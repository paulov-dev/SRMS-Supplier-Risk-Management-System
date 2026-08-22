import { NextResponse } from "next/server"

import {
  PartRiskStatus,
  Prisma,
  RiskLevel,
  RiskPartLogisticsStatus,
} from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const items: string[] = []

  for (const item of value) {
    if (typeof item === "string") {
      const trimmed = item.trim()

      if (trimmed) {
        items.push(trimmed)
      }
    }
  }

  return Array.from(new Set(items))
}

function formatRiskPart(part: any) {
  return {
    id: part.id,
    status: part.status,
    logisticsStatus: part.logisticsStatus,
    createdAt: part.createdAt,
    updatedAt: part.updatedAt,

    partNumber: {
      id: part.partNumber.id,
      partNumber: part.partNumber.partNumber,
      description: part.partNumber.description,
      vehicleProgram:
        part.partNumber.vehicleProgram,
      createdAt: part.partNumber.createdAt,
    },

    assignedTo: part.assignedTo
      ? {
          id: part.assignedTo.id,
          name: part.assignedTo.name,
          email: part.assignedTo.email,
        }
      : null,

    vehicleApplications:
      part.vehicleApplications?.map((application: any) => {
        const partNumberVehicleApplication =
          application.partNumberVehicleApplication

        const vehicleModel =
          partNumberVehicleApplication.vehicleModel

        return {
          id: application.id,
          partNumberVehicleApplicationId:
            application.partNumberVehicleApplicationId,
          validFrom:
            partNumberVehicleApplication.validFrom,
          validTo:
            partNumberVehicleApplication.validTo,
          isActive:
            partNumberVehicleApplication.isActive,
          notes:
            partNumberVehicleApplication.notes,
          vehicleModel: {
            id: vehicleModel.id,
            code: vehicleModel.code,
            name: vehicleModel.name,
            description: vehicleModel.description,
            family: {
              id: vehicleModel.family.id,
              name: vehicleModel.family.name,
            },
          },
        }
      }) || [],
  }
}

function calculateRiskLevelFromPartStatuses(
  statuses: PartRiskStatus[]
): RiskLevel {
  if (statuses.length === 0) {
    return RiskLevel.YELLOW
  }

  if (statuses.includes(PartRiskStatus.RED)) {
    return RiskLevel.RED
  }

  if (statuses.includes(PartRiskStatus.YELLOW)) {
    return RiskLevel.YELLOW
  }

  if (statuses.includes(PartRiskStatus.GREEN)) {
    return RiskLevel.GREEN
  }

  if (
    statuses.every(
      (status) => status === PartRiskStatus.GREY
    )
  ) {
    return RiskLevel.GREY
  }

  if (
    statuses.every(
      (status) => status === PartRiskStatus.ORANGE
    )
  ) {
    return RiskLevel.ORANGE
  }

  if (
    statuses.every(
      (status) => status === PartRiskStatus.BLUE
    )
  ) {
    return RiskLevel.BLUE
  }

  return RiskLevel.BLUE
}

