import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

const allowedOpeningReasons = [
  "TIER_2_CHANGE",
  "PLANT_CHANGE",
  "SUPPLIER_TRANSFER_PHASE_OUT",
  "MANUFACTURING_PROCESS_CHANGE",
] as const

const allowedWorkflowStatuses = [
  "OPEN",
  "CLOSED",
  "CANCELED",
] as const

const allowedRiskLevels = [
  "GREEN",
  "YELLOW",
  "RED",
] as const

const openingReasonLabels: Record<string, string> = {
  TIER_2_CHANGE: "Troca ou Adição de Tier 2",
  PLANT_CHANGE: "Alteração de Planta",
  SUPPLIER_TRANSFER_PHASE_OUT:
    "Transferência de Fornecedor (Phase Out)",
  MANUFACTURING_PROCESS_CHANGE:
    "Mudança no Processo de Fabricação",
}

function getPermissions(user: any): string[] {
  const permissions = user.roles.flatMap((ur: any) =>
    ur.role.permissions.map((rp: any) =>
      String(rp.permission.name)
    )
  )

  return Array.from(new Set<string>(permissions))
}

function hasAnyPermission(
  permissions: string[],
  allowed: string[]
) {
  return allowed.some((permission) =>
    permissions.includes(permission)
  )
}

function normalizeIp(ip: string | null) {
  if (!ip) return null

  const cleanIp = ip.split(",")[0]?.trim()

  if (!cleanIp) return null

  if (cleanIp.startsWith("::ffff:")) {
    return cleanIp.replace("::ffff:", "")
  }

  if (cleanIp === "::1") {
    return "127.0.0.1"
  }

  return cleanIp
}

function getRequestIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")
  const realIp = req.headers.get("x-real-ip")
  const cfIp = req.headers.get("cf-connecting-ip")

  return normalizeIp(
    forwardedFor || realIp || cfIp || null
  )
}

function toPrismaJsonObject(
  value: Record<string, unknown>
): Prisma.InputJsonObject {
  return JSON.parse(
    JSON.stringify(value)
  ) as Prisma.InputJsonObject
}

function getIsoWeekAndYear(date = new Date()) {
  const target = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    )
  )

  const dayNumber =
    target.getUTCDay() === 0
      ? 7
      : target.getUTCDay()

  target.setUTCDate(
    target.getUTCDate() + 4 - dayNumber
  )

  const yearStart = new Date(
    Date.UTC(target.getUTCFullYear(), 0, 1)
  )

  const week = Math.ceil(
    ((target.getTime() - yearStart.getTime()) /
      86400000 +
      1) /
      7
  )

  return {
    week,
    year: target.getUTCFullYear(),
  }
}

