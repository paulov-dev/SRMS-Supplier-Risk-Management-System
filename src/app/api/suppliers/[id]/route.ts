import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

function getPermissions(user: any) {
  return [
    ...new Set(
      user.roles.flatMap((ur: any) =>
        ur.role.permissions.map(
          (rp: any) => rp.permission.name
        )
      )
    ),
  ]
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

    if (!permissions.includes("SUPPLIER_VIEW")) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para visualizar fornecedores",
        },
        { status: 403 }
      )
    }

    const { id } = await params

    const supplier = await prisma.supplier.findUnique({
      where: {
        id,
      },

      include: {
        country: true,

        contacts: {
          orderBy: {
            name: "asc",
          },
        },

        riskEvents: {
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
              orderBy: {
                dueDate: "asc",
              },
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
              },
              orderBy: {
                requestedAt: "desc",
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: "Fornecedor não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: supplier.id,
      name: supplier.name,
      supplierCodeSap: supplier.supplierCodeSap,
      status: supplier.status,
      address: supplier.address,
      countryId: supplier.countryId,
      riskScore: supplier.riskScore,
      lastRiskCalculation: supplier.lastRiskCalculation,
      createdAt: supplier.createdAt,

      country: {
        id: supplier.country.id,
        name: supplier.country.name,
        isoCode: supplier.country.isoCode,
      },

      contacts: supplier.contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        createdAt: contact.createdAt,
      })),

      riskEvents: supplier.riskEvents.map((risk) => ({
        id: risk.id,
        code: risk.code,
        sequenceNumber: risk.sequenceNumber,
        codePrefix: risk.codePrefix,

        title: risk.title || risk.code,
        description: risk.description,
        openingReason: risk.openingReason,

        workflowStatus: risk.workflowStatus,
        riskLevel: risk.riskLevel,

        createdWeek: risk.createdWeek,
        createdYear: risk.createdYear,

        createdAt: risk.createdAt,
        updatedAt: risk.updatedAt,
        closedAt: risk.closedAt,

        createdBy: risk.createdBy
          ? {
              id: risk.createdBy.id,
              name: risk.createdBy.name,
              email: risk.createdBy.email,
            }
          : null,

        assignedTo: risk.assignedTo
          ? {
              id: risk.assignedTo.id,
              name: risk.assignedTo.name,
              email: risk.assignedTo.email,
            }
          : null,

        closedBy: risk.closedBy
          ? {
              id: risk.closedBy.id,
              name: risk.closedBy.name,
              email: risk.closedBy.email,
            }
          : null,

        /**
         * Mantido para compatibilidade com telas antigas
         * que esperavam risk.status.name.
         */
        status: {
          id: risk.workflowStatus,
          name: risk.workflowStatus,
        },

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
          },

          assignedTo: part.assignedTo
            ? {
                id: part.assignedTo.id,
                name: part.assignedTo.name,
                email: part.assignedTo.email,
              }
            : null,
        })),

        actionPlans: risk.actionPlans.map((actionPlan) => {
          const isOverdue =
            !actionPlan.isCompleted &&
            new Date(actionPlan.dueDate) <
              new Date()

          return {
            id: actionPlan.id,
            description: actionPlan.description,
            dueDate: actionPlan.dueDate,
            isCompleted: actionPlan.isCompleted,
            completedAt: actionPlan.completedAt,
            isOverdue,
            createdAt: actionPlan.createdAt,
            updatedAt: actionPlan.updatedAt,

            createdBy: {
              id: actionPlan.createdBy.id,
              name: actionPlan.createdBy.name,
              email: actionPlan.createdBy.email,
            },

            assignedTo: {
              id: actionPlan.assignedTo.id,
              name: actionPlan.assignedTo.name,
              email: actionPlan.assignedTo.email,
            },
          }
        }),

        logistics: risk.logistics.map((request) => ({
          id: request.id,
          status: request.status,
          requestedAt: request.requestedAt,
          reviewedAt: request.reviewedAt,
          notes: request.notes,
          rejectionReason: request.rejectionReason,

          requester: {
            id: request.requester.id,
            name: request.requester.name,
            email: request.requester.email,
          },

          reviewer: request.reviewer
            ? {
                id: request.reviewer.id,
                name: request.reviewer.name,
                email: request.reviewer.email,
              }
            : null,
        })),
      })),
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro ao buscar fornecedor" },
      { status: 500 }
    )
  }
}