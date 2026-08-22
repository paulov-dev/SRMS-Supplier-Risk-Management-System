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

export async function GET() {
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
            "Sem permissão para consultar classes veiculares",
        },
        { status: 403 }
      )
    }

    const families = await prisma.vehicleFamily.findMany({
      include: {
        models: {
          orderBy: {
            code: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(
      families.map((family) => ({
        id: family.id,
        name: family.name,
        description: family.description,
        isActive: family.isActive,
        createdAt: family.createdAt,
        updatedAt: family.updatedAt,
        models: family.models.map((model) => ({
          id: model.id,
          familyId: model.familyId,
          code: model.code,
          name: model.name,
          description: model.description,
          isActive: model.isActive,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt,
        })),
      }))
    )
  } catch (error) {
    console.error("ERRO AO BUSCAR CLASSES VEICULARES:", error)

    return NextResponse.json(
      {
        error: "Erro ao buscar classes veiculares",
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
            "Sem permissão para cadastrar classe veicular",
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : ""

    const description =
      typeof body.description === "string" &&
      body.description.trim()
        ? body.description.trim()
        : null

    if (!name) {
      return NextResponse.json(
        { error: "Informe o nome da classe" },
        { status: 400 }
      )
    }

    const existing = await prisma.vehicleFamily.findUnique({
      where: {
        name,
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Já existe uma classe veicular com este nome",
        },
        { status: 409 }
      )
    }

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const created = await prisma.$transaction(async (tx) => {
      const family = await tx.vehicleFamily.create({
        data: {
          name,
          description,
          isActive: true,
        },
      })

      await createAuditLog(tx, {
        entityType: "VehicleFamily",
        entityId: family.id,
        action: "VEHICLE_FAMILY_CREATE",
        changedBy: currentUser.id,
        ipAddress,
        newValue: {
          id: family.id,
          name: family.name,
          description: family.description,
          isActive: family.isActive,
          changedByUser: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          },
          userAgent,
        },
      })

      return family
    })

    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        description: created.description,
        isActive: created.isActive,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        models: [],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("ERRO AO CADASTRAR CLASSE VEICULAR:", error)

    return NextResponse.json(
      {
        error: "Erro ao cadastrar classe veicular",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}