import { NextResponse } from "next/server"
import {
  Prisma,
  RiskWorkflowStatus,
} from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createNotification } from "@/app/api/lib/createNotification"

function getPermissions(user: any): string[] {
  const permissions = user.roles.flatMap((ur: any) =>
    ur.role.permissions.map((rp: any) =>
      String(rp.permission.name)
    )
  )

  return Array.from(new Set<string>(permissions))
}

function hasPermission(
  permissions: string[],
  permission: string
) {
  return permissions.includes(permission)
}

function isAdmin(user: any) {
  const permissions = getPermissions(user)

  const hasAdminRole = user.roles?.some((ur: any) => {
    const roleName = ur.role?.name || ur.name

    return roleName === "ADMIN"
  })

  return (
    hasAdminRole ||
    permissions.includes("USER_MANAGE")
  )
}

function canManageRiskEvent(user: any, riskEvent: any) {
  return (
    isAdmin(user) ||
    riskEvent.assignedToId === user.id
  )
}

function toPrismaJsonObject(
  value: Record<string, unknown>
): Prisma.InputJsonObject {
  return JSON.parse(
    JSON.stringify(value)
  ) as Prisma.InputJsonObject
}

function getRequestIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null
  }

  const realIp = req.headers.get("x-real-ip")

  if (realIp) {
    return realIp
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip")

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  return null
}

function formatAssessment(assessment: any) {
  if (!assessment) {
    return null
  }

  return {
    id: assessment.id,

    isPartCanceled: assessment.isPartCanceled,
    hasDemand: assessment.hasDemand,
    sourceNamed: assessment.sourceNamed,

    actionPlanReceived: assessment.actionPlanReceived,
    scheduleMeetsDevelopment:
      assessment.scheduleMeetsDevelopment,
    technicalCommercialOk:
      assessment.technicalCommercialOk,
    productionRiskMitigated:
      assessment.productionRiskMitigated,
    eopManagementOk: assessment.eopManagementOk,

    deviationPfpFinished:
      assessment.deviationPfpFinished,
    vdaApproved: assessment.vdaApproved,
    modificationImplemented:
      assessment.modificationImplemented,

    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
  }
}

const riskInclude = {
  supplier: {
    include: {
      country: true,
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

  closedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },

  parts: {
    include: {
      partNumber: true,
      assessment: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },

  actionPlans: {
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
    orderBy: [
      {
        isCompleted: "asc",
      },
      {
        dueDate: "asc",
      },
    ],
  },

  logistics: {
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      buffers: {
        include: {
          partNumber: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      requestedAt: "desc",
    },
  },

  comments: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },

  statusHistory: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      changedAt: "desc",
    },
  },

  partHistory: {
    include: {
      partNumber: {
        select: {
          id: true,
          partNumber: true,
          description: true,
          vehicleProgram: true,
        },
      },
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      changedAt: "desc",
    },
  },

  actionPlanHistory: {
    include: {
      actionPlan: {
        select: {
          id: true,
          description: true,
        },
      },
      riskEventPart: {
        include: {
          partNumber: true,
        },
      },
      partNumber: true,
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      changedAt: "desc",
    },
  },
} satisfies Prisma.RiskEventInclude

