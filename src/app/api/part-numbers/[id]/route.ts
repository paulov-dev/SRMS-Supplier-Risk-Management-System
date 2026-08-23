import { NextResponse } from "next/server"
import {
    PartRiskStatus,
    Prisma,
    RiskPartLogisticsStatus,
    RiskWorkflowStatus,
} from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"
import { getRequestIp } from "@/app/api/lib/request-ip"

const userSelect = {
    id: true,
    name: true,
    email: true,
    photoUrl: true,
} satisfies Prisma.UserSelect

const partNumberDetailInclude = {
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
                        name: "asc" as const,
                    },
                },
            },
            {
                vehicleModel: {
                    code: "asc" as const,
                },
            },
        ],
    },

    riskParts: {
        include: {
            assignedTo: {
                select: userSelect,
            },

            assessment: true,

            riskEvent: {
                include: {
                    supplier: {
                        select: {
                            id: true,
                            name: true,
                            supplierCodeSap: true,
                            status: true,
                            country: {
                                select: {
                                    id: true,
                                    name: true,
                                    isoCode: true,
                                },
                            },
                        },
                    },

                    assignedTo: {
                        select: userSelect,
                    },
                },
            },

            actionPlans: {
                include: {
                    assignedTo: {
                        select: userSelect,
                    },
                },
                orderBy: [
                    {
                        dueDate: "asc" as const,
                    },
                    {
                        createdAt: "desc" as const,
                    },
                ],
            },

            logisticsRequests: {
                include: {
                    requestedBy: {
                        select: userSelect,
                    },
                    assignedTo: {
                        select: userSelect,
                    },
                    reviewedBy: {
                        select: userSelect,
                    },
                },
                orderBy: {
                    requestedAt: "desc" as const,
                },
            },
        },
        orderBy: {
            updatedAt: "desc" as const,
        },
    },

    riskPartHistory: {
        include: {
            riskEvent: {
                select: {
                    id: true,
                    code: true,
                    title: true,
                },
            },
            changedBy: {
                select: userSelect,
            },
        },
        orderBy: {
            changedAt: "desc" as const,
        },
        take: 50,
    },
} satisfies Prisma.PartNumberInclude

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

