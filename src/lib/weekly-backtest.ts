import {
    buildWeeklyForecast,
    FORECAST_METRICS,
    type ForecastSnapshot,
    type ForecastWeek,
} from "./weekly-forecast"

export type BacktestMetricKey =
    (typeof FORECAST_METRICS)[number]["key"]

export type BacktestRow = {
    target: ForecastWeek
    base: ForecastWeek
    projected: number
    actual: number
    baseline: number
    error: number
    baselineError: number
}

function weekKey(value: ForecastWeek) {
    return `${value.year}-${value.week}`
}

export function buildWeeklyBacktest(
    snapshots: ForecastSnapshot[],
    cutoff?: ForecastWeek
) {
    const rows: Record<
        BacktestMetricKey,
        BacktestRow[]
    > = {
        openRisks: [],
        redRisks: [],
        overdueActionPlans: [],
        pendingLogisticsRequests: [],
    }

    // Apenas resultados disponíveis até a semana selecionada.
    const eligible = cutoff
        ? snapshots.filter(
              (snapshot) =>
                  snapshot.year < cutoff.year ||
                  (
                      snapshot.year === cutoff.year &&
                      snapshot.week <= cutoff.week
                  )
          )
        : []

    const byWeek =
        new Map<string, ForecastSnapshot[]>()

    for (const snapshot of eligible) {
        const key = weekKey(snapshot)

        byWeek.set(key, [
            ...(byWeek.get(key) || []),
            snapshot,
        ])
    }

    for (const group of byWeek.values()) {
        if (group.length !== 1) continue

        const base = group[0]

        // A projeção usa somente as quatro CWs até esta base.
        // O resultado da CW seguinte não entra no cálculo.
        const forecast = buildWeeklyForecast(
            eligible,
            base
        )

        if (!forecast.available) continue

        const hasDuplicateWeek =
            forecast.weeks.some(
                (week) =>
                    byWeek.get(weekKey(week))?.length !== 1
            )

        if (hasDuplicateWeek) continue

        const targets = byWeek.get(
            weekKey(forecast.target)
        )

        // É necessário um único resultado real para conferir.
        if (!targets || targets.length !== 1) continue

        const target = targets[0]

        for (const metric of forecast.metrics) {
            const actual = target[metric.key]

            if (
                !metric.result ||
                !Number.isSafeInteger(actual) ||
                actual < 0
            ) {
                continue
            }

            const {
                projected,
                current: baseline,
            } = metric.result

            rows[metric.key].push({
                target: forecast.target,
                base: {
                    year: base.year,
                    week: base.week,
                },
                projected,
                actual,

                // Referência: repetir o valor da CW anterior.
                baseline,

                error: Math.abs(projected - actual),
                baselineError: Math.abs(
                    baseline - actual
                ),
            })
        }
    }

    return FORECAST_METRICS.map((metric) => {
        const observations = rows[metric.key].sort(
            (a, b) =>
                b.target.year - a.target.year ||
                b.target.week - a.target.week
        )

        const count = observations.length

        const totalError = observations.reduce(
            (sum, row) => sum + row.error,
            0
        )

        const totalBaselineError = observations.reduce(
            (sum, row) => sum + row.baselineError,
            0
        )

        const winner =
            count === 0
                ? null
                : totalError === totalBaselineError
                    ? "tie"
                    : totalError < totalBaselineError
                        ? "trend"
                        : "baseline"

        return {
            ...metric,
            count,
            meanError:
                count ? totalError / count : null,
            baselineMeanError:
                count
                    ? totalBaselineError / count
                    : null,
            winner,
            rows: observations,
        }
    })
}