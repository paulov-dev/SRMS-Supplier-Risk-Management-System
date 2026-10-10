import type { SupplierScore } from "./supplier-risk-score.ts"

export type PortfolioSupplier = {
  id: string
  name: string
  supplierCodeSap?: string | null
  status: string
  country?: {
    id: string
    name: string
  } | null
  contacts?: {
    id: string
  }[]
  riskScore?: number | null
  riskScoreSummary?: SupplierScore
}

export const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  UNDER_MONITORING: "Em monitoramento",
  AT_RISK: "Em risco",
  BLOCKED: "Bloqueado",
  INACTIVE: "Inativo",
}

export const bandLabels = {
  CRITICAL: "Crítico",
  HIGH: "Alto",
  ATTENTION: "Atenção",
  LOW: "Baixo",
}

export const coverageLabels = {
  COMPLETE: "Cobertura completa",
  PARTIAL: "Resultado parcial",
  UNAVAILABLE: "Sem score calculável",
  NO_OPEN_RISKS: "Sem RMs abertas",
  UNKNOWN: "Resumo indisponível",
}

export type Coverage = keyof typeof coverageLabels

export type PortfolioFilters = {
  search: string
  status: string
  country: string
  risk: "ALL" | "PRIORITY" | keyof typeof bandLabels
  coverage: "ALL" | "REVIEW" | Coverage
  sort: "SCORE" | "OPEN" | "NAME"
}

export const defaultPortfolioFilters: PortfolioFilters = {
  search: "",
  status: "ALL",
  country: "ALL",
  risk: "ALL",
  coverage: "ALL",
  sort: "SCORE",
}

export function scoreOf(
  supplier: PortfolioSupplier
): number | null {
  const summary = supplier.riskScoreSummary

  if (
    !summary ||
    !["COMPLETE", "PARTIAL"].includes(summary.status)
  ) {
    return null
  }

  return (
    typeof summary.score === "number" &&
    Number.isInteger(summary.score) &&
    summary.score >= 0 &&
    summary.score <= 100
  )
    ? summary.score
    : null
}

export function bandOf(
  supplier: PortfolioSupplier
): keyof typeof bandLabels | null {
  const score = scoreOf(supplier)

  return score === null
    ? null
    : score >= 80
      ? "CRITICAL"
      : score >= 60
        ? "HIGH"
        : score >= 30
          ? "ATTENTION"
          : "LOW"
}

export function coverageOf(
  supplier: PortfolioSupplier
): Coverage {
  const status = supplier.riskScoreSummary?.status

  if (
    !status ||
    !Object.hasOwn(coverageLabels, status)
  ) {
    return "UNKNOWN"
  }

  if (
    ["COMPLETE", "PARTIAL"].includes(status) &&
    scoreOf(supplier) === null
  ) {
    return "UNKNOWN"
  }

  return status
}

export function openCount(
  supplier: PortfolioSupplier
): number | null {
  const value = supplier.riskScoreSummary?.openRisks

  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  )
    ? value
    : null
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

export function filterSuppliers(
  data: PortfolioSupplier[],
  filters: PortfolioFilters
) {
  const query = normalize(filters.search)

  return data
    .filter(supplier => {
      const band = bandOf(supplier)
      const coverage = coverageOf(supplier)

      const matchesSearch = normalize(
        `${supplier.name} ${supplier.supplierCodeSap ?? ""}`
      ).includes(query)

      const matchesStatus =
        filters.status === "ALL" ||
        supplier.status === filters.status

      const matchesCountry =
        filters.country === "ALL" ||
        (supplier.country?.id || "UNKNOWN") ===
          filters.country

      const matchesRisk =
        filters.risk === "ALL" ||
        (
          filters.risk === "PRIORITY"
            ? band === "HIGH" || band === "CRITICAL"
            : band === filters.risk
        )

      const matchesCoverage =
        filters.coverage === "ALL" ||
        (
          filters.coverage === "REVIEW"
            ? ["PARTIAL", "UNAVAILABLE", "UNKNOWN"].includes(
                coverage
              )
            : coverage === filters.coverage
        )

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCountry &&
        matchesRisk &&
        matchesCoverage
      )
    })
    .sort((a, b) => {
      const difference =
        filters.sort === "SCORE"
          ? (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1)
          : filters.sort === "OPEN"
            ? (openCount(b) ?? -1) - (openCount(a) ?? -1)
            : 0

      return (
        difference ||
        a.name.localeCompare(b.name, "pt-BR") ||
        a.id.localeCompare(b.id)
      )
    })
}

export function portfolioStats(
  data: PortfolioSupplier[]
) {
  const bands = {
    CRITICAL: 0,
    HIGH: 0,
    ATTENTION: 0,
    LOW: 0,
  }

  const coverage = {
    COMPLETE: 0,
    PARTIAL: 0,
    UNAVAILABLE: 0,
    NO_OPEN_RISKS: 0,
    UNKNOWN: 0,
  }

  let openRisks = 0
  let unknownOpen = 0

  for (const supplier of data) {
    const band = bandOf(supplier)

    if (band) bands[band]++

    coverage[coverageOf(supplier)]++

    const count = openCount(supplier)

    if (count === null) {
      unknownOpen++
    } else {
      openRisks += count
    }
  }

  return {
    total: data.length,
    bands,
    coverage,
    openRisks,
    unknownOpen,
    priority: bands.HIGH + bands.CRITICAL,
    review:
      coverage.PARTIAL +
      coverage.UNAVAILABLE +
      coverage.UNKNOWN,
    scored: Object.values(bands).reduce(
      (sum, count) => sum + count,
      0
    ),
  }
}

export function supplierPage<T>(
  items: T[],
  requestedPage: number,
  pageSize = 10
) {
  const totalPages = Math.max(
    1,
    Math.ceil(items.length / pageSize)
  )

  const page = Math.max(
    1,
    Math.min(requestedPage, totalPages)
  )

  return {
    page,
    totalPages,
    items: items.slice(
      (page - 1) * pageSize,
      page * pageSize
    ),
  }
}