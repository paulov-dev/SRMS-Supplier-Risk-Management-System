import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

type Params = {
    params: Promise<{
        id: string
    }>
}

const supplierInclude = {
    country: true,

    contacts: {
        orderBy: {
            name: "asc",
        },
    },

    riskEvents: {
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },

            assignedTo: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },

            closedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },

            parts: {
                include: {
                    partNumber: true,
                    assignedTo: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            },

            actionPlans: {
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    validatedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    riskEventPart: {
                        include: {
                            partNumber: true,
                        },
                    },
                },
                orderBy: [
                    {
                        dueDate: "asc",
                    },
                    {
                        createdAt: "desc",
                    },
                ],
            },

            logistics: {
                include: {
                    requestedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    reviewedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    riskEventPart: {
                        include: {
                            partNumber: true,
                        },
                    },
                },
                orderBy: {
                    requestedAt: "desc",
                },
            },
        },

        orderBy: {
            createdAt: "desc",
        },
    },
} satisfies Prisma.SupplierInclude

type SupplierWithDetails = Prisma.SupplierGetPayload<{
    include: typeof supplierInclude
}>

function getPermissions(user: any): string[] {
    const permissions =
        user.roles?.flatMap((ur: any) =>
            ur.role.permissions.map((rp: any) =>
                String(rp.permission.name)
            )
        ) || []

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

function daysBetween(start: Date, end: Date) {
    const diff = end.getTime() - start.getTime()

    return Math.max(
        0,
        Math.floor(diff / (1000 * 60 * 60 * 24))
    )
}

function average(values: number[]) {
    if (values.length === 0) return null

    const total = values.reduce((sum, value) => sum + value, 0)

    return total / values.length
}

function maxOrNull(values: number[]) {
    if (values.length === 0) return null

    return Math.max(...values)
}

function formatUser(
    user:
        | {
              id: string
              name: string
              email: string
          }
        | null
        | undefined
) {
    if (!user) return null

    return {
        id: user.id,
        name: user.name,
        email: user.email,
    }
}

function formatRiskLevelLabel(level: string) {
    switch (level) {
        case "RED":
            return "Vermelho"
        case "YELLOW":
            return "Amarelo"
        case "GREEN":
            return "Verde"
        case "ORANGE":
            return "Laranja"
        case "GREY":
            return "Cinza"
        case "BLUE":
            return "Azul"
        default:
            return level
    }
}

function formatWorkflowStatusLabel(status: string) {
    switch (status) {
        case "OPEN":
            return "Aberta"
        case "CLOSED":
            return "Fechada"
        case "CANCELED":
            return "Cancelada"
        default:
            return status
    }
}

function formatSupplierStatusLabel(status: string) {
    switch (status) {
        case "ACTIVE":
            return "Ativo"
        case "UNDER_MONITORING":
            return "Em monitoramento"
        case "AT_RISK":
            return "Em risco"
        case "BLOCKED":
            return "Bloqueado"
        case "INACTIVE":
            return "Inativo"
        default:
            return status
    }
}

function formatActionPlanStatusLabel(status: string) {
    switch (status) {
        case "OPEN":
            return "Aberto"
        case "IN_PROGRESS":
            return "Em andamento"
        case "WAITING_VALIDATION":
            return "Aguardando validação"
        case "COMPLETED":
            return "Concluído"
        case "CANCELED":
            return "Cancelado"
        default:
            return status
    }
}

function formatLogisticsStatusLabel(status: string) {
    switch (status) {
        case "PENDING":
            return "Pendente"
        case "IN_REVIEW":
            return "Em análise"
        case "APPROVED":
            return "Aprovada"
        case "REJECTED":
            return "Rejeitada"
        case "CANCELED":
            return "Cancelada"
        default:
            return status
    }
}

function isActionPlanOverdue(actionPlan: {
    status: string
    dueDate: Date | null
}) {
    if (!actionPlan.dueDate) return false

    if (
        actionPlan.status === "COMPLETED" ||
        actionPlan.status === "CANCELED"
    ) {
        return false
    }

    return actionPlan.dueDate < new Date()
}

function buildSupplierAnalytics(supplier: SupplierWithDetails) {
    const now = new Date()

    const risks = supplier.riskEvents || []

    const openRisks = risks.filter(
        (risk) => risk.workflowStatus === "OPEN"
    )

    const closedRisks = risks.filter(
        (risk) => risk.workflowStatus === "CLOSED"
    )

    const canceledRisks = risks.filter(
        (risk) => risk.workflowStatus === "CANCELED"
    )

    const redRisks = risks.filter(
        (risk) => risk.riskLevel === "RED"
    )

    const yellowRisks = risks.filter(
        (risk) => risk.riskLevel === "YELLOW"
    )

    const greenRisks = risks.filter(
        (risk) => risk.riskLevel === "GREEN"
    )

    const orangeRisks = risks.filter(
        (risk) => risk.riskLevel === "ORANGE"
    )

    const greyRisks = risks.filter(
        (risk) => risk.riskLevel === "GREY"
    )

    const blueRisks = risks.filter(
        (risk) => risk.riskLevel === "BLUE"
    )

    const openRedRisks = openRisks.filter(
        (risk) => risk.riskLevel === "RED"
    )

    const parts = risks.flatMap((risk) => risk.parts || [])

    const actionPlans = risks.flatMap(
        (risk) => risk.actionPlans || []
    )

    const logisticsRequests = risks.flatMap(
        (risk) => risk.logistics || []
    )

    const overdueActionPlans = actionPlans.filter(
        (actionPlan) => isActionPlanOverdue(actionPlan)
    )

    const openActionPlans = actionPlans.filter(
        (actionPlan) => actionPlan.status === "OPEN"
    )

    const inProgressActionPlans = actionPlans.filter(
        (actionPlan) =>
            actionPlan.status === "IN_PROGRESS"
    )

    const waitingValidationActionPlans = actionPlans.filter(
        (actionPlan) =>
            actionPlan.status === "WAITING_VALIDATION"
    )

    const completedActionPlans = actionPlans.filter(
        (actionPlan) =>
            actionPlan.status === "COMPLETED"
    )

    const canceledActionPlans = actionPlans.filter(
        (actionPlan) =>
            actionPlan.status === "CANCELED"
    )

    const pendingLogisticsRequests = logisticsRequests.filter(
        (request) => request.status === "PENDING"
    )

    const inReviewLogisticsRequests = logisticsRequests.filter(
        (request) => request.status === "IN_REVIEW"
    )

    const approvedLogisticsRequests = logisticsRequests.filter(
        (request) => request.status === "APPROVED"
    )

    const rejectedLogisticsRequests = logisticsRequests.filter(
        (request) => request.status === "REJECTED"
    )

    const canceledLogisticsRequests = logisticsRequests.filter(
        (request) => request.status === "CANCELED"
    )

    const openRiskAges = openRisks.map((risk) =>
        daysBetween(risk.createdAt, now)
    )

    const resolutionDays = closedRisks
        .filter((risk) => risk.closedAt)
        .map((risk) =>
            daysBetween(
                risk.createdAt,
                risk.closedAt as Date
            )
        )

    const risksWithoutParts = openRisks.filter(
        (risk) => risk.parts.length === 0
    )

    const risksWithoutActionPlan = openRisks.filter(
        (risk) => risk.actionPlans.length === 0
    )

    const redRisksWithoutActionPlan = openRedRisks.filter(
        (risk) => risk.actionPlans.length === 0
    )

    const logisticsPendingAges = pendingLogisticsRequests.map(
        (request) => daysBetween(request.requestedAt, now)
    )

    const logisticsReviewDays = logisticsRequests
        .filter(
            (request) =>
                request.requestedAt && request.reviewedAt
        )
        .map((request) =>
            daysBetween(
                request.requestedAt,
                request.reviewedAt as Date
            )
        )

    const insights: {
        type: "critical" | "warning" | "success" | "info"
        title: string
        description: string
    }[] = []

    if (openRedRisks.length > 0) {
        insights.push({
            type: "critical",
            title: "Fornecedor com risco crítico aberto",
            description: `${openRedRisks.length} RM(s) aberta(s) em vermelho exigem acompanhamento prioritário.`,
        })
    }

    if (overdueActionPlans.length > 0) {
        insights.push({
            type: "warning",
            title: "Planos de ação atrasados",
            description: `${overdueActionPlans.length} plano(s) de ação estão vencidos ou sem validação dentro do prazo.`,
        })
    }

    if (pendingLogisticsRequests.length > 0) {
        insights.push({
            type: "warning",
            title: "Pendências logísticas",
            description: `${pendingLogisticsRequests.length} solicitação(ões) logística(s) ainda estão pendentes.`,
        })
    }

    if (redRisksWithoutActionPlan.length > 0) {
        insights.push({
            type: "critical",
            title: "RM crítica sem plano de ação",
            description: `${redRisksWithoutActionPlan.length} RM(s) vermelha(s) não possuem plano de ação vinculado.`,
        })
    }

    if (risksWithoutParts.length > 0) {
        insights.push({
            type: "info",
            title: "RMs sem PN vinculado",
            description: `${risksWithoutParts.length} RM(s) aberta(s) ainda não possuem PN vinculado.`,
        })
    }

    if (
        openRisks.length === 0 &&
        overdueActionPlans.length === 0 &&
        pendingLogisticsRequests.length === 0
    ) {
        insights.push({
            type: "success",
            title: "Fornecedor sem pendências abertas",
            description:
                "Não há RMs abertas, planos atrasados ou pendências logísticas para este fornecedor.",
        })
    }

    return {
        summary: {
            totalRisks: risks.length,
            openRisks: openRisks.length,
            closedRisks: closedRisks.length,
            canceledRisks: canceledRisks.length,

            redRisks: redRisks.length,
            yellowRisks: yellowRisks.length,
            greenRisks: greenRisks.length,
            orangeRisks: orangeRisks.length,
            greyRisks: greyRisks.length,
            blueRisks: blueRisks.length,

            openRedRisks: openRedRisks.length,

            totalParts: parts.length,

            totalActionPlans: actionPlans.length,
            openActionPlans: openActionPlans.length,
            inProgressActionPlans: inProgressActionPlans.length,
            waitingValidationActionPlans:
                waitingValidationActionPlans.length,
            completedActionPlans: completedActionPlans.length,
            canceledActionPlans: canceledActionPlans.length,
            overdueActionPlans: overdueActionPlans.length,

            totalLogisticsRequests: logisticsRequests.length,
            pendingLogisticsRequests:
                pendingLogisticsRequests.length,
            inReviewLogisticsRequests:
                inReviewLogisticsRequests.length,
            approvedLogisticsRequests:
                approvedLogisticsRequests.length,
            rejectedLogisticsRequests:
                rejectedLogisticsRequests.length,
            canceledLogisticsRequests:
                canceledLogisticsRequests.length,

            risksWithoutParts: risksWithoutParts.length,
            risksWithoutActionPlan: risksWithoutActionPlan.length,
            redRisksWithoutActionPlan:
                redRisksWithoutActionPlan.length,

            oldestOpenRiskDays: maxOrNull(openRiskAges),
            avgOpenRiskAgeDays: average(openRiskAges),
            avgResolutionDays: average(resolutionDays),

            oldestPendingLogisticsDays:
                maxOrNull(logisticsPendingAges),
            avgLogisticsReviewDays:
                average(logisticsReviewDays),
        },

        charts: {
            risksByLevel: [
                {
                    name: "Vermelho",
                    value: "RED",
                    total: redRisks.length,
                },
                {
                    name: "Amarelo",
                    value: "YELLOW",
                    total: yellowRisks.length,
                },
                {
                    name: "Verde",
                    value: "GREEN",
                    total: greenRisks.length,
                },
                {
                    name: "Laranja",
                    value: "ORANGE",
                    total: orangeRisks.length,
                },
                {
                    name: "Cinza",
                    value: "GREY",
                    total: greyRisks.length,
                },
                {
                    name: "Azul",
                    value: "BLUE",
                    total: blueRisks.length,
                },
            ],

            risksByWorkflowStatus: [
                {
                    name: "Abertas",
                    value: "OPEN",
                    total: openRisks.length,
                },
                {
                    name: "Fechadas",
                    value: "CLOSED",
                    total: closedRisks.length,
                },
                {
                    name: "Canceladas",
                    value: "CANCELED",
                    total: canceledRisks.length,
                },
            ],

            partsByStatus: [
                {
                    name: "Vermelho",
                    value: "RED",
                    total: parts.filter(
                        (part) => part.status === "RED"
                    ).length,
                },
                {
                    name: "Amarelo",
                    value: "YELLOW",
                    total: parts.filter(
                        (part) => part.status === "YELLOW"
                    ).length,
                },
                {
                    name: "Verde",
                    value: "GREEN",
                    total: parts.filter(
                        (part) => part.status === "GREEN"
                    ).length,
                },
                {
                    name: "Laranja",
                    value: "ORANGE",
                    total: parts.filter(
                        (part) => part.status === "ORANGE"
                    ).length,
                },
                {
                    name: "Cinza",
                    value: "GREY",
                    total: parts.filter(
                        (part) => part.status === "GREY"
                    ).length,
                },
                {
                    name: "Azul",
                    value: "BLUE",
                    total: parts.filter(
                        (part) => part.status === "BLUE"
                    ).length,
                },
            ],

            actionPlansByStatus: [
                {
                    name: "Abertos",
                    value: "OPEN",
                    total: openActionPlans.length,
                },
                {
                    name: "Em andamento",
                    value: "IN_PROGRESS",
                    total: inProgressActionPlans.length,
                },
                {
                    name: "Aguardando validação",
                    value: "WAITING_VALIDATION",
                    total: waitingValidationActionPlans.length,
                },
                {
                    name: "Concluídos",
                    value: "COMPLETED",
                    total: completedActionPlans.length,
                },
                {
                    name: "Cancelados",
                    value: "CANCELED",
                    total: canceledActionPlans.length,
                },
                {
                    name: "Atrasados",
                    value: "OVERDUE",
                    total: overdueActionPlans.length,
                },
            ],

            logisticsByStatus: [
                {
                    name: "Pendentes",
                    value: "PENDING",
                    total: pendingLogisticsRequests.length,
                },
                {
                    name: "Em análise",
                    value: "IN_REVIEW",
                    total: inReviewLogisticsRequests.length,
                },
                {
                    name: "Aprovadas",
                    value: "APPROVED",
                    total: approvedLogisticsRequests.length,
                },
                {
                    name: "Rejeitadas",
                    value: "REJECTED",
                    total: rejectedLogisticsRequests.length,
                },
                {
                    name: "Canceladas",
                    value: "CANCELED",
                    total: canceledLogisticsRequests.length,
                },
            ],
        },

        insights,
    }
}

export async function GET(
    _req: Request,
    { params }: Params
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
                "SUPPLIER_VIEW",
                "RISK_VIEW",
                "USER_MANAGE",
            ])
        ) {
            return NextResponse.json(
                {
                    error:
                        "Sem permissão para visualizar fornecedores",
                },
                { status: 403 }
            )
        }

        const { id } = await params

        const supplier = await prisma.supplier.findUnique({
            where: {
                id,
            },
            include: supplierInclude,
        })

        if (!supplier) {
            return NextResponse.json(
                { error: "Fornecedor não encontrado" },
                { status: 404 }
            )
        }

        const analytics = buildSupplierAnalytics(supplier)

        return NextResponse.json({
            id: supplier.id,
            name: supplier.name,
            supplierCodeSap: supplier.supplierCodeSap,
            status: supplier.status,
            statusLabel: formatSupplierStatusLabel(supplier.status),
            address: supplier.address,
            countryId: supplier.countryId,
            riskScore: supplier.riskScore,
            lastRiskCalculation: supplier.lastRiskCalculation,
            createdAt: supplier.createdAt,

            country: supplier.country
                ? {
                      id: supplier.country.id,
                      name: supplier.country.name,
                      isoCode: supplier.country.isoCode,
                  }
                : null,

            contacts: supplier.contacts.map((contact) => ({
                id: contact.id,
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
                position: contact.position,
                createdAt: contact.createdAt,
            })),

            analytics,

            riskEvents: supplier.riskEvents.map((risk) => ({
                id: risk.id,
                code: risk.code,
                sequenceNumber: risk.sequenceNumber,
                codePrefix: risk.codePrefix,

                title: risk.title || risk.code,
                description: risk.description,
                openingReason: risk.openingReason,

                commodity: risk.commodity,
                functionalGroup: risk.functionalGroup,

                workflowStatus: risk.workflowStatus,
                workflowStatusLabel:
                    formatWorkflowStatusLabel(risk.workflowStatus),

                riskLevel: risk.riskLevel,
                riskLevelLabel:
                    formatRiskLevelLabel(risk.riskLevel),

                createdWeek: risk.createdWeek,
                createdYear: risk.createdYear,

                createdAt: risk.createdAt,
                updatedAt: risk.updatedAt,
                closedAt: risk.closedAt,

                createdBy: formatUser(risk.createdBy),
                assignedTo: formatUser(risk.assignedTo),
                closedBy: formatUser(risk.closedBy),

                status: {
                    id: risk.workflowStatus,
                    name: risk.workflowStatus,
                    label: formatWorkflowStatusLabel(
                        risk.workflowStatus
                    ),
                },

                parts: risk.parts.map((part) => ({
                    id: part.id,
                    status: part.status,
                    statusLabel: formatRiskLevelLabel(part.status),
                    logisticsStatus: part.logisticsStatus,
                    createdAt: part.createdAt,
                    updatedAt: part.updatedAt,

                    partNumber: part.partNumber
                        ? {
                              id: part.partNumber.id,
                              partNumber:
                                  part.partNumber.partNumber,
                              description:
                                  part.partNumber.description,
                              vehicleProgram:
                                  part.partNumber.vehicleProgram,
                          }
                        : null,

                    assignedTo: formatUser(part.assignedTo),
                })),

                actionPlans: risk.actionPlans.map((actionPlan) => {
                    const isCompleted =
                        actionPlan.status === "COMPLETED"

                    const isOverdue =
                        isActionPlanOverdue(actionPlan)

                    return {
                        id: actionPlan.id,

                        title: actionPlan.title,
                        description: actionPlan.description,
                        requiredAction:
                            actionPlan.requiredAction,

                        responsibleArea:
                            actionPlan.responsibleArea,

                        dueDate: actionPlan.dueDate,

                        priority: actionPlan.priority,
                        status: actionPlan.status,
                        statusLabel:
                            formatActionPlanStatusLabel(
                                actionPlan.status
                            ),

                        submittedAt: actionPlan.submittedAt,
                        validatedAt: actionPlan.validatedAt,

                        evidenceUrl: actionPlan.evidenceUrl,
                        closingNotes: actionPlan.closingNotes,

                        isCompleted,
                        completedAt: actionPlan.validatedAt,
                        isOverdue,

                        createdAt: actionPlan.createdAt,
                        updatedAt: actionPlan.updatedAt,

                        createdBy: formatUser(actionPlan.createdBy),
                        assignedTo: formatUser(actionPlan.assignedTo),
                        validatedBy: formatUser(actionPlan.validatedBy),

                        riskEventPart: actionPlan.riskEventPart
                            ? {
                                  id: actionPlan.riskEventPart.id,
                                  status:
                                      actionPlan.riskEventPart.status,
                                  statusLabel:
                                      formatRiskLevelLabel(
                                          actionPlan
                                              .riskEventPart
                                              .status
                                      ),
                                  partNumber:
                                      actionPlan.riskEventPart
                                          .partNumber
                                          ? {
                                                id: actionPlan
                                                    .riskEventPart
                                                    .partNumber.id,
                                                partNumber:
                                                    actionPlan
                                                        .riskEventPart
                                                        .partNumber
                                                        .partNumber,
                                                description:
                                                    actionPlan
                                                        .riskEventPart
                                                        .partNumber
                                                        .description,
                                                vehicleProgram:
                                                    actionPlan
                                                        .riskEventPart
                                                        .partNumber
                                                        .vehicleProgram,
                                            }
                                          : null,
                              }
                            : null,
                    }
                }),

                logistics: risk.logistics.map((request) => ({
                    id: request.id,
                    code: request.code,

                    type: request.type,
                    status: request.status,
                    statusLabel:
                        formatLogisticsStatusLabel(request.status),
                    priority: request.priority,

                    requestedAt: request.requestedAt,
                    acceptedAt: request.acceptedAt,
                    reviewedAt: request.reviewedAt,
                    canceledAt: request.canceledAt,

                    requestNotes: request.requestNotes,
                    responseNotes: request.responseNotes,
                    rejectionReason: request.rejectionReason,

                    requestedQuantity:
                        request.requestedQuantity,
                    calculatedQuantity:
                        request.calculatedQuantity,

                    coverageStartDate:
                        request.coverageStartDate,
                    coverageEndDate:
                        request.coverageEndDate,

                    cutoffDate: request.cutoffDate,
                    cutoffReference:
                        request.cutoffReference,

                    oldPartNumber:
                        request.oldPartNumber,
                    newPartNumber:
                        request.newPartNumber,
                    replacementReason:
                        request.replacementReason,

                    requestedBy: formatUser(request.requestedBy),
                    assignedTo: formatUser(request.assignedTo),
                    reviewedBy: formatUser(request.reviewedBy),

                    riskEventPart: request.riskEventPart
                        ? {
                              id: request.riskEventPart.id,
                              status:
                                  request.riskEventPart.status,
                              statusLabel:
                                  formatRiskLevelLabel(
                                      request.riskEventPart.status
                                  ),
                              partNumber:
                                  request.riskEventPart.partNumber
                                      ? {
                                            id: request.riskEventPart
                                                .partNumber.id,
                                            partNumber:
                                                request.riskEventPart
                                                    .partNumber
                                                    .partNumber,
                                            description:
                                                request.riskEventPart
                                                    .partNumber
                                                    .description,
                                            vehicleProgram:
                                                request.riskEventPart
                                                    .partNumber
                                                    .vehicleProgram,
                                        }
                                      : null,
                          }
                        : null,
                })),
            })),
        })
    } catch (error) {
        console.error(error)

        return NextResponse.json(
            { error: "Erro ao buscar fornecedor" },
            { status: 500 }
        )
    }
}