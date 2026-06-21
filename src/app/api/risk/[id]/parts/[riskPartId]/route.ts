import { NextResponse } from "next/server"

import {
  PartRiskStatus,
  Prisma,
  RiskPartHistoryType,
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

function getRiskPartHistoryType(changedFields: string[]) {
  const hasStatus = changedFields.includes("status")
  const hasResponsible =
    changedFields.includes("assignedToId")
  const hasData =
    changedFields.includes("description") ||
    changedFields.includes("vehicleProgram")

  const totalTypes = [
    hasStatus,
    hasResponsible,
    hasData,
  ].filter(Boolean).length

  if (totalTypes > 1) {
    return RiskPartHistoryType.MULTIPLE_CHANGE
  }

  if (hasStatus) {
    return RiskPartHistoryType.STATUS_CHANGE
  }

  if (hasResponsible) {
    return RiskPartHistoryType.RESPONSIBLE_CHANGE
  }

  if (hasData) {
    return RiskPartHistoryType.DATA_CHANGE
  }

  return RiskPartHistoryType.NOTE
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
  }
}

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
      riskPartId: string
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
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para editar PN da RM",
        },
        { status: 403 }
      )
    }

    const { id, riskPartId } = await params

    const body = await req.json()

    const risk = await prisma.riskEvent.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        code: true,
        workflowStatus: true,
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
            "Só é possível editar PN de uma RM aberta",
        },
        { status: 400 }
      )
    }

    const currentRiskPart =
      await prisma.riskEventPart.findFirst({
        where: {
          id: riskPartId,
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
        },
      })

    if (!currentRiskPart) {
      return NextResponse.json(
        {
          error:
            "PN não encontrado nesta RM",
        },
        { status: 404 }
      )
    }

    const riskPartUpdateData: Prisma.RiskEventPartUpdateInput =
      {}

    const partNumberUpdateData: Prisma.PartNumberUpdateInput =
      {}

    const oldFields: Record<
      string,
      Prisma.InputJsonValue | null
    > = {}

    const newFields: Record<
      string,
      Prisma.InputJsonValue | null
    > = {}

    const changedFields: string[] = []

    let newStatus:
      | PartRiskStatus
      | undefined = undefined

    let newAssignedToId:
      | string
      | null
      | undefined = undefined

    let newDescription:
      | string
      | null
      | undefined = undefined

    let newVehicleProgram:
      | string
      | null
      | undefined = undefined

    if (
      typeof body.status === "string" &&
      body.status.trim()
    ) {
      const status = body.status as PartRiskStatus

      if (
        !Object.values(PartRiskStatus).includes(status)
      ) {
        return NextResponse.json(
          { error: "Status do PN inválido" },
          { status: 400 }
        )
      }

      if (status !== currentRiskPart.status) {
        riskPartUpdateData.status = status

        oldFields.status = currentRiskPart.status
        newFields.status = status

        changedFields.push("status")
        newStatus = status
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "assignedToId"
      )
    ) {
      let assignedToId:
        | string
        | null
        | undefined = undefined

      if (
        body.assignedToId === null ||
        body.assignedToId === "" ||
        body.assignedToId === "none"
      ) {
        assignedToId = null
      } else if (
        typeof body.assignedToId === "string"
      ) {
        assignedToId = body.assignedToId.trim()
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

        if (
          !assignedUser ||
          !assignedUser.isActive
        ) {
          return NextResponse.json(
            {
              error:
                "Responsável informado não existe ou está inativo",
            },
            { status: 400 }
          )
        }
      }

      if (
        assignedToId !== undefined &&
        assignedToId !==
          currentRiskPart.assignedToId
      ) {
        riskPartUpdateData.assignedTo = assignedToId
          ? {
              connect: {
                id: assignedToId,
              },
            }
          : {
              disconnect: true,
            }

        oldFields.assignedToId =
          currentRiskPart.assignedToId
        newFields.assignedToId = assignedToId

        changedFields.push("assignedToId")
        newAssignedToId = assignedToId
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "description"
      )
    ) {
      const description =
        typeof body.description === "string" &&
        body.description.trim()
          ? body.description.trim()
          : null

      if (
        description !==
        currentRiskPart.partNumber.description
      ) {
        partNumberUpdateData.description =
          description

        oldFields.description =
          currentRiskPart.partNumber.description
        newFields.description = description

        changedFields.push("description")
        newDescription = description
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "vehicleProgram"
      )
    ) {
      const vehicleProgram =
        typeof body.vehicleProgram === "string" &&
        body.vehicleProgram.trim()
          ? body.vehicleProgram.trim()
          : null

      if (
        vehicleProgram !==
        currentRiskPart.partNumber.vehicleProgram
      ) {
        partNumberUpdateData.vehicleProgram =
          vehicleProgram

        oldFields.vehicleProgram =
          currentRiskPart.partNumber.vehicleProgram
        newFields.vehicleProgram = vehicleProgram

        changedFields.push("vehicleProgram")
        newVehicleProgram = vehicleProgram
      }
    }

    const hasRiskPartChanges =
      Object.keys(riskPartUpdateData).length > 0

    const hasPartNumberChanges =
      Object.keys(partNumberUpdateData).length > 0

    if (
      !hasRiskPartChanges &&
      !hasPartNumberChanges
    ) {
      return NextResponse.json(
        {
          message:
            "Nenhuma alteração identificada",
          data: formatRiskPart(currentRiskPart),
        },
        { status: 200 }
      )
    }

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : ""

    if (!reason) {
      return NextResponse.json(
        {
          error:
            "Informe o motivo da alteração do PN",
        },
        { status: 400 }
      )
    }

    const userAgent =
      req.headers.get("user-agent") || null

    const ipAddress = getRequestIp(req)

    const updatedRiskPart =
      await prisma.$transaction(async (tx) => {
        if (hasPartNumberChanges) {
          await tx.partNumber.update({
            where: {
              id: currentRiskPart.partNumberId,
            },
            data: partNumberUpdateData,
          })
        }

        const updated =
          hasRiskPartChanges
            ? await tx.riskEventPart.update({
                where: {
                  id: currentRiskPart.id,
                },
                data: riskPartUpdateData,
                include: {
                  partNumber: true,
                  assignedTo: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              })
            : await tx.riskEventPart.findUniqueOrThrow({
                where: {
                  id: currentRiskPart.id,
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
                },
              })

        const history =
          await tx.riskEventPartHistory.create({
            data: {
              riskEventPartId:
                currentRiskPart.id,
              riskEventId: risk.id,
              partNumberId:
                currentRiskPart.partNumberId,

              changeType:
                getRiskPartHistoryType(
                  changedFields
                ),

              oldStatus:
                newStatus !== undefined
                  ? currentRiskPart.status
                  : null,
              newStatus:
                newStatus !== undefined
                  ? newStatus
                  : null,

              oldLogisticsStatus: null,
              newLogisticsStatus: null,

              oldAssignedToId:
                newAssignedToId !== undefined
                  ? currentRiskPart.assignedToId
                  : null,
              newAssignedToId:
                newAssignedToId !== undefined
                  ? newAssignedToId
                  : null,

              oldDescription:
                newDescription !== undefined
                  ? currentRiskPart.partNumber
                      .description
                  : null,
              newDescription:
                newDescription !== undefined
                  ? newDescription
                  : null,

              oldVehicleProgram:
                newVehicleProgram !== undefined
                  ? currentRiskPart.partNumber
                      .vehicleProgram
                  : null,
              newVehicleProgram:
                newVehicleProgram !== undefined
                  ? newVehicleProgram
                  : null,

              reason,
              changedById: currentUser.id,
            },
          })

        await tx.auditLog.create({
          data: {
            entityType: "RiskEvent",
            entityId: risk.id,
            action: "RISK_PART_UPDATE",
            changedBy: currentUser.id,
            ipAddress,
            oldValue: toPrismaJsonObject({
              riskEventId: risk.id,
              riskCode: risk.code,
              riskPartId:
                currentRiskPart.id,
              partNumberId:
                currentRiskPart.partNumberId,
              partNumber:
                currentRiskPart.partNumber
                  .partNumber,
              fields: oldFields,
            }),
            newValue: toPrismaJsonObject({
              riskEventId: risk.id,
              riskCode: risk.code,
              riskPartId: updated.id,
              partNumberId: updated.partNumberId,
              partNumber:
                updated.partNumber.partNumber,
              historyId: history.id,
              reason,
              fields: newFields,
              changedByUser: {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
              },
              userAgent,
            }),
          },
        })

        return updated
      })

    return NextResponse.json({
      message:
        "PN atualizado com sucesso",
      data: formatRiskPart(updatedRiskPart),
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          "Erro ao atualizar PN da RM",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
      riskPartId: string
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
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para remover PN da RM",
        },
        { status: 403 }
      )
    }

    const { id, riskPartId } = await params

    const risk = await prisma.riskEvent.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        code: true,
        workflowStatus: true,
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
            "Só é possível remover PN de uma RM aberta",
        },
        { status: 400 }
      )
    }

    const currentRiskPart =
      await prisma.riskEventPart.findFirst({
        where: {
          id: riskPartId,
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
        },
      })

    if (!currentRiskPart) {
      return NextResponse.json(
        {
          error:
            "PN não encontrado nesta RM",
        },
        { status: 404 }
      )
    }

    if (
      currentRiskPart.logisticsStatus !==
      RiskPartLogisticsStatus.NOT_REQUESTED
    ) {
      return NextResponse.json(
        {
          error:
            "Este PN já possui fluxo logístico. Não é possível removê-lo. Altere o status para cancelado, se necessário.",
        },
        { status: 400 }
      )
    }

    const userAgent =
      req.headers.get("user-agent") || null

    const ipAddress = getRequestIp(req)

    await prisma.$transaction(async (tx) => {
      await tx.riskEventPart.delete({
        where: {
          id: currentRiskPart.id,
        },
      })

      await tx.auditLog.create({
        data: {
          entityType: "RiskEvent",
          entityId: risk.id,
          action: "RISK_PART_DELETE",
          changedBy: currentUser.id,
          ipAddress,
          oldValue: toPrismaJsonObject({
            riskEventId: risk.id,
            riskCode: risk.code,
            riskPartId: currentRiskPart.id,
            status: currentRiskPart.status,
            logisticsStatus:
              currentRiskPart.logisticsStatus,
            assignedToId:
              currentRiskPart.assignedToId,
            partNumber: {
              id: currentRiskPart.partNumber.id,
              partNumber:
                currentRiskPart.partNumber
                  .partNumber,
              description:
                currentRiskPart.partNumber
                  .description,
              vehicleProgram:
                currentRiskPart.partNumber
                  .vehicleProgram,
            },
          }),
          newValue: toPrismaJsonObject({
            deleted: true,
            riskEventId: risk.id,
            riskCode: risk.code,
            riskPartId: currentRiskPart.id,
            changedByUser: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
            },
            userAgent,
          }),
        },
      })
    })

    return NextResponse.json({
      message:
        "PN removido da RM com sucesso",
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          "Erro ao remover PN da RM",
      },
      { status: 500 }
    )
  }
}