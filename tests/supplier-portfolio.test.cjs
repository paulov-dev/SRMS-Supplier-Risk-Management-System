const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
  defaultPortfolioFilters,
  filterSuppliers,
  portfolioStats,
  scoreOf,
  coverageOf,
  supplierPage,
} = require("../src/lib/supplier-portfolio.ts")

function supplier(
  id,
  score,
  coverage = "COMPLETE",
  patch = {}
) {
  const open = coverage === "NO_OPEN_RISKS" ? 0 : 2

  return {
    id,
    name: id,
    status: "ACTIVE",
    supplierCodeSap: `SAP-${id}`,
    country: {
      id: "br",
      name: "Brasil",
    },
    contacts: [],
    riskScoreSummary: {
      score,
      status: coverage,
      openRisks: open,
      scoredRisks:
        coverage === "PARTIAL"
          ? 1
          : score === null
            ? 0
            : open,
      bands: {
        LOW: 0,
        ATTENTION: 0,
        HIGH: 0,
        CRITICAL: 0,
      },
    },
    ...patch,
  }
}

const filter = (data, patch = {}) =>
  filterSuppliers(data, {
    ...defaultPortfolioFilters,
    ...patch,
  })

test(
  "separa zero, ausência de RMs, resultados parciais e metadados ausentes",
  () => {
    const data = [
      supplier("zero", 0),
      supplier("sem-rms", null, "NO_OPEN_RISKS"),
      supplier("parcial", 80, "PARTIAL"),
      supplier("sem-score", null, "UNAVAILABLE"),
      supplier("legado", null, "COMPLETE", {
        riskScore: 0,
        riskScoreSummary: undefined,
      }),
    ]

    const stats = portfolioStats(data)

    assert.equal(stats.bands.LOW, 1)
    assert.equal(stats.bands.CRITICAL, 1)
    assert.equal(stats.review, 3)
    assert.equal(stats.coverage.NO_OPEN_RISKS, 1)
    assert.equal(stats.unknownOpen, 1)
    assert.equal(scoreOf(data[4]), null)

    assert.deepEqual(
      filter(data, {
        coverage: "REVIEW",
      }).map(item => item.id),
      ["parcial", "legado", "sem-score"]
    )
  }
)

test(
  "status cadastral não determina o risco operacional; respeita limites das faixas",
  () => {
    const data = [
      supplier("zero", 0, "COMPLETE", {
        status: "BLOCKED",
      }),
      ...[29, 30, 59, 60, 79, 80, 100].map(score =>
        supplier(`score-${score}`, score)
      ),
    ]

    assert.equal(filter(data, { risk: "LOW" }).length, 2)
    assert.equal(
      filter(data, { risk: "ATTENTION" }).length,
      2
    )
    assert.equal(filter(data, { risk: "HIGH" }).length, 2)
    assert.equal(
      filter(data, { risk: "CRITICAL" }).length,
      2
    )
    assert.equal(
      filter(data, { risk: "PRIORITY" }).length,
      4
    )

    assert.deepEqual(
      filter(data, {
        status: "BLOCKED",
      }).map(item => item.id),
      ["zero"]
    )
  }
)

test(
  "combina nome sem acentos, SAP, país, faixa e cobertura",
  () => {
    const a = supplier("a", 85, "PARTIAL", {
      name: "São José",
      supplierCodeSap: "00451",
    })

    const b = supplier("b", 85, "COMPLETE", {
      name: "São José",
      country: {
        id: "de",
        name: "Alemanha",
      },
    })

    assert.deepEqual(
      filter([a, b], {
        search: " SAO JOSE ",
        country: "br",
        risk: "CRITICAL",
        coverage: "PARTIAL",
      }).map(item => item.id),
      ["a"]
    )

    assert.equal(
      filter([a, b], {
        search: "00451",
      })[0].id,
      "a"
    )
  }
)

test(
  "ordena sem alterar a base e mantém ausência de score depois do zero",
  () => {
    const data = [
      supplier("null", null, "UNAVAILABLE"),
      supplier("zero", 0),
      supplier("high", 70),
    ]

    const original = structuredClone(data)

    assert.deepEqual(
      filter(data).map(item => item.id),
      ["high", "zero", "null"]
    )

    assert.deepEqual(data, original)

    const stats = portfolioStats(data)

    filter(data, { risk: "HIGH" })

    assert.deepEqual(portfolioStats(data), stats)
  }
)

test(
  "scores inválidos não entram na distribuição como baixo risco",
  () => {
    for (const value of [
      NaN,
      Infinity,
      -1,
      101,
      12.5,
    ]) {
      const item = supplier("invalid", value)

      assert.equal(scoreOf(item), null)
      assert.equal(coverageOf(item), "UNKNOWN")
      assert.equal(portfolioStats([item]).scored, 0)
    }
  }
)

test(
  "paginação permanece válida quando a lista diminui ou fica vazia",
  () => {
    const data = Array.from(
      { length: 25 },
      (_, i) => i
    )

    assert.deepEqual(
      supplierPage(data, 3).items,
      [20, 21, 22, 23, 24]
    )

    assert.equal(
      supplierPage(data.slice(0, 11), 3).page,
      2
    )

    assert.equal(supplierPage([], 3).page, 1)
    assert.equal(supplierPage([], 3).totalPages, 1)
    assert.deepEqual(supplierPage([], 3).items, [])
  }
)