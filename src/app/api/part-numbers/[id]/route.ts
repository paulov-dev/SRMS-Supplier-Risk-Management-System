import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"
import { getRequestIp } from "@/app/api/lib/request-ip"

function getPermissions(user: any): string[] {
    const permissions = user.roles.flatMap((ur: any) =>
        ur.role.permissions.map((rp: any) =>
            String(rp.permission.name)
        )
    )

    return Array.from(new Set<string>(permissions))
}

function hasAnyPermission(
    permissions: string[],
    allowed: string[]
) {
    return allowed.some((permission) =>
        permissions.includes(permission)
    )
}

function formatPartNumber(partNumber: any) {
    return {
        id: partNumber.id,
        partNumber: partNumber.partNumber,
        description: partNumber.description,
        vehicleProgram: partNumber.vehicleProgram,
        createdAt: partNumber.createdAt,

        vehicleApplications:
            partNumber.vehicleApplications?.map((application: any) => ({
                id: application.id,
                validFrom: application.validFrom,
                validTo: application.validTo,
                isActive: application.isActive,
                notes: application.notes,

                vehicleModel: {
                    id: application.vehicleModel.id,
                    code: application.vehicleModel.code,
                    name: application.vehicleModel.name,

                    family: {
                        id: application.vehicleModel.family.id,
                        name: application.vehicleModel.family.name,
                    },
                },
            })) || [],
    }
}

export async function GET(
    _req: Request,
    context: {
        params: Promise<{ id: string }>
    }
) {
    try {
        const currentUser = await getUserFromRequest()

        if (!currentUser) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            )
        }

        const permissions = getPermissions(currentUser)

        if (
            !hasAnyPermission(permissions, [
                "RISK_VIEW",
                "RISK_CREATE",
                "RISK_UPDATE",
                "USER_MANAGE",
            ])
        ) {
            return NextResponse.json(
                { error: "Sem permissão para consultar PN" },
                { status: 403 }
            )
        }

        const { id } = await context.params

        const partNumber = await prisma.partNumber.findUnique({
            where: {
                id,
            },
            include: {
                vehicleApplications: {
                    include: {
                        vehicleModel: {
                            include: {
                                family: true,
                            },
                        },
                    },
                    orderBy: [
                        {
                            vehicleModel: {
                                family: {
                                    name: "asc",
                                },
                            },
                        },
                        {
                            vehicleModel: {
                                code: "asc",
                            },
                        },
                    ],
                },
            },
        })

        if (!partNumber) {
            return NextResponse.json(
                { error: "PN não encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json(formatPartNumber(partNumber))
    } catch (error) {
        console.error("ERRO AO BUSCAR PN:", error)

        return NextResponse.json(
            {
                error: "Erro ao buscar PN",
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        )
    }
}

export async function PATCH(
    req: Request,
    context: {
        params: Promise<{ id: string }>
    }
) {
    try {
        const currentUser = await getUserFromRequest()

        if (!currentUser) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            )
        }

        const permissions = getPermissions(currentUser)

        if (
            !hasAnyPermission(permissions, [
                "RISK_UPDATE",
                "USER_MANAGE",
            ])
        ) {
            return NextResponse.json(
                { error: "Sem permissão para editar PN" },
                { status: 403 }
            )
        }

        const { id } = await context.params
        const body = await req.json()

        const description =
            typeof body.description === "string" &&
            body.description.trim()
                ? body.description.trim()
                : null

        const currentPartNumber =
            await prisma.partNumber.findUnique({
                where: {
                    id,
                },
            })

        if (!currentPartNumber) {
            return NextResponse.json(
                { error: "PN não encontrado" },
                { status: 404 }
            )
        }

        const ipAddress = getRequestIp(req)
        const userAgent = req.headers.get("user-agent")

        const updated = await prisma.$transaction(async (tx) => {
            const partNumber = await tx.partNumber.update({
                where: {
                    id,
                },
                data: {
                    description,
                },
                include: {
                    vehicleApplications: {
                        include: {
                            vehicleModel: {
                                include: {
                                    family: true,
                                },
                            },
                        },
                        orderBy: [
                            {
                                vehicleModel: {
                                    family: {
                                        name: "asc",
                                    },
                                },
                            },
                            {
                                vehicleModel: {
                                    code: "asc",
                                },
                            },
                        ],
                    },
                },
            })

            await createAuditLog(tx, {
                entityType: "PartNumber",
                entityId: partNumber.id,
                action: "PART_NUMBER_UPDATE",
                changedBy: currentUser.id,
                ipAddress,
                oldValue: {
                    id: currentPartNumber.id,
                    partNumber: currentPartNumber.partNumber,
                    description: currentPartNumber.description,
                },
                newValue: {
                    id: partNumber.id,
                    partNumber: partNumber.partNumber,
                    description: partNumber.description,
                    changedByUser: {
                        id: currentUser.id,
                        name: currentUser.name,
                        email: currentUser.email,
                    },
                    userAgent,
                },
            })

            return partNumber
        })

        return NextResponse.json(formatPartNumber(updated))
    } catch (error) {
        console.error("ERRO AO EDITAR PN:", error)

        return NextResponse.json(
            {
                error: "Erro ao editar PN",
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        )
    }
}