const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
    buildPortfolioEvidence,
} = require("../src/lib/portfolio-ai.ts")

const now = new Date("2026-10-01T00:00:00Z")

const row = (index, extra = {}) => ({
    id: String(index),
    code: `RM-${index}`,
    supplierId: `supplier-${index % 12}`,
    riskLevel: "GREEN",
    assignedToId: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),

    _count: {
        parts: 2,
        actionPlans: 1,
        logistics: 1,
    },

    ...extra,
})

test(
    "inclui todas as RMs e fornecedores sem os limites anteriores",
    () => {
        const evidence = buildPortfolioEvidence(
            Array.from(
                { length: 45 },
                (_, index) => row(index)
            ),
            "all",
            now
        )

        const totals = evidence.find(
            (item) => item.id === "portfolio"
        ).value

        assert.equal(totals.totalOpenRisks, 45)
        assert.equal(totals.overduePlans, 45)
        assert.equal(totals.pendingLogistics, 45)
        assert.equal(totals.partAssociations, 90)
        assert.equal(totals.suppliers, 12)

        const riskEvidence = evidence.filter(
            (item) => /^rm-/.test(item.id)
        )

        assert.equal(riskEvidence.length, 45)

        assert.equal(
            new Set(
                riskEvidence.map((item) => item.href)
            ).size,
            45
        )

        for (let index = 0; index < 45; index++) {
            assert.ok(
                riskEvidence.some(
                    (item) =>
                        item.href === `/rms/${index}`
                ),
                `A RM ${index} deve estar nas evidências`
            )
        }

        const supplierEvidence = evidence.filter(
            (item) => /^supplier-\d+$/.test(item.id)
        )

        assert.equal(supplierEvidence.length, 12)

        const coverage = evidence.find(
            (item) => item.id === "supplier-coverage"
        ).value

        assert.equal(coverage.total, 12)
        assert.equal(coverage.detailed, 12)
        assert.equal(coverage.limit, null)

        const scope = evidence.find(
            (item) => item.id === "scope"
        ).value

        assert.equal(scope.totalOpenRisks, 45)
        assert.equal(scope.detailedRisks, 45)
        assert.equal(scope.detailLimit, null)
        assert.equal(scope.allRisksIncludedInTotals, true)
        assert.equal(scope.allRisksIncludedInDetails, true)
    }
)

test(
    "prioriza Red e planos atrasados sem modificar os registros originais",
    () => {
        const rows = [
            row(1),
            row(2, {
                riskLevel: "RED",
            }),
            row(3, {
                riskLevel: "RED",

                _count: {
                    parts: 0,
                    actionPlans: 4,
                    logistics: 0,
                },
            }),
        ]

        const evidence = buildPortfolioEvidence(
            rows,
            "all",
            now
        )

        assert.equal(
            evidence.find(
                (item) => item.id === "rm-1"
            ).label,
            "RM-3"
        )

        assert.equal(rows[0].id, "1")
        assert.equal(rows[1].id, "2")
        assert.equal(rows[2].id, "3")

        const reversedEvidence = buildPortfolioEvidence(
            [...rows].reverse(),
            "all",
            now
        )

        assert.equal(
            reversedEvidence.find(
                (item) => item.id === "rm-1"
            ).label,
            "RM-3"
        )
    }
)

test(
    "trata carteira vazia e identifica o escopo sem inventar histórico",
    () => {
        const evidence = buildPortfolioEvidence(
            [],
            "mine",
            now
        )

        const totals = evidence.find(
            (item) => item.id === "portfolio"
        ).value

        assert.equal(totals.totalOpenRisks, 0)
        assert.equal(totals.suppliers, 0)
        assert.equal(totals.overduePlans, 0)
        assert.equal(totals.pendingLogistics, 0)
        assert.equal(totals.oldestOpenRiskDays, null)

        const scope = evidence.find(
            (item) => item.id === "scope"
        ).value

        assert.equal(scope.historicalData, false)
        assert.equal(scope.detailedRisks, 0)
        assert.match(scope.scope, /atribuídas/)

        assert.equal(
            evidence.filter(
                (item) => /^rm-/.test(item.id)
            ).length,
            0
        )
    }
)

test(
    "não envia identificadores internos ou códigos de exibição ao modelo",
    () => {
        const evidence = buildPortfolioEvidence(
            [
                row(1, {
                    id: "PRIVATE-RISK-ID",
                    supplierId: "PRIVATE-SUPPLIER-ID",
                    code: "PRIVATE-CODE",
                    assignedToId: "PRIVATE-USER",
                }),
            ],
            "all",
            now
        )

        // Mesmo formato enviado à OpenAI.
        // Os links e rótulos ficam no SRMS.
        const input = JSON.stringify(
            evidence.map(({ id, value }) => ({
                id,
                value,
            }))
        )

        assert.equal(
            input.includes("PRIVATE"),
            false
        )

        const riskEvidence = evidence.find(
            (item) => item.id === "rm-1"
        )

        assert.equal(
            riskEvidence.href,
            "/rms/PRIVATE-RISK-ID"
        )

        assert.equal(
            riskEvidence.label,
            "PRIVATE-CODE"
        )
    }
)