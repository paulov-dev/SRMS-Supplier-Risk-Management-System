const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
  isoWeek,
  weekWindow,
  weeklyEvolution,
} = require("../src/lib/dashboard-data.ts")

const {
  homeFilters,
  deadlineWindow,
  recentTarget,
} = require("../src/lib/home-data.ts")

const now = new Date("2026-01-09T12:00:00Z")
const captured = new Date("2026-01-08T12:00:00Z")

const snapshot = {
  year: 2026,
  week: 2,
  totalRisks: 3,
  openRisks: 2,
  snapshotDate: captured,
}

const state = (id, level, status, owner) => ({
  year: 2026,
  week: 2,
  riskEventId: id,
  riskLevel: level,
  workflowStatus: status,
  assignedToId: owner,
  snapshotDate: captured,
})

const rows = [
  state("a", "RED", "OPEN", "me"),
  state("b", "YELLOW", "OPEN", "other"),
  state("c", "GREEN", "CLOSED", "me"),
]

test("janela contém oito semanas consecutivas e cruza o ano ISO", () => {
  assert.deepEqual(
    isoWeek(new Date("2025-12-29")),
    { year: 2026, week: 1 }
  )

  const weeks = weekWindow(now)

  assert.equal(weeks.length, 8)
  assert.equal(
    new Set(weeks.map(week => week.label)).size,
    8
  )
  assert.equal(weeks.at(-1).label, "2026/CW02")
  assert.equal(weeks.at(-3).label, "2025/CW52")
})

test("histórico mantém o responsável da semana e exclui RMs fechadas", () => {
  assert.equal(
    weeklyEvolution(
      [snapshot],
      rows,
      "all",
      "me",
      now
    ).at(-1).total,
    2
  )

  const mine = weeklyEvolution(
    [snapshot],
    rows,
    "mine",
    "me",
    now
  ).at(-1)

  assert.equal(mine.total, 1)
  assert.equal(mine.GREEN, 0)
  assert.equal(mine.YELLOW, 0)
})

test("ausência, duplicação, captura diferente e cobertura parcial não viram zero", () => {
  for (const [snapshots, states] of [
    [[], []],
    [[snapshot, snapshot], rows],
    [[snapshot], rows.slice(1)],
    [[snapshot], [rows[0], rows[0], rows[2]]],
    [
      [snapshot],
      rows.map(row => ({
        ...row,
        snapshotDate: now,
      })),
    ],
  ]) {
    assert.equal(
      weeklyEvolution(
        snapshots,
        states,
        "all",
        "me",
        now
      ).at(-1).total,
      null
    )
  }

  const empty = {
    ...snapshot,
    totalRisks: 0,
    openRisks: 0,
  }

  assert.equal(
    weeklyEvolution(
      [empty],
      [],
      "all",
      "me",
      now
    ).at(-1).total,
    0
  )

  assert.equal(
    weeklyEvolution(
      [
        {
          ...empty,
          snapshotDate: new Date("2026-01-10"),
        },
      ],
      [],
      "all",
      "me",
      now
    ).at(-1).total,
    null
  )
})

test("prazos usam o dia de São Paulo e incluem hoje mais sete dias", () => {
  const reference = new Date("2026-10-02T01:00:00Z")

  const { today, end } = deadlineWindow(reference)

  assert.equal(
    today.toISOString(),
    "2026-10-01T00:00:00.000Z"
  )
  assert.equal(
    end.toISOString(),
    "2026-10-09T00:00:00.000Z"
  )

  const filters = homeFilters("me", reference)

  const isUpcoming = date =>
    date >= filters.upcoming.dueDate.gte &&
    date < filters.upcoming.dueDate.lt

  assert.equal(isUpcoming(new Date("2026-10-01")), true)
  assert.equal(isUpcoming(new Date("2026-10-08")), true)
  assert.equal(isUpcoming(new Date("2026-10-09")), false)

  assert.equal(
    new Date("2026-09-30") <
      filters.overdue.dueDate.lt,
    true
  )
  assert.equal(
    new Date("2026-10-01") <
      filters.overdue.dueDate.lt,
    false
  )
})

test("PN é atribuído pelo vínculo e planos são atribuídos diretamente", () => {
  const filters = homeFilters("me", now)

  assert.deepEqual(filters.parts, {
    riskParts: {
      some: {
        assignedToId: "me",
        riskEvent: {
          workflowStatus: "OPEN",
        },
      },
    },
  })

  for (const key of [
    "plans",
    "overdue",
    "upcoming",
    "waiting",
  ]) {
    assert.equal(filters[key].assignedToId, "me")
  }

  assert.equal(
    filters.waiting.status,
    "WAITING_VALIDATION"
  )

  assert.equal(
    filters.overdue.status.in.includes(
      "WAITING_VALIDATION"
    ),
    false
  )

  assert.equal(
    filters.upcoming.status.in.includes("COMPLETED"),
    false
  )
})

test("recentes aceitam somente páginas de detalhe conhecidas", () => {
  const id = "734f06a6-ffa6-491f-8541-d741f2d5f9c8"

  assert.equal(
    recentTarget(`/pns/${id}`).entityType,
    "PartNumber"
  )

  assert.equal(
    recentTarget(`/rms/${id}`).entityType,
    "RiskEvent"
  )

  for (const path of [
    "/rms/create",
    "/admin/roles",
    `https://evil.test/rms/${id}`,
    `/rms/${id}/edit`,
    null,
  ]) {
    assert.equal(recentTarget(path), null)
  }
})