async function recalculateRiskEventLevel(
  tx: Prisma.TransactionClient,
  riskEventId: string
) {
  const parts = await tx.riskEventPart.findMany({
    where: {
      riskEventId,
    },
    select: {
      status: true,
    },
  })

  const statuses = parts.map((part) => part.status)

  const nextRiskLevel =
    calculateRiskLevelFromPartStatuses(statuses)

  await tx.riskEvent.update({
    where: {
      id: riskEventId,
    },
    data: {
      riskLevel: nextRiskLevel,
    },
  })

  return nextRiskLevel
}

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
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
        "RISK_VIEW",
        "RISK_CREATE",
        "RISK_UPDATE",
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para visualizar PNs da RM",
        },
        { status: 403 }
      )
    }

    const { id } = await params

    const risk = await prisma.riskEvent.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        code: true,
      },
    })

    if (!risk) {
      return NextResponse.json(
        { error: "RM não encontrada" },
        { status: 404 }
      )
    }

    const parts =
      await prisma.riskEventPart.findMany({
        where: {
          riskEventId: id,
        },
        include: {
          partNumber: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          vehicleApplications: {
            include: {
              partNumberVehicleApplication: {
                include: {
                  vehicleModel: {
                    include: {
                      family: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })

    return NextResponse.json({
      riskEventId: risk.id,
      code: risk.code,
      data: parts.map(formatRiskPart),
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro ao listar PNs da RM" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
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
        "RISK_UPDATE",
        "RISK_CREATE",
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para adicionar PN na RM",
        },
        { status: 403 }
      )
    }

    const { id } = await params

    const body = await req.json()

    const vehicleApplicationIds = normalizeStringArray(
      body.vehicleApplicationIds
    )

    const rawPartNumber =
      typeof body.partNumber === "string"
        ? body.partNumber.trim()
        : ""

    const partNumber = rawPartNumber.toUpperCase()

    const description =
      typeof body.description === "string" &&
      body.description.trim()
        ? body.description.trim()
        : null

    const vehicleProgram =
      typeof body.vehicleProgram === "string" &&
      body.vehicleProgram.trim()
        ? body.vehicleProgram.trim()
        : null

    const assignedToId =
      typeof body.assignedToId === "string" &&
      body.assignedToId.trim()
        ? body.assignedToId.trim()
        : null

    const status =
      typeof body.status === "string" &&
      Object.values(PartRiskStatus).includes(
        body.status as PartRiskStatus
      )
        ? (body.status as PartRiskStatus)
        : PartRiskStatus.YELLOW

    if (!partNumber) {
      return NextResponse.json(
        { error: "Número do PN é obrigatório" },
        { status: 400 }
      )
    }

    const risk = await prisma.riskEvent.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        code: true,
        workflowStatus: true,
        supplierId: true,
      },
    })

    if (!risk) {
      return NextResponse.json(
        { error: "RM não encontrada" },
        { status: 404 }
      )
    }

    if (risk.workflowStatus !== "OPEN") {
      return NextResponse.json(
        {
          error:
            "Só é possível adicionar PN em uma RM aberta",
        },
        { status: 400 }
      )
    }

    if (assignedToId) {
      const assignedUser =
        await prisma.user.findUnique({
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

    const userAgent =
      req.headers.get("user-agent") || null

    const ipAddress = getRequestIp(req)

    const result = await prisma.$transaction(
      async (tx) => {
        const partNumberUpdateData: Prisma.PartNumberUpdateInput =
          {}

        if (description) {
          partNumberUpdateData.description =
            description
        }

        if (vehicleProgram) {
          partNumberUpdateData.vehicleProgram =
            vehicleProgram
        }

        const masterPartNumber =
          await tx.partNumber.upsert({
            where: {
              partNumber,
            },
            create: {
              partNumber,
              description,
              vehicleProgram,
            },
            update: partNumberUpdateData,
          })

        const selectedApplications =
          vehicleApplicationIds.length > 0
            ? await tx.partNumberVehicleApplication.findMany({
                where: {
                  id: {
                    in: vehicleApplicationIds,
                  },
                  partNumberId: masterPartNumber.id,
                  isActive: true,
                  vehicleModel: {
                    isActive: true,
                    family: {
                      isActive: true,
                    },
                  },
                },
                select: {
                  id: true,
                },
              })
            : []

        if (
          selectedApplications.length !==
          vehicleApplicationIds.length
        ) {
          throw new Error(
            "Uma ou mais aplicações veiculares selecionadas são inválidas para este PN"
          )
        }

        const createdRiskPart =
          await tx.riskEventPart.create({
            data: {
              riskEventId: risk.id,
              partNumberId: masterPartNumber.id,
              status,
              logisticsStatus:
                RiskPartLogisticsStatus.NOT_REQUESTED,
              assignedToId,
              vehicleApplications:
                selectedApplications.length > 0
                  ? {
                      create:
                        selectedApplications.map(
                          (application) => ({
                            partNumberVehicleApplicationId:
                              application.id,
                          })
                        ),
                    }
                  : undefined,
            },
            include: {
              partNumber: true,
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              vehicleApplications: {
                include: {
                  partNumberVehicleApplication: {
                    include: {
                      vehicleModel: {
                        include: {
                          family: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          })

        await tx.auditLog.create({
          data: {
            entityType: "RiskEvent",
            entityId: risk.id,
            action: "RISK_PART_ADD",
            changedBy: currentUser.id,
            ipAddress,
            newValue: toPrismaJsonObject({
              riskEventId: risk.id,
              riskCode: risk.code,
              riskPartId: createdRiskPart.id,
              partNumberId: masterPartNumber.id,
              partNumber:
                masterPartNumber.partNumber,
              description:
                masterPartNumber.description,
              vehicleProgram:
                masterPartNumber.vehicleProgram,
              status:
                createdRiskPart.status,
              logisticsStatus:
                createdRiskPart.logisticsStatus,
              assignedToId:
                createdRiskPart.assignedToId,
              vehicleApplicationIds:
                selectedApplications.map(
                  (application) => application.id
                ),
              changedByUser: {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
              },
              userAgent,
            }),
          },
        })

        await recalculateRiskEventLevel(tx, risk.id)

        return createdRiskPart
      }
    )

    return NextResponse.json(
      {
        message:
          "PN adicionado à RM com sucesso",
        data: formatRiskPart(result),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message ===
        "Uma ou mais aplicações veiculares selecionadas são inválidas para este PN"
    ) {
      return NextResponse.json(
        {
          error:
            "Uma ou mais aplicações veiculares selecionadas são inválidas para este PN",
        },
        { status: 400 }
      )
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Este PN já está vinculado a esta RM",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Erro ao adicionar PN na RM" },
      { status: 500 }
    )
  }
}