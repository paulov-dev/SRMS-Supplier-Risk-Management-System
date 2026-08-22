import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"
import { getRequestIp } from "@/app/api/lib/request-ip"

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
            "Sem permissão para consultar modelos veiculares",
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)

    const familyId =
      searchParams.get("familyId")?.trim() || ""

    const search =
      searchParams.get("search")?.trim() || ""

    const models = await prisma.vehicleModel.findMany({
      where: {
        ...(familyId ? { familyId } : {}),
        ...(search
          ? {
              OR: [
                {
                  code: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  family: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        family: true,
      },
      orderBy: [
        {
          family: {
            name: "asc",
          },
        },
        {
          code: "asc",
        },
      ],
    })

    return NextResponse.json(
      models.map((model) => ({
        id: model.id,
        familyId: model.familyId,
        code: model.code,
        name: model.name,
        description: model.description,
        isActive: model.isActive,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        family: {
          id: model.family.id,
          name: model.family.name,
        },
      }))
    )
  } catch (error) {
    console.error("ERRO AO BUSCAR MODELOS VEICULARES:", error)

    return NextResponse.json(
      {
        error: "Erro ao buscar modelos veiculares",
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
        "RISK_UPDATE",
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para cadastrar modelo veicular",
        },
        { status: 403 }
      )
    }

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const body = await req.json()

    const familyId =
      typeof body.familyId === "string"
        ? body.familyId.trim()
        : ""

    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : ""

    const name =
      typeof body.name === "string" &&
      body.name.trim()
        ? body.name.trim()
        : null

    const description =
      typeof body.description === "string" &&
      body.description.trim()
        ? body.description.trim()
        : null

    if (!familyId) {
      return NextResponse.json(
        { error: "Informe a classe/família" },
        { status: 400 }
      )
    }

    if (!code) {
      return NextResponse.json(
        { error: "Informe o código do modelo" },
        { status: 400 }
      )
    }

    const family = await prisma.vehicleFamily.findUnique({
      where: {
        id: familyId,
      },
    })

    if (!family) {
      return NextResponse.json(
        { error: "Classe/família não encontrada" },
        { status: 404 }
      )
    }

    if (!family.isActive) {
      return NextResponse.json(
        { error: "Classe/família inativa" },
        { status: 400 }
      )
    }

    const duplicated = await prisma.vehicleModel.findUnique({
      where: {
        familyId_code: {
          familyId,
          code,
        },
      },
    })

    if (duplicated) {
      return NextResponse.json(
        {
          error:
            "Já existe um modelo com este código nesta classe",
        },
        { status: 409 }
      )
    }

    const created = await prisma.$transaction(async (tx) => {
      const model = await tx.vehicleModel.create({
        data: {
          familyId,
          code,
          name,
          description,
          isActive: true,
        },
        include: {
          family: true,
        },
      })

      await createAuditLog(tx, {
        entityType: "VehicleModel",
        entityId: model.id,
        action: "VEHICLE_MODEL_CREATE",
        changedBy: currentUser.id,
        ipAddress,
        newValue: {
          id: model.id,
          familyId: model.familyId,
          familyName: model.family.name,
          code: model.code,
          name: model.name,
          description: model.description,
          isActive: model.isActive,
          changedByUser: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          },
          userAgent,
        },
      })

      return model
    })

    return NextResponse.json(
      {
        id: created.id,
        familyId: created.familyId,
        code: created.code,
        name: created.name,
        description: created.description,
        isActive: created.isActive,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        family: {
          id: created.family.id,
          name: created.family.name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("ERRO AO CADASTRAR MODELO VEICULAR:", error)

    return NextResponse.json(
      {
        error: "Erro ao cadastrar modelo veicular",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}