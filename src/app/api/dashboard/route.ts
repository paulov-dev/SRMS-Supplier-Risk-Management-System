import type { Prisma } from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"

import {
  weekWindow,
  weeklyEvolution,
} from "@/lib/dashboard-data"

import {
  homeAccess,
  allowedHomeLists,
  homeFilters,
  homeLists,
  PAGE_SIZE,
  recentTarget,
  type HomeData,
  type HomeItem,
  type HomeList,
  type HomePage,
} from "@/lib/home-data"

export const runtime = "nodejs"

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  })

const dateLabel = (date: Date) =>
  date.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  })

async function readList(
  tx: Prisma.TransactionClient,
  userId: string,
  key: HomeList,
  page: number,
  now: Date
): Promise<HomePage> {
  const filters = homeFilters(userId, now)

  const paging = {
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  }

  if (
    key === "logisticsPending" ||
    key === "logisticsReview" ||
    key === "logisticsQueue"
  ) {
    const [total, rows] = await Promise.all([
      tx.logisticsRequest.count({
        where: filters[key],
      }),

      tx.logisticsRequest.findMany({
        where: filters[key],
        ...paging,
        orderBy: [
          { priority: "desc" },
          { requestedAt: "asc" },
          { id: "asc" },
        ],
        select: {
          id: true,
          code: true,
          type: true,
          priority: true,
          requestedAt: true,
          riskEvent: {
            select: {
              code: true,
              supplier: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ])

    const priorityLabels = {
      LOW: "Baixa",
      MEDIUM: "Média",
      HIGH: "Alta",
      CRITICAL: "Crítica",
    }

    return {
      total,
      page,
      items: rows.map(row => ({
        id: row.id,
        label: row.code,
        detail: [
          row.riskEvent.code,
          row.riskEvent.supplier.name,
          row.type === "BOOK_INCLUSION"
            ? "Inclusão no book"
            : "Cálculo de buffer",
          `Prioridade ${priorityLabels[row.priority]}`,
          dateLabel(row.requestedAt),
        ].join(" · "),
        href: "/logistics",
        actionLabel: "Ir à Logística",
      })),
    }
  }

  if (key === "risks") {
    const [total, rows] = await Promise.all([
      tx.riskEvent.count({
        where: filters.risks,
      }),

      tx.riskEvent.findMany({
        where: filters.risks,
        ...paging,
        orderBy: [
          { updatedAt: "desc" },
          { id: "asc" },
        ],
        select: {
          id: true,
          code: true,
          supplier: {
            select: {
              name: true,
            },
          },
        },
      }),
    ])

    return {
      total,
      page,
      items: rows.map(risk => ({
        id: risk.id,
        label: risk.code,
        detail: risk.supplier.name,
        href: `/rms/${risk.id}`,
      })),
    }
  }

  if (key === "parts") {
    const [total, rows] = await Promise.all([
      tx.partNumber.count({
        where: filters.parts,
      }),

      tx.partNumber.findMany({
        where: filters.parts,
        ...paging,
        orderBy: [
          { partNumber: "asc" },
          { id: "asc" },
        ],
        select: {
          id: true,
          partNumber: true,
          description: true,
        },
      }),
    ])

    return {
      total,
      page,
      items: rows.map(part => ({
        id: part.id,
        label: part.partNumber,
        detail:
          part.description ??
          "PN atribuído a você em RM aberta",
        href: `/pns/${part.id}`,
      })),
    }
  }

  const [total, rows] = await Promise.all([
    tx.riskActionPlan.count({
      where: filters[key],
    }),

    tx.riskActionPlan.findMany({
      where: filters[key],
      ...paging,
      orderBy: [
        {
          dueDate: {
            sort: "asc",
            nulls: "last",
          },
        },
        { id: "asc" },
      ],
      select: {
        id: true,
        title: true,
        dueDate: true,
        riskEvent: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    }),
  ])

  return {
    total,
    page,
    items: rows.map(plan => ({
      id: plan.id,
      label: plan.title,
      detail: `${plan.riskEvent.code} · ${
        plan.dueDate
          ? `Prazo ${dateLabel(plan.dueDate)}`
          : "Sem prazo definido"
      }`,
      href: `/rms/${plan.riskEvent.id}`,
    })),
  }
}

async function readRecent(
  tx: Prisma.TransactionClient,
  userId: string,
  permissions: string[]
) {
  const access = homeAccess(permissions, [])

  const types = [
    ...(access.chart ? ["RiskEvent"] : []),
    ...(access.parts ? ["PartNumber"] : []),
    ...(access.suppliers ? ["Supplier"] : []),
  ]

  if (!types.length) return []

  const logs = await tx.auditLog.groupBy({
    by: ["entityType", "entityId"],
    where: {
      changedBy: userId,
      action: "RECENT_ITEM_OPEN",
      entityType: {
        in: types,
      },
    },
    _max: {
      createdAt: true,
    },
    orderBy: [
      {
        _max: {
          createdAt: "desc",
        },
      },
      { entityId: "asc" },
    ],
    take: 30,
  })

  const ids = (type: string) =>
    logs
      .filter(log => log.entityType === type)
      .map(log => log.entityId)

  const [risks, parts, suppliers] = await Promise.all([
    tx.riskEvent.findMany({
      where: {
        id: { in: ids("RiskEvent") },
      },
      select: {
        id: true,
        code: true,
      },
    }),

    tx.partNumber.findMany({
      where: {
        id: { in: ids("PartNumber") },
      },
      select: {
        id: true,
        partNumber: true,
      },
    }),

    tx.supplier.findMany({
      where: {
        id: { in: ids("Supplier") },
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ])

  const items = new Map<string, HomeItem>()

  for (const risk of risks) {
    items.set(`RiskEvent:${risk.id}`, {
      id: risk.id,
      label: risk.code,
      detail: "RM",
      href: `/rms/${risk.id}`,
    })
  }

  for (const part of parts) {
    items.set(`PartNumber:${part.id}`, {
      id: part.id,
      label: part.partNumber,
      detail: "PN",
      href: `/pns/${part.id}`,
    })
  }

  for (const supplier of suppliers) {
    items.set(`Supplier:${supplier.id}`, {
      id: supplier.id,
      label: supplier.name,
      detail: "Fornecedor",
      href: `/suppliers/${supplier.id}`,
    })
  }

  return logs.flatMap(log => {
    const item = items.get(
      `${log.entityType}:${log.entityId}`
    )

    return item
      ? [{
          ...item,
          detail: `${item.detail} · ${
            log._max.createdAt!.toLocaleString(
              "pt-BR",
              { timeZone: "America/Sao_Paulo" }
            )
          }`,
        }]
      : []
  }).slice(0, 6)
}

export async function GET(request: Request) {
  const user = await getUserFromRequest()

  if (!user) {
    return json({ error: "Não autenticado." }, 401)
  }

  try {
    const permissions = user.roles.flatMap(userRole =>
      userRole.role.permissions.map(
        rolePermission => rolePermission.permission.name
      )
    )

    const access = homeAccess(
      permissions,
      user.roles.map(userRole => userRole.role.name)
    )

    if (!user.isActive || !access.home) {
      await createAuditLog(prisma, {
        entityType: "Dashboard",
        entityId: user.id,
        changedBy: user.id,
        action: "DASHBOARD_DENIED",
      })

      return json(
        { error: "Sem permissão para acessar esta página." },
        403
      )
    }

    const params = new URL(request.url).searchParams

    const key = params.get("list")
    const page = Number(params.get("page") ?? "1")
    const scope = params.get("scope") ?? "all"

    if (
      (key !== null && !Object.hasOwn(homeLists, key)) ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !["mine", "all"].includes(scope)
    ) {
      await createAuditLog(prisma, {
        entityType: "Dashboard",
        entityId: user.id,
        changedBy: user.id,
        action: "DASHBOARD_INVALID_REQUEST",
      })

      return json({ error: "Filtro inválido." }, 400)
    }

    const allowed = allowedHomeLists(access)

    if (key && !allowed.includes(key as HomeList)) {
      await createAuditLog(prisma, {
        entityType: "Dashboard",
        entityId: user.id,
        changedBy: user.id,
        action: "DASHBOARD_LIST_DENIED",
        newValue: {
          list: key,
        },
      })

      return json(
        { error: "Sem permissão para consultar esta lista." },
        403
      )
    }

    const now = new Date()

    const result = await prisma.$transaction(
      async tx => {
        if (key) {
          const list = await readList(
            tx,
            user.id,
            key as HomeList,
            page,
            now
          )

          await createAuditLog(tx, {
            entityType: "Dashboard",
            entityId: user.id,
            changedBy: user.id,
            action: "DASHBOARD_LIST_VIEW",
            newValue: {
              list: key,
              page,
            },
          })

          return list
        }

        const entries = await Promise.all(
          allowed.map(async name => [
            name,
            await readList(
              tx,
              user.id,
              name,
              1,
              now
            ),
          ] as const)
        )

        const periods = weekWindow(now).map(
          ({ year, week }) => ({ year, week })
        )

        const [snapshots, states, recent] =
          await Promise.all([
            access.chart
              ? tx.weeklySnapshot.findMany({
                  where: {
                    OR: periods,
                    snapshotDate: { lte: now },
                  },
                  select: {
                    year: true,
                    week: true,
                    totalRisks: true,
                    openRisks: true,
                    snapshotDate: true,
                  },
                })
              : Promise.resolve([]),

            access.chart
              ? tx.weeklyRiskStateSnapshot.findMany({
                  where: {
                    OR: periods,
                    snapshotDate: { lte: now },
                  },
                  select: {
                    year: true,
                    week: true,
                    riskEventId: true,
                    workflowStatus: true,
                    riskLevel: true,
                    assignedToId: true,
                    snapshotDate: true,
                  },
                })
              : Promise.resolve([]),

            readRecent(tx, user.id, permissions),
          ])

        await createAuditLog(tx, {
          entityType: "Dashboard",
          entityId: user.id,
          changedBy: user.id,
          action: "DASHBOARD_VIEW",
          newValue: {
            chartScope: access.chart ? scope : null,
            lists: allowed,
          },
        })

        return {
          name: user.name,
          updatedAt: now.toISOString(),
          access,
          lists: Object.fromEntries(entries),
          recent,
          weeks: access.chart
            ? weeklyEvolution(
                snapshots,
                states,
                scope as "mine" | "all",
                user.id,
                now
              )
            : [],
        } as HomeData
      },
      {
        isolationLevel: "RepeatableRead",
        timeout: 15000,
      }
    )

    return json(result)
  } catch {
    return json(
      {
        error:
          "Não foi possível carregar ou auditar a página inicial.",
      },
      503
    )
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest()

  if (!user) {
    return json({ error: "Não autenticado." }, 401)
  }

  try {
    const target = recentTarget(
      (await request.json().catch(() => null))?.path
    )

    const permissions = user.roles.flatMap(userRole =>
      userRole.role.permissions.map(
        rolePermission => rolePermission.permission.name
      )
    )

    const allowed =
      target &&
      (
        target.kind === "suppliers"
          ? permissions.includes("SUPPLIER_VIEW")
          : target.kind === "rms"
            ? permissions.includes("RISK_VIEW")
            : permissions.some(permission =>
                [
                  "RISK_VIEW",
                  "RISK_CREATE",
                  "RISK_UPDATE",
                  "USER_MANAGE",
                ].includes(permission)
              )
      )

    if (
      !user.isActive ||
      request.headers.get("origin") !==
        new URL(request.url).origin ||
      !allowed ||
      !target
    ) {
      await createAuditLog(prisma, {
        entityType: "Dashboard",
        entityId: user.id,
        changedBy: user.id,
        action: "RECENT_ITEM_DENIED",
      })

      return json(
        { error: "Acesso recente não autorizado." },
        403
      )
    }

    const exists =
      target.kind === "rms"
        ? await prisma.riskEvent.findUnique({
            where: { id: target.id },
            select: { id: true },
          })
        : target.kind === "pns"
          ? await prisma.partNumber.findUnique({
              where: { id: target.id },
              select: { id: true },
            })
          : await prisma.supplier.findUnique({
              where: { id: target.id },
              select: { id: true },
            })

    await createAuditLog(prisma, {
      entityType: target.entityType,
      entityId: target.id,
      changedBy: user.id,
      action: exists
        ? "RECENT_ITEM_OPEN"
        : "RECENT_ITEM_NOT_FOUND",
    })

    return exists
      ? json({ ok: true })
      : json({ error: "Registro não encontrado." }, 404)
  } catch {
    return json(
      {
        error:
          "Não foi possível registrar o acesso recente.",
      },
      503
    )
  }
}