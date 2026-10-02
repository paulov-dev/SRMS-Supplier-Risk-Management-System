const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const ts = require("typescript")

function setup({
  authenticated = true,
  auditFailure = false,
  permissions = ["DASHBOARD_VIEW", "RISK_VIEW"],
  roles = ["RISK_ANALYST"],
  active = true,
} = {}) {
  const calls = []
  const audits = []

  const actor = {
    id: "me",
    name: "Teste",
    isActive: active,
    roles: roles.map(name => ({
      role: {
        name,
        permissions: permissions.map(name => ({
          permission: { name },
        })),
      },
    })),
  }

  const db = {}

  for (const model of [
    "riskEvent",
    "partNumber",
    "riskActionPlan",
    "logisticsRequest",
    "supplier",
    "weeklySnapshot",
    "weeklyRiskStateSnapshot",
    "auditLog",
  ]) {
    db[model] = Object.fromEntries(
      [
        "findMany",
        "count",
        "findUnique",
        "groupBy",
      ].map(method => [
        method,
        async args => {
          calls.push({ model, method, args })

          return method === "count"
            ? 0
            : method === "findUnique"
              ? { id: args.where.id }
              : []
        },
      ])
    )
  }

  db.$transaction = async run => run(db)

  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../src/app/api/dashboard/route.ts"
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

  const dependencies = {
    "@/app/api/lib/prisma": {
      prisma: db,
    },

    "@/app/api/lib/getUserFromToken": {
      getUserFromRequest: async () =>
        authenticated ? actor : null,
    },

    "@/app/api/lib/createAuditLog": {
      createAuditLog: async (_, data) => {
        if (auditFailure) {
          throw new Error("AUDIT_UNAVAILABLE")
        }

        audits.push(data)
      },
    },

    "@/lib/home-data":
      require("../src/lib/home-data.ts"),

    "@/lib/dashboard-data":
      require("../src/lib/dashboard-data.ts"),
  }

  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    Response,
    URL,
    Date,

    require: name => {
      if (!(name in dependencies)) {
        throw new Error(`Unexpected import ${name}`)
      }

      return dependencies[name]
    },
  })

  return {
    ...module.exports,
    calls,
    audits,
  }
}

const get = query =>
  new Request(
    `http://localhost/api/dashboard${query}`
  )

const post = (
  path,
  origin = "http://localhost"
) =>
  new Request("http://localhost/api/dashboard", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
    },
    body: JSON.stringify({ path }),
  })

test("lista usa o usuário autenticado e paginação no banco", async () => {
  const api = setup()

  const response = await api.GET(
    get("?list=parts&page=2&userId=other")
  )

  assert.equal(response.status, 200)

  const query = api.calls.find(
    call =>
      call.model === "partNumber" &&
      call.method === "findMany"
  ).args

  assert.equal(
    query.where.riskParts.some.assignedToId,
    "me"
  )
  assert.equal(query.take, 10)
  assert.equal(query.skip, 10)

  assert.equal(
    api.audits[0].action,
    "DASHBOARD_LIST_VIEW"
  )
})

test("gráfico global mantém cards e acessos recentes pessoais", async () => {
  const api = setup()

  const response = await api.GET(
    get("?scope=all")
  )

  assert.equal(response.status, 200)

  const body = await response.json()

  assert.equal(body.weeks.length, 8)

  assert.equal(
    api.calls.find(
      call =>
        call.model === "riskEvent" &&
        call.method === "count"
    ).args.where.assignedToId,
    "me"
  )

  const recent = api.calls.find(
    call => call.method === "groupBy"
  ).args.where

  assert.equal(recent.changedBy, "me")
  assert.equal(
    recent.entityType.in.includes("Supplier"),
    false
  )

  assert.equal(
    api.audits.at(-1).action,
    "DASHBOARD_VIEW"
  )
})

test("sem autenticação ou permissão não consulta a carteira", async () => {
  for (const options of [
    { authenticated: false },
    { permissions: ["RISK_VIEW"] },
  ]) {
    const api = setup(options)

    assert.equal(
      (await api.GET(get(""))).status,
      options.authenticated === false ? 401 : 403
    )

    assert.equal(api.calls.length, 0)
  }
})

test("falha de auditoria impede resposta de sucesso", async () => {
  const api = setup({ auditFailure: true })

  assert.equal(
    (await api.GET(get("?list=risks"))).status,
    503
  )

  assert.equal(
    (
      await api.POST(
        post("/rms/734f06a6-ffa6-491f-8541-d741f2d5f9c8")
      )
    ).status,
    503
  )
})

