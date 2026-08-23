import { NextResponse } from "next/server"
import {
  Prisma,
  RiskActionPlanHistoryType,
  RiskActionPlanPriority,
  RiskActionPlanStatus,
  RiskWorkflowStatus,
} from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createNotification } from "@/app/api/lib/createNotification"
import { createAuditLog } from "@/app/api/lib/createAuditLog"
import { getRequestIp } from "@/app/api/lib/request-ip"

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

function isValidPriority(value: unknown) {
  return Object.values(RiskActionPlanPriority).includes(
    value as RiskActionPlanPriority
  )
}

function isValidStatus(value: unknown) {
  return Object.values(RiskActionPlanStatus).includes(
    value as RiskActionPlanStatus
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

function getHistoryTypeFromStatusChange(
  oldStatus: RiskActionPlanStatus,
  newStatus: RiskActionPlanStatus
) {
  if (
    oldStatus === RiskActionPlanStatus.OPEN &&
    newStatus === RiskActionPlanStatus.IN_PROGRESS
  ) {
    return RiskActionPlanHistoryType.ACTION_PLAN_START
  }

  if (
    newStatus ===
    RiskActionPlanStatus.WAITING_VALIDATION
  ) {
    return RiskActionPlanHistoryType.ACTION_PLAN_SUBMIT_VALIDATION
  }

  if (newStatus === RiskActionPlanStatus.COMPLETED) {
    return RiskActionPlanHistoryType.ACTION_PLAN_VALIDATE
  }

  if (newStatus === RiskActionPlanStatus.CANCELED) {
    return RiskActionPlanHistoryType.ACTION_PLAN_CANCEL
  }

  if (oldStatus === RiskActionPlanStatus.COMPLETED) {
    return RiskActionPlanHistoryType.ACTION_PLAN_REOPEN
  }

  return RiskActionPlanHistoryType.ACTION_PLAN_UPDATE
}

function getDefaultHistoryReason(
  changeType: RiskActionPlanHistoryType
) {
  switch (changeType) {
    case RiskActionPlanHistoryType.ACTION_PLAN_START:
      return "Plano de ação iniciado."

    case RiskActionPlanHistoryType.ACTION_PLAN_SUBMIT_VALIDATION:
      return "Plano de ação enviado para validação."

    case RiskActionPlanHistoryType.ACTION_PLAN_VALIDATE:
      return "Plano de ação validado e concluído."

    case RiskActionPlanHistoryType.ACTION_PLAN_REOPEN:
      return "Plano de ação reaberto."

    case RiskActionPlanHistoryType.ACTION_PLAN_CANCEL:
      return "Plano de ação cancelado."

    case RiskActionPlanHistoryType.ACTION_PLAN_DELETE:
      return "Plano de ação excluído."

    default:
      return "Plano de ação atualizado."
  }
}

function getAuditAction(changeType: RiskActionPlanHistoryType) {
  switch (changeType) {
    case RiskActionPlanHistoryType.ACTION_PLAN_START:
      return "RISK_ACTION_PLAN_START"

    case RiskActionPlanHistoryType.ACTION_PLAN_SUBMIT_VALIDATION:
      return "RISK_ACTION_PLAN_SUBMIT_VALIDATION"

    case RiskActionPlanHistoryType.ACTION_PLAN_VALIDATE:
      return "RISK_ACTION_PLAN_VALIDATE"

    case RiskActionPlanHistoryType.ACTION_PLAN_REOPEN:
      return "RISK_ACTION_PLAN_REOPEN"

    case RiskActionPlanHistoryType.ACTION_PLAN_CANCEL:
      return "RISK_ACTION_PLAN_CANCEL"

    case RiskActionPlanHistoryType.ACTION_PLAN_DELETE:
      return "RISK_ACTION_PLAN_DELETE"

    default:
      return "RISK_ACTION_PLAN_UPDATE"
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
          validatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

    if (
      !existingPlan ||
      existingPlan.riskEventId !== id
    ) {
      return NextResponse.json(
        {
          error:
            "Plano de ação não encontrado nesta RM",
        },
        { status: 404 }
      )
    }

    const risk = existingPlan.riskEvent

    if (
      risk.workflowStatus !==
      RiskWorkflowStatus.OPEN
    ) {
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

    if (
      !isAdmin &&
      !isRiskOwner &&
      !isActionResponsible
    ) {
      return NextResponse.json(
        {
          error:
            "Somente o responsável pela ação, o responsável pela RM, quem abriu a RM ou um admin pode alterar este plano de ação",
        },
        { status: 403 }
      )
    }

    const canValidateOrManage =
      isAdmin || isRiskOwner

    const canExecute =
      isActionResponsible ||
      canValidateOrManage

    const action =
      typeof body.action === "string"
        ? body.action.trim().toUpperCase()
        : "UPDATE"

    const updateData: Prisma.RiskActionPlanUpdateInput =
      {}

    let nextRiskPart:
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

    if (action === "START") {
      if (!canExecute) {
        return NextResponse.json(
          {
            error:
              "Somente o responsável pela ação pode iniciar este plano.",
          },
          { status: 403 }
        )
      }

      if (
        existingPlan.status !==
        RiskActionPlanStatus.OPEN
      ) {
        return NextResponse.json(
          {
            error:
              "Somente planos abertos podem ser iniciados.",
          },
          { status: 400 }
        )
      }

      updateData.status =
        RiskActionPlanStatus.IN_PROGRESS
    }

    if (action === "SUBMIT_VALIDATION") {
      if (!canExecute) {
        return NextResponse.json(
          {
            error:
              "Somente o responsável pela ação pode enviar este plano para validação.",
          },
          { status: 403 }
        )
      }

      const allowedSubmitStatuses: RiskActionPlanStatus[] = [
        RiskActionPlanStatus.OPEN,
        RiskActionPlanStatus.IN_PROGRESS,
      ]

      if (!allowedSubmitStatuses.includes(existingPlan.status)) {
        return NextResponse.json(
          {
            error:
              "Somente planos abertos ou em andamento podem ser enviados para validação.",
          },
          { status: 400 }
        )
      }

      const evidenceUrl =
        typeof body.evidenceUrl === "string"
          ? body.evidenceUrl.trim() || null
          : existingPlan.evidenceUrl

      const closingNotes =
        typeof body.closingNotes === "string"
          ? body.closingNotes.trim() || null
          : existingPlan.closingNotes

      updateData.status =
        RiskActionPlanStatus.WAITING_VALIDATION
      updateData.submittedAt = new Date()
      updateData.evidenceUrl = evidenceUrl
      updateData.closingNotes = closingNotes
    }

    if (action === "VALIDATE") {
      if (!canValidateOrManage) {
        return NextResponse.json(
          {
            error:
              "Somente o responsável pela RM, quem abriu a RM ou um admin pode validar este plano.",
          },
          { status: 403 }
        )
      }

      if (
        existingPlan.status !==
        RiskActionPlanStatus.WAITING_VALIDATION
      ) {
        return NextResponse.json(
          {
            error:
              "Somente planos aguardando validação podem ser validados.",
          },
          { status: 400 }
        )
      }

      updateData.status =
        RiskActionPlanStatus.COMPLETED
      updateData.validatedAt = new Date()
      updateData.validatedBy = {
        connect: {
          id: currentUser.id,
        },
      }
    }

    if (action === "REOPEN") {
      if (!canValidateOrManage) {
        return NextResponse.json(
          {
            error:
              "Somente o responsável pela RM, quem abriu a RM ou um admin pode reabrir este plano.",
          },
          { status: 403 }
        )
      }

      updateData.status =
        RiskActionPlanStatus.IN_PROGRESS
      updateData.validatedAt = null
      updateData.validatedBy = {
        disconnect: true,
      }
    }

    if (action === "CANCEL") {
      if (!canValidateOrManage) {
        return NextResponse.json(
          {
            error:
              "Somente o responsável pela RM, quem abriu a RM ou um admin pode cancelar este plano.",
          },
          { status: 403 }
        )
      }

      updateData.status =
        RiskActionPlanStatus.CANCELED
    }

    if (action === "UPDATE") {
      const hasManagerFields =
        Object.prototype.hasOwnProperty.call(
          body,
          "title"
        ) ||
        Object.prototype.hasOwnProperty.call(
          body,
          "description"
        ) ||
        Object.prototype.hasOwnProperty.call(
          body,
          "requiredAction"
        ) ||
        Object.prototype.hasOwnProperty.call(
          body,
          "responsibleArea"
        ) ||
        Object.prototype.hasOwnProperty.call(
          body,
          "dueDate"
        ) ||
        Object.prototype.hasOwnProperty.call(
          body,
          "priority"
        ) ||
        Object.prototype.hasOwnProperty.call(
          body,
          "assignedToId"
        ) ||
        Object.prototype.hasOwnProperty.call(
          body,
          "riskEventPartId"
        )

      if (hasManagerFields && !canValidateOrManage) {
        return NextResponse.json(
          {
            error:
              "Somente o responsável pela RM, quem abriu a RM ou um admin pode editar dados principais do plano.",
          },
          { status: 403 }
        )
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "title"
        )
      ) {
        const title =
          typeof body.title === "string"
            ? body.title.trim()
            : ""

        if (!title) {
          return NextResponse.json(
            {
              error:
                "Título do plano de ação é obrigatório",
            },
            { status: 400 }
          )
        }

        updateData.title = title
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "description"
        )
      ) {
        updateData.description =
          typeof body.description === "string"
            ? body.description.trim() || null
            : null
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "requiredAction"
        )
      ) {
        const requiredAction =
          typeof body.requiredAction === "string"
            ? body.requiredAction.trim()
            : ""

        if (!requiredAction) {
          return NextResponse.json(
            {
              error:
                "Ação necessária do plano de ação é obrigatória",
            },
            { status: 400 }
          )
        }

        updateData.requiredAction =
          requiredAction
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "responsibleArea"
        )
      ) {
        const responsibleArea =
          typeof body.responsibleArea ===
            "string"
            ? body.responsibleArea.trim()
            : ""

        if (!responsibleArea) {
          return NextResponse.json(
            {
              error:
                "Área responsável é obrigatória",
            },
            { status: 400 }
          )
        }

        updateData.responsibleArea =
          responsibleArea
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

        updateData.dueDate = dueDate
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "priority"
        )
      ) {
        if (!isValidPriority(body.priority)) {
          return NextResponse.json(
            {
              error:
                "Prioridade do plano de ação inválida",
            },
            { status: 400 }
          )
        }

        updateData.priority =
          body.priority as RiskActionPlanPriority
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

        const assignedUser =
          await prisma.user.findUnique({
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
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "riskEventPartId"
        )
      ) {
        const riskEventPartId =
          typeof body.riskEventPartId ===
            "string"
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

        nextRiskPart = riskPart

        updateData.riskEventPart = {
          connect: {
            id: riskEventPartId,
          },
        }
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "evidenceUrl"
        )
      ) {
        updateData.evidenceUrl =
          typeof body.evidenceUrl === "string"
            ? body.evidenceUrl.trim() || null
            : null
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "closingNotes"
        )
      ) {
        updateData.closingNotes =
          typeof body.closingNotes === "string"
            ? body.closingNotes.trim() || null
            : null
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "status"
        )
      ) {
        if (!isValidStatus(body.status)) {
          return NextResponse.json(
            {
              error:
                "Status do plano de ação inválido",
            },
            { status: 400 }
          )
        }

        if (!canValidateOrManage) {
          return NextResponse.json(
            {
              error:
                "Somente o responsável pela RM, quem abriu a RM ou um admin pode alterar manualmente o status do plano.",
            },
            { status: 403 }
          )
        }

        updateData.status =
          body.status as RiskActionPlanStatus
      }
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
        const plan =
          await tx.riskActionPlan.update({
            where: {
              id: existingPlan.id,
            },
            data: updateData,
            include: actionPlanInclude,
          })

        const changeType =
          existingPlan.status !== plan.status
            ? getHistoryTypeFromStatusChange(
              existingPlan.status,
              plan.status
            )
            : RiskActionPlanHistoryType.ACTION_PLAN_UPDATE

        const partForHistory =
          plan.riskEventPart ||
          nextRiskPart ||
          existingPlan.riskEventPart ||
          null

        await tx.riskActionPlanHistory.create({
          data: {
            actionPlanId: plan.id,
            riskEventId: risk.id,

            riskEventPartId:
              partForHistory?.id || null,
            partNumberId:
              partForHistory?.partNumberId ||
              null,

            changeType,

            oldTitle: existingPlan.title,
            newTitle: plan.title,

            oldDescription:
              existingPlan.description,
            newDescription: plan.description,

            oldRequiredAction:
              existingPlan.requiredAction,
            newRequiredAction:
              plan.requiredAction,

            oldResponsibleArea:
              existingPlan.responsibleArea,
            newResponsibleArea:
              plan.responsibleArea,

            oldDueDate: existingPlan.dueDate,
            newDueDate: plan.dueDate,

            oldPriority:
              existingPlan.priority,
            newPriority: plan.priority,

            oldStatus: existingPlan.status,
            newStatus: plan.status,

            oldAssignedToId:
              existingPlan.assignedToId,
            newAssignedToId:
              plan.assignedToId,

            oldValidatedById:
              existingPlan.validatedById,
            newValidatedById:
              plan.validatedById,

            oldSubmittedAt:
              existingPlan.submittedAt,
            newSubmittedAt: plan.submittedAt,

            oldValidatedAt:
              existingPlan.validatedAt,
            newValidatedAt: plan.validatedAt,

            oldEvidenceUrl:
              existingPlan.evidenceUrl,
            newEvidenceUrl: plan.evidenceUrl,

            oldClosingNotes:
              existingPlan.closingNotes,
            newClosingNotes:
              plan.closingNotes,

            reason:
              reason ||
              getDefaultHistoryReason(
                changeType
              ),

            changedById: currentUser.id,
          },
        })

        if (
          existingPlan.assignedToId !==
          plan.assignedToId &&
          plan.assignedToId &&
          plan.assignedToId !== currentUser.id
        ) {
          const pnText =
            plan.riskEventPart?.partNumber
              ?.partNumber
              ? ` para o PN ${plan.riskEventPart.partNumber.partNumber}`
              : ""

          await createNotification(tx, {
            userId: plan.assignedToId,
            title: "Plano de ação atribuído a você",
            message: `Você recebeu um plano de ação${pnText} na RM ${risk.code}: ${plan.title}`,
            type: "ACTION_PLAN_ASSIGNED",
            entity: "RiskEvent",
            entityId: risk.id,
          })
        }

        if (
          changeType ===
          RiskActionPlanHistoryType.ACTION_PLAN_SUBMIT_VALIDATION
        ) {
          const targetUserIds = Array.from(
            new Set(
              [
                risk.assignedToId,
                risk.createdById,
              ].filter(
                (userId): userId is string =>
                  Boolean(userId) && userId !== currentUser.id
              )
            )
          )

          for (const userId of targetUserIds) {
            await createNotification(tx, {
              userId,
              title: "Plano de ação enviado para validação",
              message: `O plano "${plan.title}" da RM ${risk.code} foi enviado para validação.`,
              type: "ACTION_PLAN_SUBMITTED",
              entity: "RiskEvent",
              entityId: risk.id,
            })
          }
        }

        if (
          changeType ===
          RiskActionPlanHistoryType.ACTION_PLAN_VALIDATE &&
          plan.assignedToId &&
          plan.assignedToId !== currentUser.id
        ) {
          await createNotification(tx, {
            userId: plan.assignedToId,
            title: "Plano de ação validado",
            message: `O plano "${plan.title}" da RM ${risk.code} foi validado e concluído.`,
            type: "ACTION_PLAN_VALIDATED",
            entity: "RiskEvent",
            entityId: risk.id,
          })
        }

        if (
          changeType ===
          RiskActionPlanHistoryType.ACTION_PLAN_REOPEN &&
          plan.assignedToId &&
          plan.assignedToId !== currentUser.id
        ) {
          await createNotification(tx, {
            userId: plan.assignedToId,
            title: "Plano de ação reaberto",
            message: `O plano "${plan.title}" da RM ${risk.code} foi reaberto e precisa de nova tratativa.`,
            type: "ACTION_PLAN_REOPENED",
            entity: "RiskEvent",
            entityId: risk.id,
          })
        }

        await createAuditLog(tx, {
          entityType: "RiskActionPlan",
          entityId: plan.id,
          action: getAuditAction(changeType),
          changedBy: currentUser.id,
          ipAddress,
          oldValue: {
            riskEventId: risk.id,
            riskCode: risk.code,

            actionPlanId: existingPlan.id,

            riskEventPartId:
              existingPlan.riskEventPartId,
            partNumberId:
              existingPlan.riskEventPart
                ?.partNumberId || null,
            partNumber:
              existingPlan.riskEventPart
                ?.partNumber.partNumber ||
              null,

            title: existingPlan.title,
            description:
              existingPlan.description,
            requiredAction:
              existingPlan.requiredAction,
            responsibleArea:
              existingPlan.responsibleArea,

            dueDate: existingPlan.dueDate,

            priority: existingPlan.priority,
            status: existingPlan.status,

            assignedToId:
              existingPlan.assignedToId,

            submittedAt:
              existingPlan.submittedAt,
            validatedAt:
              existingPlan.validatedAt,
            validatedById:
              existingPlan.validatedById,

            evidenceUrl:
              existingPlan.evidenceUrl,
            closingNotes:
              existingPlan.closingNotes,
          },
          newValue: {
            riskEventId: risk.id,
            riskCode: risk.code,

            actionPlanId: plan.id,

            riskEventPartId:
              plan.riskEventPartId,
            partNumberId:
              plan.riskEventPart
                ?.partNumberId || null,
            partNumber:
              plan.riskEventPart?.partNumber
                .partNumber || null,

            title: plan.title,
            description: plan.description,
            requiredAction:
              plan.requiredAction,
            responsibleArea:
              plan.responsibleArea,

            dueDate: plan.dueDate,

            priority: plan.priority,
            status: plan.status,

            assignedToId:
              plan.assignedToId,

            submittedAt: plan.submittedAt,
            validatedAt: plan.validatedAt,
            validatedById: plan.validatedById,

            evidenceUrl: plan.evidenceUrl,
            closingNotes: plan.closingNotes,

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
    console.error(
      "Erro ao atualizar plano de ação:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Erro ao atualizar plano de ação",
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
          validatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

    if (
      !existingPlan ||
      existingPlan.riskEventId !== id
    ) {
      return NextResponse.json(
        {
          error:
            "Plano de ação não encontrado nesta RM",
        },
        { status: 404 }
      )
    }

    const risk = existingPlan.riskEvent

    if (
      risk.workflowStatus !==
      RiskWorkflowStatus.OPEN
    ) {
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

    if (!isAdmin && !isRiskOwner) {
      return NextResponse.json(
        {
          error:
            "Somente o responsável pela RM, quem abriu a RM ou um admin pode excluir este plano de ação",
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

          changeType:
            RiskActionPlanHistoryType.ACTION_PLAN_DELETE,

          oldTitle: existingPlan.title,
          newTitle: null,

          oldDescription:
            existingPlan.description,
          newDescription: null,

          oldRequiredAction:
            existingPlan.requiredAction,
          newRequiredAction: null,

          oldResponsibleArea:
            existingPlan.responsibleArea,
          newResponsibleArea: null,

          oldDueDate: existingPlan.dueDate,
          newDueDate: null,

          oldPriority: existingPlan.priority,
          newPriority: null,

          oldStatus: existingPlan.status,
          newStatus: null,

          oldAssignedToId:
            existingPlan.assignedToId,
          newAssignedToId: null,

          oldValidatedById:
            existingPlan.validatedById,
          newValidatedById: null,

          oldSubmittedAt:
            existingPlan.submittedAt,
          newSubmittedAt: null,

          oldValidatedAt:
            existingPlan.validatedAt,
          newValidatedAt: null,

          oldEvidenceUrl:
            existingPlan.evidenceUrl,
          newEvidenceUrl: null,

          oldClosingNotes:
            existingPlan.closingNotes,
          newClosingNotes: null,

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
        entityType: "RiskActionPlan",
        entityId: existingPlan.id,
        action: "RISK_ACTION_PLAN_DELETE",
        changedBy: currentUser.id,
        ipAddress,
        oldValue: {
          riskEventId: risk.id,
          riskCode: risk.code,

          actionPlanId: existingPlan.id,

          riskEventPartId:
            existingPlan.riskEventPartId,
          partNumberId:
            existingPlan.riskEventPart
              ?.partNumberId || null,
          partNumber:
            existingPlan.riskEventPart
              ?.partNumber.partNumber || null,

          title: existingPlan.title,
          description:
            existingPlan.description,
          requiredAction:
            existingPlan.requiredAction,
          responsibleArea:
            existingPlan.responsibleArea,

          dueDate: existingPlan.dueDate,

          priority: existingPlan.priority,
          status: existingPlan.status,

          assignedToId:
            existingPlan.assignedToId,

          submittedAt:
            existingPlan.submittedAt,
          validatedAt:
            existingPlan.validatedAt,
          validatedById:
            existingPlan.validatedById,

          evidenceUrl:
            existingPlan.evidenceUrl,
          closingNotes:
            existingPlan.closingNotes,

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
    console.error(
      "Erro ao excluir plano de ação:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Erro ao excluir plano de ação",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}