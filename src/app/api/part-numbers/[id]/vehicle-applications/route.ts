import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"
import { getRequestIp } from "@/app/api/lib/request-ip"

type Params = {
  params: Promise<{
    id: string
  }>
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

function parseDate(value: unknown) {
  if (!value) return null

  if (typeof value !== "string") {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function formatApplication(application: any) {
  return {
    id: application.id,

    partNumberId: application.partNumberId,
    vehicleModelId: application.vehicleModelId,

    validFrom: application.validFrom,
    validTo: application.validTo,

    isActive: application.isActive,
    notes: application.notes,

    createdAt: application.createdAt,
    updatedAt: application.updatedAt,

    vehicleModel: {
      id: application.vehicleModel.id,
      code: application.vehicleModel.code,
      name: application.vehicleModel.name,
      description: application.vehicleModel.description,
      family: {
        id: application.vehicleModel.family.id,
        name: application.vehicleModel.family.name,
      },
    },
  }
}

export async function GET(
  _req: Request,
  { params }: Params
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
            "Sem permissão para consultar aplicações veiculares do PN",
        },
        { status: 403 }
      )
    }

    const { id } = await params

    const partNumber = await prisma.partNumber.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        partNumber: true,
        description: true,
      },
    })

    if (!partNumber) {
      return NextResponse.json(
        { error: "PN não encontrado" },
        { status: 404 }
      )
    }

    const applications =
      await prisma.partNumberVehicleApplication.findMany({
        where: {
          partNumberId: id,
        },
        include: {
          vehicleModel: {
            include: {
              family: true,
            },
          },
        },
        orderBy: [
          {
            vehicleModel: {
              family: {
                name: "asc",
              },
            },
          },
          {
            vehicleModel: {
              code: "asc",
            },
          },
          {
            validTo: "asc",
          },
        ],
      })

    return NextResponse.json({
      partNumber,
      data: applications.map(formatApplication),
    })
  } catch (error) {
    console.error(
      "ERRO AO BUSCAR APLICAÇÕES VEICULARES DO PN:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Erro ao buscar aplicações veiculares do PN",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: Params
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
        "RISK_CREATE",
        "RISK_UPDATE",
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para cadastrar aplicação veicular do PN",
        },
        { status: 403 }
      )
    }

    const { id } = await params

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const body = await req.json()

    const vehicleModelId =
      typeof body.vehicleModelId === "string"
        ? body.vehicleModelId.trim()
        : ""

    const validFrom = parseDate(body.validFrom)
    const validTo = parseDate(body.validTo)

    const notes =
      typeof body.notes === "string" &&
      body.notes.trim()
        ? body.notes.trim()
        : null

    if (!vehicleModelId) {
      return NextResponse.json(
        { error: "Informe o modelo veicular" },
        { status: 400 }
      )
    }

    if (
      validFrom &&
      validTo &&
      validTo.getTime() < validFrom.getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "A data final não pode ser menor que a data inicial",
        },
        { status: 400 }
      )
    }

    const partNumber = await prisma.partNumber.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        partNumber: true,
        description: true,
      },
    })

    if (!partNumber) {
      return NextResponse.json(
        { error: "PN não encontrado" },
        { status: 404 }
      )
    }

    const vehicleModel = await prisma.vehicleModel.findUnique({
      where: {
        id: vehicleModelId,
      },
      include: {
        family: true,
      },
    })

    if (!vehicleModel) {
      return NextResponse.json(
        { error: "Modelo veicular não encontrado" },
        { status: 404 }
      )
    }

    if (!vehicleModel.isActive) {
      return NextResponse.json(
        { error: "Modelo veicular inativo" },
        { status: 400 }
      )
    }

    const existingApplication =
      await prisma.partNumberVehicleApplication.findFirst({
        where: {
          partNumberId: id,
          vehicleModelId,
          validFrom,
          validTo,
        },
      })

    if (existingApplication) {
      return NextResponse.json(
        {
          error:
            "Esta aplicação veicular já está cadastrada para este PN",
        },
        { status: 409 }
      )
    }

    const created =
      await prisma.$transaction(async (tx) => {
        const application =
          await tx.partNumberVehicleApplication.create({
            data: {
              partNumberId: id,
              vehicleModelId,
              validFrom,
              validTo,
              notes,
              isActive: true,
            },
            include: {
              vehicleModel: {
                include: {
                  family: true,
                },
              },
            },
          })

        await createAuditLog(tx, {
          entityType: "PartNumber",
          entityId: partNumber.id,
          action:
            "PART_NUMBER_VEHICLE_APPLICATION_CREATE",
          changedBy: currentUser.id,
          ipAddress,
          newValue: {
            partNumberId: partNumber.id,
            partNumber: partNumber.partNumber,
            description: partNumber.description,

            applicationId: application.id,

            vehicleModelId: vehicleModel.id,
            vehicleFamily:
              vehicleModel.family.name,
            vehicleModelCode: vehicleModel.code,
            vehicleModelName: vehicleModel.name,

            validFrom,
            validTo,
            notes,

            changedByUser: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
            },

            userAgent,
          },
        })

        return application
      })

    return NextResponse.json(
      formatApplication(created),
      { status: 201 }
    )
  } catch (error) {
    console.error(
      "ERRO AO CADASTRAR APLICAÇÃO VEICULAR DO PN:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Erro ao cadastrar aplicação veicular do PN",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}