function uniqueById<T extends { id: string }>(items: T[]) {
    const map = new Map<string, T>()

    for (const item of items) {
        map.set(item.id, item)
    }

    return Array.from(map.values())
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

function isOpenActionPlan(status: string) {
    return status !== "COMPLETED" && status !== "CANCELED"
}

function isOverdueAction(plan: {
    dueDate: Date | null
    status: string
}) {
    if (!plan.dueDate || !isOpenActionPlan(plan.status)) {
        return false
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dueDate = new Date(plan.dueDate)
    dueDate.setHours(0, 0, 0, 0)

    return dueDate < today
}

function isDueSoonAction(plan: {
    dueDate: Date | null
    status: string
}) {
    if (!plan.dueDate || !isOpenActionPlan(plan.status)) {
        return false
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dueDate = new Date(plan.dueDate)
    dueDate.setHours(0, 0, 0, 0)

    const differenceInDays = Math.ceil(
        (dueDate.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
    )

    return differenceInDays >= 0 && differenceInDays <= 7
}

async function findPartNumberDetail(id: string) {
    return prisma.partNumber.findUnique({
        where: {
            id,
        },
        include: partNumberDetailInclude,
    })
}

function formatPartNumber(partNumber: any) {
    const allRiskParts = partNumber.riskParts || []

    const openRiskParts = allRiskParts.filter(
        (riskPart: any) =>
            riskPart.riskEvent.workflowStatus ===
            RiskWorkflowStatus.OPEN
    )

    /*
     * A situação atual prioriza RMs abertas. Quando não existem
     * RMs abertas, o histórico completo é usado como referência.
     */
    const analysisRiskParts =
        openRiskParts.length > 0
            ? openRiskParts
            : allRiskParts

    const analysisScope =
        openRiskParts.length > 0
            ? "OPEN_RMS"
            : allRiskParts.length > 0
                ? "HISTORICAL_RMS"
                : "NO_RMS"

    const consolidatedStatus = getWorstPartStatus(
        analysisRiskParts.map(
            (riskPart: any) => riskPart.status
        )
    )

    const consolidatedLogisticsStatus =
        getConsolidatedLogisticsStatus(
            analysisRiskParts.map(
                (riskPart: any) =>
                    riskPart.logisticsStatus
            )
        )

    const analysisActionPlans = analysisRiskParts.flatMap(
        (riskPart: any) => riskPart.actionPlans || []
    )

    const allActionPlans = allRiskParts.flatMap(
        (riskPart: any) => riskPart.actionPlans || []
    )

    const openActionPlans = analysisActionPlans.filter(
        (plan: any) => isOpenActionPlan(plan.status)
    )

    const overdueActionPlans = analysisActionPlans.filter(
        (plan: any) => isOverdueAction(plan)
    )

    const dueSoonActionPlans = analysisActionPlans.filter(
        (plan: any) => isDueSoonAction(plan)
    )

    const completedActionPlans = analysisActionPlans.filter(
        (plan: any) => plan.status === "COMPLETED"
    )

    const nextDueDate =
        openActionPlans
            .filter((plan: any) => plan.dueDate)
            .sort(
                (planA: any, planB: any) =>
                    new Date(planA.dueDate).getTime() -
                    new Date(planB.dueDate).getTime()
            )[0]?.dueDate || null

    const riskEvents = uniqueById(
        allRiskParts.map(
            (riskPart: any) => riskPart.riskEvent
        )
    )

    const suppliers = uniqueById(
        riskEvents.map(
            (riskEvent: any) => riskEvent.supplier
        )
    )

    const riskResponsibles = uniqueById(
        analysisRiskParts
            .map(
                (riskPart: any) =>
                    riskPart.riskEvent.assignedTo
            )
            .filter(Boolean)
    )

    const pnResponsibles = uniqueById(
        analysisRiskParts
            .map(
                (riskPart: any) =>
                    riskPart.assignedTo
            )
            .filter(Boolean)
    )

    const hasActiveVehicleApplication =
        partNumber.vehicleApplications.some(
            (application: any) => application.isActive
        )

    const operationalReasons: string[] = []

    if (analysisScope === "HISTORICAL_RMS") {
        operationalReasons.push(
            "Nenhuma RM aberta; análise baseada nas RMs históricas"
        )
    }

    if (analysisScope === "NO_RMS") {
        operationalReasons.push(
            "Nenhuma RM relacionada ao PN"
        )
    }

    if (consolidatedStatus === "RED") {
        operationalReasons.push("PN em status vermelho")
    }

    if (consolidatedStatus === "YELLOW") {
        operationalReasons.push(
            analysisActionPlans.length === 0
                ? "PN amarelo sem plano de ação relacionado"
                : "PN em status amarelo com plano relacionado"
        )
    }

    if (consolidatedStatus === "GREEN") {
        operationalReasons.push(
            analysisActionPlans.length === 0
                ? "PN verde sem plano de ação relacionado"
                : "PN verde em monitoramento"
        )
    }

    if (consolidatedStatus === "ORANGE") {
        operationalReasons.push("PN em status laranja")
    }

    if (overdueActionPlans.length > 0) {
        operationalReasons.push(
            String(overdueActionPlans.length) +
                " plano(s) de ação atrasado(s)"
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

    if (
        analysisRiskParts.length > 0 &&
        riskResponsibles.length === 0
    ) {
        operationalReasons.push(
            "RM sem responsável Risk"
        )
    }

    if (
        analysisRiskParts.length > 0 &&
        pnResponsibles.length === 0
    ) {
        operationalReasons.push(
            "PN sem responsável"
        )
    }

    if (!hasActiveVehicleApplication) {
        operationalReasons.push(
            "PN sem aplicação veicular ativa"
        )
    }

    const operationalStatus =
        analysisScope === "HISTORICAL_RMS"
            ? consolidatedStatus === "BLUE"
                ? "COMPLETED"
                : "MONITORING"
            : analysisScope === "NO_RMS"
                ? hasActiveVehicleApplication
                    ? "MONITORING"
                    : "REGISTRATION_ADJUSTMENT"
                : consolidatedStatus === "RED" ||
                    overdueActionPlans.length > 0 ||
                    consolidatedLogisticsStatus === "REJECTED" ||
                    (consolidatedStatus === "YELLOW" &&
                        analysisActionPlans.length === 0)
                    ? "IMMEDIATE_ACTION"
                    : consolidatedStatus === "BLUE"
                        ? "COMPLETED"
                        : consolidatedStatus === "YELLOW" ||
                            (consolidatedStatus === "GREEN" &&
                                analysisActionPlans.length === 0)
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
        id: partNumber.id,
        partNumber: partNumber.partNumber,
        description: partNumber.description,
        vehicleProgram: partNumber.vehicleProgram,
        createdAt: partNumber.createdAt,

        vehicleApplications:
            partNumber.vehicleApplications.map(
                (application: any) => ({
                    id: application.id,
                    validFrom: application.validFrom,
                    validTo: application.validTo,
                    isActive: application.isActive,
                    notes: application.notes,
                    createdAt: application.createdAt,
                    updatedAt: application.updatedAt,

                    vehicleModel: {
                        id: application.vehicleModel.id,
                        code: application.vehicleModel.code,
                        name: application.vehicleModel.name,
                        description:
                            application.vehicleModel.description,
                        isActive:
                            application.vehicleModel.isActive,

                        family: {
                            id:
                                application.vehicleModel.family.id,
                            name:
                                application.vehicleModel.family.name,
                            description:
                                application.vehicleModel.family
                                    .description,
                            isActive:
                                application.vehicleModel.family
                                    .isActive,
                        },
                    },
                })
            ),

        analysis: {
            scope: analysisScope,
            consolidatedStatus,
            consolidatedLogisticsStatus,
            operationalStatus,
            operationalReasons,
            nextDueDate,

            metrics: {
                totalRms: riskEvents.length,
                openRms: allRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.riskEvent.workflowStatus ===
                        "OPEN"
                ).length,
                closedRms: allRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.riskEvent.workflowStatus ===
                        "CLOSED"
                ).length,
                canceledRms: allRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.riskEvent.workflowStatus ===
                        "CANCELED"
                ).length,
                totalSuppliers: suppliers.length,
                totalActionPlans: analysisActionPlans.length,
                openActionPlans: openActionPlans.length,
                overdueActionPlans: overdueActionPlans.length,
                dueSoonActionPlans: dueSoonActionPlans.length,
                completedActionPlans:
                    completedActionPlans.length,
                historicalActionPlans:
                    allActionPlans.length,
                activeApplications:
                    partNumber.vehicleApplications.filter(
                        (application: any) =>
                            application.isActive
                    ).length,
                inactiveApplications:
                    partNumber.vehicleApplications.filter(
                        (application: any) =>
                            !application.isActive
                    ).length,
            },

            statusDistribution: {
                red: analysisRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.status === "RED"
                ).length,
                yellow: analysisRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.status === "YELLOW"
                ).length,
                green: analysisRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.status === "GREEN"
                ).length,
                orange: analysisRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.status === "ORANGE"
                ).length,
                grey: analysisRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.status === "GREY"
                ).length,
                blue: analysisRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.status === "BLUE"
                ).length,
            },

            logisticsDistribution: {
                notRequested: analysisRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.logisticsStatus ===
                        "NOT_REQUESTED"
                ).length,
                requested: analysisRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.logisticsStatus ===
                        "REQUESTED"
                ).length,
                inLogistics: analysisRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.logisticsStatus ===
                        "IN_LOGISTICS"
                ).length,
                approved: analysisRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.logisticsStatus ===
                        "APPROVED"
                ).length,
                rejected: analysisRiskParts.filter(
                    (riskPart: any) =>
                        riskPart.logisticsStatus ===
                        "REJECTED"
                ).length,
            },

            suppliers: suppliers.map((supplier: any) => ({
                id: supplier.id,
                name: supplier.name,
                supplierCodeSap:
                    supplier.supplierCodeSap,
                status: supplier.status,
                country: supplier.country,
            })),

            riskResponsibles,
            pnResponsibles,
        },

        riskContexts: allRiskParts.map((riskPart: any) => ({
            id: riskPart.id,
            status: riskPart.status,
            logisticsStatus:
                riskPart.logisticsStatus,
            assignedTo: riskPart.assignedTo,
            assessment: riskPart.assessment,
            createdAt: riskPart.createdAt,
            updatedAt: riskPart.updatedAt,

            riskEvent: {
                id: riskPart.riskEvent.id,
                code: riskPart.riskEvent.code,
                title: riskPart.riskEvent.title,
                description:
                    riskPart.riskEvent.description,
                workflowStatus:
                    riskPart.riskEvent.workflowStatus,
                riskLevel:
                    riskPart.riskEvent.riskLevel,
                commodity:
                    riskPart.riskEvent.commodity,
                functionalGroup:
                    riskPart.riskEvent.functionalGroup,
                createdAt:
                    riskPart.riskEvent.createdAt,
                assignedTo:
                    riskPart.riskEvent.assignedTo,
                supplier:
                    riskPart.riskEvent.supplier,
            },

            actionPlans: riskPart.actionPlans.map(
                (plan: any) => ({
                    id: plan.id,
                    title: plan.title,
                    description: plan.description,
                    requiredAction:
                        plan.requiredAction,
                    responsibleArea:
                        plan.responsibleArea,
                    dueDate: plan.dueDate,
                    priority: plan.priority,
                    status: plan.status,
                    assignedTo: plan.assignedTo,
                    updatedAt: plan.updatedAt,
                    isOverdue:
                        isOverdueAction(plan),
                    isDueSoon:
                        isDueSoonAction(plan),
                })
            ),

            logisticsRequests:
                riskPart.logisticsRequests.map(
                    (request: any) => ({
                        id: request.id,
                        code: request.code,
                        type: request.type,
                        status: request.status,
                        priority: request.priority,
                        requestedAt:
                            request.requestedAt,
                        acceptedAt:
                            request.acceptedAt,
                        reviewedAt:
                            request.reviewedAt,
                        requestNotes:
                            request.requestNotes,
                        responseNotes:
                            request.responseNotes,
                        rejectionReason:
                            request.rejectionReason,
                        requestedQuantity:
                            request.requestedQuantity,
                        calculatedQuantity:
                            request.calculatedQuantity,
                        requestedBy:
                            request.requestedBy,
                        assignedTo:
                            request.assignedTo,
                        reviewedBy:
                            request.reviewedBy,
                    })
                ),
        })),

        history:
            partNumber.riskPartHistory.map(
                (history: any) => ({
                    id: history.id,
                    changeType: history.changeType,
                    oldStatus: history.oldStatus,
                    newStatus: history.newStatus,
                    oldLogisticsStatus:
                        history.oldLogisticsStatus,
                    newLogisticsStatus:
                        history.newLogisticsStatus,
                    reason: history.reason,
                    changedAt: history.changedAt,
                    changedBy: history.changedBy,
                    riskEvent: history.riskEvent,
                })
            ),
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
        const partNumber = await findPartNumberDetail(id)

        if (!partNumber) {
            return NextResponse.json(
                { error: "PN não encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json(
            formatPartNumber(partNumber)
        )
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

        await prisma.$transaction(async (tx) => {
            const partNumber = await tx.partNumber.update({
                where: {
                    id,
                },
                data: {
                    description,
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
        })

        const updated = await findPartNumberDetail(id)

        if (!updated) {
            return NextResponse.json(
                { error: "PN não encontrado após atualização" },
                { status: 404 }
            )
        }

        return NextResponse.json(
            formatPartNumber(updated)
        )
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
