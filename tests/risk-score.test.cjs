const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
  calculateRiskScore,
} = require("../src/lib/risk-score.ts")

const now = new Date("2026-10-06T15:00:00Z")

const rm = (patch = {}) => ({
  id: "rm-1",
  workflowStatus: "OPEN",
  riskLevel: "GREEN",
  assignedToId: "user-1",
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
  comments: [],
  statusHistory: [],
  partHistory: [],
  actionPlanHistory: [],
  ...patch,
})

const plan = (patch = {}) => ({
  status: "OPEN",
  assignedToId: "user-1",
  dueDate: "2026-10-10",
  ...patch,
})

const request = (patch = {}) => ({
  status: "PENDING",
  priority: "LOW",
  cutoffDate: null,
  ...patch,
})

const calc = input =>
  calculateRiskScore(input, now)

test(
  "verde sem pendências vale zero; vermelho mantém piso alto sem duplicar RM e PN",
  () => {
    assert.equal(calc(rm()).score, 0)

    const result = calc(
      rm({
        riskLevel: "RED",
        parts: [{ status: "RED" }],
        actionPlans: [plan()],
      })
    )

    assert.equal(result.score, 65)
    assert.equal(result.band, "HIGH")

    assert.equal(
      calc(
        rm({
          parts: [{ status: "RED" }],
          actionPlans: [plan()],
        })
      ).score,
      65
    )

    assert.equal(
      calc(
        rm({
          riskLevel: "YELLOW",
          actionPlans: [plan()],
        })
      ).score,
      30
    )
  }
)

test(
  "atinge 100 com evidências, preserva entrada e soma exatamente os fatores",
  () => {
    const input = rm({
      riskLevel: "RED",
      assignedToId: null,
      actionPlans: [
        plan({
          dueDate: "2026-09-01",
          assignedToId: null,
        }),
        plan({
          dueDate: null,
        }),
      ],
      logistics: [
        request({
          priority: "CRITICAL",
        }),
      ],
    })

    const before = structuredClone(input)
    const result = calc(input)

    assert.equal(result.score, 100)
    assert.equal(result.band, "CRITICAL")

    assert.equal(
      result.factors.reduce(
        (sum, factor) => sum + factor.points,
        0
      ),
      100
    )

    assert.deepEqual(input, before)
  }
)

test(
  "laranja, cinza e azul não são severidade; encerradas não recebem zero artificial",
  () => {
    for (const color of ["ORANGE", "GREY", "BLUE"]) {
      assert.equal(
        calc(
          rm({
            riskLevel: color,
            parts: [{ status: color }],
          })
        ).score,
        null
      )

      assert.equal(
        calc(
          rm({
            parts: [
              { status: "GREEN" },
              { status: color },
            ],
          })
        ).score,
        0
      )
    }

    for (const status of ["CLOSED", "CANCELED"]) {
      assert.equal(
        calc(
          rm({
            workflowStatus: status,
            riskLevel: "RED",
          })
        ).score,
        null
      )
    }
  }
)

test(
  "dados ausentes ou inválidos não se tornam baixo risco",
  () => {
    for (const patch of [
      { parts: [] },
      { parts: undefined },
      { actionPlans: undefined },
      { riskLevel: "UNKNOWN" },
      { parts: [{ status: "UNKNOWN" }] },
      {
        actionPlans: [
          plan({ dueDate: "2026-02-30" }),
        ],
      },
      {
        actionPlans: [
          plan({ status: "UNKNOWN" }),
        ],
      },
      {
        logistics: [
          request({ priority: "UNKNOWN" }),
        ],
      },
      {
        logistics: [
          request({ cutoffDate: "invalid" }),
        ],
      },
    ]) {
      assert.equal(calc(rm(patch)).score, null)
    }
  }
)

test(
  "atrasos respeitam o dia de Brasília e os limites de 7 e 8 dias",
  () => {
    const input = dueDate =>
      rm({
        actionPlans: [plan({ dueDate })],
      })

    assert.equal(
      calc(input("2026-10-06")).score,
      0
    )

    assert.equal(
      calc(input("2026-10-05")).score,
      10
    )

    assert.equal(
      calc(input("2026-09-29")).score,
      10
    )

    assert.equal(
      calc(input("2026-09-28")).score,
      15
    )

    assert.equal(
      calculateRiskScore(
        input("2026-10-05"),
        new Date("2026-10-06T02:59:59Z")
      ).score,
      0
    )

    assert.equal(
      calculateRiskScore(
        input("2026-10-05"),
        new Date("2026-10-06T03:00:00Z")
      ).score,
      10
    )
  }
)

test(
  "validação não é atraso; planos encerrados não contam como ativos",
  () => {
    for (const status of [
      "WAITING_VALIDATION",
      "COMPLETED",
      "CANCELED",
    ]) {
      assert.equal(
        calc(
          rm({
            actionPlans: [
              plan({
                status,
                dueDate: "2026-01-01",
              }),
            ],
          })
        ).score,
        0
      )
    }

    assert.equal(
      calc(
        rm({
          riskLevel: "RED",
          actionPlans: [],
        })
      ).score,
      80
    )

    assert.equal(
      calc(
        rm({
          riskLevel: "RED",
          actionPlans: [
            plan({ status: "COMPLETED" }),
          ],
        })
      ).score,
      80
    )
  }
)

