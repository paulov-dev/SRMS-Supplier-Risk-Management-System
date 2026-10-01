const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
    aggregateSupplierWeeks,
    supplierWeekDelta,
} = require("../src/lib/supplier-360.ts")

const row = (date, week, state, level) => ({
    year: 2026,
    week,
    weekStartDate: new Date(date),
    workflowStatus: state,
    riskLevel: level,
})

test(
    "aggregates only open risks and keeps weeks with zero open risks",
    () => {
        const weeks = aggregateSupplierWeeks([
            row(
                "2026-01-05T00:00:00Z",
                2,
                "OPEN",
                "RED"
            ),
            row(
                "2026-01-05T00:00:00Z",
                2,
                "OPEN",
                "GREEN"
            ),
            row(
                "2026-01-05T00:00:00Z",
                2,
                "CLOSED",
                "RED"
            ),
            row(
                "2026-01-12T00:00:00Z",
                3,
                "CANCELED",
                "RED"
            ),
        ])

        assert.equal(weeks[0].openRisks, 0)
        assert.equal(weeks[1].openRisks, 2)
        assert.equal(weeks[1].redRisks, 1)

        assert.equal(
            supplierWeekDelta(weeks[0], weeks[1]),
            -1
        )
    }
)

test(
    "missing weeks and absent history do not imply zero",
    () => {
        const weeks = aggregateSupplierWeeks([
            row(
                "2026-01-05T00:00:00Z",
                2,
                "OPEN",
                "RED"
            ),
            row(
                "2026-01-19T00:00:00Z",
                4,
                "OPEN",
                "RED"
            ),
        ])

        assert.equal(
            supplierWeekDelta(weeks[0], weeks[1]),
            null
        )

        assert.equal(
            supplierWeekDelta(weeks[0]),
            null
        )

        assert.deepEqual(
            aggregateSupplierWeeks([]),
            []
        )
    }
)