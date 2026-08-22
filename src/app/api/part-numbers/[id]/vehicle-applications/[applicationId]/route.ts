import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"
import { getRequestIp } from "@/app/api/lib/request-ip"

type Params = {
  params: Promise<{
    id: string
    applicationId: string
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
            "Sem permissão para editar aplicação veicular do PN",
        },
        { status: 403 }
      )
    }

    const { id, applicationId } = await params

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const body = await req.json()

    const existing =
      await prisma.partNumberVehicleApplication.findFirst({
        where: {
          id: applicationId,
          partNumberId: id,
        },
        include: {
          partNumber: {
            select: {
              id: true,
              partNumber: true,
              description: true,
            },
          },
          vehicleModel: {
            include: {
              family: true,
            },
          },
        },
      })

    if (!existing) {
      return NextResponse.json(
        { error: "Aplicação veicular não encontrada" },
        { status: 404 }
      )
    }

    const hasVehicleModelId =
      Object.prototype.hasOwnProperty.call(
        body,
        "vehicleModelId"
      )

    const hasValidFrom =
      Object.prototype.hasOwnProperty.call(
        body,
        "validFrom"
      )

    const hasValidTo =
      Object.prototype.hasOwnProperty.call(
        body,
        "validTo"
      )

    const hasNotes =
      Object.prototype.hasOwnProperty.call(
        body,
        "notes"
      )

    const hasIsActive =
      Object.prototype.hasOwnProperty.call(
        body,
        "isActive"
      )

    const nextVehicleModelId =
      hasVehicleModelId &&
      typeof body.vehicleModelId === "string"
        ? body.vehicleModelId.trim()
        : existing.vehicleModelId

    const nextValidFrom = hasValidFrom
      ? parseDate(body.validFrom)
      : existing.validFrom

    const nextValidTo = hasValidTo
      ? parseDate(body.validTo)
      : existing.validTo

    const nextNotes = hasNotes
      ? typeof body.notes === "string" &&
        body.notes.trim()
        ? body.notes.trim()
        : null
      : existing.notes

    const nextIsActive = hasIsActive
      ? Boolean(body.isActive)
      : existing.isActive

    if (!nextVehicleModelId) {
      return NextResponse.json(
        { error: "Informe o modelo veicular" },
        { status: 400 }
      )
    }

    if (
      nextValidFrom &&
      nextValidTo &&
      nextValidTo.getTime() < nextValidFrom.getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "A data final não pode ser menor que a data inicial",
        },
        { status: 400 }
      )
    }

    const vehicleModel =
      await prisma.vehicleModel.findUnique({
        where: {
          id: nextVehicleModelId,
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

    const duplicated =
      await prisma.partNumberVehicleApplication.findFirst({
        where: {
          id: {
            not: applicationId,
          },
          partNumberId: id,
          vehicleModelId: nextVehicleModelId,
          validFrom: nextValidFrom,
          validTo: nextValidTo,
        },
      })

    if (duplicated) {
      return NextResponse.json(
        {
          error:
            "Já existe uma aplicação veicular igual cadastrada para este PN",
        },
        { status: 409 }
      )
    }

    const updated =
      await prisma.$transaction(async (tx) => {
        const application =
          await tx.partNumberVehicleApplication.update({
            where: {
              id: applicationId,
            },
            data: {
              vehicleModelId: nextVehicleModelId,
              validFrom: nextValidFrom,
              validTo: nextValidTo,
              notes: nextNotes,
              isActive: nextIsActive,
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
          entityId: existing.partNumber.id,
          action:
            "PART_NUMBER_VEHICLE_APPLICATION_UPDATE",
          changedBy: currentUser.id,
          ipAddress,
          oldValue: {
            partNumberId: existing.partNumber.id,
            partNumber: existing.partNumber.partNumber,
            description: existing.partNumber.description,

            applicationId: existing.id,

            vehicleModelId: existing.vehicleModel.id,
            vehicleFamily:
              existing.vehicleModel.family.name,
            vehicleModelCode:
              existing.vehicleModel.code,
            vehicleModelName:
              existing.vehicleModel.name,

            validFrom: existing.validFrom,
            validTo: existing.validTo,
            notes: existing.notes,
            isActive: existing.isActive,
          },
          newValue: {
            partNumberId: existing.partNumber.id,
            partNumber: existing.partNumber.partNumber,
            description: existing.partNumber.description,

            applicationId: application.id,

            vehicleModelId: application.vehicleModel.id,
            vehicleFamily:
              application.vehicleModel.family.name,
            vehicleModelCode:
              application.vehicleModel.code,
            vehicleModelName:
              application.vehicleModel.name,

            validFrom: application.validFrom,
            validTo: application.validTo,
            notes: application.notes,
            isActive: application.isActive,

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
      formatApplication(updated)
    )
  } catch (error) {
    console.error(
      "ERRO AO EDITAR APLICAÇÃO VEICULAR DO PN:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Erro ao editar aplicação veicular do PN",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
            "Sem permissão para excluir aplicação veicular do PN",
        },
        { status: 403 }
      )
    }

    const { id, applicationId } = await params

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const existing =
      await prisma.partNumberVehicleApplication.findFirst({
        where: {
          id: applicationId,
          partNumberId: id,
        },
        include: {
          partNumber: {
            select: {
              id: true,
              partNumber: true,
              description: true,
            },
          },
          vehicleModel: {
            include: {
              family: true,
            },
          },
          riskEventPartApplications: {
            select: {
              id: true,
            },
          },
        },
      })

    if (!existing) {
      return NextResponse.json(
        { error: "Aplicação veicular não encontrada" },
        { status: 404 }
      )
    }

    if (existing.riskEventPartApplications.length > 0) {
      return NextResponse.json(
        {
          error:
            "Esta aplicação já está vinculada a uma RM. Inative a aplicação em vez de excluir.",
        },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.partNumberVehicleApplication.delete({
        where: {
          id: applicationId,
        },
      })

      await createAuditLog(tx, {
        entityType: "PartNumber",
        entityId: existing.partNumber.id,
        action:
          "PART_NUMBER_VEHICLE_APPLICATION_DELETE",
        changedBy: currentUser.id,
        ipAddress,
        oldValue: {
          partNumberId: existing.partNumber.id,
          partNumber: existing.partNumber.partNumber,
          description: existing.partNumber.description,

          applicationId: existing.id,

          vehicleModelId: existing.vehicleModel.id,
          vehicleFamily:
            existing.vehicleModel.family.name,
          vehicleModelCode:
            existing.vehicleModel.code,
          vehicleModelName:
            existing.vehicleModel.name,

          validFrom: existing.validFrom,
          validTo: existing.validTo,
          notes: existing.notes,
          isActive: existing.isActive,

          deletedByUser: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          },

          userAgent,
        },
      })
    })

    return NextResponse.json({
      message: "Aplicação veicular excluída com sucesso",
    })
  } catch (error) {
    console.error(
      "ERRO AO EXCLUIR APLICAÇÃO VEICULAR DO PN:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Erro ao excluir aplicação veicular do PN",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}