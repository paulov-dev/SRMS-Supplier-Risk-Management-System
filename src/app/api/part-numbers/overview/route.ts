import { NextResponse } from "next/server"
import {
    PartRiskStatus,
    Prisma,
    RiskPartLogisticsStatus,
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

function getConsolidatedLogisticsStatus(
    statuses: RiskPartLogisticsStatus[]
) {
    if (statuses.length === 0) return null

    if (statuses.includes("REJECTED")) return "REJECTED"
    if (statuses.includes("IN_LOGISTICS")) return "IN_LOGISTICS"
    if (statuses.includes("REQUESTED")) return "REQUESTED"
    if (statuses.includes("APPROVED")) return "APPROVED"
    if (statuses.includes("NOT_REQUESTED")) return "NOT_REQUESTED"

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
    status:
    | "OPEN"
    | "IN_PROGRESS"
    | "WAITING_VALIDATION"
    | "COMPLETED"
    | "CANCELED"
}) {

    if (!plan.dueDate) {
        return false
    }


    if (
        plan.status === "COMPLETED" ||
        plan.status === "CANCELED"
    ) {
        return false
    }


    const today = new Date()

    today.setHours(
        0,
        0,
        0,
        0
    )


    const dueDate = new Date(plan.dueDate)

    dueDate.setHours(
        0,
        0,
        0,
        0
    )


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

        const logisticsStatus =
            searchParams.get("logisticsStatus")?.trim() || "all"

        const operationalStatusFilter =
            searchParams.get("operationalStatus")?.trim() || "all"

        const sortBy =
            searchParams.get("sortBy")?.trim() || "operationalStatus"

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

            const consolidatedLogisticsStatus =
                getConsolidatedLogisticsStatus(
                    riskParts.map(
                        (riskPart) =>
                            riskPart.logisticsStatus
                    )
                )

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
                (plan) =>
                    plan.status !== "COMPLETED" &&
                    plan.status !== "CANCELED"
            )

            const completedActionPlans = allActionPlans.filter(
                (plan) =>
                    plan.status === "COMPLETED"
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

            const hasActiveVehicleApplication =
                part.vehicleApplications.some(
                    (application) => application.isActive
                )

            const operationalReasons: string[] = []

            if (consolidatedStatus === "RED") {
                operationalReasons.push("PN em status vermelho")
            }

            if (consolidatedStatus === "YELLOW") {
                operationalReasons.push(
                    allActionPlans.length === 0
                        ? "PN amarelo sem plano de ação relacionado"
                        : "PN em status amarelo"
                )
            }

            if (consolidatedStatus === "ORANGE") {
                operationalReasons.push("PN em status laranja")
            }

            if (consolidatedStatus === "GREEN") {
                operationalReasons.push(
                    allActionPlans.length === 0
                        ? "PN verde sem plano de ação relacionado"
                        : "PN verde em monitoramento"
                )
            }

            if (overdueActionPlans.length > 0) {
                operationalReasons.push(
                    `${overdueActionPlans.length} plano(s) atrasado(s)`
                )
            }

            if (consolidatedLogisticsStatus === "REJECTED") {
                operationalReasons.push(
                    "Solicitação logística rejeitada"
                )
            }

            if (consolidatedLogisticsStatus === "IN_LOGISTICS") {
                operationalReasons.push(
                    "PN atualmente em análise pela Logística"
                )
            }

            if (consolidatedLogisticsStatus === "REQUESTED") {
                operationalReasons.push(
                    "Solicitação enviada e aguardando a Logística"
                )
            }

            if (riskResponsibles.length === 0) {
                operationalReasons.push("RM sem responsável Risk")
            }

            if (pnResponsibles.length === 0) {
                operationalReasons.push("PN sem responsável")
            }

            if (!hasActiveVehicleApplication) {
                operationalReasons.push("Sem aplicação ativa")
            }

            const operationalStatus =
                consolidatedStatus === "RED" ||
                    overdueActionPlans.length > 0 ||
                    consolidatedLogisticsStatus === "REJECTED" ||
                    (consolidatedStatus === "YELLOW" &&
                        allActionPlans.length === 0)
                    ? "IMMEDIATE_ACTION"
                    : consolidatedStatus === "BLUE"
                        ? "COMPLETED"
                    : consolidatedStatus === "YELLOW" ||
                        (consolidatedStatus === "GREEN" &&
                            allActionPlans.length === 0)
                        ? "ATTENTION"
                        : consolidatedLogisticsStatus === "REQUESTED" ||
                            consolidatedLogisticsStatus === "IN_LOGISTICS"
                            ? "WAITING_LOGISTICS"
                            : riskResponsibles.length === 0 ||
                                pnResponsibles.length === 0 ||
                                !hasActiveVehicleApplication
                                ? "REGISTRATION_ADJUSTMENT"
                                : "MONITORING"

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

                analysis: {
                    operationalStatus,
                    operationalReasons,
                    isCompleted:
                        consolidatedStatus === "BLUE",
                    withoutRiskResponsible:
                        riskResponsibles.length === 0,
                    withoutPnResponsible:
                        pnResponsibles.length === 0,
                    withoutActiveVehicleApplication:
                        !hasActiveVehicleApplication,
                },

                logistics: {
                    consolidatedStatus:
                        consolidatedLogisticsStatus,
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

        if (logisticsStatus !== "all") {
            filtered = filtered.filter(
                (part) =>
                    part.logistics.consolidatedStatus ===
                    logisticsStatus
            )
        }

        if (operationalStatusFilter !== "all") {
            filtered = filtered.filter(
                (part) =>
                    part.analysis.operationalStatus ===
                    operationalStatusFilter
            )
        }

        const operationalStatusOrder: Record<string, number> = {
            IMMEDIATE_ACTION: 0,
            ATTENTION: 1,
            WAITING_LOGISTICS: 2,
            REGISTRATION_ADJUSTMENT: 3,
            MONITORING: 4,
            COMPLETED: 5,
        }

        filtered.sort((partA, partB) => {
            if (sortBy === "partNumber") {
                return partA.partNumber.localeCompare(
                    partB.partNumber,
                    "pt-BR"
                )
            }

            if (sortBy === "updatedAt") {
                return (
                    new Date(partB.updatedAt).getTime() -
                    new Date(partA.updatedAt).getTime()
                )
            }

            if (sortBy === "openRms") {
                return (
                    partB.usage.openRms -
                    partA.usage.openRms
                )
            }

            if (sortBy === "overdue") {
                return (
                    partB.actionPlans.overdue -
                    partA.actionPlans.overdue
                )
            }

            const operationalStatusDelta =
                operationalStatusOrder[
                    partA.analysis.operationalStatus
                ] -
                operationalStatusOrder[
                    partB.analysis.operationalStatus
                ]

            if (operationalStatusDelta !== 0) {
                return operationalStatusDelta
            }

            if (
                partB.actionPlans.overdue !==
                partA.actionPlans.overdue
            ) {
                return (
                    partB.actionPlans.overdue -
                    partA.actionPlans.overdue
                )
            }

            if (partB.usage.openRms !== partA.usage.openRms) {
                return (
                    partB.usage.openRms -
                    partA.usage.openRms
                )
            }

            return partA.partNumber.localeCompare(
                partB.partNumber,
                "pt-BR"
            )
        })

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
            completedPartNumbers: statsBase.filter(
                (part) => part.analysis.isCompleted
            ).length,
            operationalQueuePartNumbers: statsBase.filter(
                (part) =>
                    part.analysis.operationalStatus !==
                    "MONITORING" &&
                    part.analysis.operationalStatus !==
                    "COMPLETED"
            ).length,
            partNumbersWithoutRiskResponsible: statsBase.filter(
                (part) =>
                    part.analysis.withoutRiskResponsible
            ).length,
            partNumbersWithoutPnResponsible: statsBase.filter(
                (part) => part.analysis.withoutPnResponsible
            ).length,
            partNumbersWithoutActiveApplication: statsBase.filter(
                (part) =>
                    part.analysis.withoutActiveVehicleApplication
            ).length,
            totalOpenActionPlans: statsBase.reduce(
                (total, part) =>
                    total + part.actionPlans.open,
                0
            ),
            totalOverdueActionPlans: statsBase.reduce(
                (total, part) =>
                    total + part.actionPlans.overdue,
                0
            ),
            statusDistribution: {
                red: statsBase.filter(
                    (part) => part.consolidatedStatus === "RED"
                ).length,
                yellow: statsBase.filter(
                    (part) => part.consolidatedStatus === "YELLOW"
                ).length,
                green: statsBase.filter(
                    (part) => part.consolidatedStatus === "GREEN"
                ).length,
                orange: statsBase.filter(
                    (part) => part.consolidatedStatus === "ORANGE"
                ).length,
                grey: statsBase.filter(
                    (part) => part.consolidatedStatus === "GREY"
                ).length,
                blue: statsBase.filter(
                    (part) => part.consolidatedStatus === "BLUE"
                ).length,
                withoutStatus: statsBase.filter(
                    (part) => !part.consolidatedStatus
                ).length,
            },
            logisticsDistribution: {
                notRequested: statsBase.filter(
                    (part) =>
                        part.logistics.consolidatedStatus ===
                        "NOT_REQUESTED"
                ).length,
                requested: statsBase.filter(
                    (part) =>
                        part.logistics.consolidatedStatus ===
                        "REQUESTED"
                ).length,
                inLogistics: statsBase.filter(
                    (part) =>
                        part.logistics.consolidatedStatus ===
                        "IN_LOGISTICS"
                ).length,
                approved: statsBase.filter(
                    (part) =>
                        part.logistics.consolidatedStatus ===
                        "APPROVED"
                ).length,
                rejected: statsBase.filter(
                    (part) =>
                        part.logistics.consolidatedStatus ===
                        "REJECTED"
                ).length,
                withoutStatus: statsBase.filter(
                    (part) =>
                        !part.logistics.consolidatedStatus
                ).length,
            },
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
