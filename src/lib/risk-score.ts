export const RISK_SCORE_VERSION = "rm-v1"

type DateValue = Date | string | null

export type RiskScoreInput = {
    workflowStatus: string
    riskLevel: string
    assignedToId: string | null
    parts: {
        status: string
    }[]
    actionPlans: {
        status: string
        assignedToId: string | null
        dueDate: DateValue
    }[]
    logistics: {
        status: string
        priority: string
        cutoffDate: DateValue
    }[]
}

export type RiskScore = {
    version: string
    calculatedAt: string
    score: number | null
    band:
    | "LOW"
    | "ATTENTION"
    | "HIGH"
    | "CRITICAL"
    | "UNAVAILABLE"
    message: string
    factors: {
        label: string
        points: number
        max: number
        detail: string
    }[]
}

const colors: Record<string, number> = {
    GREEN: 0,
    YELLOW: 30,
    RED: 65,
    ORANGE: 0,
    GREY: 0,
    BLUE: 0,
}

const activePlans = [
    "OPEN",
    "IN_PROGRESS",
    "WAITING_VALIDATION",
]

const planStatuses = [
    ...activePlans,
    "COMPLETED",
    "CANCELED",
]

const logisticsStatuses = [
    "PENDING",
    "IN_REVIEW",
    "APPROVED",
    "REJECTED",
    "CANCELED",
]

const priorities: Record<string, number> = {
    LOW: 3,
    MEDIUM: 3,
    HIGH: 7,
    CRITICAL: 10,
}

const has = (object: object, key: string) =>
    Object.prototype.hasOwnProperty.call(object, key)

// Prazos são datas de calendário:
// preserva o YYYY-MM-DD armazenado no banco.
function dateKey(value: DateValue): string | null {
    if (value === null) return null

    const text =
        value instanceof Date
            ? Number.isFinite(value.getTime())
                ? value.toISOString()
                : ""
            : value

    if (typeof text !== "string") return null

    const key = text.slice(0, 10)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        return null
    }

    const parsed = new Date(`${key}T00:00:00Z`)

    return (
        Number.isFinite(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === key
    )
        ? key
        : null
}

function todayKey(now: Date): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now)

    const get = (type: string) =>
        parts.find(part => part.type === type)!.value

    return `${get("year")}-${get("month")}-${get("day")}`
}

