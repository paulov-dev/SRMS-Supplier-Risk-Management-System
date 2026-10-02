export const levels = [
    "RED",
    "ORANGE",
    "YELLOW",
    "GREEN",
    "BLUE",
    "GREY",
] as const

export type Level = typeof levels[number]

export const colors: Record<Level, string> = {
    RED: "#ef4444",
    ORANGE: "#f97316",
    YELLOW: "#eab308",
    GREEN: "#22c55e",
    BLUE: "#3b82f6",
    GREY: "#94a3b8",
}

export function isoWeek(date: Date) {
    const d = new Date(
        Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate()
        )
    )

    d.setUTCDate(
        d.getUTCDate() + 4 - (d.getUTCDay() || 7)
    )

    const year = d.getUTCFullYear()

    return {
        year,
        week: Math.ceil(
            (
                (d.getTime() - Date.UTC(year, 0, 1)) /
                86400000 +
                1
            ) / 7
        ),
    }
}

export function weekWindow(now = new Date()) {
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(now)

    date.setUTCDate(
      date.getUTCDate() - (7 - index) * 7
    )

    const value = isoWeek(date)

    return {
      ...value,
      label: `${value.year}/CW${String(value.week).padStart(2, "0")}`,
    }
  })
}

type Snapshot = {
    year: number
    week: number
    totalRisks: number
    openRisks: number
    snapshotDate: Date
}

type State = {
    year: number
    week: number
    riskEventId: string
    workflowStatus: string
    riskLevel: string
    assignedToId: string | null
    snapshotDate: Date
}

export function weeklyEvolution(
    snapshots: Snapshot[],
    states: State[],
    scope: "mine" | "all",
    userId: string,
    now = new Date()
) {
    return weekWindow(now).map(period => {
        const matches = snapshots.filter(
            item =>
                item.year === period.year &&
                item.week === period.week &&
                item.snapshotDate <= now
        )

        const snapshot =
            matches.length === 1
                ? matches[0]
                : undefined

        const rows = states.filter(
            item =>
                item.year === period.year &&
                item.week === period.week &&
                item.snapshotDate <= now
        )

        const complete = Boolean(
            snapshot &&
            Number.isInteger(snapshot.totalRisks) &&
            snapshot.totalRisks >= 0 &&
            rows.length === snapshot.totalRisks &&
            new Set(rows.map(item => item.riskEventId))
                .size === rows.length &&
            rows.every(
                item =>
                    item.snapshotDate.getTime() ===
                    snapshot.snapshotDate.getTime() &&
                    levels.includes(item.riskLevel as Level)
            ) &&
            rows.filter(
                item => item.workflowStatus === "OPEN"
            ).length === snapshot.openRisks
        )

        const open = complete
            ? rows.filter(
                item =>
                    item.workflowStatus === "OPEN" &&
                    (
                        scope === "all" ||
                        item.assignedToId === userId
                    )
            )
            : []

        return {
            ...period,
            available: complete,
            total: complete ? open.length : null,

            ...Object.fromEntries(
                levels.map(level => [
                    level,
                    complete
                        ? open.filter(
                            item => item.riskLevel === level
                        ).length
                        : null,
                ])
            ) as Record<Level, number | null>,
        }
    })
}

export type DashboardItem = {
    id: string
    label: string
    detail: string
    href: string
    level?: string
}

export type DashboardData = {
    scope: "mine" | "all"
    updatedAt: string

    lists: {
        open: DashboardItem[]
        red: DashboardItem[]
        parts: DashboardItem[]
        overdue: DashboardItem[]
    }

    distribution: Record<Level, number>

    priorities: {
        id: string
        code: string
        supplier: string
        level: string
        owner: string
        reason: string
    }[]

    weeks: ReturnType<typeof weeklyEvolution>
}