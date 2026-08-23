import { NextResponse } from "next/server"
import {
    LogisticsPriority,
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

function isValidRequestType(
    value: unknown
): value is LogisticsRequestType {
    return (
        value === LogisticsRequestType.BOOK_INCLUSION ||
        value === LogisticsRequestType.BUFFER_CALCULATION
    )
}

function isValidPriority(
    value: unknown
): value is LogisticsPriority {
    return (
        value === LogisticsPriority.LOW ||
        value === LogisticsPriority.MEDIUM ||
        value === LogisticsPriority.HIGH ||
        value === LogisticsPriority.CRITICAL
    )
}

async function getNextLogisticsRequestCode(tx: any) {
    const sequence = await tx.riskSequence.upsert({
        where: {
            key: "LOGISTICS_REQUEST",
        },
        create: {
            key: "LOGISTICS_REQUEST",
            currentNumber: 1,
        },
        update: {
            currentNumber: {
                increment: 1,
            },
        },
    })

    return `LOG${String(sequence.currentNumber).padStart(3, "0")}`
}

function formatLogisticsRequest(request: any) {
    return {
        id: request.id,
        code: request.code,
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

        riskEventPart: request.riskEventPart
            ? {
                id: request.riskEventPart.id,
                status: request.riskEventPart.status,
                logisticsStatus:
                    request.riskEventPart.logisticsStatus,
                partNumber: {
                    id: request.riskEventPart.partNumber.id,
                    partNumber:
                        request.riskEventPart.partNumber
                            .partNumber,
                    description:
                        request.riskEventPart.partNumber
                            .description,
                    vehicleProgram:
                        request.riskEventPart.partNumber
                            .vehicleProgram,
                },
            }
            : null,
    }
}

export async function GET(
    _req: Request,
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

        const { id } = await context.params

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

        const requests =
            await prisma.logisticsRequest.findMany({
                where: {
                    riskEventId: id,
                },
                include: {
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
                },
                orderBy: {
                    requestedAt: "desc",
                },
            })

        return NextResponse.json({
            risk,
            data: requests.map(formatLogisticsRequest),
        })
    } catch (error) {
        console.error(
            "ERRO AO BUSCAR SOLICITAÇÕES LOGÍSTICAS DA RM:",
            error
        )

        return NextResponse.json(
            {
                error:
                    "Erro ao buscar solicitações logísticas da RM",
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

        if (
            !hasAnyPermission(permissions, [
                "LOGISTICS_REQUEST_CREATE",
                "RISK_UPDATE",
                "USER_MANAGE",
            ])
        ) {
            return NextResponse.json(
                {
                    error:
                        "Sem permissão para criar solicitação logística",
                },
                { status: 403 }
            )
        }

        const { id } = await context.params
        const body = await req.json()

        const requestsInput = Array.isArray(body.requests)
            ? body.requests
            : []

        if (requestsInput.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "Informe pelo menos um PN para solicitar logística",
                },
                { status: 400 }
            )
        }

        const risk = await prisma.riskEvent.findUnique({
            where: {
                id,
            },
            include: {
                parts: {
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
                supplier: {
                    select: {
                        id: true,
                        name: true,
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

        if (risk.workflowStatus !== "OPEN") {
            return NextResponse.json(
                {
                    error:
                        "Não é possível solicitar logística para uma RM fechada ou cancelada",
                },
                { status: 400 }
            )
        }

        if (risk.parts.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "A RM precisa ter pelo menos um PN vinculado para solicitar logística",
                },
                { status: 400 }
            )
        }

        const riskPartMap = new Map(
            risk.parts.map((part) => [part.id, part])
        )

        type NormalizedLogisticsRequest = {
            riskPart: any
            riskEventPartId: string
            type: LogisticsRequestType
            priority: LogisticsPriority
            requestNotes: string
            requestedQuantity: number | null
            coverageStartDate: Date | null
            coverageEndDate: Date | null
            cutoffDate: Date | null
            cutoffReference: string | null
            oldPartNumber: string | null
            newPartNumber: string | null
            replacementReason: string | null
        }

        const normalizedRequests: NormalizedLogisticsRequest[] = []

        for (const item of requestsInput) {
            const riskEventPartId =
                typeof item.riskEventPartId === "string"
                    ? item.riskEventPartId.trim()
                    : ""

            const riskPart = riskPartMap.get(riskEventPartId)

            if (!riskPart) {
                return NextResponse.json(
                    {
                        error:
                            "Um ou mais PNs informados não pertencem a esta RM",
                    },
                    { status: 400 }
                )
            }

            if (!isValidRequestType(item.type)) {
                return NextResponse.json(
                    {
                        error:
                            "Tipo de solicitação logística inválido",
                    },
                    { status: 400 }
                )
            }

            const priority = isValidPriority(item.priority)
                ? item.priority
                : LogisticsPriority.MEDIUM

            const requestNotes =
                typeof item.requestNotes === "string" &&
                    item.requestNotes.trim()
                    ? item.requestNotes.trim()
                    : null

            if (!requestNotes) {
                return NextResponse.json(
                    {
                        error:
                            `Informe a orientação da solicitação logística para o PN ${riskPart.partNumber.partNumber}`,
                    },
                    { status: 400 }
                )
            }

            const requestedQuantity =
                typeof item.requestedQuantity === "number" &&
                    Number.isFinite(item.requestedQuantity)
                    ? Math.trunc(item.requestedQuantity)
                    : null

            if (
                requestedQuantity !== null &&
                requestedQuantity < 0
            ) {
                return NextResponse.json(
                    {
                        error:
                            `A quantidade solicitada do PN ${riskPart.partNumber.partNumber} não pode ser negativa`,
                    },
                    { status: 400 }
                )
            }

            const coverageStartDate = parseDateOrNull(
                item.coverageStartDate
            )
            const coverageEndDate = parseDateOrNull(
                item.coverageEndDate
            )
            const cutoffDate = parseDateOrNull(item.cutoffDate)

            if (
                coverageStartDate &&
                coverageEndDate &&
                coverageStartDate.getTime() >
                coverageEndDate.getTime()
            ) {
                return NextResponse.json(
                    {
                        error:
                            `A data inicial de cobertura não pode ser maior que a data final para o PN ${riskPart.partNumber.partNumber}`,
                    },
                    { status: 400 }
                )
            }

            if (
                item.type ===
                LogisticsRequestType.BUFFER_CALCULATION &&
                (!coverageStartDate || !coverageEndDate)
            ) {
                return NextResponse.json(
                    {
                        error:
                            `Informe o período de cobertura para cálculo de buffer do PN ${riskPart.partNumber.partNumber}`,
                    },
                    { status: 400 }
                )
            }

            const cutoffReference =
                typeof item.cutoffReference === "string" &&
                    item.cutoffReference.trim()
                    ? item.cutoffReference.trim()
                    : null

            const oldPartNumber =
                typeof item.oldPartNumber === "string" &&
                    item.oldPartNumber.trim()
                    ? item.oldPartNumber.trim()
                    : null

            const newPartNumber =
                typeof item.newPartNumber === "string" &&
                    item.newPartNumber.trim()
                    ? item.newPartNumber.trim()
                    : null

            const replacementReason =
                typeof item.replacementReason === "string" &&
                    item.replacementReason.trim()
                    ? item.replacementReason.trim()
                    : null

            normalizedRequests.push({
                riskPart,
                riskEventPartId,
                type: item.type as LogisticsRequestType,
                priority,
                requestNotes,
                requestedQuantity,
                coverageStartDate,
                coverageEndDate,
                cutoffDate,
                cutoffReference,
                oldPartNumber,
                newPartNumber,
                replacementReason,
            })
        }

        const duplicateOpenRequests =
            await prisma.logisticsRequest.findMany({
                where: {
                    riskEventId: id,
                    status: {
                        in: [
                            LogisticsRequestStatus.PENDING,
                            LogisticsRequestStatus.IN_REVIEW,
                        ],
                    },
                    OR: normalizedRequests.map((item) => ({
                        riskEventPartId: item.riskEventPartId,
                        type: item.type,
                    })),
                },
                include: {
                    riskEventPart: {
                        include: {
                            partNumber: {
                                select: {
                                    partNumber: true,
                                },
                            },
                        },
                    },
                },
            })

        if (duplicateOpenRequests.length > 0) {
            const duplicatedParts = duplicateOpenRequests
                .map(
                    (request) =>
                        request.riskEventPart.partNumber.partNumber
                )
                .join(", ")

            return NextResponse.json(
                {
                    error:
                        `Já existe solicitação logística pendente/em análise para: ${duplicatedParts}`,
                },
                { status: 409 }
            )
        }

        const logisticsUsers = await prisma.user.findMany({
            where: {
                isActive: true,
                OR: [
                    {
                        roles: {
                            some: {
                                role: {
                                    name: "LOGISTICS",
                                },
                            },
                        },
                    },
                    {
                        roles: {
                            some: {
                                role: {
                                    permissions: {
                                        some: {
                                            permission: {
                                                name: "LOGISTICS_REQUEST_REVIEW",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        roles: {
                            some: {
                                role: {
                                    permissions: {
                                        some: {
                                            permission: {
                                                name: "USER_MANAGE",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        })

        const ipAddress = getRequestIp(req)
        const userAgent = req.headers.get("user-agent")

        const createdRequests = await prisma.$transaction(
            async (tx) => {
                const created = []

                for (const item of normalizedRequests) {
                    const code = await getNextLogisticsRequestCode(tx)

                    const request =
                        await tx.logisticsRequest.create({
                            data: {
                                code,
                                riskEventId: risk.id,
                                riskEventPartId:
                                    item.riskEventPartId,
                                type: item.type,
                                status:
                                    LogisticsRequestStatus.PENDING,
                                priority: item.priority,
                                requestedById: currentUser.id,

                                requestNotes: item.requestNotes,

                                requestedQuantity:
                                    item.requestedQuantity,

                                coverageStartDate:
                                    item.coverageStartDate,
                                coverageEndDate:
                                    item.coverageEndDate,

                                cutoffDate: item.cutoffDate,
                                cutoffReference:
                                    item.cutoffReference,

                                oldPartNumber:
                                    item.oldPartNumber,
                                newPartNumber:
                                    item.newPartNumber,
                                replacementReason:
                                    item.replacementReason,
                            },
                            include: {
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
                            },
                        })

                    await tx.riskEventPart.update({
                        where: {
                            id: item.riskEventPartId,
                        },
                        data: {
                            logisticsStatus:
                                RiskPartLogisticsStatus.REQUESTED,
                        },
                    })

                    await tx.riskEventPartHistory.create({
                        data: {
                            riskEventPartId:
                                item.riskEventPartId,
                            riskEventId: risk.id,
                            partNumberId:
                                item.riskPart.partNumber.id,
                            changeType:
                                RiskPartHistoryType.LOGISTICS_CHANGE,
                            oldLogisticsStatus:
                                item.riskPart.logisticsStatus,
                            newLogisticsStatus:
                                RiskPartLogisticsStatus.REQUESTED,
                            reason:
                                item.type ===
                                    LogisticsRequestType.BUFFER_CALCULATION
                                    ? "Solicitação de cálculo de buffer enviada para Logística."
                                    : "Solicitação de inclusão no book da Logística enviada.",
                            changedById: currentUser.id,
                        },
                    })

                    await createAuditLog(tx, {
                        entityType: "LogisticsRequest",
                        entityId: request.id,
                        action: "LOGISTICS_REQUEST_CREATE",
                        changedBy: currentUser.id,
                        ipAddress,
                        oldValue: null,
                        newValue: {
                            id: request.id,
                            code: request.code,
                            riskEvent: {
                                id: risk.id,
                                code: risk.code,
                            },
                            supplier: risk.supplier,
                            partNumber: {
                                id: item.riskPart.partNumber.id,
                                partNumber:
                                    item.riskPart.partNumber
                                        .partNumber,
                                description:
                                    item.riskPart.partNumber
                                        .description,
                            },
                            type: request.type,
                            status: request.status,
                            priority: request.priority,
                            requestNotes:
                                request.requestNotes,
                            requestedQuantity:
                                request.requestedQuantity,
                            coverageStartDate:
                                request.coverageStartDate,
                            coverageEndDate:
                                request.coverageEndDate,
                            cutoffDate: request.cutoffDate,
                            cutoffReference:
                                request.cutoffReference,
                            oldPartNumber:
                                request.oldPartNumber,
                            newPartNumber:
                                request.newPartNumber,
                            replacementReason:
                                request.replacementReason,
                            changedByUser: {
                                id: currentUser.id,
                                name: currentUser.name,
                                email: currentUser.email,
                            },
                            userAgent,
                        },
                    })

                    for (const logisticsUser of logisticsUsers) {
                        if (logisticsUser.id === currentUser.id) {
                            continue
                        }

                        await createNotification(tx, {
                            userId: logisticsUser.id,
                            title:
                                "Nova solicitação logística",
                            message:
                                `Nova solicitação logística para o PN ${item.riskPart.partNumber.partNumber} na RM ${risk.code}.`,
                            type: "LOGISTICS_REQUEST_CREATED",
                            entity: "LogisticsRequest",
                            entityId: request.id,
                        })
                    }

                    created.push(request)
                }

                return created
            }
        )

        return NextResponse.json(
            {
                message:
                    "Solicitação logística criada com sucesso",
                data: createdRequests.map(formatLogisticsRequest),
            },
            { status: 201 }
        )
    } catch (error) {
        console.error(
            "ERRO AO CRIAR SOLICITAÇÃO LOGÍSTICA:",
            error
        )

        return NextResponse.json(
            {
                error: "Erro ao criar solicitação logística",
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        )
    }
}