export function calculateRiskScore(
    input: RiskScoreInput,
    now = new Date()
): RiskScore {
    if (!Number.isFinite(now.getTime())) {
        throw new Error("Data de cálculo inválida")
    }

    const base = {
        version: RISK_SCORE_VERSION,
        calculatedAt: now.toISOString(),
    }

    const unavailable = (message: string): RiskScore => ({
        ...base,
        score: null,
        band: "UNAVAILABLE",
        message,
        factors: [],
    })

    if (
        ["CLOSED", "CANCELED"].includes(input.workflowStatus)
    ) {
        return unavailable(
            "RM encerrada ou cancelada: score operacional não aplicável."
        )
    }

    if (
        input.workflowStatus !== "OPEN" ||
        !has(colors, input.riskLevel) ||
        !Array.isArray(input.parts) ||
        !Array.isArray(input.actionPlans) ||
        !Array.isArray(input.logistics) ||
        input.parts.some(part => !has(colors, part.status))
    ) {
        return unavailable(
            "Dados incompletos ou status desconhecido. Revise o cadastro."
        )
    }

    if (input.parts.length === 0) {
        return unavailable(
            "RM sem PNs: dados insuficientes para o score."
        )
    }

    if (
        input.actionPlans.some(
            plan => !planStatuses.includes(plan.status)
        ) ||
        input.logistics.some(
            request => !logisticsStatuses.includes(request.status)
        )
    ) {
        return unavailable(
            "Status de plano ou logística desconhecido. Revise o cadastro."
        )
    }

    const plans = input.actionPlans.filter(plan =>
        activePlans.includes(plan.status)
    )

    const pending = input.logistics.filter(request =>
        ["PENDING", "IN_REVIEW"].includes(request.status)
    )

    if (
        plans.some(
            plan =>
                plan.dueDate !== null &&
                dateKey(plan.dueDate) === null
        ) ||
        pending.some(
            request =>
                !has(priorities, request.priority) ||
                (
                    request.cutoffDate !== null &&
                    dateKey(request.cutoffDate) === null
                )
        )
    ) {
        return unavailable(
            "Prazo ou prioridade inválidos. Revise os dados antes de calcular."
        )
    }

    const severity = input.parts.reduce(
        (value, part) =>
            Math.max(value, colors[part.status]),
        colors[input.riskLevel]
    )

    const hasOperationalPart = input.parts.some(part =>
        ["RED", "YELLOW", "GREEN"].includes(part.status)
    )

    if (
        !hasOperationalPart &&
        !["RED", "YELLOW", "GREEN"].includes(input.riskLevel)
    ) {
        return unavailable(
            "RM e PNs sem situação operacional ativa: score não aplicável."
        )
    }

    const today = todayKey(now)

    const overdue = plans.filter(
        plan =>
            plan.status !== "WAITING_VALIDATION" &&
            plan.dueDate !== null &&
            dateKey(plan.dueDate)! < today
    )

    const oldestDays = overdue.reduce(
        (days, plan) =>
            Math.max(
                days,
                (
                    Date.parse(`${today}T00:00:00Z`) -
                    Date.parse(`${dateKey(plan.dueDate)}T00:00:00Z`)
                ) / 86400000
            ),
        0
    )

    const missingOwner = plans.filter(
        plan => !plan.assignedToId
    ).length

    const missingDue = plans.filter(
        plan => plan.dueDate === null
    ).length

    const overduePoints =
        oldestDays > 7 ? 15 : oldestDays > 0 ? 10 : 0

    const noPlan = severity > 0 && plans.length === 0

    const planPoints = noPlan
        ? 15
        : overduePoints +
        (missingOwner ? 5 : 0) +
        (missingDue ? 5 : 0)

    const cutoffOverdue = pending.filter(
        request =>
            request.cutoffDate !== null &&
            dateKey(request.cutoffDate)! < today
    ).length

    const logisticsPoints = pending.reduce(
        (value, request) =>
            Math.max(value, priorities[request.priority]),
        cutoffOverdue ? 10 : 0
    )

    const score =
        severity +
        planPoints +
        logisticsPoints

    return {
        ...base,
        score,
        band:
            score >= 80
                ? "CRITICAL"
                : score >= 60
                    ? "HIGH"
                    : score >= 30
                        ? "ATTENTION"
                        : "LOW",
        message:
            "Índice de priorização por regras; não representa probabilidade de falha.",
        factors: [
            {
                label: "Severidade",
                points: severity,
                max: 65,
                detail:
                    "Maior severidade entre RM e PNs: vermelho 65, amarelo 30, verde 0. Laranja, cinza e azul não acrescentam pontos.",
            },
            {
                label: "Planos de ação",
                points: planPoints,
                max: 25,
                detail: noPlan
                    ? "RM vermelha/amarela sem plano ativo: +15. Planos concluídos ou cancelados não cobrem a pendência atual."
                    : `${overdue.length} plano(s) atrasado(s), maior atraso ${oldestDays} dia(s): +${overduePoints}. Sem responsável: ${missingOwner} (+${missingOwner ? 5 : 0}). Sem prazo: ${missingDue} (+${missingDue ? 5 : 0}). Aguardando validação não conta como atraso.`,
            },
            {
                label: "Logística",
                points: logisticsPoints,
                max: 10,
                detail:
                    `${pending.length} solicitação(ões) pendente(s)/em análise; ${cutoffOverdue} com corte vencido. Usa o maior sinal: baixa/média 3, alta 7, crítica ou corte vencido 10.`,
            },
        ],
    }
}