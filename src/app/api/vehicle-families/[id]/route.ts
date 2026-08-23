import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

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

export async function PATCH(
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
        "RISK_UPDATE",
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para editar classe veicular",
        },
        { status: 403 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Identificador da classe não informado" },
        { status: 400 }
      )
    }

    const body = await req.json()

    const existing = await prisma.vehicleFamily.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Classe veicular não encontrada" },
        { status: 404 }
      )
    }

    const hasName =
      Object.prototype.hasOwnProperty.call(body, "name")
    const hasDescription =
      Object.prototype.hasOwnProperty.call(
        body,
        "description"
      )
    const hasIsActive =
      Object.prototype.hasOwnProperty.call(
        body,
        "isActive"
      )

    const nextName = hasName
      ? typeof body.name === "string"
        ? body.name.trim()
        : ""
      : existing.name

    const nextDescription = hasDescription
      ? typeof body.description === "string" &&
        body.description.trim()
        ? body.description.trim()
        : null
      : existing.description

    const nextIsActive = hasIsActive
      ? typeof body.isActive === "boolean"
        ? body.isActive
        : existing.isActive
      : existing.isActive

    if (!nextName) {
      return NextResponse.json(
        { error: "Informe o nome da classe" },
        { status: 400 }
      )
    }

    const duplicated =
      await prisma.vehicleFamily.findFirst({
        where: {
          id: { not: id },
          name: {
            equals: nextName,
            mode: "insensitive",
          },
        },
        select: { id: true },
      })

    if (duplicated) {
      return NextResponse.json(
        {
          error:
            "Já existe outra classe veicular com este nome",
        },
        { status: 409 }
      )
    }

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const updated = await prisma.$transaction(
      async (tx) => {
        const family = await tx.vehicleFamily.update({
          where: { id },
          data: {
            name: nextName,
            description: nextDescription,
            isActive: nextIsActive,
          },
        })

        await createAuditLog(tx, {
          entityType: "VehicleFamily",
          entityId: family.id,
          action: "VEHICLE_FAMILY_UPDATE",
          changedBy: currentUser.id,
          ipAddress,
          oldValue: {
            id: existing.id,
            name: existing.name,
            description: existing.description,
            isActive: existing.isActive,
          },
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
      }
    )

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
  } catch (error) {
    console.error(
      "ERRO AO EDITAR CLASSE VEICULAR:",
      error
    )

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Já existe outra classe veicular com este nome",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error: "Erro ao editar classe veicular",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}
