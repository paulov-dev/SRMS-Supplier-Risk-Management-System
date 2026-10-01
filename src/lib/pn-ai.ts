import type { Evidence } from "./supplier-ai"

export const assessmentFields = [
    "isPartCanceled",
    "hasDemand",
    "sourceNamed",
    "actionPlanReceived",
    "scheduleMeetsDevelopment",
    "technicalCommercialOk",
    "productionRiskMitigated",
    "eopManagementOk",
    "deviationPfpFinished",
    "onlyVdaPending",
    "vdaApproved",
    "modificationImplemented",
] as const

type Assessment = Record<
    (typeof assessmentFields)[number],
    boolean | null
>

export type PNForAI = {
    id: string
    partNumber: string
    description: string | null
    vehicleProgram: string | null

    _count: {
        vehicleApplications: number
    }

    riskParts: {
        status: string
        logisticsStatus: string
        assignedToId: string | null

        riskEvent: {
            id: string
            workflowStatus: string
            assignedToId?: string | null
        }

        assessment: Assessment | null

        actionPlans: {
            status: string
            priority: string
            dueDate: Date | null
            assignedToId: string | null
        }[]

        logisticsRequests: {
            status: string
            priority: string
        }[]
    }[]
}

type PNAnalysisContext = {
    scope: "all" | "mine"
    userId?: string
}

export function buildPNEvidence(
    parts: PNForAI[],
    now = new Date(),
    context: PNAnalysisContext = { scope: "all" }
): Evidence[] {
    if (context.scope === "mine" && !context.userId) {
        throw new Error(
            "User required for personal PN scope"
        )
    }

    const belongsToUser = (
        link: PNForAI["riskParts"][number]
    ) =>
        Boolean(context.userId) &&
        (
            link.assignedToId === context.userId ||
            link.riskEvent.assignedToId === context.userId
        )

    const selected =
        context.scope === "mine"
            ? parts.filter((part) =>
                  part.riskParts.some(belongsToUser)
              )
            : parts

    const ordered = [...selected].sort(
        (a, b) => a.id.localeCompare(b.id)
    )

    const rms = new Map<string, string>()
    const byWorkflow: Record<string, Set<string>> = {}

    for (const part of ordered) {
        for (const link of part.riskParts) {
            if (!rms.has(link.riskEvent.id)) {
                rms.set(
                    link.riskEvent.id,
                    `rm-${rms.size + 1}`
                )
            }

            const status =
                link.riskEvent.workflowStatus

            byWorkflow[status] ??= new Set()
            byWorkflow[status].add(link.riskEvent.id)
        }
    }

    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const overdue = (
        plan: PNForAI["riskParts"][number]["actionPlans"][number]
    ) => {
        if (
            !plan.dueDate ||
            ["COMPLETED", "CANCELED"].includes(plan.status)
        ) {
            return false
        }

        const due = new Date(plan.dueDate)
        due.setHours(0, 0, 0, 0)

        return due < today
    }

    const evidence: Evidence[] = [
        {
            id: "scope",
            label: "Cobertura dos PNs no escopo selecionado",

            value: {
                scope:
                    context.scope === "all"
                        ? "Todos os PNs cadastrados, com ou sem RM. Inclui vínculos de RMs abertas, encerradas e canceladas."
                        : "PNs com alguma RM atribuída ao usuário autenticado OU algum vínculo PN–RM atribuído a ele. Inclui todos os estados de RM e todos os vínculos dos PNs selecionados, inclusive de outros responsáveis. Não atribua todos os vínculos ao usuário.",

                selectedScope: context.scope,
                totalPNs: ordered.length,
                detailedPNs: ordered.length,
                limit: null,

                pnsWithoutRM: ordered.filter(
                    (part) => !part.riskParts.length
                ).length,

                riskLinks: ordered.reduce(
                    (sum, part) =>
                        sum + part.riskParts.length,
                    0
                ),

                uniqueRMs: rms.size,

                uniqueRMsByWorkflow:
                    Object.fromEntries(
                        Object.entries(byWorkflow).map(
                            ([status, ids]) => [
                                status,
                                ids.size,
                            ]
                        )
                    ),

                pnsWithRedInOpenRM: ordered.filter(
                    (part) =>
                        part.riskParts.some(
                            (link) =>
                                link.riskEvent.workflowStatus ===
                                    "OPEN" &&
                                link.status === "RED"
                        )
                ).length,

                noRMIsNormal: true,
                noRMDoesNotMeanGreen: true,

                coverage:
                    "Todos os PNs e vínculos do escopo selecionado. Planos e logística somente quando associados diretamente ao vínculo PN–RM. Não inclui buffers, comentários nem histórico de alterações.",
            },
        },
    ]

    ordered.forEach((part, index) => {
        evidence.push({
            id: `pn-${index + 1}`,
            label: part.partNumber,
            href: `/pns/${encodeURIComponent(part.id)}`,

            value: {
                hasDescription: Boolean(
                    part.description?.trim()
                ),

                vehicleProgram: part.vehicleProgram,

                activeVehicleApplications:
                    part._count.vehicleApplications,

                rmRelationship:
                    part.riskParts.length > 0
                        ? "LINKED"
                        : "NO_RM_NORMAL",

                riskLinks: part.riskParts.map(
                    (link) => ({
                        rmReference:
                            rms.get(link.riskEvent.id),

                        workflowStatus:
                            link.riskEvent.workflowStatus,

                        matchesUserResponsibility:
                            belongsToUser(link),

                        pnStatus: link.status,

                        logisticsStatus:
                            link.logisticsStatus,

                        hasAssignedPerson: Boolean(
                            link.assignedToId
                        ),

                        assessment: link.assessment
                            ? Object.fromEntries(
                                  assessmentFields.map(
                                      (field) => [
                                          field,
                                          link.assessment![field],
                                      ]
                                  )
                              )
                            : null,

                        actionPlans:
                            link.actionPlans.map(
                                (plan) => ({
                                    status: plan.status,
                                    priority: plan.priority,

                                    dueDate:
                                        plan.dueDate
                                            ?.toISOString() ??
                                        null,

                                    overdue: overdue(plan),

                                    hasAssignedPerson:
                                        Boolean(
                                            plan.assignedToId
                                        ),
                                })
                            ),

                        logisticsRequests:
                            link.logisticsRequests.map(
                                (item) => ({
                                    status: item.status,
                                    priority: item.priority,
                                })
                            ),
                    })
                ),
            },
        })
    })

    return evidence
}