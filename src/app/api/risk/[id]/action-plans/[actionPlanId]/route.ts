import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createNotification } from "@/app/api/lib/createNotification"

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

function getRoleNames(user: any): string[] {
  const roles = user.roles.map((ur: any) =>
    String(ur.role.name)
  )

  return Array.from(new Set<string>(roles))
}

function hasAnyPermission(
  permissions: string[],
  allowed: string[]
) {
  return allowed.some((permission) =>
    permissions.includes(permission)
  )
}

function isAdminUser(user: any) {
  const permissions = getPermissions(user)
  const roles = getRoleNames(user)

  return (
    permissions.includes("USER_MANAGE") ||
    roles.includes("ADMIN") ||
    roles.includes("SUPER_ADMIN")
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

function toPrismaJsonObject(
  value: Record<string, unknown>
): Prisma.InputJsonObject {
  return JSON.parse(
    JSON.stringify(value)
  ) as Prisma.InputJsonObject
}

function formatActionPlan(plan: any) {
  const now = new Date()

  return {
    id: plan.id,

    description: plan.description,
    dueDate: plan.dueDate,

    isCompleted: plan.isCompleted,
    completedAt: plan.completedAt,

    isOverdue:
      !plan.isCompleted && new Date(plan.dueDate) < now,

    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,

    createdBy: plan.createdBy
      ? {
        id: plan.createdBy.id,
        name: plan.createdBy.name,
        email: plan.createdBy.email,
      }
      : null,

    assignedTo: plan.assignedTo
      ? {
        id: plan.assignedTo.id,
        name: plan.assignedTo.name,
        email: plan.assignedTo.email,
      }
      : null,

    riskEventPart: plan.riskEventPart
      ? {
        id: plan.riskEventPart.id,
        status: plan.riskEventPart.status,
        logisticsStatus:
          plan.riskEventPart.logisticsStatus,
        partNumber: {
          id: plan.riskEventPart.partNumber.id,
          partNumber:
            plan.riskEventPart.partNumber.partNumber,
          description:
            plan.riskEventPart.partNumber.description,
          vehicleProgram:
            plan.riskEventPart.partNumber
              .vehicleProgram,
        },
      }
      : null,
  }
}

function getActionPlanUpdateType(
  oldCompleted: boolean,
  newCompleted: boolean
) {
  if (!oldCompleted && newCompleted) {
    return "ACTION_PLAN_COMPLETE" as const
  }

  if (oldCompleted && !newCompleted) {
    return "ACTION_PLAN_REOPEN" as const
  }

  return "ACTION_PLAN_UPDATE" as const
}

function getDefaultHistoryReason(
  changeType:
    | "ACTION_PLAN_UPDATE"
    | "ACTION_PLAN_COMPLETE"
    | "ACTION_PLAN_REOPEN"
    | "ACTION_PLAN_DELETE"
) {
  switch (changeType) {
    case "ACTION_PLAN_COMPLETE":
      return "Plano de ação concluído."

    case "ACTION_PLAN_REOPEN":
      return "Plano de ação reaberto."

    case "ACTION_PLAN_DELETE":
      return "Plano de ação excluído."

    default:
      return "Plano de ação atualizado."
  }
}

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
      actionPlanId: string
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
            "Sem permissão para alterar plano de ação",
        },
        { status: 403 }
      )
    }

    const { id, actionPlanId } = await params

    const body = await req.json()

    const existingPlan =
      await prisma.riskActionPlan.findUnique({
        where: {
          id: actionPlanId,
        },
        include: {
          riskEvent: {
            select: {
              id: true,
              code: true,
              workflowStatus: true,
              createdById: true,
              assignedToId: true,
            },
          },
          riskEventPart: {
            include: {
              partNumber: true,
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
        },
      })

    if (!existingPlan || existingPlan.riskEventId !== id) {
      return NextResponse.json(
        {
          error:
            "Plano de ação não encontrado nesta RM",
        },
        { status: 404 }
      )
    }

    const risk = existingPlan.riskEvent

    if (risk.workflowStatus !== "OPEN") {
      return NextResponse.json(
        {
          error:
            "Só é possível alterar plano de ação em uma RM aberta",
        },
        { status: 400 }
      )
    }

    const isAdmin = isAdminUser(currentUser)

    const isRiskOwner =
      risk.assignedToId === currentUser.id ||
      risk.createdById === currentUser.id

    const isActionResponsible =
      existingPlan.assignedToId === currentUser.id

    if (!isAdmin && !isRiskOwner && !isActionResponsible) {
      return NextResponse.json(
        {
          error:
            "Somente o responsável pela ação, o dono da RM ou um admin pode alterar este plano de ação",
        },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {}

    const hasDescription =
      Object.prototype.hasOwnProperty.call(
        body,
        "description"
      )

    if (hasDescription) {
      const description =
        typeof body.description === "string"
          ? body.description.trim()
          : ""

      if (!description) {
        return NextResponse.json(
          {
            error:
              "Descrição do plano de ação é obrigatória",
          },
          { status: 400 }
        )
      }

      updateData.description = description
    }

    const hasDueDate =
      Object.prototype.hasOwnProperty.call(
        body,
        "dueDate"
      )

    if (hasDueDate) {
      const dueDateRaw =
        typeof body.dueDate === "string"
          ? body.dueDate.trim()
          : ""

      if (!dueDateRaw) {
        return NextResponse.json(
          {
            error:
              "Prazo do plano de ação é obrigatório",
          },
          { status: 400 }
        )
      }

      const dueDate = new Date(dueDateRaw)

      if (Number.isNaN(dueDate.getTime())) {
        return NextResponse.json(
          {
            error:
              "Prazo do plano de ação inválido",
          },
          { status: 400 }
        )
      }

      updateData.dueDate = dueDate
    }

    let nextAssignedToId: string | null = null

    const hasAssignedToId =
      Object.prototype.hasOwnProperty.call(
        body,
        "assignedToId"
      )

    if (hasAssignedToId) {
      const assignedToId =
        typeof body.assignedToId === "string"
          ? body.assignedToId.trim()
          : ""

      if (!assignedToId) {
        return NextResponse.json(
          {
            error:
              "Responsável pelo plano de ação é obrigatório",
          },
          { status: 400 }
        )
      }

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

      updateData.assignedToId = assignedToId
      nextAssignedToId = assignedToId
    }

    const hasRiskEventPartId =
      Object.prototype.hasOwnProperty.call(
        body,
        "riskEventPartId"
      )

    let newRiskPart:
      | {
        id: string
        partNumberId: string
        partNumber: {
          id: string
          partNumber: string
          description: string | null
          vehicleProgram: string | null
        }
      }
      | null = null

    if (hasRiskEventPartId) {
      const riskEventPartId =
        typeof body.riskEventPartId === "string"
          ? body.riskEventPartId.trim()
          : ""

      if (!riskEventPartId) {
        return NextResponse.json(
          {
            error:
              "PN vinculado ao plano de ação é obrigatório",
          },
          { status: 400 }
        )
      }

      const riskPart =
        await prisma.riskEventPart.findFirst({
          where: {
            id: riskEventPartId,
            riskEventId: risk.id,
          },
          include: {
            partNumber: true,
          },
        })

      if (!riskPart) {
        return NextResponse.json(
          {
            error:
              "PN informado não pertence a esta RM",
          },
          { status: 400 }
        )
      }

      newRiskPart = riskPart

      updateData.riskEventPartId = riskEventPartId
    }

    const hasIsCompleted =
      Object.prototype.hasOwnProperty.call(
        body,
        "isCompleted"
      )

    if (hasIsCompleted) {
      if (typeof body.isCompleted !== "boolean") {
        return NextResponse.json(
          {
            error:
              "Status de conclusão inválido",
          },
          { status: 400 }
        )
      }

      updateData.isCompleted = body.isCompleted
      updateData.completedAt = body.isCompleted
        ? new Date()
        : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error:
            "Nenhum campo informado para atualização",
        },
        { status: 400 }
      )
    }

    const reason =
      typeof body.reason === "string" &&
        body.reason.trim()
        ? body.reason.trim()
        : null

    const userAgent =
      req.headers.get("user-agent") || null

    const ipAddress = getRequestIp(req)

    const updatedActionPlan =
      await prisma.$transaction(async (tx) => {
        const plan = await tx.riskActionPlan.update({
          where: {
            id: existingPlan.id,
          },
          data: updateData,
          include: {
            riskEventPart: {
              include: {
                partNumber: true,
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
          },
        })

        const isChangingResponsible =
          hasAssignedToId &&
          nextAssignedToId !== null &&
          nextAssignedToId !== existingPlan.assignedToId

        if (
          isChangingResponsible &&
          nextAssignedToId &&
          nextAssignedToId !== currentUser.id
        ) {
          const pnText = plan.riskEventPart?.partNumber?.partNumber
            ? ` para o PN ${plan.riskEventPart.partNumber.partNumber}`
            : ""

          await createNotification(tx, {
            userId: nextAssignedToId,
            title: "Plano de ação atribuído a você",
            message: `Você recebeu um plano de ação${pnText} na RM ${risk.code}: ${plan.description}`,
            type: "ACTION_PLAN_ASSIGNED",
            entity: "RiskEvent",
            entityId: risk.id,
          })
        }

        const changeType = getActionPlanUpdateType(
          existingPlan.isCompleted,
          plan.isCompleted
        )

        const partForHistory =
          plan.riskEventPart || newRiskPart || null

        await tx.riskActionPlanHistory.create({
          data: {
            actionPlanId: plan.id,
            riskEventId: risk.id,

            riskEventPartId:
              partForHistory?.id || null,
            partNumberId:
              partForHistory?.partNumberId || null,

            changeType,

            oldDescription:
              existingPlan.description,
            newDescription: plan.description,

            oldDueDate: existingPlan.dueDate,
            newDueDate: plan.dueDate,

            oldAssignedToId:
              existingPlan.assignedToId,
            newAssignedToId: plan.assignedToId,

            oldCompleted:
              existingPlan.isCompleted,
            newCompleted: plan.isCompleted,

            reason:
              reason ||
              getDefaultHistoryReason(changeType),

            changedById: currentUser.id,
          },
        })

        const auditAction =
          changeType === "ACTION_PLAN_COMPLETE"
            ? "RISK_ACTION_PLAN_COMPLETE"
            : changeType === "ACTION_PLAN_REOPEN"
              ? "RISK_ACTION_PLAN_REOPEN"
              : "RISK_ACTION_PLAN_UPDATE"

        await createAuditLog(tx, {
          entityType: "RiskEvent",
          entityId: risk.id,
          action: auditAction,
          changedBy: currentUser.id,
          ipAddress,
          oldValue: {
            riskEventId: risk.id,
            riskCode: risk.code,

            actionPlanId: existingPlan.id,

            riskEventPartId: existingPlan.riskEventPartId,
            partNumberId:
              existingPlan.riskEventPart?.partNumberId || null,
            partNumber:
              existingPlan.riskEventPart?.partNumber.partNumber || null,

            description: existingPlan.description,
            dueDate: existingPlan.dueDate,

            assignedToId: existingPlan.assignedToId,

            isCompleted: existingPlan.isCompleted,
            completedAt: existingPlan.completedAt,
          },
          newValue: {
            riskEventId: risk.id,
            riskCode: risk.code,

            actionPlanId: plan.id,

            riskEventPartId: plan.riskEventPartId,
            partNumberId:
              plan.riskEventPart?.partNumberId || null,
            partNumber:
              plan.riskEventPart?.partNumber.partNumber || null,

            description: plan.description,
            dueDate: plan.dueDate,

            assignedToId: plan.assignedToId,

            isCompleted: plan.isCompleted,
            completedAt: plan.completedAt,

            changedByUser: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
            },

            userAgent,
          },
        })

        return plan
      })

    return NextResponse.json({
      message:
        "Plano de ação atualizado com sucesso",
      data: formatActionPlan(updatedActionPlan),
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          "Erro ao atualizar plano de ação",
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
      actionPlanId: string
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
            "Sem permissão para excluir plano de ação",
        },
        { status: 403 }
      )
    }

    const { id, actionPlanId } = await params

    const existingPlan =
      await prisma.riskActionPlan.findUnique({
        where: {
          id: actionPlanId,
        },
        include: {
          riskEvent: {
            select: {
              id: true,
              code: true,
              workflowStatus: true,
              createdById: true,
              assignedToId: true,
            },
          },
          riskEventPart: {
            include: {
              partNumber: true,
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
        },
      })

    if (!existingPlan || existingPlan.riskEventId !== id) {
      return NextResponse.json(
        {
          error:
            "Plano de ação não encontrado nesta RM",
        },
        { status: 404 }
      )
    }

    const risk = existingPlan.riskEvent

    if (risk.workflowStatus !== "OPEN") {
      return NextResponse.json(
        {
          error:
            "Só é possível excluir plano de ação em uma RM aberta",
        },
        { status: 400 }
      )
    }

    const isAdmin = isAdminUser(currentUser)

    const isRiskOwner =
      risk.assignedToId === currentUser.id ||
      risk.createdById === currentUser.id

    const isActionResponsible =
      existingPlan.assignedToId === currentUser.id

    if (!isAdmin && !isRiskOwner && !isActionResponsible) {
      return NextResponse.json(
        {
          error:
            "Somente o responsável pela ação, o dono da RM ou um admin pode excluir este plano de ação",
        },
        { status: 403 }
      )
    }

    const userAgent =
      req.headers.get("user-agent") || null

    const ipAddress = getRequestIp(req)

    await prisma.$transaction(async (tx) => {
      await tx.riskActionPlanHistory.create({
        data: {
          actionPlanId: existingPlan.id,
          riskEventId: risk.id,

          riskEventPartId:
            existingPlan.riskEventPartId,
          partNumberId:
            existingPlan.riskEventPart
              ?.partNumberId || null,

          changeType: "ACTION_PLAN_DELETE",

          oldDescription:
            existingPlan.description,
          newDescription: null,

          oldDueDate: existingPlan.dueDate,
          newDueDate: null,

          oldAssignedToId:
            existingPlan.assignedToId,
          newAssignedToId: null,

          oldCompleted:
            existingPlan.isCompleted,
          newCompleted: null,

          reason: "Plano de ação excluído.",

          changedById: currentUser.id,
        },
      })

      await tx.riskActionPlan.delete({
        where: {
          id: existingPlan.id,
        },
      })

      await createAuditLog(tx, {
        entityType: "RiskEvent",
        entityId: risk.id,
        action: "RISK_ACTION_PLAN_DELETE",
        changedBy: currentUser.id,
        ipAddress,
        oldValue: {
          riskEventId: risk.id,
          riskCode: risk.code,

          actionPlanId: existingPlan.id,

          riskEventPartId: existingPlan.riskEventPartId,
          partNumberId:
            existingPlan.riskEventPart?.partNumberId || null,
          partNumber:
            existingPlan.riskEventPart?.partNumber.partNumber || null,

          description: existingPlan.description,
          dueDate: existingPlan.dueDate,

          assignedToId: existingPlan.assignedToId,

          isCompleted: existingPlan.isCompleted,
          completedAt: existingPlan.completedAt,

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
      message:
        "Plano de ação excluído com sucesso",
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          "Erro ao excluir plano de ação",
      },
      { status: 500 }
    )
  }
}