function formatRiskResponse(risk: any) {
  const now = new Date()

  return {
    id: risk.id,

    code: risk.code,
    sequenceNumber: risk.sequenceNumber,
    codePrefix: risk.codePrefix,

    title: risk.title,
    description: risk.description,

    openingReason: risk.openingReason,

    supplierId: risk.supplierId,

    commodity: risk.commodity,

    workflowStatus: risk.workflowStatus,
    riskLevel: risk.riskLevel,

    status: {
      id: risk.workflowStatus,
      name: risk.workflowStatus,
    },

    createdWeek: risk.createdWeek,
    createdYear: risk.createdYear,

    createdAt: risk.createdAt,
    updatedAt: risk.updatedAt,
    closedAt: risk.closedAt,

    supplier: risk.supplier
      ? {
        id: risk.supplier.id,
        name: risk.supplier.name,
        supplierCodeSap:
          risk.supplier.supplierCodeSap,
        country: risk.supplier.country
          ? {
            id: risk.supplier.country.id,
            name: risk.supplier.country.name,
            isoCode:
              risk.supplier.country.isoCode,
          }
          : null,
      }
      : null,

    createdBy: risk.createdBy,

    assignedTo: risk.assignedTo,

    closedBy: risk.closedBy,

    parts: risk.parts.map((part: any) => ({
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

      assessment: formatAssessment(part.assessment),
    })),

    actionPlans: risk.actionPlans.map((plan: any) => ({
      id: plan.id,

      description: plan.description,
      dueDate: plan.dueDate,

      isCompleted: plan.isCompleted,
      completedAt: plan.completedAt,

      isOverdue:
        !plan.isCompleted &&
        new Date(plan.dueDate) < now,

      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,

      createdBy: plan.createdBy,

      assignedTo: plan.assignedTo,

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
    })),

    logistics: risk.logistics.map((request: any) => ({
      id: request.id,

      status: request.status,

      requestedAt: request.requestedAt,
      reviewedAt: request.reviewedAt,

      notes: request.notes,
      rejectionReason: request.rejectionReason,

      requester: request.requester,
      reviewer: request.reviewer,

      buffers: request.buffers.map((buffer: any) => ({
        id: buffer.id,

        bufferQuantity: buffer.bufferQuantity,
        coverageDays: buffer.coverageDays,
        validUntil: buffer.validUntil,

        notes: buffer.notes,
        createdAt: buffer.createdAt,

        partNumber: {
          id: buffer.partNumber.id,
          partNumber:
            buffer.partNumber.partNumber,
          description:
            buffer.partNumber.description,
          vehicleProgram:
            buffer.partNumber.vehicleProgram,
        },
      })),
    })),

    comments: risk.comments.map((comment: any) => ({
      id: comment.id,

      message: comment.message,
      createdAt: comment.createdAt,

      user: comment.user,
    })),

    statusHistory: risk.statusHistory.map(
      (history: any) => ({
        id: history.id,

        oldStatus: history.oldStatus,
        newStatus: history.newStatus,

        reason: history.reason ?? null,

        changedAt: history.changedAt,

        user: history.user,
      })
    ),

    partHistory: risk.partHistory.map((history: any) => ({
      id: history.id,

      changeType: history.changeType,

      oldStatus: history.oldStatus,
      newStatus: history.newStatus,

      oldLogisticsStatus:
        history.oldLogisticsStatus,
      newLogisticsStatus:
        history.newLogisticsStatus,

      oldAssignedToId: history.oldAssignedToId,
      newAssignedToId: history.newAssignedToId,

      oldDescription: history.oldDescription,
      newDescription: history.newDescription,

      oldVehicleProgram:
        history.oldVehicleProgram,
      newVehicleProgram:
        history.newVehicleProgram,

      reason: history.reason,

      changedAt: history.changedAt,

      partNumber: history.partNumber,

      changedBy: history.changedBy,
    })),

    actionPlanHistory: risk.actionPlanHistory.map(
      (history: any) => ({
        id: history.id,

        changeType: history.changeType,

        oldDescription: history.oldDescription,
        newDescription: history.newDescription,

        oldDueDate: history.oldDueDate,
        newDueDate: history.newDueDate,

        oldAssignedToId: history.oldAssignedToId,
        newAssignedToId: history.newAssignedToId,

        oldCompleted: history.oldCompleted,
        newCompleted: history.newCompleted,

        reason: history.reason,

        changedAt: history.changedAt,

        actionPlan: history.actionPlan
          ? {
            id: history.actionPlan.id,
            description:
              history.actionPlan.description,
          }
          : null,

        riskEventPart: history.riskEventPart
          ? {
            id: history.riskEventPart.id,
            partNumber: {
              id: history.riskEventPart.partNumber.id,
              partNumber:
                history.riskEventPart.partNumber
                  .partNumber,
              description:
                history.riskEventPart.partNumber
                  .description,
              vehicleProgram:
                history.riskEventPart.partNumber
                  .vehicleProgram,
            },
          }
          : null,

        partNumber: history.partNumber
          ? {
            id: history.partNumber.id,
            partNumber:
              history.partNumber.partNumber,
            description:
              history.partNumber.description,
            vehicleProgram:
              history.partNumber.vehicleProgram,
          }
          : null,

        changedBy: history.changedBy,
      })
    ),
  }
}

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

    if (!hasPermission(permissions, "RISK_VIEW")) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para visualizar esta RM",
        },
        { status: 403 }
      )
    }

    const { id } = await params

    const risk = await prisma.riskEvent.findUnique({
      where: {
        id,
      },
      include: riskInclude,
    })

    if (!risk) {
      return NextResponse.json(
        { error: "RM não encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      formatRiskResponse(risk)
    )
  } catch (error) {
    console.error("ERRO DETALHADO AO BUSCAR RM:", error)

    return NextResponse.json(
      {
        error: "Erro ao buscar detalhes da RM",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    if (!hasPermission(permissions, "RISK_UPDATE")) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para atualizar esta RM",
        },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await req.json()
    const ipAddress = getRequestIp(req)

    const {
      title,
      description,
      openingReason,
      commodity,
      assignedToId,
      workflowStatus,
      reason,
    } = body

    const currentRisk =
      await prisma.riskEvent.findUnique({
        where: {
          id,
        },
        include: {
          supplier: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

    if (!currentRisk) {
      return NextResponse.json(
        { error: "RM não encontrada" },
        { status: 404 }
      )
    }

    if (!canManageRiskEvent(currentUser, currentRisk)) {
      return NextResponse.json(
        {
          error:
            "Você não tem permissão para editar esta RM.",
        },
        { status: 403 }
      )
    }

    let nextWorkflowStatus:
      | RiskWorkflowStatus
      | undefined

    if (workflowStatus !== undefined) {
      if (
        !Object.values(RiskWorkflowStatus).includes(
          workflowStatus
        )
      ) {
        return NextResponse.json(
          {
            error: "Status da RM inválido.",
          },
          { status: 400 }
        )
      }

      nextWorkflowStatus =
        workflowStatus as RiskWorkflowStatus
    }

    const isChangingWorkflow =
      nextWorkflowStatus !== undefined &&
      nextWorkflowStatus !==
      currentRisk.workflowStatus

    if (
      isChangingWorkflow &&
      !String(reason || "").trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Informe o motivo para fechar ou reabrir a RM.",
        },
        { status: 400 }
      )
    }

    const nextAssignedToId =
      assignedToId === undefined
        ? undefined
        : assignedToId || null

    const isChangingResponsible =
      nextAssignedToId !== undefined &&
      nextAssignedToId !== currentRisk.assignedToId

    const nextTitle =
      typeof title === "string"
        ? title.trim()
        : undefined

    const nextDescription =
      typeof description === "string"
        ? description.trim() || null
        : undefined

    const nextCommodity =
      typeof commodity === "string"
        ? commodity.trim() || null
        : undefined

    const nextOpeningReason =
      typeof openingReason === "string"
        ? openingReason
        : undefined

    const isChangingBasicData =
      (nextTitle !== undefined &&
        nextTitle !== currentRisk.title) ||
      (nextDescription !== undefined &&
        nextDescription !== currentRisk.description) ||
      (nextCommodity !== undefined &&
        nextCommodity !== currentRisk.commodity) ||
      (nextOpeningReason !== undefined &&
        nextOpeningReason !==
        currentRisk.openingReason)

    const updatedRisk = await prisma.$transaction(
      async (tx) => {
        const updateData: Prisma.RiskEventUpdateInput = {}

        if (nextTitle !== undefined) {
          updateData.title = nextTitle
        }

        if (nextDescription !== undefined) {
          updateData.description = nextDescription
        }

        if (nextCommodity !== undefined) {
          updateData.commodity = nextCommodity
        }

        if (nextOpeningReason !== undefined) {
          updateData.openingReason = nextOpeningReason as any
        }

        if (nextAssignedToId !== undefined) {
          updateData.assignedTo = nextAssignedToId
            ? {
              connect: {
                id: nextAssignedToId,
              },
            }
            : {
              disconnect: true,
            }
        }

        if (nextWorkflowStatus !== undefined) {
          updateData.workflowStatus = nextWorkflowStatus

          if (
            nextWorkflowStatus ===
            RiskWorkflowStatus.CLOSED
          ) {
            updateData.closedAt = new Date()
            updateData.closedBy = {
              connect: {
                id: currentUser.id,
              },
            }
          }

          if (
            nextWorkflowStatus ===
            RiskWorkflowStatus.OPEN
          ) {
            updateData.closedAt = null
            updateData.closedBy = {
              disconnect: true,
            }
          }

          if (
            nextWorkflowStatus ===
            RiskWorkflowStatus.CANCELED
          ) {
            updateData.closedAt = new Date()
            updateData.closedBy = {
              connect: {
                id: currentUser.id,
              },
            }
          }
        }

        const updated = await tx.riskEvent.update({
          where: {
            id,
          },
          data: updateData,
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })

        if (isChangingWorkflow) {
          await tx.riskStatusHistory.create({
            data: {
              riskEventId: id,
              oldStatus: currentRisk.workflowStatus,
              newStatus: nextWorkflowStatus!,
              changedBy: currentUser.id,
              reason: String(reason).trim(),
            },
          })
        }

        if (isChangingResponsible) {
          await tx.riskStatusHistory.create({
            data: {
              riskEventId: id,
              oldStatus: currentRisk.workflowStatus,
              newStatus: currentRisk.workflowStatus,
              changedBy: currentUser.id,
              reason: nextAssignedToId
                ? `Responsável alterado de ${currentRisk.assignedTo?.name ||
                "Sem responsável"
                } para ${updated.assignedTo?.name ||
                "Novo responsável"
                }.`
                : `Responsável removido. Responsável anterior: ${currentRisk.assignedTo?.name ||
                "Sem responsável"
                }.`,
            },
          })

          if (nextAssignedToId) {
            await createNotification(tx, {
              userId: nextAssignedToId,
              title: "RM atribuída a você",
              message: `A RM ${currentRisk.code} foi atribuída ao seu nome.`,
              type: "RISK_ASSIGNED",
              entity: "RiskEvent",
              entityId: id,
            })
          }
        }

        if (isChangingBasicData) {
          await tx.riskStatusHistory.create({
            data: {
              riskEventId: id,
              oldStatus:
                currentRisk.workflowStatus,
              newStatus:
                currentRisk.workflowStatus,
              changedBy: currentUser.id,
              reason:
                "Informações básicas da RM foram alteradas.",
            },
          })
        }

        if (
          isChangingWorkflow &&
          currentRisk.assignedToId &&
          currentRisk.assignedToId !== currentUser.id
        ) {
          await createNotification(tx, {
            userId: currentRisk.assignedToId,
            title:
              nextWorkflowStatus === "CLOSED"
                ? "RM fechada"
                : "RM reaberta",
            message:
              nextWorkflowStatus === "CLOSED"
                ? `A RM ${currentRisk.code} foi fechada.`
                : `A RM ${currentRisk.code} foi reaberta.`,
            type:
              nextWorkflowStatus === "CLOSED"
                ? "RISK_CLOSED"
                : "RISK_REOPENED",
            entity: "RiskEvent",
            entityId: id,
          })
        }

        await tx.auditLog.create({
          data: {
            entityType: "RiskEvent",
            entityId: id,
            action: isChangingWorkflow
              ? "RISK_EVENT_WORKFLOW_UPDATE"
              : isChangingResponsible
                ? "RISK_EVENT_RESPONSIBLE_UPDATE"
                : "RISK_EVENT_UPDATE",
            changedBy: currentUser.id,
            ipAddress,
            oldValue: toPrismaJsonObject({
              title: currentRisk.title,
              description: currentRisk.description,
              openingReason: currentRisk.openingReason,
              commodity: currentRisk.commodity,
              assignedToId: currentRisk.assignedToId,
              assignedToName:
                currentRisk.assignedTo?.name || null,
              workflowStatus: currentRisk.workflowStatus,
              closedAt: currentRisk.closedAt,
              closedById: currentRisk.closedById,
            }),
            newValue: toPrismaJsonObject({
              title: updated.title,
              description: updated.description,
              openingReason: updated.openingReason,
              commodity: updated.commodity,
              assignedToId: updated.assignedToId,
              assignedToName:
                updated.assignedTo?.name || null,
              workflowStatus: updated.workflowStatus,
              closedAt: updated.closedAt,
              closedById: updated.closedById,
              reason: reason || null,
              changedBy: {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
              },
            }),
          },
        })

        const refreshedRisk =
          await tx.riskEvent.findUniqueOrThrow({
            where: {
              id,
            },
            include: riskInclude,
          })

        return refreshedRisk
      }
    )

    return NextResponse.json(
      formatRiskResponse(updatedRisk)
    )
  } catch (error) {
    console.error(
      "ERRO DETALHADO AO ATUALIZAR RM:",
      error
    )

    return NextResponse.json(
      {
        error: "Erro ao atualizar RM",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}