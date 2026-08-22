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
            "Sem permissão para editar modelo veicular",
        },
        { status: 403 }
      )
    }

    const { id } = await params

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const body = await req.json()

    const existing = await prisma.vehicleModel.findUnique({
      where: {
        id,
      },
      include: {
        family: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Modelo veicular não encontrado" },
        { status: 404 }
      )
    }

    const hasFamilyId =
      Object.prototype.hasOwnProperty.call(
        body,
        "familyId"
      )

    const hasCode = Object.prototype.hasOwnProperty.call(
      body,
      "code"
    )

    const hasName = Object.prototype.hasOwnProperty.call(
      body,
      "name"
    )

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

    const nextFamilyId =
      hasFamilyId && typeof body.familyId === "string"
        ? body.familyId.trim()
        : existing.familyId

    const nextCode =
      hasCode && typeof body.code === "string"
        ? body.code.trim()
        : existing.code

    const nextName = hasName
      ? typeof body.name === "string" &&
        body.name.trim()
        ? body.name.trim()
        : null
      : existing.name

    const nextDescription = hasDescription
      ? typeof body.description === "string" &&
        body.description.trim()
        ? body.description.trim()
        : null
      : existing.description

    const nextIsActive = hasIsActive
      ? Boolean(body.isActive)
      : existing.isActive

    if (!nextFamilyId) {
      return NextResponse.json(
        { error: "Informe a classe/família" },
        { status: 400 }
      )
    }

    if (!nextCode) {
      return NextResponse.json(
        { error: "Informe o código do modelo" },
        { status: 400 }
      )
    }

    const family = await prisma.vehicleFamily.findUnique({
      where: {
        id: nextFamilyId,
      },
    })

    if (!family) {
      return NextResponse.json(
        { error: "Classe/família não encontrada" },
        { status: 404 }
      )
    }

    const duplicated = await prisma.vehicleModel.findFirst({
      where: {
        id: {
          not: id,
        },
        familyId: nextFamilyId,
        code: nextCode,
      },
    })

    if (duplicated) {
      return NextResponse.json(
        {
          error:
            "Já existe outro modelo com este código nesta classe",
        },
        { status: 409 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const model = await tx.vehicleModel.update({
        where: {
          id,
        },
        data: {
          familyId: nextFamilyId,
          code: nextCode,
          name: nextName,
          description: nextDescription,
          isActive: nextIsActive,
        },
        include: {
          family: true,
        },
      })

      await createAuditLog(tx, {
        entityType: "VehicleModel",
        entityId: model.id,
        action: "VEHICLE_MODEL_UPDATE",
        changedBy: currentUser.id,
        ipAddress,
        oldValue: {
          id: existing.id,
          familyId: existing.familyId,
          familyName: existing.family.name,
          code: existing.code,
          name: existing.name,
          description: existing.description,
          isActive: existing.isActive,
        },
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

    return NextResponse.json({
      id: updated.id,
      familyId: updated.familyId,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      family: {
        id: updated.family.id,
        name: updated.family.name,
      },
    })
  } catch (error) {
    console.error("ERRO AO EDITAR MODELO VEICULAR:", error)

    return NextResponse.json(
      {
        error: "Erro ao editar modelo veicular",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}