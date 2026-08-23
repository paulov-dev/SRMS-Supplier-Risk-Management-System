import { NextResponse } from "next/server"
import {
    LogisticsRequestStatus,
    LogisticsRequestType,
    RiskPartHistoryType,
    RiskPartLogisticsStatus,
} from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"
import { createNotification } from "@/app/api/lib/createNotification"
import { getRequestIp } from "@/app/api/lib/request-ip"

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

function parseDateOrNull(value: unknown) {
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

function formatLogisticsRequest(request: any) {
    return {
        id: request.id,

        riskEventId: request.riskEventId,
        riskEventPartId: request.riskEventPartId,

        type: request.type,
        status: request.status,
        priority: request.priority,

        requestedAt: request.requestedAt,
        acceptedAt: request.acceptedAt,
        reviewedAt: request.reviewedAt,
        canceledAt: request.canceledAt,

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

        riskEvent: request.riskEvent
            ? {
                id: request.riskEvent.id,
                code: request.riskEvent.code,
                title: request.riskEvent.title,
            }
            : null,

        riskEventPart: request.riskEventPart
            ? {
                id: request.riskEventPart.id,
                status: request.riskEventPart.status,
                logisticsStatus:
                    request.riskEventPart.logisticsStatus,
                partNumber: request.riskEventPart.partNumber,
            }
            : null,

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

export async function PATCH(
    req: Request,
    context: {
        params: Promise<{ id: string }>
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

        const canReviewLogistics = hasAnyPermission(
            permissions,
            [
                "LOGISTICS_REQUEST_REVIEW",
                "USER_MANAGE",
            ]
        )

        const canCancelOwnRequest = hasAnyPermission(
            permissions,
            [
                "LOGISTICS_REQUEST_CREATE",
                "RISK_UPDATE",
                "USER_MANAGE",
            ]
        )

        const { id } = await context.params
        const body = await req.json()

        const action =
            typeof body.action === "string"
                ? body.action.trim()
                : ""

        if (
            ![
                "ACCEPT",
                "APPROVE",
                "REJECT",
                "CANCEL",
            ].includes(action)
        ) {
            return NextResponse.json(
                {
                    error:
                        "Ação inválida. Use ACCEPT, APPROVE, REJECT ou CANCEL.",
                },
                { status: 400 }
            )
        }

        const currentRequest =
            await prisma.logisticsRequest.findUnique({
                where: {
                    id,
                },
                include: {
                    riskEvent: {
                        select: {
                            id: true,
                            code: true,
                            title: true,
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
            })

        if (!currentRequest) {
            return NextResponse.json(
                { error: "Solicitação logística não encontrada" },
                { status: 404 }
            )
        }

        if (
            action !== "CANCEL" &&
            !canReviewLogistics
        ) {
            return NextResponse.json(
                {
                    error:
                        "Sem permissão para revisar solicitação logística",
                },
                { status: 403 }
            )
        }

        if (action === "CANCEL") {
            const isRequester =
                currentRequest.requestedById === currentUser.id

            if (!canCancelOwnRequest || (!isRequester && !canReviewLogistics)) {
                return NextResponse.json(
                    {
                        error:
                            "Sem permissão para cancelar esta solicitação logística",
                    },
                    { status: 403 }
                )
            }
        }

        const finishedStatuses: LogisticsRequestStatus[] = [
            LogisticsRequestStatus.APPROVED,
            LogisticsRequestStatus.REJECTED,
            LogisticsRequestStatus.CANCELED,
        ]

        if (finishedStatuses.includes(currentRequest.status)) {
            return NextResponse.json(
                {
                    error:
                        "Esta solicitação já foi finalizada e não pode ser alterada",
                },
                { status: 400 }
            )
        }

        const responseNotes =
            typeof body.responseNotes === "string" &&
                body.responseNotes.trim()
                ? body.responseNotes.trim()
                : null

        const rejectionReason =
            typeof body.rejectionReason === "string" &&
                body.rejectionReason.trim()
                ? body.rejectionReason.trim()
                : null

        const calculatedQuantity =
            typeof body.calculatedQuantity === "number" &&
                Number.isFinite(body.calculatedQuantity)
                ? Math.trunc(body.calculatedQuantity)
                : null

        const cutoffDate = parseDateOrNull(body.cutoffDate)

        const cutoffReference =
            typeof body.cutoffReference === "string" &&
                body.cutoffReference.trim()
                ? body.cutoffReference.trim()
                : null

        if (
            calculatedQuantity !== null &&
            calculatedQuantity < 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "A quantidade calculada não pode ser negativa",
                },
                { status: 400 }
            )
        }

        if (
            action === "APPROVE" &&
            currentRequest.type ===
            LogisticsRequestType.BUFFER_CALCULATION &&
            calculatedQuantity === null
        ) {
            return NextResponse.json(
                {
                    error:
                        "Informe a quantidade calculada para concluir o cálculo de buffer",
                },
                { status: 400 }
            )
        }

        if (
            action === "APPROVE" &&
            !responseNotes &&
            currentRequest.type ===
            LogisticsRequestType.BOOK_INCLUSION
        ) {
            return NextResponse.json(
                {
                    error:
                        "Informe uma resposta da logística para aprovar a solicitação",
                },
                { status: 400 }
            )
        }

        if (action === "REJECT" && !rejectionReason) {
            return NextResponse.json(
                {
                    error:
                        "Informe o motivo da recusa",
                },
                { status: 400 }
            )
        }

        const ipAddress = getRequestIp(req)
        const userAgent = req.headers.get("user-agent")

        const updated = await prisma.$transaction(async (tx) => {
            let nextStatus = currentRequest.status
            let nextRiskPartLogisticsStatus =
                currentRequest.riskEventPart.logisticsStatus

            const updateData: any = {}

            if (action === "ACCEPT") {
                if (
                    currentRequest.status !==
                    LogisticsRequestStatus.PENDING
                ) {
                    throw new Error(
                        "Apenas solicitações pendentes podem ser assumidas"
                    )
                }

                nextStatus = LogisticsRequestStatus.IN_REVIEW
                nextRiskPartLogisticsStatus =
                    RiskPartLogisticsStatus.IN_LOGISTICS

                updateData.status = nextStatus
                updateData.assignedToId = currentUser.id
                updateData.acceptedAt = new Date()
            }

            if (action === "APPROVE") {
                if (
                    currentRequest.status !==
                    LogisticsRequestStatus.PENDING &&
                    currentRequest.status !==
                    LogisticsRequestStatus.IN_REVIEW
                ) {
                    throw new Error(
                        "Apenas solicitações pendentes ou em análise podem ser aprovadas"
                    )
                }

                nextStatus = LogisticsRequestStatus.APPROVED
                nextRiskPartLogisticsStatus =
                    RiskPartLogisticsStatus.APPROVED

                updateData.status = nextStatus
                updateData.assignedToId =
                    currentRequest.assignedToId ||
                    currentUser.id
                updateData.reviewedById = currentUser.id
                updateData.reviewedAt = new Date()
                updateData.responseNotes = responseNotes
                updateData.calculatedQuantity =
                    calculatedQuantity
                updateData.cutoffDate =
                    cutoffDate || currentRequest.cutoffDate
                updateData.cutoffReference =
                    cutoffReference ||
                    currentRequest.cutoffReference
            }

            if (action === "REJECT") {
                if (
                    currentRequest.status !==
                    LogisticsRequestStatus.PENDING &&
                    currentRequest.status !==
                    LogisticsRequestStatus.IN_REVIEW
                ) {
                    throw new Error(
                        "Apenas solicitações pendentes ou em análise podem ser recusadas"
                    )
                }

                nextStatus = LogisticsRequestStatus.REJECTED
                nextRiskPartLogisticsStatus =
                    RiskPartLogisticsStatus.REJECTED

                updateData.status = nextStatus
                updateData.assignedToId =
                    currentRequest.assignedToId ||
                    currentUser.id
                updateData.reviewedById = currentUser.id
                updateData.reviewedAt = new Date()
                updateData.rejectionReason = rejectionReason
                updateData.responseNotes = responseNotes
            }

            if (action === "CANCEL") {
                nextStatus = LogisticsRequestStatus.CANCELED
                nextRiskPartLogisticsStatus =
                    RiskPartLogisticsStatus.NOT_REQUESTED

                updateData.status = nextStatus
                updateData.canceledAt = new Date()
                updateData.responseNotes =
                    responseNotes || "Solicitação cancelada."
            }

            const request =
                await tx.logisticsRequest.update({
                    where: {
                        id: currentRequest.id,
                    },
                    data: updateData,
                    include: {
                        riskEvent: {
                            select: {
                                id: true,
                                code: true,
                                title: true,
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
                })

            await tx.riskEventPart.update({
                where: {
                    id: currentRequest.riskEventPartId,
                },
                data: {
                    logisticsStatus:
                        nextRiskPartLogisticsStatus,
                },
            })

            await tx.riskEventPartHistory.create({
                data: {
                    riskEventPartId:
                        currentRequest.riskEventPartId,
                    riskEventId: currentRequest.riskEventId,
                    partNumberId:
                        currentRequest.riskEventPart.partNumber.id,
                    changeType:
                        RiskPartHistoryType.LOGISTICS_CHANGE,
                    oldLogisticsStatus:
                        currentRequest.riskEventPart
                            .logisticsStatus,
                    newLogisticsStatus:
                        nextRiskPartLogisticsStatus,
                    reason:
                        action === "ACCEPT"
                            ? "Solicitação logística assumida pelo time de Logística."
                            : action === "APPROVE"
                                ? "Solicitação logística aprovada/concluída."
                                : action === "REJECT"
                                    ? `Solicitação logística recusada: ${rejectionReason}`
                                    : "Solicitação logística cancelada.",
                    changedById: currentUser.id,
                },
            })

            await createAuditLog(tx, {
                entityType: "LogisticsRequest",
                entityId: request.id,
                action: `LOGISTICS_REQUEST_${action}`,
                changedBy: currentUser.id,
                ipAddress,
                oldValue: {
                    id: currentRequest.id,
                    status: currentRequest.status,
                    assignedToId: currentRequest.assignedToId,
                    reviewedById: currentRequest.reviewedById,
                    responseNotes:
                        currentRequest.responseNotes,
                    rejectionReason:
                        currentRequest.rejectionReason,
                    calculatedQuantity:
                        currentRequest.calculatedQuantity,
                    cutoffDate: currentRequest.cutoffDate,
                    cutoffReference:
                        currentRequest.cutoffReference,
                },
                newValue: {
                    id: request.id,
                    status: request.status,
                    assignedToId: request.assignedToId,
                    reviewedById: request.reviewedById,
                    responseNotes: request.responseNotes,
                    rejectionReason: request.rejectionReason,
                    calculatedQuantity:
                        request.calculatedQuantity,
                    cutoffDate: request.cutoffDate,
                    cutoffReference: request.cutoffReference,
                    riskEvent: {
                        id: request.riskEvent.id,
                        code: request.riskEvent.code,
                    },
                    partNumber: {
                        id: request.riskEventPart.partNumber.id,
                        partNumber:
                            request.riskEventPart.partNumber
                                .partNumber,
                        description:
                            request.riskEventPart.partNumber
                                .description,
                    },
                    changedByUser: {
                        id: currentUser.id,
                        name: currentUser.name,
                        email: currentUser.email,
                    },
                    userAgent,
                },
            })

            if (
                action === "APPROVE" ||
                action === "REJECT" ||
                action === "CANCEL"
            ) {
                const shouldNotifyRequester =
                    currentRequest.requestedById !==
                    currentUser.id

                if (shouldNotifyRequester) {
                    await createNotification(tx, {
                        userId: currentRequest.requestedById,
                        title:
                            action === "APPROVE"
                                ? "Solicitação logística respondida"
                                : action === "REJECT"
                                    ? "Solicitação logística recusada"
                                    : "Solicitação logística cancelada",
                        message:
                            action === "APPROVE"
                                ? `A solicitação logística do PN ${currentRequest.riskEventPart.partNumber.partNumber} na RM ${currentRequest.riskEvent.code} foi aprovada/respondida.`
                                : action === "REJECT"
                                    ? `A solicitação logística do PN ${currentRequest.riskEventPart.partNumber.partNumber} na RM ${currentRequest.riskEvent.code} foi recusada.`
                                    : `A solicitação logística do PN ${currentRequest.riskEventPart.partNumber.partNumber} na RM ${currentRequest.riskEvent.code} foi cancelada.`,
                        type:
                            action === "APPROVE"
                                ? "LOGISTICS_REQUEST_APPROVED"
                                : action === "REJECT"
                                    ? "LOGISTICS_REQUEST_REJECTED"
                                    : "LOGISTICS_REQUEST_CANCELED",
                        entity: "LogisticsRequest",
                        entityId: request.id,
                    })
                }
            }

            if (
                action === "ACCEPT" &&
                currentRequest.requestedById !==
                currentUser.id
            ) {
                await createNotification(tx, {
                    userId: currentRequest.requestedById,
                    title: "Solicitação logística em análise",
                    message: `A solicitação logística do PN ${currentRequest.riskEventPart.partNumber.partNumber} na RM ${currentRequest.riskEvent.code} foi assumida por ${currentUser.name}.`,
                    type: "LOGISTICS_REQUEST_IN_REVIEW",
                    entity: "LogisticsRequest",
                    entityId: request.id,
                })
            }

            return request
        })

        return NextResponse.json(formatLogisticsRequest(updated))
    } catch (error) {
        console.error(
            "ERRO AO ATUALIZAR SOLICITAÇÃO LOGÍSTICA:",
            error
        )

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Erro ao atualizar solicitação logística",
            },
            { status: 500 }
        )
    }
}