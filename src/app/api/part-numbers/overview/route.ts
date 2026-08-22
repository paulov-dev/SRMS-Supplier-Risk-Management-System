import { NextResponse } from "next/server"
import {
    PartRiskStatus,
    Prisma,
    RiskWorkflowStatus,
} from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

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

function getWorstPartStatus(statuses: PartRiskStatus[]) {
    if (statuses.length === 0) return null

    if (statuses.includes("RED")) return "RED"
    if (statuses.includes("YELLOW")) return "YELLOW"
    if (statuses.includes("GREEN")) return "GREEN"
    if (statuses.includes("ORANGE")) return "ORANGE"
    if (statuses.includes("GREY")) return "GREY"
    if (statuses.includes("BLUE")) return "BLUE"

    return statuses[0]
}

function uniqueById<T extends { id: string }>(items: T[]) {
    const map = new Map<string, T>()

    for (const item of items) {
        map.set(item.id, item)
    }

    return Array.from(map.values())
}

function isOverdueAction(plan: {
    dueDate: Date | null
    isCompleted: boolean
}) {
    if (!plan.dueDate) return false
    if (plan.isCompleted) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dueDate = new Date(plan.dueDate)
    dueDate.setHours(0, 0, 0, 0)

    return dueDate < today
}

export async function GET(req: Request) {
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
                        "Sem permissão para consultar visão consolidada de PNs",
                },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(req.url)

        const page = Math.max(
            Number(searchParams.get("page") || 1),
            1
        )

        const pageSize = Math.min(
            Math.max(
                Number(searchParams.get("pageSize") || 20),
                1
            ),
            100
        )

        const search =
            searchParams.get("search")?.trim() || ""

        const status =
            searchParams.get("status")?.trim() || "all"

        const supplierId =
            searchParams.get("supplierId")?.trim() || "all"

        const vehicleFamilyId =
            searchParams.get("vehicleFamilyId")?.trim() || "all"

        const vehicleModelId =
            searchParams.get("vehicleModelId")?.trim() || "all"

        const riskResponsibleId =
            searchParams.get("riskResponsibleId")?.trim() || "all"

        const pnResponsibleId =
            searchParams.get("pnResponsibleId")?.trim() || "all"

        const onlyOpenRisks =
            searchParams.get("onlyOpenRisks") === "true"

        const hasOverdueActions =
            searchParams.get("hasOverdueActions") === "true"

        const partNumberWhere: Prisma.PartNumberWhereInput = {
            ...(search
                ? {
                    OR: [
                        {
                            partNumber: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                        {
                            description: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    ],
                }
                : {}),

            ...(vehicleModelId !== "all"
                ? {
                    vehicleApplications: {
                        some: {
                            vehicleModelId,
                        },
                    },
                }
                : vehicleFamilyId !== "all"
                    ? {
                        vehicleApplications: {
                            some: {
                                vehicleModel: {
                                    familyId: vehicleFamilyId,
                                },
                            },
                        },
                    }
                    : {}),
        }

        const parts = await prisma.partNumber.findMany({
            where: partNumberWhere,
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

                riskParts: {
                    include: {
                        assignedTo: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },

                        assessment: true,

                        actionPlans: {
                            include: {
                                assignedTo: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },

                        riskEvent: {
                            include: {
                                supplier: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },

                                assignedTo: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                partNumber: "asc",
            },
        })

        const mapped = parts.map((part) => {
            const riskParts = part.riskParts.filter((riskPart) => {
                if (
                    onlyOpenRisks &&
                    riskPart.riskEvent.workflowStatus !==
                    RiskWorkflowStatus.OPEN
                ) {
                    return false
                }

                if (
                    supplierId !== "all" &&
                    riskPart.riskEvent.supplierId !== supplierId
                ) {
                    return false
                }

                if (
                    riskResponsibleId !== "all" &&
                    riskPart.riskEvent.assignedToId !== riskResponsibleId
                ) {
                    return false
                }

                if (
                    pnResponsibleId !== "all" &&
                    riskPart.assignedToId !== pnResponsibleId
                ) {
                    return false
                }

                return true
            })

            const statuses = riskParts.map(
                (riskPart) => riskPart.status
            )

            const consolidatedStatus =
                getWorstPartStatus(statuses)

            const riskEvents = riskParts.map((riskPart) => ({
                id: riskPart.riskEvent.id,
                code: riskPart.riskEvent.code,
                title: riskPart.riskEvent.title,
                workflowStatus: riskPart.riskEvent.workflowStatus,
                riskLevel: riskPart.riskEvent.riskLevel,
                supplier: riskPart.riskEvent.supplier,
                assignedTo: riskPart.riskEvent.assignedTo,
            }))

            const suppliers = uniqueById(
                riskEvents.map((riskEvent) => riskEvent.supplier)
            )

            const commodities = Array.from(
                new Set(
                    riskParts
                        .map((riskPart) => riskPart.riskEvent.commodity)
                        .filter(Boolean)
                )
            )

            const riskResponsibles = uniqueById(
                riskEvents
                    .map((riskEvent) => riskEvent.assignedTo)
                    .filter(Boolean) as {
                        id: string
                        name: string
                        email: string
                    }[]
            )

            const pnResponsibles = uniqueById(
                riskParts
                    .map((riskPart) => riskPart.assignedTo)
                    .filter(Boolean) as {
                        id: string
                        name: string
                        email: string
                    }[]
            )

            const allActionPlans = riskParts.flatMap(
                (riskPart) => riskPart.actionPlans
            )

            const openActionPlans = allActionPlans.filter(
                (plan) => !plan.isCompleted
            )

            const completedActionPlans = allActionPlans.filter(
                (plan) => plan.isCompleted
            )

            const overdueActionPlans =
                allActionPlans.filter(isOverdueAction)

            const nextDueDate =
                openActionPlans
                    .filter((plan) => plan.dueDate)
                    .sort(
                        (a, b) =>
                            new Date(a.dueDate!).getTime() -
                            new Date(b.dueDate!).getTime()
                    )[0]?.dueDate || null

            const openRms = riskEvents.filter(
                (riskEvent) =>
                    riskEvent.workflowStatus ===
                    RiskWorkflowStatus.OPEN
            )

            const closedRms = riskEvents.filter(
                (riskEvent) =>
                    riskEvent.workflowStatus ===
                    RiskWorkflowStatus.CLOSED
            )

            const updatedAtCandidates = [
                part.createdAt,
                ...riskParts.map((riskPart) => riskPart.updatedAt),
                ...allActionPlans.map((plan) => plan.updatedAt),
            ].filter(Boolean)

            const updatedAt = updatedAtCandidates.sort(
                (a, b) =>
                    new Date(b).getTime() -
                    new Date(a).getTime()
            )[0]

            return {
                id: part.id,
                partNumber: part.partNumber,
                description: part.description,
                vehicleProgram: part.vehicleProgram,

                vehicleApplications: part.vehicleApplications.map(
                    (application) => ({
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
                    })
                ),

                suppliers,
                commodities,

                consolidatedStatus,

                riskEvents,

                riskResponsibles,
                pnResponsibles,

                actionPlans: {
                    total: allActionPlans.length,
                    open: openActionPlans.length,
                    completed: completedActionPlans.length,
                    overdue: overdueActionPlans.length,
                    nextDueDate,
                },

                usage: {
                    totalRms: riskEvents.length,
                    openRms: openRms.length,
                    closedRms: closedRms.length,
                },

                updatedAt,
            }
        })

        let filtered = mapped.filter(
            (part) => part.usage.totalRms > 0
        )

        if (status !== "all") {
            filtered = filtered.filter(
                (part) => part.consolidatedStatus === status
            )
        }

        if (hasOverdueActions) {
            filtered = filtered.filter(
                (part) => part.actionPlans.overdue > 0
            )
        }

        const total = filtered.length

        const totalPages = Math.max(
            Math.ceil(total / pageSize),
            1
        )

        const paginated = filtered.slice(
            (page - 1) * pageSize,
            page * pageSize
        )

        const statsBase = mapped.filter(
            (part) => part.usage.totalRms > 0
        )

        const stats = {
            totalPartNumbers: statsBase.length,
            partNumbersWithOpenRisks: statsBase.filter(
                (part) => part.usage.openRms > 0
            ).length,
            criticalPartNumbers: statsBase.filter(
                (part) => part.consolidatedStatus === "RED"
            ).length,
            partNumbersWithOverdueActions: statsBase.filter(
                (part) => part.actionPlans.overdue > 0
            ).length,
        }

        return NextResponse.json({
            data: paginated,
            stats,
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
            },
        })
    } catch (error) {
        console.error("ERRO AO BUSCAR VISÃO DE PNs:", error)

        return NextResponse.json(
            {
                error: "Erro ao buscar visão consolidada de PNs",
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        )
    }
}