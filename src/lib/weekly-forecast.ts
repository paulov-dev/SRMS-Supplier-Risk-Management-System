export const FORECAST_METRICS = [
    { key: "openRisks", label: "RMs abertas" },
    { key: "redRisks", label: "RMs Red" },
    { key: "overdueActionPlans", label: "Planos atrasados" },
    {
        key: "pendingLogisticsRequests",
        label: "Logística pendente",
    },
] as const

type MetricKey =
    (typeof FORECAST_METRICS)[number]["key"]

export type ForecastWeek = {
    week: number
    year: number
}

export type ForecastSnapshot =
    ForecastWeek & Record<MetricKey, number>

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function firstMonday(year: number) {
    const january4 = new Date(Date.UTC(year, 0, 4))

    return (
        january4.getTime() -
        ((january4.getUTCDay() + 6) % 7) * 86400000
    )
}

function weekStart(value: ForecastWeek) {
    if (
        !Number.isInteger(value.year) ||
        value.year < 1900 ||
        value.year > 9998 ||
        !Number.isInteger(value.week) ||
        value.week < 1 ||
        value.week > 53
    ) {
        return null
    }

    const start =
        firstMonday(value.year) +
        (value.week - 1) * WEEK_MS

    return start < firstMonday(value.year + 1)
        ? start
        : null
}

export function forecastWeekLabel(value: ForecastWeek) {
    return `CW${String(value.week).padStart(2, "0")} / ${value.year}`
}

export function projectWeeklyValues(values: number[]) {
    if (
        values.length !== 4 ||
        values.some(
            (value) =>
                !Number.isSafeInteger(value) ||
                value < 0
        )
    ) {
        return null
    }

    const mean =
        values.reduce((sum, value) => sum + value, 0) / 4

    // Ajuste linear nos pontos x = 0, 1, 2 e 3.
    const slope =
        values.reduce(
            (sum, value, index) =>
                sum + (index - 1.5) * (value - mean),
            0
        ) / 5

    // Projeção para o próximo ponto: x = 4.
    const projected = Math.max(
        0,
        Math.round(mean + slope * 2.5)
    )

    if (!Number.isSafeInteger(projected)) {
        return null
    }

    return {
        current: values[3],
        projected,
        delta: projected - values[3],

        consecutiveIncreases: values
            .slice(1)
            .every(
                (value, index) =>
                    value > values[index]
            ),
    }
}

export function buildWeeklyForecast(
    snapshots: ForecastSnapshot[],
    base?: ForecastWeek
) {
    if (!base) {
        return {
            available: false as const,
            reason:
                "Selecione uma semana base para analisar a tendência.",
        }
    }

    const baseStart = weekStart(base)

    if (baseStart === null) {
        return {
            available: false as const,
            reason:
                "A semana base não é uma CW válida.",
        }
    }

    const candidates = snapshots
        .map((snapshot) => ({
            snapshot,
            start: weekStart(snapshot),
        }))
        .filter(
            (
                item
            ): item is {
                snapshot: ForecastSnapshot
                start: number
            } =>
                item.start !== null &&
                item.start <= baseStart
        )
        .sort((a, b) => a.start - b.start)
        .slice(-4)

    if (candidates.length < 4) {
        return {
            available: false as const,
            reason:
                "São necessários quatro snapshots de CWs consecutivas até a semana base. Gere os próximos snapshots para habilitar a projeção.",
        }
    }

    const hasMissingOrDuplicateWeek = candidates.some(
        (item, index) =>
            item.start !==
            baseStart - (3 - index) * WEEK_MS
    )

    if (hasMissingOrDuplicateWeek) {
        return {
            available: false as const,
            reason:
                "Há uma CW ausente ou duplicada nas quatro semanas necessárias. A projeção fica indisponível; semanas ausentes não são estimadas.",
        }
    }

    const weeks = candidates.map(
        (item) => item.snapshot
    )

    const nextYear =
        baseStart + WEEK_MS >=
        firstMonday(base.year + 1)

    const target = {
        year: nextYear ? base.year + 1 : base.year,
        week: nextYear ? 1 : base.week + 1,
    }

    const metrics = FORECAST_METRICS.map(
        (metric) => ({
            ...metric,
            result: projectWeeklyValues(
                weeks.map(
                    (snapshot) => snapshot[metric.key]
                )
            ),
        })
    )

    return {
        available: true as const,
        weeks,
        target,
        metrics,
    }
}