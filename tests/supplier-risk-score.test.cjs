const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
  calculateSupplierScore,
} = require("../src/lib/supplier-risk-score.ts")

const {
  buildAIEvidence,
} = require("../src/lib/supplier-ai.ts")

const now = new Date("2026-10-06T15:00:00Z")

const rm = (id, patch = {}) => ({
  id,
  code: id,
  workflowStatus: "OPEN",
  riskLevel: "GREEN",
  assignedToId: null,
  createdAt: new Date("2026-10-01T12:00:00Z"),
  parts: [
    {
      status: "GREEN",
      partNumber: {
        id: "pn-1",
        partNumber: "PN-1",
      },
    },
  ],
  actionPlans: [],
  logistics: [],
  ...patch,
})

test(
  "consolida todas as RMs abertas pelo maior score, sem média nem limite",
  () => {
    const risks = Array.from(
      { length: 50 },
      (_, i) => rm(`rm-${i}`)
    )

    risks.push(
      rm("critical", {
        riskLevel: "RED",
      })
    )

    risks.push(
      rm("closed", {
        workflowStatus: "CLOSED",
        riskLevel: "RED",
      })
    )

    const before = structuredClone(risks)
    const result = calculateSupplierScore(risks, now)

    assert.equal(result.score, 80)
    assert.equal(result.openRisks, 51)
    assert.equal(result.scoredRisks, 51)
    assert.equal(result.driver.id, "critical")
    assert.equal(result.bands.CRITICAL, 1)
    assert.equal(result.bands.LOW, 50)
    assert.deepEqual(risks, before)
  }
)

test(
  "distingue zero válido, ausência de RMs, ausência de score e cobertura parcial",
  () => {
    assert.equal(
      calculateSupplierScore([rm("a")], now).score,
      0
    )

    const empty = calculateSupplierScore([], now)

    assert.equal(empty.score, null)
    assert.equal(empty.status, "NO_OPEN_RISKS")

    const unavailable = calculateSupplierScore(
      [rm("a", { parts: [] })],
      now
    )

    assert.equal(unavailable.score, null)
    assert.equal(unavailable.status, "UNAVAILABLE")

    const partial = calculateSupplierScore(
      [
        rm("a"),
        rm("b", { parts: [] }),
      ],
      now
    )

    assert.equal(partial.status, "PARTIAL")
    assert.equal(partial.score, 0)
    assert.equal(partial.unscoredRisks, 1)
  }
)

test(
  "recalcula atrasos na consulta e remove do agregado uma RM encerrada",
  () => {
    const risks = [
      rm("a", {
        actionPlans: [
          {
            status: "OPEN",
            assignedToId: "user",
            dueDate: "2026-10-06",
          },
        ],
      }),
    ]

    assert.equal(
      calculateSupplierScore(risks, now).score,
      0
    )

    assert.equal(
      calculateSupplierScore(
        risks,
        new Date("2026-10-07T15:00:00Z")
      ).score,
      10
    )

    assert.equal(
      calculateSupplierScore(
        [
          {
            ...risks[0],
            workflowStatus: "CLOSED",
          },
        ],
        now
      ).score,
      null
    )
  }
)

test(
  "empate é determinístico e horário isolado não invalida evidência da IA",
  () => {
    const a = calculateSupplierScore(
      [rm("b"), rm("a")],
      now
    )

    const b = calculateSupplierScore(
      [rm("a"), rm("b")],
      new Date("2026-10-06T16:00:00Z")
    )

    assert.equal(a.driver.id, "a")
    assert.equal(b.driver.id, "a")

    const evidence = summary =>
      buildAIEvidence({
        riskScore: summary.score,
        lastRiskCalculation: summary.calculatedAt,
        riskScoreSummary: summary,
        analytics: {
          summary: {},
        },
        riskEvents: [],
      })

    assert.deepEqual(evidence(a), evidence(b))

    assert.notDeepEqual(
      evidence(a),
      evidence(
        calculateSupplierScore(
          [rm("a", { riskLevel: "RED" })],
          now
        )
      )
    )
  }
)

