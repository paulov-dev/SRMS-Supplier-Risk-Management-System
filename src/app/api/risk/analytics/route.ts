import { NextResponse } from "next/server"
import {
  Prisma,
  RiskActionPlanStatus,
  RiskLevel,
  RiskOpeningReason,
  RiskWorkflowStatus,
} from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

function getPermissions(user: any): string[] {
  const permissions =
    user.roles?.flatMap((ur: any) =>
      ur.role.permissions.map(
        (rp: any) => String(rp.permission.name)
      )
    ) || []

  return Array.from(new Set<string>(permissions))
}

function buildRiskWhere(
  searchParams: URLSearchParams
): Prisma.RiskEventWhereInput {
  const search = searchParams.get("search") || ""
  const workflowStatus = searchParams.get("workflowStatus") || ""
  const riskLevel = searchParams.get("riskLevel") || ""
  const supplierId = searchParams.get("supplierId") || ""
  const assignedToId = searchParams.get("assignedToId") || ""
  const openingReason = searchParams.get("openingReason") || ""

  const where: Prisma.RiskEventWhereInput = {}

  if (search.trim()) {
    where.OR = [
      {
        code: {
          contains: search.trim(),
          mode: "insensitive",
        },
      },
      {
        title: {
          contains: search.trim(),
          mode: "insensitive",
        },
      },
      {
        supplier: {
          is: {
            name: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
      },
      {
        supplier: {
          is: {
            supplierCodeSap: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
      },
    ]
  }

  if (
    workflowStatus &&
    Object.values(RiskWorkflowStatus).includes(
      workflowStatus as RiskWorkflowStatus
    )
  ) {
    where.workflowStatus =
      workflowStatus as RiskWorkflowStatus
  }

  if (
    riskLevel &&
    Object.values(RiskLevel).includes(
      riskLevel as RiskLevel
    )
  ) {
    where.riskLevel = riskLevel as RiskLevel
  }

  if (supplierId) {
    where.supplierId = supplierId
  }

  if (assignedToId) {
    where.assignedToId = assignedToId
  }

  if (
    openingReason &&
    Object.values(RiskOpeningReason).includes(
      openingReason as RiskOpeningReason
    )
  ) {
    where.openingReason =
      openingReason as RiskOpeningReason
  }

  return where
}

function getOpeningReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    TIER_2_CHANGE: "Troca ou Adição de Tier 2",
    PLANT_CHANGE: "Alteração de Planta",
    SUPPLIER_TRANSFER_PHASE_OUT:
      "Transferência de Fornecedor (Phase Out)",
    MANUFACTURING_PROCESS_CHANGE:
      "Mudança no Processo de Fabricação",
  }

  return labels[reason] || reason
}

function getRiskAgeBucket(createdAt: Date) {
  const now = new Date()

  const diffInMs =
    now.getTime() - createdAt.getTime()

  const diffInDays = Math.floor(
    diffInMs / (1000 * 60 * 60 * 24)
  )

  if (diffInDays <= 7) {
    return "0 a 7 dias"
  }

  if (diffInDays <= 15) {
    return "8 a 15 dias"
  }

  if (diffInDays <= 30) {
    return "16 a 30 dias"
  }

  if (diffInDays <= 60) {
    return "31 a 60 dias"
  }

  return "Mais de 60 dias"
}

function sortByTotalDesc<T extends { total: number }>(
  data: T[]
) {
  return data.sort((a, b) => b.total - a.total)
}

function incrementMapValue<T extends Record<string, any>>(
  map: Map<string, T>,
  key: string,
  defaultValue: T,
  updater: (item: T) => void
) {
  if (!map.has(key)) {
    map.set(key, { ...defaultValue })
  }

  const item = map.get(key)

  if (item) {
    updater(item)
  }
}

export async function GET(req: Request) {
  try {
    const currentUser = await getUserFromRequest()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const permissions = getPermissions(currentUser)

    if (!permissions.includes("RISK_VIEW")) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para visualizar análises de RMs",
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const where = buildRiskWhere(searchParams)

    const risks = await prisma.riskEvent.findMany({
      where,
      include: {
        supplier: {
          include: {
            country: true,
          },
        },

        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        parts: {
          select: {
            id: true,
            status: true,
            logisticsStatus: true,
          },
        },

        actionPlans: {
          select: {
            id: true,
            dueDate: true,
            status: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },

        logistics: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        sequenceNumber: "asc",
      },
    })

    const now = new Date()

    const byResponsible = new Map<
      string,
      {
        responsible: string
        total: number
        open: number
        closed: number
        canceled: number
        red: number
        yellow: number
        green: number
      }
    >()

    const bySupplier = new Map<
      string,
      {
        supplier: string
        total: number
        open: number
        closed: number
        canceled: number
        red: number
        yellow: number
        green: number
      }
    >()

    const byCreatedBy = new Map<
      string,
      {
        user: string
        total: number
      }
    >()

    const byOpeningReason = new Map<
      string,
      {
        reason: string
        total: number
        red: number
        yellow: number
        green: number
      }
    >()

    const byCountry = new Map<
      string,
      {
        country: string
        total: number
      }
    >()

    const byWeek = new Map<
      string,
      {
        week: string
        year: number
        weekNumber: number
        total: number
        open: number
        closed: number
        canceled: number
        red: number
        yellow: number
        green: number
      }
    >()

    const byCodePrefix = new Map<
      string,
      {
        prefix: string
        total: number
      }
    >()

    const riskLevelDistribution = new Map<
      string,
      {
        level: string
        total: number
      }
    >()

    const workflowStatusDistribution = new Map<
      string,
      {
        status: string
        total: number
      }
    >()

    const openAgeBuckets = new Map<
      string,
      {
        bucket: string
        total: number
      }
    >()

    const partStatusDistribution = new Map<
      string,
      {
        status: string
        total: number
      }
    >()

    const partLogisticsStatusDistribution = new Map<
      string,
      {
        status: string
        total: number
      }
    >()

    const logisticsStatusDistribution = new Map<
      string,
      {
        status: string
        total: number
      }
    >()

    const overdueActionPlansByResponsible = new Map<
      string,
      {
        responsible: string
        total: number
      }
    >()

    const actionPlansByResponsible = new Map<
      string,
      {
        responsible: string
        total: number
        completed: number
        pending: number
        overdue: number
      }
    >()

    let total = 0
    let open = 0
    let closed = 0
    let canceled = 0

    let red = 0
    let yellow = 0
    let green = 0

    let national = 0
    let international = 0

    let withoutResponsible = 0
    let withoutParts = 0
    let withParts = 0

    let withLogistics = 0
    let withoutLogistics = 0
    let pendingLogistics = 0

    let totalParts = 0
    let totalActionPlans = 0
    let completedActionPlans = 0
    let pendingActionPlans = 0
    let overdueActionPlans = 0

    let openRedRisks = 0
    let openWithoutParts = 0
    let openWithoutResponsible = 0

    for (const risk of risks) {
      total += 1

      if (risk.workflowStatus === "OPEN") {
        open += 1
      }

      if (risk.workflowStatus === "CLOSED") {
        closed += 1
      }

      if (risk.workflowStatus === "CANCELED") {
        canceled += 1
      }

      if (risk.riskLevel === "RED") {
        red += 1
      }

      if (risk.riskLevel === "YELLOW") {
        yellow += 1
      }

      if (risk.riskLevel === "GREEN") {
        green += 1
      }

      if (
        risk.workflowStatus === "OPEN" &&
        risk.riskLevel === "RED"
      ) {
        openRedRisks += 1
      }

      if (risk.codePrefix === "RM") {
        national += 1
      }

      if (risk.codePrefix === "IRM") {
        international += 1
      }

      if (!risk.assignedTo) {
        withoutResponsible += 1
      }

      if (
        risk.workflowStatus === "OPEN" &&
        !risk.assignedTo
      ) {
        openWithoutResponsible += 1
      }

      if (risk.parts.length === 0) {
        withoutParts += 1
      } else {
        withParts += 1
      }

      if (
        risk.workflowStatus === "OPEN" &&
        risk.parts.length === 0
      ) {
        openWithoutParts += 1
      }

      if (risk.logistics.length > 0) {
        withLogistics += 1
      } else {
        withoutLogistics += 1
      }

      if (
        risk.logistics.some(
          (logistics) => logistics.status === "PENDING"
        )
      ) {
        pendingLogistics += 1
      }

      totalParts += risk.parts.length
      totalActionPlans += risk.actionPlans.length

      const responsibleName =
        risk.assignedTo?.name || "Sem responsável"

      incrementMapValue(
        byResponsible,
        responsibleName,
        {
          responsible: responsibleName,
          total: 0,
          open: 0,
          closed: 0,
          canceled: 0,
          red: 0,
          yellow: 0,
          green: 0,
        },
        (item) => {
          item.total += 1

          if (risk.workflowStatus === "OPEN") {
            item.open += 1
          }

          if (risk.workflowStatus === "CLOSED") {
            item.closed += 1
          }

          if (risk.workflowStatus === "CANCELED") {
            item.canceled += 1
          }

          if (risk.riskLevel === "RED") {
            item.red += 1
          }

          if (risk.riskLevel === "YELLOW") {
            item.yellow += 1
          }

          if (risk.riskLevel === "GREEN") {
            item.green += 1
          }
        }
      )

      const supplierName = risk.supplier.name

      incrementMapValue(
        bySupplier,
        supplierName,
        {
          supplier: supplierName,
          total: 0,
          open: 0,
          closed: 0,
          canceled: 0,
          red: 0,
          yellow: 0,
          green: 0,
        },
        (item) => {
          item.total += 1

          if (risk.workflowStatus === "OPEN") {
            item.open += 1
          }

          if (risk.workflowStatus === "CLOSED") {
            item.closed += 1
          }

          if (risk.workflowStatus === "CANCELED") {
            item.canceled += 1
          }

          if (risk.riskLevel === "RED") {
            item.red += 1
          }

          if (risk.riskLevel === "YELLOW") {
            item.yellow += 1
          }

          if (risk.riskLevel === "GREEN") {
            item.green += 1
          }
        }
      )

      const createdByName = risk.createdBy.name

      incrementMapValue(
        byCreatedBy,
        createdByName,
        {
          user: createdByName,
          total: 0,
        },
        (item) => {
          item.total += 1
        }
      )

      const reasonLabel = getOpeningReasonLabel(
        risk.openingReason
      )

      incrementMapValue(
        byOpeningReason,
        reasonLabel,
        {
          reason: reasonLabel,
          total: 0,
          red: 0,
          yellow: 0,
          green: 0,
        },
        (item) => {
          item.total += 1

          if (risk.riskLevel === "RED") {
            item.red += 1
          }

          if (risk.riskLevel === "YELLOW") {
            item.yellow += 1
          }

          if (risk.riskLevel === "GREEN") {
            item.green += 1
          }
        }
      )

      const countryName =
        risk.supplier.country?.name || "Sem país"

      incrementMapValue(
        byCountry,
        countryName,
        {
          country: countryName,
          total: 0,
        },
        (item) => {
          item.total += 1
        }
      )

      const weekKey = `${risk.createdYear}-W${String(
        risk.createdWeek
      ).padStart(2, "0")}`

      incrementMapValue(
        byWeek,
        weekKey,
        {
          week: `S${risk.createdWeek}/${risk.createdYear}`,
          year: risk.createdYear,
          weekNumber: risk.createdWeek,
          total: 0,
          open: 0,
          closed: 0,
          canceled: 0,
          red: 0,
          yellow: 0,
          green: 0,
        },
        (item) => {
          item.total += 1

          if (risk.workflowStatus === "OPEN") {
            item.open += 1
          }

          if (risk.workflowStatus === "CLOSED") {
            item.closed += 1
          }

          if (risk.workflowStatus === "CANCELED") {
            item.canceled += 1
          }

          if (risk.riskLevel === "RED") {
            item.red += 1
          }

          if (risk.riskLevel === "YELLOW") {
            item.yellow += 1
          }

          if (risk.riskLevel === "GREEN") {
            item.green += 1
          }
        }
      )

      incrementMapValue(
        byCodePrefix,
        risk.codePrefix,
        {
          prefix:
            risk.codePrefix === "RM"
              ? "Nacional"
              : "Internacional",
          total: 0,
        },
        (item) => {
          item.total += 1
        }
      )

      incrementMapValue(
        riskLevelDistribution,
        risk.riskLevel,
        {
          level: risk.riskLevel,
          total: 0,
        },
        (item) => {
          item.total += 1
        }
      )

      incrementMapValue(
        workflowStatusDistribution,
        risk.workflowStatus,
        {
          status: risk.workflowStatus,
          total: 0,
        },
        (item) => {
          item.total += 1
        }
      )

      if (risk.workflowStatus === "OPEN") {
        const bucket = getRiskAgeBucket(risk.createdAt)

        incrementMapValue(
          openAgeBuckets,
          bucket,
          {
            bucket,
            total: 0,
          },
          (item) => {
            item.total += 1
          }
        )
      }

      for (const part of risk.parts) {
        incrementMapValue(
          partStatusDistribution,
          part.status,
          {
            status: part.status,
            total: 0,
          },
          (item) => {
            item.total += 1
          }
        )

        incrementMapValue(
          partLogisticsStatusDistribution,
          part.logisticsStatus,
          {
            status: part.logisticsStatus,
            total: 0,
          },
          (item) => {
            item.total += 1
          }
        )
      }

      for (const logistics of risk.logistics) {
        incrementMapValue(
          logisticsStatusDistribution,
          logistics.status,
          {
            status: logistics.status,
            total: 0,
          },
          (item) => {
            item.total += 1
          }
        )
      }

      for (const plan of risk.actionPlans) {
        const planResponsible =
          plan.assignedTo?.name || "Sem responsável"

        const isCompleted =
          plan.status === RiskActionPlanStatus.COMPLETED

        const isCanceled =
          plan.status === RiskActionPlanStatus.CANCELED

        const isPending =
          !isCompleted && !isCanceled

        const isOverdue =
          isPending &&
          Boolean(plan.dueDate) &&
          plan.dueDate!.getTime() < now.getTime()

        if (isCompleted) {
          completedActionPlans += 1
        }

        if (isPending) {
          pendingActionPlans += 1
        }

        if (isOverdue) {
          overdueActionPlans += 1

          incrementMapValue(
            overdueActionPlansByResponsible,
            planResponsible,
            {
              responsible: planResponsible,
              total: 0,
            },
            (item) => {
              item.total += 1
            }
          )
        }

        incrementMapValue(
          actionPlansByResponsible,
          planResponsible,
          {
            responsible: planResponsible,
            total: 0,
            completed: 0,
            pending: 0,
            overdue: 0,
          },
          (item) => {
            item.total += 1

            if (isCompleted) {
              item.completed += 1
            }

            if (isPending) {
              item.pending += 1
            }

            if (isOverdue) {
              item.overdue += 1
            }
          }
        )
      }
    }

    const byWeekArray = Array.from(byWeek.values()).sort(
      (a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year
        }

        return a.weekNumber - b.weekNumber
      }
    )

    const response = {
      summary: {
        total,
        open,
        closed,
        canceled,

        red,
        yellow,
        green,

        national,
        international,

        withoutResponsible,
        withoutParts,
        withParts,

        withLogistics,
        withoutLogistics,
        pendingLogistics,

        totalParts,

        totalActionPlans,
        completedActionPlans,
        pendingActionPlans,
        overdueActionPlans,

        openRedRisks,
        openWithoutParts,
        openWithoutResponsible,
      },

      alerts: {
        openRedRisks,
        openWithoutParts,
        openWithoutResponsible,
        overdueActionPlans,
        pendingLogistics,
      },

      charts: {
        byResponsible: sortByTotalDesc(
          Array.from(byResponsible.values())
        ),

        statusByResponsible: sortByTotalDesc(
          Array.from(byResponsible.values())
        ),

        riskLevelByResponsible: sortByTotalDesc(
          Array.from(byResponsible.values())
        ),

        topSuppliers: sortByTotalDesc(
          Array.from(bySupplier.values())
        ).slice(0, 10),

        topCriticalSuppliers: Array.from(
          bySupplier.values()
        )
          .sort((a, b) => {
            if (b.red !== a.red) {
              return b.red - a.red
            }

            return b.total - a.total
          })
          .slice(0, 10),

        byRiskLevel: Array.from(
          riskLevelDistribution.values()
        ),

        byWorkflowStatus: Array.from(
          workflowStatusDistribution.values()
        ),

        byOpeningReason: sortByTotalDesc(
          Array.from(byOpeningReason.values())
        ),

        byCountry: sortByTotalDesc(
          Array.from(byCountry.values())
        ),

        nationalVsInternational: Array.from(
          byCodePrefix.values()
        ),

        byWeek: byWeekArray,

        byCreatedBy: sortByTotalDesc(
          Array.from(byCreatedBy.values())
        ),

        openAgeBuckets: [
          "0 a 7 dias",
          "8 a 15 dias",
          "16 a 30 dias",
          "31 a 60 dias",
          "Mais de 60 dias",
        ].map((bucket) => ({
          bucket,
          total:
            openAgeBuckets.get(bucket)?.total || 0,
        })),

        partStatusDistribution: Array.from(
          partStatusDistribution.values()
        ),

        partLogisticsStatusDistribution: Array.from(
          partLogisticsStatusDistribution.values()
        ),

        logisticsStatusDistribution: Array.from(
          logisticsStatusDistribution.values()
        ),

        overdueActionPlansByResponsible:
          sortByTotalDesc(
            Array.from(
              overdueActionPlansByResponsible.values()
            )
          ),

        actionPlansByResponsible: sortByTotalDesc(
          Array.from(actionPlansByResponsible.values())
        ),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Erro ao carregar análises das RMs:", error)

    return NextResponse.json(
      {
        error:
          "Erro ao carregar análises das RMs",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}