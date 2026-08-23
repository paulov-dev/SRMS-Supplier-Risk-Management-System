import { NextResponse } from "next/server"
import {
    LogisticsRequestStatus,
    LogisticsRequestType,
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

function hasAnyPermission(
    permissions: string[],
    allowed: string[]
) {
    return allowed.some((permission) =>
        permissions.includes(permission)
    )
}

function isValidStatus(
    value: string | null
): value is LogisticsRequestStatus {
    return (
        value === LogisticsRequestStatus.PENDING ||
        value === LogisticsRequestStatus.IN_REVIEW ||
        value === LogisticsRequestStatus.APPROVED ||
        value === LogisticsRequestStatus.REJECTED ||
        value === LogisticsRequestStatus.CANCELED
    )
}

function isValidType(
    value: string | null
): value is LogisticsRequestType {
    return (
        value === LogisticsRequestType.BOOK_INCLUSION ||
        value === LogisticsRequestType.BUFFER_CALCULATION
    )
}

function getPendingDays(requestedAt: Date) {
    const now = new Date()
    const diffMs = now.getTime() - requestedAt.getTime()

    return Math.max(
        0,
        Math.floor(diffMs / (1000 * 60 * 60 * 24))
    )
}

function formatLogisticsRequest(request: any) {
    return {
        id: request.id,

        type: request.type,
        status: request.status,
        priority: request.priority,

        requestedAt: request.requestedAt,
        acceptedAt: request.acceptedAt,
        reviewedAt: request.reviewedAt,
        canceledAt: request.canceledAt,

        pendingDays:
            request.status === "PENDING" ||
            request.status === "IN_REVIEW"
                ? getPendingDays(request.requestedAt)
                : 0,

        requestNotes: request.requestNotes,
        responseNotes: request.responseNotes,
        rejectionReason: request.rejectionReason,

        requestedQuantity: request.requestedQuantity,
        calculatedQuantity: request.calculatedQuantity,

        coverageStartDate: request.coverageStartDate,
        coverageEndDate: request.coverageEndDate,

        cutoffDate: request.cutoffDate,
        cutoffReference: request.cutoffReference,

        oldPartNumber: request.oldPartNumber,
        newPartNumber: request.newPartNumber,
        replacementReason: request.replacementReason,

        riskEvent: {
            id: request.riskEvent.id,
            code: request.riskEvent.code,
            title: request.riskEvent.title,
            riskLevel: request.riskEvent.riskLevel,
            workflowStatus: request.riskEvent.workflowStatus,
            supplier: request.riskEvent.supplier,
        },

        riskEventPart: {
            id: request.riskEventPart.id,
            status: request.riskEventPart.status,
            logisticsStatus: request.riskEventPart.logisticsStatus,
            partNumber: request.riskEventPart.partNumber,
        },

        requestedBy: request.requestedBy
            ? {
                  id: request.requestedBy.id,
                  name: request.requestedBy.name,
                  email: request.requestedBy.email,
              }
            : null,

        assignedTo: request.assignedTo
            ? {
                  id: request.assignedTo.id,
                  name: request.assignedTo.name,
                  email: request.assignedTo.email,
              }
            : null,

        reviewedBy: request.reviewedBy
            ? {
                  id: request.reviewedBy.id,
                  name: request.reviewedBy.name,
                  email: request.reviewedBy.email,
              }
            : null,
    }
}

export async function GET(req: Request) {
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
                "LOGISTICS_REQUEST_VIEW",
                "LOGISTICS_REQUEST_REVIEW",
                "USER_MANAGE",
            ])
        ) {
            return NextResponse.json(
                {
                    error:
                        "Sem permissão para consultar solicitações logísticas",
                },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(req.url)

        const page = Number(searchParams.get("page") || "1")
        const pageSize = Number(
            searchParams.get("pageSize") || "20"
        )

        const search = searchParams.get("search")?.trim() || ""

        const statusParam = searchParams.get("status")
        const typeParam = searchParams.get("type")

        const assignedToId =
            searchParams.get("assignedToId")?.trim() || "all"

        const requestedById =
            searchParams.get("requestedById")?.trim() || "all"

        const onlyMine =
            searchParams.get("onlyMine") === "true"

        const onlyPending =
            searchParams.get("onlyPending") === "true"

        const status = isValidStatus(statusParam)
            ? statusParam
            : null

        const type = isValidType(typeParam)
            ? typeParam
            : null

        const safePage = Number.isFinite(page) && page > 0 ? page : 1

        const safePageSize =
            Number.isFinite(pageSize) &&
            pageSize > 0 &&
            pageSize <= 100
                ? pageSize
                : 20

        const where: any = {
            ...(status
                ? {
                      status,
                  }
                : {}),

            ...(type
                ? {
                      type,
                  }
                : {}),

            ...(onlyPending
                ? {
                      status: {
                          in: [
                              LogisticsRequestStatus.PENDING,
                              LogisticsRequestStatus.IN_REVIEW,
                          ],
                      },
                  }
                : {}),

            ...(assignedToId !== "all"
                ? {
                      assignedToId,
                  }
                : {}),

            ...(requestedById !== "all"
                ? {
                      requestedById,
                  }
                : {}),

            ...(onlyMine
                ? {
                      OR: [
                          {
                              assignedToId: currentUser.id,
                          },
                          {
                              requestedById: currentUser.id,
                          },
                      ],
                  }
                : {}),

            ...(search
                ? {
                      OR: [
                          {
                              riskEvent: {
                                  code: {
                                      contains: search,
                                      mode: "insensitive",
                                  },
                              },
                          },
                          {
                              riskEvent: {
                                  title: {
                                      contains: search,
                                      mode: "insensitive",
                                  },
                              },
                          },
                          {
                              riskEvent: {
                                  supplier: {
                                      name: {
                                          contains: search,
                                          mode: "insensitive",
                                      },
                                  },
                              },
                          },
                          {
                              riskEventPart: {
                                  partNumber: {
                                      partNumber: {
                                          contains: search,
                                          mode: "insensitive",
                                      },
                                  },
                              },
                          },
                          {
                              riskEventPart: {
                                  partNumber: {
                                      description: {
                                          contains: search,
                                          mode: "insensitive",
                                      },
                                  },
                              },
                          },
                      ],
                  }
                : {}),
        }

        const [total, requests] = await Promise.all([
            prisma.logisticsRequest.count({
                where,
            }),
            prisma.logisticsRequest.findMany({
                where,
                include: {
                    riskEvent: {
                        select: {
                            id: true,
                            code: true,
                            title: true,
                            riskLevel: true,
                            workflowStatus: true,
                            supplier: {
                                select: {
                                    id: true,
                                    name: true,
                                    supplierCodeSap: true,
                                },
                            },
                        },
                    },
                    riskEventPart: {
                        include: {
                            partNumber: {
                                select: {
                                    id: true,
                                    partNumber: true,
                                    description: true,
                                    vehicleProgram: true,
                                },
                            },
                        },
                    },
                    requestedBy: {
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
                    reviewedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: [
                    {
                        status: "asc",
                    },
                    {
                        requestedAt: "desc",
                    },
                ],
                skip: (safePage - 1) * safePageSize,
                take: safePageSize,
            }),
        ])

        const stats = await prisma.logisticsRequest.groupBy({
            by: ["status"],
            _count: {
                _all: true,
            },
        })

        const statusCounts = {
            pending: 0,
            inReview: 0,
            approved: 0,
            rejected: 0,
            canceled: 0,
        }

        for (const item of stats) {
            if (item.status === LogisticsRequestStatus.PENDING) {
                statusCounts.pending = item._count._all
            }

            if (item.status === LogisticsRequestStatus.IN_REVIEW) {
                statusCounts.inReview = item._count._all
            }

            if (item.status === LogisticsRequestStatus.APPROVED) {
                statusCounts.approved = item._count._all
            }

            if (item.status === LogisticsRequestStatus.REJECTED) {
                statusCounts.rejected = item._count._all
            }

            if (item.status === LogisticsRequestStatus.CANCELED) {
                statusCounts.canceled = item._count._all
            }
        }

        return NextResponse.json({
            data: requests.map(formatLogisticsRequest),
            stats: {
                total,
                ...statusCounts,
            },
            pagination: {
                page: safePage,
                pageSize: safePageSize,
                total,
                totalPages: Math.max(
                    1,
                    Math.ceil(total / safePageSize)
                ),
            },
        })
    } catch (error) {
        console.error(
            "ERRO AO BUSCAR SOLICITAÇÕES LOGÍSTICAS:",
            error
        )

        return NextResponse.json(
            {
                error:
                    "Erro ao buscar solicitações logísticas",
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        )
    }
}