test("acesso recente verifica origem, permissão e registra o ator real", async () => {
  const api = setup()
  const id = "734f06a6-ffa6-491f-8541-d741f2d5f9c8"

  assert.equal(
    (
      await api.POST(
        post(`/rms/${id}`, "https://other.test")
      )
    ).status,
    403
  )

  assert.equal(
    (
      await api.POST(
        post(`/suppliers/${id}`)
      )
    ).status,
    403
  )

  assert.equal(
    (
      await api.POST(
        post(`/rms/${id}`)
      )
    ).status,
    200
  )

  assert.equal(
    api.audits.at(-1).action,
    "RECENT_ITEM_OPEN"
  )
  assert.equal(
    api.audits.at(-1).changedBy,
    "me"
  )
  assert.equal(
    api.audits.at(-1).entityId,
    id
  )
})

test("engenharia e qualidade recebem planos pessoais e gráfico geral, sem fila logística ou cards de RMs", async () => {
  for (const role of ["ENGINEERING", "QUALITY"]) {
    const api = setup({
      roles: [role],
    })

    const response = await api.GET(get(""))

    assert.equal(response.status, 200)

    const body = await response.json()

    assert.equal(body.access.risk, false)
    assert.equal(body.access.chart, true)
    assert.equal(body.lists.risks, undefined)
    assert.equal(body.lists.logisticsQueue, undefined)

    assert.equal(
      api.calls.find(
        call =>
          call.model === "riskActionPlan" &&
          call.method === "count"
      ).args.where.assignedToId,
      "me"
    )

    assert.equal(
      api.calls.some(
        call => call.model === "logisticsRequest"
      ),
      false
    )

    assert.equal(
      api.audits.at(-1).newValue.chartScope,
      "all"
    )
  }
})

test("logística separa atribuições pessoais e fila sem responsável", async () => {
  const api = setup({
    roles: ["LOGISTICS"],
    permissions: [
      "DASHBOARD_VIEW",
      "RISK_VIEW",
      "LOGISTICS_REQUEST_REVIEW",
      "LOGISTICS_ANALYST",
    ],
  })

  for (const [key, owner, status] of [
    ["logisticsPending", "me", "PENDING"],
    ["logisticsReview", "me", "IN_REVIEW"],
    ["logisticsQueue", null, "PENDING"],
  ]) {
    api.calls.length = 0

    assert.equal(
      (
        await api.GET(
          get(`?list=${key}&page=2&userId=other`)
        )
      ).status,
      200
    )

    const query = api.calls.find(
      call =>
        call.model === "logisticsRequest" &&
        call.method === "findMany"
    ).args

    assert.equal(query.where.assignedToId, owner)
    assert.equal(query.where.status, status)
    assert.equal(query.skip, 10)
    assert.equal(query.take, 10)
    assert.equal(
      query.orderBy[0].priority,
      "desc"
    )
  }
})

test("permissão de consulta logística não concede fila operacional e bloqueia URL direta", async () => {
  const api = setup({
    permissions: [
      "DASHBOARD_VIEW",
      "RISK_VIEW",
      "LOGISTICS_REQUEST_REVIEW",
    ],
  })

  const response = await api.GET(
    get("?list=logisticsQueue")
  )

  assert.equal(response.status, 403)
  assert.equal(api.calls.length, 0)

  assert.equal(
    api.audits.at(-1).action,
    "DASHBOARD_LIST_DENIED"
  )
})

test("funções acumuladas preservam blocos de Risk e Logística", async () => {
  const api = setup({
    roles: ["RISK_ANALYST", "LOGISTICS"],
    permissions: [
      "DASHBOARD_VIEW",
      "RISK_VIEW",
      "LOGISTICS_REQUEST_REVIEW",
      "LOGISTICS_ANALYST",
    ],
  })

  const response = await api.GET(get(""))
  const body = await response.json()

  assert.equal(body.access.risk, true)
  assert.equal(body.access.logistics, true)

  assert.ok(body.lists.risks)
  assert.ok(body.lists.plans)
  assert.ok(body.lists.logisticsQueue)
})

test("sem RISK_VIEW não consulta snapshots nem libera gráfico por parâmetro", async () => {
  const api = setup({
    roles: ["VIEWER"],
    permissions: ["DASHBOARD_VIEW"],
  })

  const response = await api.GET(
    get("?scope=all")
  )

  assert.equal(response.status, 200)

  const body = await response.json()

  assert.equal(body.access.chart, false)
  assert.equal(body.weeks.length, 0)

  assert.equal(
    api.calls.some(
      call => call.model.startsWith("weekly")
    ),
    false
  )

  assert.equal(
    (
      await api.GET(
        get("?list=plans")
      )
    ).status,
    403
  )
})

test("conta inativa não recebe dados mesmo com as permissões", async () => {
  const api = setup({ active: false })

  assert.equal(
    (await api.GET(get(""))).status,
    403
  )

  assert.equal(api.calls.length, 0)
})