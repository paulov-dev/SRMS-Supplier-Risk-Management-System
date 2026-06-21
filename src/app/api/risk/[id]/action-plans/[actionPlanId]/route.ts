import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

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
          partNumber: {
            id: plan.riskEventPart.partNumber.id,
            partNumber:
              plan.riskEventPart.partNumber.partNumber,
            description:
              plan.riskEventPart.partNumber.description,
            vehicleProgram:
              plan.riskEventPart.partNumber.vehicleProgram,
          },
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
            "Sem permissão para editar plano de ação",
        },
        { status: 403 }
      )
    }

    const { id, actionPlanId } = await params

    const body = await req.json()

    const currentPlan =
      await prisma.riskActionPlan.findFirst({
        where: {
          id: actionPlanId,
          riskEventId: id,
        },
        include: {
          riskEvent: {
            select: {
              id: true,
              code: true,
              workflowStatus: true,
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

    if (!currentPlan) {
      return NextResponse.json(
        {
          error:
            "Plano de ação não encontrado nesta RM",
        },
        { status: 404 }
      )
    }

    if (
      currentPlan.riskEvent.workflowStatus !== "OPEN"
    ) {
      return NextResponse.json(
        {
          error:
            "Só é possível alterar plano de ação de uma RM aberta",
        },
        { status: 400 }
      )
    }

    const updateData: Prisma.RiskActionPlanUpdateInput =
      {}

    const oldFields: Record<
      string,
      Prisma.InputJsonValue | null
    > = {}

    const newFields: Record<
      string,
      Prisma.InputJsonValue | null
    > = {}

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "description"
      )
    ) {
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

      if (description !== currentPlan.description) {
        updateData.description = description

        oldFields.description =
          currentPlan.description
        newFields.description = description
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "dueDate"
      )
    ) {
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

      if (
        dueDate.getTime() !==
        new Date(currentPlan.dueDate).getTime()
      ) {
        updateData.dueDate = dueDate

        oldFields.dueDate = currentPlan.dueDate
        newFields.dueDate = dueDate
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "assignedToId"
      )
    ) {
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

      if (assignedToId !== currentPlan.assignedToId) {
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

        updateData.assignedTo = {
          connect: {
            id: assignedToId,
          },
        }

        oldFields.assignedToId =
          currentPlan.assignedToId
        newFields.assignedToId = assignedToId
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "isCompleted"
      )
    ) {
      if (typeof body.isCompleted !== "boolean") {
        return NextResponse.json(
          {
            error:
              "Status de conclusão inválido",
          },
          { status: 400 }
        )
      }

      if (body.isCompleted !== currentPlan.isCompleted) {
        updateData.isCompleted = body.isCompleted
        updateData.completedAt = body.isCompleted
          ? new Date()
          : null

        oldFields.isCompleted =
          currentPlan.isCompleted
        newFields.isCompleted = body.isCompleted

        oldFields.completedAt =
          currentPlan.completedAt
        newFields.completedAt =
          updateData.completedAt as Date | null
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          message:
            "Nenhuma alteração identificada",
          data: formatActionPlan(currentPlan),
        },
        { status: 200 }
      )
    }

    const userAgent =
      req.headers.get("user-agent") || null

    const ipAddress = getRequestIp(req)

    const updatedPlan =
      await prisma.$transaction(async (tx) => {
        const plan = await tx.riskActionPlan.update({
          where: {
            id: currentPlan.id,
          },
          data: updateData,
          include: {
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

        await tx.auditLog.create({
          data: {
            entityType: "RiskEvent",
            entityId: currentPlan.riskEvent.id,
            action: "RISK_ACTION_PLAN_UPDATE",
            changedBy: currentUser.id,
            ipAddress,
            oldValue: toPrismaJsonObject({
              riskEventId:
                currentPlan.riskEvent.id,
              riskCode:
                currentPlan.riskEvent.code,
              actionPlanId: currentPlan.id,
              fields: oldFields,
            }),
            newValue: toPrismaJsonObject({
              riskEventId:
                currentPlan.riskEvent.id,
              riskCode:
                currentPlan.riskEvent.code,
              actionPlanId: currentPlan.id,
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

        return plan
      })

    return NextResponse.json({
      message:
        "Plano de ação atualizado com sucesso",
      data: formatActionPlan(updatedPlan),
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

    const currentPlan =
      await prisma.riskActionPlan.findFirst({
        where: {
          id: actionPlanId,
          riskEventId: id,
        },
        include: {
          riskEvent: {
            select: {
              id: true,
              code: true,
              workflowStatus: true,
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

    if (!currentPlan) {
      return NextResponse.json(
        {
          error:
            "Plano de ação não encontrado nesta RM",
        },
        { status: 404 }
      )
    }

    if (
      currentPlan.riskEvent.workflowStatus !== "OPEN"
    ) {
      return NextResponse.json(
        {
          error:
            "Só é possível excluir plano de ação de uma RM aberta",
        },
        { status: 400 }
      )
    }

    const userAgent =
      req.headers.get("user-agent") || null

    const ipAddress = getRequestIp(req)

    await prisma.$transaction(async (tx) => {
      await tx.riskActionPlan.delete({
        where: {
          id: currentPlan.id,
        },
      })

      await tx.auditLog.create({
        data: {
          entityType: "RiskEvent",
          entityId: currentPlan.riskEvent.id,
          action: "RISK_ACTION_PLAN_DELETE",
          changedBy: currentUser.id,
          ipAddress,
          oldValue: toPrismaJsonObject({
            riskEventId:
              currentPlan.riskEvent.id,
            riskCode:
              currentPlan.riskEvent.code,
            actionPlanId: currentPlan.id,
            description: currentPlan.description,
            dueDate: currentPlan.dueDate,
            isCompleted:
              currentPlan.isCompleted,
            completedAt: currentPlan.completedAt,
            assignedToId:
              currentPlan.assignedToId,
            createdById:
              currentPlan.createdById,
            deletedByUser: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
            },
            userAgent,
          }),
          newValue: toPrismaJsonObject({
            deleted: true,
          }),
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