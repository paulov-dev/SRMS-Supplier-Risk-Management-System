import { NextResponse } from "next/server"
import {
  Prisma,
  RiskActionPlanPriority,
  RiskActionPlanStatus,
  RiskWorkflowStatus,
} from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createNotification } from "@/app/api/lib/createNotification"

function getPermissions(user: any): string[] {
  const permissions =
    user.roles?.flatMap((ur: any) =>
      ur.role.permissions.map((rp: any) =>
        String(rp.permission.name)
      )
    ) || []

  return Array.from(new Set<string>(permissions))
}

function getRoleNames(user: any): string[] {
  const roles =
    user.roles?.map((ur: any) =>
      String(ur.role.name)
    ) || []

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

function isValidPriority(value: unknown) {
  return Object.values(RiskActionPlanPriority).includes(
    value as RiskActionPlanPriority
  )
}

function formatActionPlan(plan: any) {
  const now = new Date()

  const dueDate = plan.dueDate
    ? new Date(plan.dueDate)
    : null

  const isOverdue =
    dueDate !== null &&
    dueDate < now &&
    ![
      RiskActionPlanStatus.COMPLETED,
      RiskActionPlanStatus.CANCELED,
    ].includes(plan.status)

  return {
    id: plan.id,

    title: plan.title,
    description: plan.description,
    requiredAction: plan.requiredAction,
    responsibleArea: plan.responsibleArea,

    dueDate: plan.dueDate,

    priority: plan.priority,
    status: plan.status,

    submittedAt: plan.submittedAt,
    validatedAt: plan.validatedAt,

    evidenceUrl: plan.evidenceUrl,
    closingNotes: plan.closingNotes,

    isOverdue,

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

    validatedBy: plan.validatedBy
      ? {
        id: plan.validatedBy.id,
        name: plan.validatedBy.name,
        email: plan.validatedBy.email,
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
            plan.riskEventPart.partNumber
              .partNumber,
          description:
            plan.riskEventPart.partNumber
              .description,
          vehicleProgram:
            plan.riskEventPart.partNumber
              .vehicleProgram,
        },
      }
      : null,
  }
}