test(
  "logística usa somente solicitações ativas e não soma sinais repetidos",
  () => {
    assert.equal(
      calc(
        rm({
          logistics: [request(), request()],
        })
      ).score,
      3
    )

    assert.equal(
      calc(
        rm({
          logistics: [
            request({ priority: "HIGH" }),
          ],
        })
      ).score,
      7
    )

    assert.equal(
      calc(
        rm({
          logistics: [
            request({ cutoffDate: "2026-10-05" }),
          ],
        })
      ).score,
      10
    )

    assert.equal(
      calc(
        rm({
          logistics: [
            request({ cutoffDate: "2026-10-06" }),
          ],
        })
      ).score,
      3
    )

    for (const status of [
      "APPROVED",
      "REJECTED",
      "CANCELED",
    ]) {
      assert.equal(
        calc(
          rm({
            logistics: [
              request({
                status,
                priority: "CRITICAL",
              }),
            ],
          })
        ).score,
        0
      )
    }
  }
)

function api({
  authenticated = true,
  active = true,
  permitted = true,
  missing = false,
  failAudit,
} = {}) {
  const fs = require("node:fs")
  const path = require("node:path")
  const vm = require("node:vm")
  const ts = require("typescript")

  const audits = []
  let reads = 0

  const db = {
    riskEvent: {
      findUnique: async () => {
        reads++
        return missing ? null : rm()
      },
    },
    $transaction: async fn => fn(db),
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
              id: "user-1",
              isActive: active,
              roles: [
                {
                  role: {
                    permissions: permitted
                      ? [
                          {
                            permission: {
                              name: "RISK_VIEW",
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

    "@/app/api/lib/createNotification": {
      createNotification: async () => {},
    },

    "@/app/api/lib/createAuditLog": {
      createAuditLog: async (_, data) => {
        if (data.action === failAudit) {
          throw new Error("AUDIT_UNAVAILABLE")
        }

        audits.push(data)
      },
    },

    "@/lib/risk-score":
      require("../src/lib/risk-score.ts"),
  }

  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../src/app/api/risk/[id]/route.ts"
    ),
    "utf8"
  )

  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText

  const module = { exports: {} }

  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    Date,
    Response,
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
    get: () =>
      module.exports.GET(
        new Request(
          "http://localhost/api/risk/rm-1"
        ),
        {
          params: Promise.resolve({
            id: "rm-1",
          }),
        }
      ),
    audits,
    reads: () => reads,
  }
}

test(
  "API protege acesso e audita recusas autenticadas",
  async () => {
    const anonymous = api({
      authenticated: false,
    })

    assert.equal(
      (await anonymous.get()).status,
      401
    )

    assert.equal(anonymous.reads(), 0)

    for (const config of [
      { active: false },
      { permitted: false },
    ]) {
      const app = api(config)

      assert.equal(
        (await app.get()).status,
        403
      )

      assert.equal(app.reads(), 0)

      assert.equal(
        app.audits[0].action,
        "RISK_DETAIL_DENIED"
      )
    }
  }
)

test(
  "API devolve score auditado e impede cache HTTP",
  async () => {
    const app = api()
    const response = await app.get()

    assert.equal(response.status, 200)

    assert.equal(
      response.headers.get("cache-control"),
      "no-store"
    )

    const body = await response.json()

    assert.equal(body.riskScore.score, 0)

    assert.equal(
      app.audits.at(-1).action,
      "RISK_SCORE_VIEWED"
    )

    assert.deepEqual(
      app.audits.at(-1).newValue.riskScore,
      body.riskScore
    )
  }
)

test(
  "API registra inexistência e não devolve sucesso quando auditoria falha",
  async () => {
    const missing = api({
      missing: true,
    })

    assert.equal(
      (await missing.get()).status,
      404
    )

    assert.equal(
      missing.audits.at(-1).action,
      "RISK_DETAIL_NOT_FOUND"
    )

    for (const failAudit of [
      "RISK_DETAIL_REQUESTED",
      "RISK_SCORE_VIEWED",
    ]) {
      const app = api({ failAudit })
      const response = await app.get()

      assert.equal(response.status, 503)

      assert.equal(
        (await response.json()).riskScore,
        undefined
      )

      if (failAudit === "RISK_DETAIL_REQUESTED") {
        assert.equal(app.reads(), 0)
      }

      assert.equal(
        app.audits.some(
          audit =>
            audit.action === "RISK_SCORE_VIEWED"
        ),
        false
      )
    }
  }
)

test(
  "responsável da RM não altera o score e todos os PNs participam da seleção do pior status",
  () => {
    for (const color of ["GREEN", "YELLOW", "RED"]) {
      const input = rm({
        riskLevel: color,
        actionPlans: [plan()],
      })

      assert.equal(
        calc(input).score,
        calc({
          ...input,
          assignedToId: null,
        }).score
      )
    }

    for (const statuses of [
      ["GREEN", "YELLOW", "RED"],
      ["RED", "GREEN", "YELLOW"],
    ]) {
      assert.equal(
        calc(
          rm({
            parts: statuses.map(status => ({ status })),
            actionPlans: [plan()],
          })
        ).score,
        65
      )
    }
  }
)














































































































