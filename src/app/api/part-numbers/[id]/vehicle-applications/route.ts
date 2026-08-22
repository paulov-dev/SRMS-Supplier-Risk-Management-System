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

function parseDateOrNull(value: unknown) {
    if (!value) return null

    if (typeof value !== "string") {
        return null
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return date
}

function formatApplication(application: any) {
    return {
        id: application.id,
        partNumberId: application.partNumberId,
        vehicleModelId: application.vehicleModelId,
        validFrom: application.validFrom,
        validTo: application.validTo,
        isActive: application.isActive,
        notes: application.notes,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        vehicleModel: {
            id: application.vehicleModel.id,
            familyId: application.vehicleModel.familyId,
            code: application.vehicleModel.code,
            name: application.vehicleModel.name,
            description: application.vehicleModel.description,
            isActive: application.vehicleModel.isActive,
            family: {
                id: application.vehicleModel.family.id,
                name: application.vehicleModel.family.name,
                description: application.vehicleModel.family.description,
                isActive: application.vehicleModel.family.isActive,
            },
        },
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
                {
                    error:
                        "Sem permissão para consultar aplicações veiculares do PN",
                },
                { status: 403 }
            )
        }

        const { id } = await context.params

        const partNumber = await prisma.partNumber.findUnique({
            where: {
                id,
            },
            select: {
                id: true,
                partNumber: true,
                description: true,
            },
        })

        if (!partNumber) {
            return NextResponse.json(
                { error: "PN não encontrado" },
                { status: 404 }
            )
        }

        const applications =
            await prisma.partNumberVehicleApplication.findMany({
                where: {
                    partNumberId: id,
                },
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
            })

        return NextResponse.json({
            partNumber,
            data: applications.map(formatApplication),
        })
    } catch (error) {
        console.error(
            "ERRO AO BUSCAR APLICAÇÕES VEICULARES DO PN:",
            error
        )

        return NextResponse.json(
            {
                error:
                    "Erro ao buscar aplicações veiculares do PN",
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        )
    }
}

export async function POST(
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
                "RISK_CREATE",
                "RISK_UPDATE",
                "USER_MANAGE",
            ])
        ) {
            return NextResponse.json(
                {
                    error:
                        "Sem permissão para cadastrar aplicação veicular do PN",
                },
                { status: 403 }
            )
        }

        const { id } = await context.params
        const body = await req.json()

        const vehicleModelId =
            typeof body.vehicleModelId === "string"
                ? body.vehicleModelId.trim()
                : ""

        const validFrom = parseDateOrNull(body.validFrom)
        const validTo = parseDateOrNull(body.validTo)

        const notes =
            typeof body.notes === "string" &&
            body.notes.trim()
                ? body.notes.trim()
                : null

        if (!vehicleModelId) {
            return NextResponse.json(
                { error: "Informe o modelo veicular" },
                { status: 400 }
            )
        }

        if (
            validFrom &&
            validTo &&
            validFrom.getTime() > validTo.getTime()
        ) {
            return NextResponse.json(
                {
                    error:
                        "A data inicial não pode ser maior que a data final",
                },
                { status: 400 }
            )
        }

        const partNumber = await prisma.partNumber.findUnique({
            where: {
                id,
            },
            select: {
                id: true,
                partNumber: true,
                description: true,
            },
        })

        if (!partNumber) {
            return NextResponse.json(
                { error: "PN não encontrado" },
                { status: 404 }
            )
        }

        const vehicleModel = await prisma.vehicleModel.findUnique({
            where: {
                id: vehicleModelId,
            },
            include: {
                family: true,
            },
        })

        if (!vehicleModel) {
            return NextResponse.json(
                { error: "Modelo veicular não encontrado" },
                { status: 404 }
            )
        }

        if (!vehicleModel.isActive) {
            return NextResponse.json(
                {
                    error:
                        "Não é possível vincular um modelo veicular inativo",
                },
                { status: 400 }
            )
        }

        if (!vehicleModel.family.isActive) {
            return NextResponse.json(
                {
                    error:
                        "Não é possível vincular um modelo de uma classe inativa",
                },
                { status: 400 }
            )
        }

        const duplicate =
            await prisma.partNumberVehicleApplication.findFirst({
                where: {
                    partNumberId: id,
                    vehicleModelId,
                    validFrom,
                    validTo,
                },
                select: {
                    id: true,
                },
            })

        if (duplicate) {
            return NextResponse.json(
                {
                    error:
                        "Este PN já possui aplicação cadastrada para este modelo e período",
                },
                { status: 409 }
            )
        }

        const ipAddress = getRequestIp(req)
        const userAgent = req.headers.get("user-agent")

        const created = await prisma.$transaction(async (tx) => {
            const application =
                await tx.partNumberVehicleApplication.create({
                    data: {
                        partNumberId: id,
                        vehicleModelId,
                        validFrom,
                        validTo,
                        notes,
                        isActive: true,
                    },
                    include: {
                        vehicleModel: {
                            include: {
                                family: true,
                            },
                        },
                    },
                })

            await createAuditLog(tx, {
                entityType: "PartNumberVehicleApplication",
                entityId: application.id,
                action: "PART_NUMBER_VEHICLE_APPLICATION_CREATE",
                changedBy: currentUser.id,
                ipAddress,
                oldValue: null,
                newValue: {
                    id: application.id,
                    partNumber: {
                        id: partNumber.id,
                        partNumber: partNumber.partNumber,
                        description: partNumber.description,
                    },
                    vehicleModel: {
                        id: vehicleModel.id,
                        code: vehicleModel.code,
                        name: vehicleModel.name,
                        family: {
                            id: vehicleModel.family.id,
                            name: vehicleModel.family.name,
                        },
                    },
                    validFrom,
                    validTo,
                    notes,
                    isActive: true,
                    changedByUser: {
                        id: currentUser.id,
                        name: currentUser.name,
                        email: currentUser.email,
                    },
                    userAgent,
                },
            })

            return application
        })

        return NextResponse.json(
            formatApplication(created),
            { status: 201 }
        )
    } catch (error) {
        console.error(
            "ERRO AO CADASTRAR APLICAÇÃO VEICULAR DO PN:",
            error
        )

        return NextResponse.json(
            {
                error:
                    "Erro ao cadastrar aplicação veicular do PN",
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        )
    }
}