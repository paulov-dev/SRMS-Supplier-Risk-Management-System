const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
    buildWeeklyIntelligence,
} = require("../src/lib/weekly-intelligence.ts")

const snapshot = (date, red) => ({
    year: 2026,
    week: 1,
    weekStartDate: date,
    openRisks: 12,
    redRisks: red,
    redParts: 0,
    overdueActionPlans: 0,
    pendingLogisticsRequests: 0,
    risksWorsenedThisWeek: 3,
    risksImprovedThisWeek: 1,
})

const a = snapshot("2025-12-22T00:00:00Z", 2)
const b = snapshot("2025-12-29T00:00:00Z", 4)
const c = snapshot("2026-01-05T00:00:00Z", 9)

test(
    "acceleration spans year boundary and ignores future snapshots",
    () => {
        const result = buildWeeklyIntelligence(
            [
                c,
                snapshot("2026-01-12T00:00:00Z", 99),
                a,
                b,
            ],
            c
        )

        assert.equal(result.acceleration, 3)
        assert.equal(result.deterioration, 2)
        assert.equal(result.signals[0].delta, 5)
    }
)

test(
    "missing and duplicated weeks never become zero or bridge gaps",
    () => {
        assert.equal(
            buildWeeklyIntelligence([a, c], c).acceleration,
            null
        )

        assert.equal(
            buildWeeklyIntelligence([a, c], c)
                .signals[0].delta,
            null
        )

        assert.equal(
            buildWeeklyIntelligence(
                [a, b, b, c],
                c
            ).acceleration,
            null
        )
    }
)

test(
    "invalid counters do not produce acceleration or alerts",
    () => {
        const bad = {
            ...c,
            redRisks: NaN,
        }

        const result = buildWeeklyIntelligence(
            [a, b, bad],
            bad
        )

        assert.equal(result.acceleration, null)
        assert.equal(result.signals[0].value, null)
        assert.equal(result.topSignals.length, 0)
    }
)

test(
    "flat and improving trends preserve zero and negative values",
    () => {
        assert.equal(
            buildWeeklyIntelligence(
                [a, b],
                {
                    ...c,
                    redRisks: 6,
                }
            ).acceleration,
            0
        )

        assert.equal(
            buildWeeklyIntelligence(
                [a, b],
                {
                    ...c,
                    redRisks: 3,
                }
            ).acceleration,
            -3
        )

        assert.equal(
            buildWeeklyIntelligence([], undefined),
            null
        )
    }
)