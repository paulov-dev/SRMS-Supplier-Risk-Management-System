import { NextResponse } from "next/server"

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

function hasPermission(
  permissions: string[],
  permission: string
) {
  return permissions.includes(permission)
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
      include: {
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
      },
    })

    if (!risk) {
      return NextResponse.json(
        { error: "RM não encontrada" },
        { status: 404 }
      )
    }

    const now = new Date()

    return NextResponse.json({
      id: risk.id,

      code: risk.code,
      sequenceNumber: risk.sequenceNumber,
      codePrefix: risk.codePrefix,

      title: risk.title,
      description: risk.description,

      openingReason: risk.openingReason,

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

      parts: risk.parts.map((part) => ({
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
      })),

      actionPlans: risk.actionPlans.map((plan) => ({
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

      logistics: risk.logistics.map((request) => ({
        id: request.id,

        status: request.status,

        requestedAt: request.requestedAt,
        reviewedAt: request.reviewedAt,

        notes: request.notes,
        rejectionReason: request.rejectionReason,

        requester: request.requester,
        reviewer: request.reviewer,

        buffers: request.buffers.map((buffer) => ({
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

      comments: risk.comments.map((comment) => ({
        id: comment.id,

        message: comment.message,
        createdAt: comment.createdAt,

        user: comment.user,
      })),

      statusHistory: risk.statusHistory.map(
        (history) => ({
          id: history.id,

          oldStatus: history.oldStatus,
          newStatus: history.newStatus,

          changedAt: history.changedAt,

          user: history.user,
        })
      ),

      partHistory: risk.partHistory.map((history) => ({
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
        (history) => ({
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
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          "Erro ao buscar detalhes da RM",
      },
      { status: 500 }
    )
  }
}