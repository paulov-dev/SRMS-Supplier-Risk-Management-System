import type { Prisma } from "@prisma/client"
import type { weeklyEvolution } from "./dashboard-data"

export const homeLists = {
  risks: "Minhas RMs abertas",
  parts: "Meus PNs",
  plans: "Meus planos ativos",
  overdue: "Planos atrasados",
  upcoming: "Vencem em até 7 dias",
  waiting: "Aguardando validação",
  logisticsPending: "Meus atendimentos pendentes",
  logisticsReview: "Meus atendimentos em análise",
  logisticsQueue: "Fila sem responsável",
} as const

export type HomeList = keyof typeof homeLists

export type HomeItem = {
  id: string
  label: string
  detail: string
  href: string
  actionLabel?: string
}

export type HomePage = {
  items: HomeItem[]
  total: number
  page: number
}

export type HomeAccess = {
  home: boolean
  chart: boolean
  risk: boolean
  plans: boolean
  logistics: boolean
  suppliers: boolean
  parts: boolean
  logisticsPage: boolean
}

export type HomeData = {
  name: string
  updatedAt: string
  access: HomeAccess
  lists: Partial<Record<HomeList, HomePage>>
  recent: HomeItem[]
  weeks: ReturnType<typeof weeklyEvolution>
}

export const PAGE_SIZE = 10

export const planKeys = [
  "plans",
  "overdue",
  "upcoming",
  "waiting",
] as const

export const logisticsKeys = [
  "logisticsPending",
  "logisticsReview",
  "logisticsQueue",
] as const

export function homeAccess(
  permissions: string[],
  roles: string[]
): HomeAccess {
  const has = (permission: string) =>
    permissions.includes(permission)

  const chart = has("RISK_VIEW")

  return {
    home:
      has("DASHBOARD_VIEW") ||
      has("USER_MANAGE"),

    chart,

    plans: chart,

    risk:
      chart &&
      roles.some(role =>
        [
          "ADMIN",
          "SUPER_ADMIN",
          "RISK_ANALYST",
          "RISK_MANAGER",
        ].includes(role)
      ),

    logistics:
      has("LOGISTICS_REQUEST_REVIEW") &&
      (
        has("LOGISTICS_ANALYST") ||
        has("USER_MANAGE")
      ),

    suppliers: has("SUPPLIER_VIEW"),

    parts: [
      "RISK_VIEW",
      "RISK_CREATE",
      "RISK_UPDATE",
      "USER_MANAGE",
    ].some(has),

    logisticsPage: has("LOGISTICS_REQUEST_REVIEW"),
  }
}

export function allowedHomeLists(
  access: HomeAccess
): HomeList[] {
  return [
    ...(access.risk
      ? ["risks", "parts"] as const
      : []),

    ...(access.plans ? planKeys : []),

    ...(access.logistics ? logisticsKeys : []),
  ]
}

// Prazos são datas de calendário armazenadas como YYYY-MM-DD.
export function deadlineWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)

  const get = (type: string) =>
    parts.find(part => part.type === type)!.value

  const today = new Date(
    `${get("year")}-${get("month")}-${get("day")}T00:00:00Z`
  )

  const end = new Date(today)
  end.setUTCDate(end.getUTCDate() + 8)

  return { today, end }
}

export function homeFilters(
  userId: string,
  now = new Date()
) {
  const { today, end } = deadlineWindow(now)

  const risks: Prisma.RiskEventWhereInput = {
    assignedToId: userId,
    workflowStatus: "OPEN",
  }

  const parts: Prisma.PartNumberWhereInput = {
    riskParts: {
      some: {
        assignedToId: userId,
        riskEvent: {
          workflowStatus: "OPEN",
        },
      },
    },
  }

  const base: Prisma.RiskActionPlanWhereInput = {
    assignedToId: userId,
    riskEvent: {
      workflowStatus: "OPEN",
    },
  }

  const plans: Prisma.RiskActionPlanWhereInput = {
    ...base,
    status: {
      in: [
        "OPEN",
        "IN_PROGRESS",
        "WAITING_VALIDATION",
      ],
    },
  }

  const overdue: Prisma.RiskActionPlanWhereInput = {
    ...base,
    status: {
      in: ["OPEN", "IN_PROGRESS"],
    },
    dueDate: {
      lt: today,
    },
  }

  const upcoming: Prisma.RiskActionPlanWhereInput = {
    ...base,
    status: {
      in: ["OPEN", "IN_PROGRESS"],
    },
    dueDate: {
      gte: today,
      lt: end,
    },
  }

  const waiting: Prisma.RiskActionPlanWhereInput = {
    ...base,
    status: "WAITING_VALIDATION",
  }

  const logisticsPending: Prisma.LogisticsRequestWhereInput = {
    assignedToId: userId,
    status: "PENDING",
  }

  const logisticsReview: Prisma.LogisticsRequestWhereInput = {
    assignedToId: userId,
    status: "IN_REVIEW",
  }

  const logisticsQueue: Prisma.LogisticsRequestWhereInput = {
    assignedToId: null,
    status: "PENDING",
  }

  return {
    risks,
    parts,
    plans,
    overdue,
    upcoming,
    waiting,
    logisticsPending,
    logisticsReview,
    logisticsQueue,
  }
}

export function recentTarget(path: unknown) {
  if (typeof path !== "string") return null

  const match =
    /^\/(rms|pns|suppliers)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i.exec(
      path
    )

  if (!match) return null

  const kind = match[1].toLowerCase()

  return {
    id: match[2].toLowerCase(),
    kind,
    entityType:
      kind === "rms"
        ? "RiskEvent"
        : kind === "pns"
          ? "PartNumber"
          : "Supplier",
  }
}