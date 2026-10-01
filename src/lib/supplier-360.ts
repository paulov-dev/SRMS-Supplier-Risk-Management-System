export type SupplierWeek = {
    year: number
    week: number
    weekStartDate: string
    openRisks: number
    redRisks: number
}

type SupplierSnapshotRow = {
    year: number
    week: number
    weekStartDate: Date
    workflowStatus: string
    riskLevel: string
}

export function aggregateSupplierWeeks(
    rows: SupplierSnapshotRow[]
): SupplierWeek[] {
    const weeks = new Map<string, SupplierWeek>()

    for (const row of rows) {
        const key = `${row.year}-${row.week}`

        const item = weeks.get(key) ?? {
            year: row.year,
            week: row.week,
            weekStartDate: row.weekStartDate.toISOString(),
            openRisks: 0,
            redRisks: 0,
        }

        if (row.workflowStatus === "OPEN") {
            item.openRisks++

            if (row.riskLevel === "RED") {
                item.redRisks++
            }
        }

        weeks.set(key, item)
    }

    return [...weeks.values()].sort(
        (a, b) =>
            b.year - a.year ||
            b.week - a.week
    )
}

export function supplierWeekDelta(
    current: SupplierWeek,
    previous?: SupplierWeek
) {
    if (!previous) return null

    const interval =
        Date.parse(current.weekStartDate) -
        Date.parse(previous.weekStartDate)

    if (interval !== 7 * 86400000) {
        return null
    }

    return current.redRisks - previous.redRisks
}