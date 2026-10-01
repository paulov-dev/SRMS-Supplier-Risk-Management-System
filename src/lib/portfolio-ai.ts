import type { Evidence } from "./supplier-ai"

export type PortfolioRisk = {
    id: string
    code: string
    supplierId: string
    riskLevel: string
    assignedToId: string | null
    createdAt: Date

    _count: {
        parts: number
        actionPlans: number
        logistics: number
    }
}

type SupplierTotals = {
    risks: number
    red: number
    overduePlans: number
    pendingLogistics: number
}

export function buildPortfolioEvidence(
    rows: PortfolioRisk[],
    scope: "all" | "mine",
    now = new Date()
): Evidence[] {
    const age = (row: PortfolioRisk) =>
        Math.max(
            0,
            Math.floor(
                (
                    now.getTime() -
                    row.createdAt.getTime()
                ) / 86400000
            )
        )

    const suppliers = new Map<string, SupplierTotals>()
    const levels: Record<string, number> = {}

    for (const row of rows) {
        levels[row.riskLevel] =
            (levels[row.riskLevel] ?? 0) + 1

        const supplierTotals =
            suppliers.get(row.supplierId) ?? {
                risks: 0,
                red: 0,
                overduePlans: 0,
                pendingLogistics: 0,
            }

        supplierTotals.risks++

        if (row.riskLevel === "RED") {
            supplierTotals.red++
        }

        supplierTotals.overduePlans +=
            row._count.actionPlans

        supplierTotals.pendingLogistics +=
            row._count.logistics

        suppliers.set(
            row.supplierId,
            supplierTotals
        )
    }

    // Ordena todas as RMs, sem limitar a quantidade.
    const orderedRisks = [...rows].sort(
        (a, b) =>
            Number(b.riskLevel === "RED") -
                Number(a.riskLevel === "RED") ||
            b._count.actionPlans -
                a._count.actionPlans ||
            b._count.logistics -
                a._count.logistics ||
            a.createdAt.getTime() -
                b.createdAt.getTime() ||
            a.id.localeCompare(b.id)
    )

    const evidence: Evidence[] = [
        {
            id: "scope",
            label: "Escopo da análise",

            value: {
                scope:
                    scope === "all"
                        ? "Todas as RMs abertas da carteira autorizada"
                        : "RMs abertas atribuídas ao usuário autenticado",

                totalOpenRisks: rows.length,
                detailedRisks: orderedRisks.length,

                detailLimit: null,
                allRisksIncludedInTotals: true,
                allRisksIncludedInDetails: true,

                historicalData: false,
                filtersFromListApplied: false,

                order:
                    "Red, planos atrasados, logística pendente, antiguidade",
            },
        },
        {
            id: "portfolio",
            label:
                "Indicadores de todas as RMs abertas do escopo",

            value: {
                totalOpenRisks: rows.length,
                riskLevels: levels,
                suppliers: suppliers.size,

                overduePlans: rows.reduce(
                    (sum, row) =>
                        sum + row._count.actionPlans,
                    0
                ),

                pendingLogistics: rows.reduce(
                    (sum, row) =>
                        sum + row._count.logistics,
                    0
                ),

                partAssociations: rows.reduce(
                    (sum, row) =>
                        sum + row._count.parts,
                    0
                ),

                unassignedRisks: rows.filter(
                    (row) => !row.assignedToId
                ).length,

                oldestOpenRiskDays:
                    rows.length > 0
                        ? rows.reduce(
                              (maximum, row) =>
                                  Math.max(
                                      maximum,
                                      age(row)
                                  ),
                              0
                          )
                        : null,
            },
        },
    ]

    // Ordena todos os fornecedores, sem limitar a quantidade.
    const orderedSuppliers = [...suppliers.entries()]
        .sort(
            (a, b) =>
                b[1].red - a[1].red ||
                b[1].overduePlans -
                    a[1].overduePlans ||
                a[0].localeCompare(b[0])
        )

    // Referências anônimas usadas para relacionar RMs e fornecedores.
    const supplierReferences = new Map<string, string>()

    for (
        const [index, [supplierId, totals]]
        of orderedSuppliers.entries()
    ) {
        const reference = `supplier-${index + 1}`

        supplierReferences.set(
            supplierId,
            reference
        )

        evidence.push({
            id: reference,
            label: `Fornecedor ${index + 1}`,
            href:
                `/suppliers/${encodeURIComponent(supplierId)}`,
            value: totals,
        })
    }

    evidence.push({
        id: "supplier-coverage",
        label: "Cobertura por fornecedor",

        value: {
            total: suppliers.size,
            detailed: suppliers.size,
            limit: null,
        },
    })

    // Adiciona uma evidência individual para CADA RM aberta.
    for (const [index, row] of orderedRisks.entries()) {
        evidence.push({
            id: `rm-${index + 1}`,
            label: row.code,
            href: `/rms/${encodeURIComponent(row.id)}`,

            value: {
                supplierGroup:
                    supplierReferences.get(
                        row.supplierId
                    ),

                level: row.riskLevel,
                ageDays: age(row),
                assigned: Boolean(row.assignedToId),

                partAssociations:
                    row._count.parts,

                overduePlans:
                    row._count.actionPlans,

                pendingLogistics:
                    row._count.logistics,
            },
        })
    }

    return evidence
}