function api(
  kind,
  {
    authenticated = true,
    active = true,
    permitted = true,
    missing = false,
    failAudit,
  } = {}
) {
  const fs = require("node:fs")
  const path = require("node:path")
  const vm = require("node:vm")
  const ts = require("typescript")

  const audits = []
  const queries = []

  const supplier = {
    id: "supplier-1",
    name: "Teste",
    status: "ACTIVE",
    riskScore: 99,
    country: {
      id: "br",
      name: "Brasil",
      isoCode: "BR",
    },
    contacts: [],
    riskEvents: [
      rm("rm-1", {
        riskLevel: "RED",
      }),
    ],
  }

  const db = {
    supplier: {
      findMany: async args => {
        queries.push(args)
        return [supplier]
      },
      findUnique: async args => {
        queries.push(args)
        return missing ? null : supplier
      },
    },
    weeklyRiskStateSnapshot: {
      findMany: async () => [],
    },
  }

  const dependencies = {
    "next/server": {
      NextResponse: Response,
    },

    "@prisma/client": require("@prisma/client"),

    "@/app/api/lib/prisma": {
      prisma: db,
    },

    "@/app/api/lib/getUserFromToken": {
      getUserFromRequest: async () =>
        authenticated
          ? {
              id: "user",
              isActive: active,
              roles: [
                {
                  role: {
                    permissions: permitted
                      ? [
                          {
                            permission: {
                              name: "SUPPLIER_VIEW",
                            },
                          },
                        ]
                      : [],
                  },
                },
              ],
            }
          : null,
    },

    "@/lib/supplier-360":
      require("../src/lib/supplier-360.ts"),

    "@/lib/supplier-risk-score":
      require("../src/lib/supplier-risk-score.ts"),

    "@/app/api/lib/createAuditLog": {
      createAuditLog: async (_, entry) => {
        if (entry.action === failAudit) {
          throw new Error("AUDIT_FAILED")
        }

        audits.push(entry)
      },
    },
  }

  const file =
    kind === "list"
      ? "../src/app/api/suppliers/route.ts"
      : "../src/app/api/suppliers/[id]/route.ts"

  const compiled = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, file),
      "utf8"
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText

  const module = { exports: {} }

  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    Date,
    console: {
      error() {},
    },
    require: name => {
      if (!(name in dependencies)) {
        throw new Error(`Unexpected import ${name}`)
      }

      return dependencies[name]
    },
  })

  return {
    audits,
    queries,
    get: () =>
      module.exports.GET(
        new Request(
          "http://localhost/api/suppliers/supplier-1"
        ),
        {
          params: Promise.resolve({
            id: "supplier-1",
          }),
        }
      ),
  }
}

for (const kind of ["list", "detail"]) {
  test(
    `${kind}: devolve score atual, preserva campos e registra auditoria`,
    async () => {
      const app = api(kind)
      const response = await app.get()

      assert.equal(response.status, 200)

      assert.equal(
        response.headers.get("cache-control"),
        "no-store"
      )

      const body = await response.json()
      const item = kind === "list" ? body[0] : body

      assert.equal(item.riskScore, 80)

      assert.equal(
        item.riskScoreSummary.driver.id,
        "rm-1"
      )

      assert.equal(item.name, "Teste")

      assert.equal(
        app.audits.at(-1).action,
        kind === "list"
          ? "SUPPLIER_SCORES_VIEWED"
          : "SUPPLIER_SCORE_VIEWED"
      )

      if (kind === "list") {
        assert.equal(
          app.queries[0].include.riskEvents.where
            .workflowStatus,
          "OPEN"
        )

        assert.equal(
          app.queries[0].include.riskEvents.take,
          undefined
        )
      }
    }
  )

  test(
    `${kind}: exige autenticação/permissão e não libera dados se auditoria falhar`,
    async () => {
      for (const [config, status] of [
        [{ authenticated: false }, 401],
        [{ active: false }, 403],
        [{ permitted: false }, 403],
      ]) {
        const app = api(kind, config)

        assert.equal(
          (await app.get()).status,
          status
        )

        assert.equal(app.queries.length, 0)

        if (status === 403) {
          assert.match(
            app.audits[0].action,
            /DENIED$/
          )
        }
      }

      const failures =
        kind === "list"
          ? [
              "SUPPLIER_LIST_REQUESTED",
              "SUPPLIER_SCORES_VIEWED",
            ]
          : [
              "SUPPLIER_DETAIL_REQUESTED",
              "SUPPLIER_SCORE_VIEWED",
            ]

      for (const failAudit of failures) {
        const app = api(kind, { failAudit })
        const response = await app.get()

        assert.ok(response.status >= 500)

        assert.equal(
          (await response.json()).riskScore,
          undefined
        )

        if (failAudit.endsWith("REQUESTED")) {
          assert.equal(app.queries.length, 0)
        }
      }
    }
  )
}

test(
  "detalhe registra fornecedor inexistente",
  async () => {
    const app = api("detail", {
      missing: true,
    })

    assert.equal(
      (await app.get()).status,
      404
    )

    assert.equal(
      app.audits.at(-1).action,
      "SUPPLIER_DETAIL_NOT_FOUND"
    )
  }
)