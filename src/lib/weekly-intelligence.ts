export type IntelligenceSnapshot = {
    year: number
    week: number
    weekStartDate: string

    openRisks: number
    redRisks: number
    redParts: number

    overdueActionPlans: number
    pendingLogisticsRequests: number

    risksWorsenedThisWeek: number
    risksImprovedThisWeek: number
}

const rules = [
    {
        key: "redRisks",
        label: "RMs Red",
        action:
            "Revisar as RMs Red e confirmar responsáveis e prazos de contenção.",
    },
    {
        key: "redParts",
        label: "PNs Red",
        action:
            "Priorizar os PNs Red e verificar o impacto no abastecimento.",
    },
    {
        key: "overdueActionPlans",
        label: "Planos atrasados",
        action:
            "Cobrar atualização dos planos vencidos e revisar os prazos com os responsáveis.",
    },
    {
        key: "pendingLogisticsRequests",
        label: "Logística pendente",
        action:
            "Revisar a fila logística e priorizar as solicitações urgentes.",
    },
] as const

const valid = (value: number) =>
    Number.isSafeInteger(value) && value >= 0

const weekMs = 7 * 86400000

export function buildWeeklyIntelligence(
    history: IntelligenceSnapshot[],
    current?: IntelligenceSnapshot
) {
    if (!current) return null

    const start = Date.parse(current.weekStartDate)

    
    const at = (offset: number) => {
        const matches = history.filter(
            (snapshot) =>
                Date.parse(snapshot.weekStartDate) ===
                start - offset * weekMs
        )

        return matches.length === 1
            ? matches[0]
            : undefined
    }

    const previous = at(1)
    const earlier = at(2)

    const acceleration =
        previous &&
        earlier &&
        [
            current.redRisks,
            previous.redRisks,
            earlier.redRisks,
        ].every(valid)
            ? current.redRisks -
              2 * previous.redRisks +
              earlier.redRisks
            : null

    const signals = rules.map((rule) => ({
        ...rule,

        value: valid(current[rule.key])
            ? current[rule.key]
            : null,

        delta:
            previous &&
            valid(previous[rule.key]) &&
            valid(current[rule.key])
                ? current[rule.key] - previous[rule.key]
                : null,
    }))

    const deterioration =
        valid(current.risksWorsenedThisWeek) &&
        valid(current.risksImprovedThisWeek)
            ? current.risksWorsenedThisWeek -
              current.risksImprovedThisWeek
            : null

    const topSignals = [...signals]
        .filter(
            (signal) =>
                signal.value !== null &&
                signal.value > 0
        )
        .sort(
            (a, b) =>
                Number((b.delta ?? 0) > 0) -
                Number((a.delta ?? 0) > 0)
        )

    return {
        previous,
        acceleration,
        deterioration,
        signals,
        topSignals,
    }
}