function formatRiskItem(risk: any) {
  return {
    id: risk.id,

    code: risk.code,
    sequenceNumber: risk.sequenceNumber,
    codePrefix: risk.codePrefix,

    title: risk.title,
    description: risk.description,

    openingReason: risk.openingReason,

    workflowStatus: risk.workflowStatus,
    riskLevel: risk.riskLevel,

    createdWeek: risk.createdWeek,
    createdYear: risk.createdYear,

    createdAt: risk.createdAt,
    updatedAt: risk.updatedAt,
    closedAt: risk.closedAt,

    supplier: risk.supplier
      ? {
          id: risk.supplier.id,
          name: risk.supplier.name,
          supplierCodeSap:
            risk.supplier.supplierCodeSap,
          country: risk.supplier.country
            ? {
                id: risk.supplier.country.id,
                name: risk.supplier.country.name,
                isoCode:
                  risk.supplier.country.isoCode,
              }
            : null,
        }
      : null,

    createdBy: risk.createdBy
      ? {
          id: risk.createdBy.id,
          name: risk.createdBy.name,
          email: risk.createdBy.email,
        }
      : null,

    assignedTo: risk.assignedTo
      ? {
          id: risk.assignedTo.id,
          name: risk.assignedTo.name,
          email: risk.assignedTo.email,
        }
      : null,

    closedBy: risk.closedBy
      ? {
          id: risk.closedBy.id,
          name: risk.closedBy.name,
          email: risk.closedBy.email,
        }
      : null,

    counts: {
      parts: risk._count?.parts ?? 0,
      actionPlans: risk._count?.actionPlans ?? 0,
      logistics: risk._count?.logistics ?? 0,
    },
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

    if (!hasAnyPermission(permissions, ["RISK_VIEW"])) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para visualizar RMs",
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)

    const pageParam = Number(
      searchParams.get("page") || "1"
    )

    const pageSizeParam = Number(
      searchParams.get("pageSize") || "20"
    )

    const page =
      Number.isFinite(pageParam) && pageParam > 0
        ? pageParam
        : 1

    const pageSize =
      Number.isFinite(pageSizeParam) &&
      pageSizeParam > 0
        ? Math.min(pageSizeParam, 100)
        : 20

    const search =
      searchParams.get("search")?.trim() || ""

    const workflowStatus =
      searchParams.get("workflowStatus")?.trim() || ""

    const riskLevel =
      searchParams.get("riskLevel")?.trim() || ""

    const supplierId =
      searchParams.get("supplierId")?.trim() || ""

    const assignedToId =
      searchParams.get("assignedToId")?.trim() || ""

    const openingReason =
      searchParams.get("openingReason")?.trim() || ""

    const where: Prisma.RiskEventWhereInput = {}

    if (search) {
      where.OR = [
        {
          code: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          supplier: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          supplier: {
            supplierCodeSap: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ]
    }

    if (
      workflowStatus &&
      allowedWorkflowStatuses.includes(
        workflowStatus as any
      )
    ) {
      where.workflowStatus = workflowStatus as any
    }

    if (
      riskLevel &&
      allowedRiskLevels.includes(riskLevel as any)
    ) {
      where.riskLevel = riskLevel as any
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    if (assignedToId) {
      where.assignedToId = assignedToId
    }

    if (
      openingReason &&
      allowedOpeningReasons.includes(
        openingReason as any
      )
    ) {
      where.openingReason = openingReason as any
    }

    const skip = (page - 1) * pageSize

    const [
      total,
      open,
      closed,
      red,
      yellow,
      green,
      risks,
    ] = await prisma.$transaction([
      prisma.riskEvent.count({
        where,
      }),

      prisma.riskEvent.count({
        where: {
          ...where,
          workflowStatus: "OPEN",
        },
      }),

      prisma.riskEvent.count({
        where: {
          ...where,
          workflowStatus: "CLOSED",
        },
      }),

      prisma.riskEvent.count({
        where: {
          ...where,
          riskLevel: "RED",
        },
      }),

      prisma.riskEvent.count({
        where: {
          ...where,
          riskLevel: "YELLOW",
        },
      }),

      prisma.riskEvent.count({
        where: {
          ...where,
          riskLevel: "GREEN",
        },
      }),

      prisma.riskEvent.findMany({
        where,
        include: {
          supplier: {
            include: {
              country: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          closedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              parts: true,
              actionPlans: true,
              logistics: true,
            },
          },
        },
        orderBy: [
          {
            sequenceNumber: "asc",
          },
        ],
        skip,
        take: pageSize,
      }),
    ])

    const totalPages =
      total > 0 ? Math.ceil(total / pageSize) : 1

    return NextResponse.json({
      data: risks.map(formatRiskItem),

      stats: {
        total,
        open,
        closed,
        red,
        yellow,
        green,
      },

      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error("ERRO AO LISTAR RMS:", error)

    return NextResponse.json(
      {
        error: "Erro ao listar RMs",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getUserFromRequest()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const permissions = getPermissions(currentUser)

    if (
      !hasAnyPermission(permissions, [
        "RISK_CREATE",
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para criar RM",
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    const supplierId =
      typeof body.supplierId === "string"
        ? body.supplierId.trim()
        : ""

    const openingReason =
      typeof body.openingReason === "string"
        ? body.openingReason.trim()
        : ""

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : ""

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : ""

    const assignedToId =
      typeof body.assignedToId === "string"
        ? body.assignedToId.trim()
        : ""

    const riskLevel =
      typeof body.riskLevel === "string"
        ? body.riskLevel.trim()
        : "GREEN"

    if (!supplierId) {
      return NextResponse.json(
        {
          error: "Fornecedor é obrigatório",
        },
        { status: 400 }
      )
    }

    if (
      !openingReason ||
      !allowedOpeningReasons.includes(
        openingReason as any
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Motivo de abertura inválido ou não informado",
        },
        { status: 400 }
      )
    }

    if (
      riskLevel &&
      !allowedRiskLevels.includes(riskLevel as any)
    ) {
      return NextResponse.json(
        {
          error: "Farol da RM inválido",
        },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
      include: {
        country: true,
      },
    })

    if (!supplier) {
      return NextResponse.json(
        {
          error:
            "Fornecedor não encontrado",
        },
        { status: 404 }
      )
    }

    let assignedUser:
      | {
          id: string
          isActive: boolean
        }
      | null = null

    if (assignedToId && assignedToId !== "none") {
      assignedUser = await prisma.user.findUnique({
        where: {
          id: assignedToId,
        },
        select: {
          id: true,
          isActive: true,
        },
      })

      if (!assignedUser || !assignedUser.isActive) {
        return NextResponse.json(
          {
            error:
              "Responsável informado não existe ou está inativo",
          },
          { status: 400 }
        )
      }
    }

    const codePrefix =
      supplier.country?.isoCode?.toUpperCase() === "BR"
        ? "RM"
        : "IRM"

    const { week, year } = getIsoWeekAndYear()

    const userAgent =
      req.headers.get("user-agent") || null

    const ipAddress = getRequestIp(req)

    const createdRisk =
      await prisma.$transaction(async (tx) => {
        const sequence = await tx.riskSequence.upsert({
          where: {
            key: "RISK_EVENT",
          },
          create: {
            key: "RISK_EVENT",
            currentNumber: 1,
          },
          update: {
            currentNumber: {
              increment: 1,
            },
          },
        })

        const sequenceNumber =
          sequence.currentNumber

        const code = `${codePrefix}${String(
          sequenceNumber
        ).padStart(3, "0")}`

        const risk = await tx.riskEvent.create({
          data: {
            code,
            sequenceNumber,
            codePrefix: codePrefix as any,

            title:
              title ||
              openingReasonLabels[openingReason] ||
              code,

            description: description || null,

            openingReason: openingReason as any,

            supplierId: supplier.id,

            workflowStatus: "OPEN",
            riskLevel: riskLevel as any,

            createdWeek: week,
            createdYear: year,

            createdById: currentUser.id,
            assignedToId:
              assignedToId && assignedToId !== "none"
                ? assignedToId
                : null,
          },
          include: {
            supplier: {
              include: {
                country: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            closedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                parts: true,
                actionPlans: true,
                logistics: true,
              },
            },
          },
        })

        await tx.auditLog.create({
          data: {
            entityType: "RiskEvent",
            entityId: risk.id,
            action: "RISK_CREATE",
            changedBy: currentUser.id,
            ipAddress,
            newValue: toPrismaJsonObject({
              id: risk.id,
              code: risk.code,
              sequenceNumber:
                risk.sequenceNumber,
              codePrefix: risk.codePrefix,

              title: risk.title,
              description: risk.description,

              openingReason:
                risk.openingReason,

              supplierId: risk.supplierId,
              supplierName: supplier.name,

              workflowStatus:
                risk.workflowStatus,
              riskLevel: risk.riskLevel,

              createdWeek: risk.createdWeek,
              createdYear: risk.createdYear,

              createdById: currentUser.id,
              assignedToId:
                risk.assignedToId,

              createdByUser: {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
              },

              userAgent,
            }),
          },
        })

        return risk
      })

    return NextResponse.json(
      {
        message: "RM criada com sucesso",
        data: formatRiskItem(createdRisk),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("ERRO AO CRIAR RM:", error)

    return NextResponse.json(
      {
        error: "Erro ao criar RM",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}