const actionPlanInclude = {
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
  validatedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.RiskActionPlanInclude

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
        "RISK_UPDATE",
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para visualizar planos de ação",
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

    const actionPlans =
      await prisma.riskActionPlan.findMany({
        where: {
          riskEventId: id,
        },
        include: actionPlanInclude,
        orderBy: [
          {
            status: "asc",
          },
          {
            dueDate: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
      })

    return NextResponse.json({
      riskEventId: risk.id,
      code: risk.code,
      data: actionPlans.map(formatActionPlan),
    })
  } catch (error) {
    console.error(
      "Erro ao listar planos de ação:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Erro ao listar planos de ação",
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
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para criar plano de ação",
        },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await req.json()

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : ""

    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null

    const requiredAction =
      typeof body.requiredAction === "string"
        ? body.requiredAction.trim()
        : ""

    const responsibleArea =
      typeof body.responsibleArea === "string"
        ? body.responsibleArea.trim()
        : ""

    const assignedToId =
      typeof body.assignedToId === "string"
        ? body.assignedToId.trim()
        : ""

    const riskEventPartId =
      typeof body.riskEventPartId === "string"
        ? body.riskEventPartId.trim()
        : ""

    const dueDateRaw =
      typeof body.dueDate === "string"
        ? body.dueDate.trim()
        : ""

    const priorityRaw =
      typeof body.priority === "string"
        ? body.priority.trim()
        : RiskActionPlanPriority.MEDIUM

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Título do plano de ação é obrigatório",
        },
        { status: 400 }
      )
    }

    if (!requiredAction) {
      return NextResponse.json(
        {
          error:
            "Ação necessária do plano de ação é obrigatória",
        },
        { status: 400 }
      )
    }

    if (!responsibleArea) {
      return NextResponse.json(
        {
          error:
            "Área responsável é obrigatória",
        },
        { status: 400 }
      )
    }

    if (!riskEventPartId) {
      return NextResponse.json(
        {
          error:
            "PN vinculado ao plano de ação é obrigatório",
        },
        { status: 400 }
      )
    }

    if (!assignedToId) {
      return NextResponse.json(
        {
          error:
            "Responsável pelo plano de ação é obrigatório",
        },
        { status: 400 }
      )
    }

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

    if (!isValidPriority(priorityRaw)) {
      return NextResponse.json(
        {
          error:
            "Prioridade do plano de ação inválida",
        },
        { status: 400 }
      )
    }

    const priority =
      priorityRaw as RiskActionPlanPriority

    const risk = await prisma.riskEvent.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        code: true,
        workflowStatus: true,
        createdById: true,
        assignedToId: true,
      },
    })

    if (!risk) {
      return NextResponse.json(
        { error: "RM não encontrada" },
        { status: 404 }
      )
    }

    if (risk.workflowStatus !== RiskWorkflowStatus.OPEN) {
      return NextResponse.json(
        {
          error:
            "Só é possível criar plano de ação em uma RM aberta",
        },
        { status: 400 }
      )
    }

    const isAdmin = isAdminUser(currentUser)

    const isRiskOwner =
      risk.assignedToId === currentUser.id ||
      risk.createdById === currentUser.id

    if (!isAdmin && !isRiskOwner) {
      return NextResponse.json(
        {
          error:
            "Somente quem abriu a RM, o responsável pela RM ou um admin pode criar plano de ação",
        },
        { status: 403 }
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

    const assignedUser = await prisma.user.findUnique({
      where: {
        id: assignedToId,
      },
      select: {
        id: true,
        name: true,
        email: true,
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

    const userAgent =
      req.headers.get("user-agent") || null

    const ipAddress = getRequestIp(req)

    const createdActionPlan =
      await prisma.$transaction(async (tx) => {
        const plan =
          await tx.riskActionPlan.create({
            data: {
              riskEventId: risk.id,
              riskEventPartId,

              title,
              description,
              requiredAction,
              responsibleArea,

              dueDate,

              priority,
              status:
                RiskActionPlanStatus.OPEN,

              createdById: currentUser.id,
              assignedToId,
            },
            include: actionPlanInclude,
          })

        if (assignedToId !== currentUser.id) {
          const pnText =
            plan.riskEventPart?.partNumber
              ?.partNumber
              ? ` para o PN ${plan.riskEventPart.partNumber.partNumber}`
              : ""

          await createNotification(tx, {
            userId: assignedToId,
            title: "Plano de ação atribuído a você",
            message: `Você recebeu um plano de ação${pnText} na RM ${risk.code}: ${plan.title}`,
            type: "ACTION_PLAN_ASSIGNED",
            entity: "RiskEvent",
            entityId: risk.id,
          })
        }

        await tx.riskActionPlanHistory.create({
          data: {
            actionPlanId: plan.id,
            riskEventId: risk.id,

            riskEventPartId,
            partNumberId: riskPart.partNumberId,

            changeType:
              "ACTION_PLAN_CREATE",

            oldTitle: null,
            newTitle: plan.title,

            oldDescription: null,
            newDescription:
              plan.description,

            oldRequiredAction: null,
            newRequiredAction:
              plan.requiredAction,

            oldResponsibleArea: null,
            newResponsibleArea:
              plan.responsibleArea,

            oldDueDate: null,
            newDueDate: plan.dueDate,

            oldPriority: null,
            newPriority: plan.priority,

            oldStatus: null,
            newStatus: plan.status,

            oldAssignedToId: null,
            newAssignedToId:
              plan.assignedToId,

            oldEvidenceUrl: null,
            newEvidenceUrl:
              plan.evidenceUrl,

            oldClosingNotes: null,
            newClosingNotes:
              plan.closingNotes,

            reason: "Plano de ação criado.",

            changedById: currentUser.id,
          },
        })

        await tx.auditLog.create({
          data: {
            entityType: "RiskActionPlan",
            entityId: plan.id,
            action: "RISK_ACTION_PLAN_CREATE",
            changedBy: currentUser.id,
            ipAddress,
            newValue: toPrismaJsonObject({
              riskEventId: risk.id,
              riskCode: risk.code,

              actionPlanId: plan.id,

              riskEventPartId,
              partNumberId:
                riskPart.partNumberId,
              partNumber:
                riskPart.partNumber
                  .partNumber,

              title: plan.title,
              description:
                plan.description,
              requiredAction:
                plan.requiredAction,
              responsibleArea:
                plan.responsibleArea,

              dueDate: plan.dueDate,

              priority: plan.priority,
              status: plan.status,

              assignedToId:
                plan.assignedToId,
              assignedTo: assignedUser
                ? {
                  id: assignedUser.id,
                  name: assignedUser.name,
                  email:
                    assignedUser.email,
                }
                : null,

              createdById:
                plan.createdById,

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

    return NextResponse.json(
      {
        message:
          "Plano de ação criado com sucesso",
        data: formatActionPlan(createdActionPlan),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      "Erro ao criar plano de ação:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Erro ao criar plano de ação",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}