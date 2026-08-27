import {
    Prisma,
    RiskActionPlanStatus,
    RiskLevel,
    RiskWorkflowStatus,
    WeeklySnapshotEventType,
} from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { createAuditLog } from "@/app/api/lib/createAuditLog"

type RiskLike = {
    id: string
    code: string | null
    title: string
    riskLevel: RiskLevel
    workflowStatus: RiskWorkflowStatus
    createdAt: Date
    closedAt: Date | null
    canceledAt?: Date | null
    assignedToId: string | null
    createdById: string
    supplierId: string | null
    parts: {
        id: string
        status: string
        createdAt: Date
    }[]
    actionPlans: {
        id: string
        status: RiskActionPlanStatus
        dueDate: Date | null
        assignedToId: string | null
        createdAt: Date
        validatedAt: Date | null
    }[]
}

type GenerateWeeklySnapshotInput = {
    triggeredById: string
    ipAddress?: string | null
    mode: "MANUAL" | "AUTOMATIC"
    enforceManualAllowed?: boolean
}

const riskLevelWeight: Record<string, number> = {
    BLUE: 0,
    GREY: 0,
    GREEN: 1,
    ORANGE: 1,
    YELLOW: 2,
    RED: 3,
}

function toPrismaJsonObject(
    value: Record<string, unknown>
): Prisma.InputJsonObject {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
}

function startOfDay(date: Date) {
    const next = new Date(date)
    next.setHours(0, 0, 0, 0)
    return next
}

function endOfDay(date: Date) {
    const next = new Date(date)
    next.setHours(23, 59, 59, 999)
    return next
}

export function getWeekInfo(baseDate = new Date()) {
    const date = startOfDay(baseDate)

    const day = date.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day

    const weekStartDate = startOfDay(
        new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() + diffToMonday
        )
    )

    const weekEndDate = endOfDay(
        new Date(
            weekStartDate.getFullYear(),
            weekStartDate.getMonth(),
            weekStartDate.getDate() + 6
        )
    )

    const firstThursday = new Date(date.getFullYear(), 0, 4)
    const firstThursdayDay = firstThursday.getDay() || 7

    const firstWeekMonday = startOfDay(
        new Date(
            firstThursday.getFullYear(),
            firstThursday.getMonth(),
            firstThursday.getDate() - firstThursdayDay + 1
        )
    )

    const week =
        Math.floor(
            (weekStartDate.getTime() - firstWeekMonday.getTime()) /
                (7 * 24 * 60 * 60 * 1000)
        ) + 1

    return {
        week,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        weekStartDate,
        weekEndDate,
    }
}

function getPreviousWeekReference(week: number, year: number) {
    if (week > 1) {
        return {
            week: week - 1,
            year,
        }
    }

    return {
        week: 52,
        year: year - 1,
    }
}

function daysBetween(start: Date, end: Date) {
    const diff = end.getTime() - start.getTime()

    return Math.max(
        0,
        Math.floor(diff / (24 * 60 * 60 * 1000))
    )
}

function average(values: number[]) {
    if (values.length === 0) return null

    const total = values.reduce((sum, value) => sum + value, 0)

    return total / values.length
}

function maxOrNull(values: number[]) {
    if (values.length === 0) return null

    return Math.max(...values)
}

function isBetween(date: Date | null | undefined, start: Date, end: Date) {
    if (!date) return false

    return date >= start && date <= end
}

function countRisksByLevel(risks: RiskLike[]) {
    return {
        redRisks: risks.filter((risk) => risk.riskLevel === "RED").length,
        yellowRisks: risks.filter((risk) => risk.riskLevel === "YELLOW").length,
        greenRisks: risks.filter((risk) => risk.riskLevel === "GREEN").length,
        orangeRisks: risks.filter((risk) => risk.riskLevel === "ORANGE").length,
        greyRisks: risks.filter((risk) => risk.riskLevel === "GREY").length,
        blueRisks: risks.filter((risk) => risk.riskLevel === "BLUE").length,
    }
}

function countPartsByStatus(risks: RiskLike[]) {
    const parts = risks.flatMap((risk) => risk.parts)

    return {
        totalParts: parts.length,
        redParts: parts.filter((part) => part.status === "RED").length,
        yellowParts: parts.filter((part) => part.status === "YELLOW").length,
        greenParts: parts.filter((part) => part.status === "GREEN").length,
        orangeParts: parts.filter((part) => part.status === "ORANGE").length,
        greyParts: parts.filter((part) => part.status === "GREY").length,
        blueParts: parts.filter((part) => part.status === "BLUE").length,
    }
}

function countActionPlans(risks: RiskLike[], now: Date) {
    const plans = risks.flatMap((risk) => risk.actionPlans)

    return {
        totalActionPlans: plans.length,
        openActionPlans: plans.filter((plan) => plan.status === "OPEN").length,
        inProgressActionPlans: plans.filter(
            (plan) => plan.status === "IN_PROGRESS"
        ).length,
        waitingValidationActionPlans: plans.filter(
            (plan) => plan.status === "WAITING_VALIDATION"
        ).length,
        completedActionPlans: plans.filter(
            (plan) => plan.status === "COMPLETED"
        ).length,
        canceledActionPlans: plans.filter(
            (plan) => plan.status === "CANCELED"
        ).length,
        overdueActionPlans: plans.filter(
            (plan) =>
                plan.dueDate &&
                plan.dueDate < now &&
                !["COMPLETED", "CANCELED"].includes(plan.status)
        ).length,
    }
}

function getRiskLevelChangeType(
    oldLevel: string,
    newLevel: string
): WeeklySnapshotEventType {
    const oldWeight = riskLevelWeight[oldLevel] ?? 0
    const newWeight = riskLevelWeight[newLevel] ?? 0

    if (newWeight > oldWeight) {
        return "RISK_LEVEL_WORSENED"
    }

    if (newWeight < oldWeight) {
        return "RISK_LEVEL_IMPROVED"
    }

    return "RISK_LEVEL_CHANGED"
}

export async function generateWeeklySnapshot({
    triggeredById,
    ipAddress,
    mode,
    enforceManualAllowed = false,
}: GenerateWeeklySnapshotInput) {
    const now = new Date()

    const {
        week,
        month,
        year,
        weekStartDate,
        weekEndDate,
    } = getWeekInfo(now)

    const config =
        await prisma.weeklySnapshotConfig.findFirst({
            orderBy: {
                createdAt: "asc",
            },
        })

    if (enforceManualAllowed && config && !config.allowManualRun) {
        throw new Error("Execução manual de snapshot está desabilitada")
    }

    const result = await prisma.$transaction(async (tx) => {
        const risks = await tx.riskEvent.findMany({
            include: {
                parts: {
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                    },
                },
                actionPlans: {
                    select: {
                        id: true,
                        status: true,
                        dueDate: true,
                        assignedToId: true,
                        createdAt: true,
                        validatedAt: true,
                    },
                },
            },
        }) as RiskLike[]

        const logisticsRequests =
            await tx.logisticsRequest.findMany()

        const previousWeekReference = getPreviousWeekReference(
            week,
            year
        )

        const previousRiskStates =
            await tx.weeklyRiskStateSnapshot.findMany({
                where: {
                    week: previousWeekReference.week,
                    year: previousWeekReference.year,
                },
            })

        const previousRiskStateMap = new Map(
            previousRiskStates.map((state) => [
                state.riskEventId,
                state,
            ])
        )

        const hasPreviousWeekState =
            previousRiskStates.length > 0

        const movementEvents: Prisma.WeeklySnapshotEventCreateManyInput[] =
            []

        for (const risk of risks) {
            const previousState = previousRiskStateMap.get(risk.id)

            if (!previousState) continue

            if (previousState.riskLevel !== risk.riskLevel) {
                const eventType = getRiskLevelChangeType(
                    previousState.riskLevel,
                    risk.riskLevel
                )

                movementEvents.push({
                    week,
                    month,
                    year,
                    weekStartDate,
                    weekEndDate,
                    eventType,
                    riskEventId: risk.id,
                    userId: risk.assignedToId || risk.createdById,
                    oldValue: previousState.riskLevel,
                    newValue: risk.riskLevel,
                    description: `${risk.code || risk.title} mudou de ${previousState.riskLevel} para ${risk.riskLevel}`,
                })
            }
        }

        const totalRisks = risks.length

        const openRisks = risks.filter(
            (risk) => risk.workflowStatus === "OPEN"
        )

        const closedRisks = risks.filter(
            (risk) => risk.workflowStatus === "CLOSED"
        )

        const canceledRisks = risks.filter(
            (risk) => risk.workflowStatus === "CANCELED"
        )

        const riskLevels = countRisksByLevel(risks)
        const partStatuses = countPartsByStatus(risks)
        const actionPlans = countActionPlans(risks, now)

        const risksCreatedThisWeek = risks.filter((risk) =>
            isBetween(risk.createdAt, weekStartDate, weekEndDate)
        )

        const risksClosedThisWeek = risks.filter((risk) =>
            isBetween(risk.closedAt, weekStartDate, weekEndDate)
        )

        const risksCanceledThisWeek = risks.filter((risk) =>
            risk.workflowStatus === "CANCELED" &&
            isBetween(
                risk.canceledAt || null,
                weekStartDate,
                weekEndDate
            )
        )

        const risksImprovedThisWeek =
            movementEvents.filter(
                (event) =>
                    event.eventType === "RISK_LEVEL_IMPROVED"
            ).length

        const risksWorsenedThisWeek =
            movementEvents.filter(
                (event) =>
                    event.eventType === "RISK_LEVEL_WORSENED"
            ).length

        const comparisonMessage = hasPreviousWeekState
            ? `${risksImprovedThisWeek} RM(s) melhoraram e ${risksWorsenedThisWeek} RM(s) pioraram em relação à CW${previousWeekReference.week} / ${previousWeekReference.year}.`
            : `Nenhum snapshot de estado anterior encontrado para comparação de farol. A CW${week} / ${year} foi salva como base para as próximas comparações.`

        const createdRiskEvents =
            risksCreatedThisWeek.map((risk) => ({
                week,
                month,
                year,
                weekStartDate,
                weekEndDate,
                eventType: "RISK_CREATED" as WeeklySnapshotEventType,
                riskEventId: risk.id,
                userId: risk.createdById,
                description: `${risk.code || risk.title} criada na semana`,
            }))

        const closedRiskEvents =
            risksClosedThisWeek.map((risk) => ({
                week,
                month,
                year,
                weekStartDate,
                weekEndDate,
                eventType: "RISK_CLOSED" as WeeklySnapshotEventType,
                riskEventId: risk.id,
                userId: risk.assignedToId || risk.createdById,
                description: `${risk.code || risk.title} fechada na semana`,
            }))

        const canceledRiskEvents =
            risksCanceledThisWeek.map((risk) => ({
                week,
                month,
                year,
                weekStartDate,
                weekEndDate,
                eventType: "RISK_CANCELED" as WeeklySnapshotEventType,
                riskEventId: risk.id,
                userId: risk.assignedToId || risk.createdById,
                description: `${risk.code || risk.title} cancelada na semana`,
            }))

        const pendingLogisticsRequests =
            logisticsRequests.filter(
                (request: any) => request.status === "PENDING"
            )

        const inReviewLogisticsRequests =
            logisticsRequests.filter(
                (request: any) => request.status === "IN_REVIEW"
            )

        const approvedLogisticsRequests =
            logisticsRequests.filter(
                (request: any) => request.status === "APPROVED"
            )

        const rejectedLogisticsRequests =
            logisticsRequests.filter(
                (request: any) => request.status === "REJECTED"
            )

        const canceledLogisticsRequests =
            logisticsRequests.filter(
                (request: any) => request.status === "CANCELED"
            )

        const improvedRisks = movementEvents
            .filter(
                (event) =>
                    event.eventType === "RISK_LEVEL_IMPROVED"
            )
            .map((event) => {
                const risk = risks.find(
                    (item) => item.id === event.riskEventId
                )

                return {
                    id: event.riskEventId,
                    riskEventId: event.riskEventId,
                    code: risk?.code,
                    title: risk?.title,
                    oldValue: event.oldValue,
                    newValue: event.newValue,
                    description: event.description,
                }
            })

        const worsenedRisks = movementEvents
            .filter(
                (event) =>
                    event.eventType === "RISK_LEVEL_WORSENED"
            )
            .map((event) => {
                const risk = risks.find(
                    (item) => item.id === event.riskEventId
                )

                return {
                    id: event.riskEventId,
                    riskEventId: event.riskEventId,
                    code: risk?.code,
                    title: risk?.title,
                    oldValue: event.oldValue,
                    newValue: event.newValue,
                    description: event.description,
                }
            })

        const snapshotData = {
            week,
            month,
            year,
            weekStartDate,
            weekEndDate,
            snapshotDate: now,

            totalRisks,
            openRisks: openRisks.length,
            closedRisks: closedRisks.length,
            canceledRisks: canceledRisks.length,

            ...riskLevels,
            ...partStatuses,
            ...actionPlans,

            totalLogisticsRequests: logisticsRequests.length,
            pendingLogisticsRequests:
                pendingLogisticsRequests.length,
            inReviewLogisticsRequests:
                inReviewLogisticsRequests.length,
            approvedLogisticsRequests:
                approvedLogisticsRequests.length,
            rejectedLogisticsRequests:
                rejectedLogisticsRequests.length,
            canceledLogisticsRequests:
                canceledLogisticsRequests.length,

            risksCreatedThisWeek:
                risksCreatedThisWeek.length,
            risksClosedThisWeek:
                risksClosedThisWeek.length,
            risksCanceledThisWeek:
                risksCanceledThisWeek.length,
            risksReopenedThisWeek: 0,

            risksImprovedThisWeek,
            risksWorsenedThisWeek,

            summary: toPrismaJsonObject({
                createdRisks: risksCreatedThisWeek.map((risk) => ({
                    id: risk.id,
                    riskEventId: risk.id,
                    code: risk.code,
                    title: risk.title,
                })),
                closedRisks: risksClosedThisWeek.map((risk) => ({
                    id: risk.id,
                    riskEventId: risk.id,
                    code: risk.code,
                    title: risk.title,
                })),
                canceledRisks: risksCanceledThisWeek.map((risk) => ({
                    id: risk.id,
                    riskEventId: risk.id,
                    code: risk.code,
                    title: risk.title,
                })),
                improvedRisks,
                worsenedRisks,
            }),
        }

        const snapshot = await tx.weeklySnapshot.upsert({
            where: {
                week_year: {
                    week,
                    year,
                },
            },
            update: snapshotData,
            create: snapshotData,
        })

        const riskUsers = await tx.user.findMany({
            where: {
                OR: [
                    {
                        createdRisks: {
                            some: {},
                        },
                    },
                    {
                        assignedRisks: {
                            some: {},
                        },
                    },
                ],
            },
            select: {
                id: true,
            },
        })

        for (const user of riskUsers) {
            const userAssignedRisks = risks.filter(
                (risk) => risk.assignedToId === user.id
            )

            const userOpenRisks = userAssignedRisks.filter(
                (risk) => risk.workflowStatus === "OPEN"
            )

            const userClosedRisks = userAssignedRisks.filter(
                (risk) => risk.workflowStatus === "CLOSED"
            )

            const userCanceledRisks = userAssignedRisks.filter(
                (risk) => risk.workflowStatus === "CANCELED"
            )

            const userCreatedThisWeek = risks.filter(
                (risk) =>
                    risk.createdById === user.id &&
                    isBetween(
                        risk.createdAt,
                        weekStartDate,
                        weekEndDate
                    )
            )

            const userClosedThisWeek = userAssignedRisks.filter(
                (risk) =>
                    isBetween(
                        risk.closedAt,
                        weekStartDate,
                        weekEndDate
                    )
            )

            const userMovementEvents = movementEvents.filter(
                (event) => event.userId === user.id
            )

            const userPlans =
                userAssignedRisks.flatMap(
                    (risk) => risk.actionPlans
                )

            const userOpenRiskAges =
                userOpenRisks.map((risk) =>
                    daysBetween(risk.createdAt, now)
                )

            const userResolutionDays =
                userClosedRisks
                    .filter((risk) => risk.closedAt)
                    .map((risk) =>
                        daysBetween(
                            risk.createdAt,
                            risk.closedAt as Date
                        )
                    )

            const analystData = {
                userId: user.id,
                week,
                month,
                year,
                weekStartDate,
                weekEndDate,
                snapshotDate: now,

                assignedRisks: userAssignedRisks.length,
                openRisks: userOpenRisks.length,
                closedRisks: userClosedRisks.length,
                canceledRisks: userCanceledRisks.length,

                ...countRisksByLevel(userAssignedRisks),

                risksCreatedThisWeek:
                    userCreatedThisWeek.length,
                risksAssignedThisWeek: 0,
                risksClosedThisWeek:
                    userClosedThisWeek.length,
                risksCanceledThisWeek:
                    userCanceledRisks.filter((risk) =>
                        isBetween(
                            risk.canceledAt || null,
                            weekStartDate,
                            weekEndDate
                        )
                    ).length,
                risksReopenedThisWeek: 0,

                risksImprovedThisWeek:
                    userMovementEvents.filter(
                        (event) =>
                            event.eventType ===
                            "RISK_LEVEL_IMPROVED"
                    ).length,
                risksWorsenedThisWeek:
                    userMovementEvents.filter(
                        (event) =>
                            event.eventType ===
                            "RISK_LEVEL_WORSENED"
                    ).length,

                actionPlansTotal: userPlans.length,
                actionPlansOpen: userPlans.filter(
                    (plan) => plan.status === "OPEN"
                ).length,
                actionPlansOverdue: userPlans.filter(
                    (plan) =>
                        plan.dueDate &&
                        plan.dueDate < now &&
                        !["COMPLETED", "CANCELED"].includes(
                            plan.status
                        )
                ).length,
                actionPlansWaitingValidation:
                    userPlans.filter(
                        (plan) =>
                            plan.status ===
                            "WAITING_VALIDATION"
                    ).length,

                oldestOpenRiskDays:
                    maxOrNull(userOpenRiskAges),
                avgResolutionDays:
                    average(userResolutionDays),

                summary: toPrismaJsonObject({
                    createdRisks: userCreatedThisWeek.map((risk) => ({
                        id: risk.id,
                        code: risk.code,
                        title: risk.title,
                    })),
                    closedRisks: userClosedThisWeek.map((risk) => ({
                        id: risk.id,
                        code: risk.code,
                        title: risk.title,
                    })),
                }),
            }

            await tx.weeklyRiskAnalystSnapshot.upsert({
                where: {
                    userId_week_year: {
                        userId: user.id,
                        week,
                        year,
                    },
                },
                update: analystData,
                create: analystData,
            })
        }

        const logisticsUsers = await tx.user.findMany({
            where: {
                OR: [
                    {
                        logisticsAssigned: {
                            some: {},
                        },
                    },
                    {
                        logisticsReviewed: {
                            some: {},
                        },
                    },
                ],
            },
            select: {
                id: true,
            },
        })

        for (const user of logisticsUsers) {
            const userAssignedRequests =
                logisticsRequests.filter(
                    (request: any) =>
                        request.assignedToId === user.id
                )

            const userReviewedRequests =
                logisticsRequests.filter(
                    (request: any) =>
                        request.reviewedById === user.id
                )

            const userPendingRequests =
                userAssignedRequests.filter(
                    (request: any) =>
                        request.status === "PENDING"
                )

            const userInReviewRequests =
                userAssignedRequests.filter(
                    (request: any) =>
                        request.status === "IN_REVIEW"
                )

            const userApprovedRequests =
                userReviewedRequests.filter(
                    (request: any) =>
                        request.status === "APPROVED"
                )

            const userRejectedRequests =
                userReviewedRequests.filter(
                    (request: any) =>
                        request.status === "REJECTED"
                )

            const userCanceledRequests =
                userAssignedRequests.filter(
                    (request: any) =>
                        request.status === "CANCELED"
                )

            const requestsReceivedThisWeek =
                userAssignedRequests.filter((request: any) =>
                    isBetween(
                        request.requestedAt,
                        weekStartDate,
                        weekEndDate
                    )
                )

            const requestsApprovedThisWeek =
                userReviewedRequests.filter(
                    (request: any) =>
                        request.status === "APPROVED" &&
                        isBetween(
                            request.reviewedAt,
                            weekStartDate,
                            weekEndDate
                        )
                )

            const requestsRejectedThisWeek =
                userReviewedRequests.filter(
                    (request: any) =>
                        request.status === "REJECTED" &&
                        isBetween(
                            request.reviewedAt,
                            weekStartDate,
                            weekEndDate
                        )
                )

            const oldestPendingRequestDays =
                maxOrNull(
                    userPendingRequests.map((request: any) =>
                        daysBetween(request.requestedAt, now)
                    )
                )

            const reviewDays =
                userReviewedRequests
                    .filter(
                        (request: any) =>
                            request.requestedAt &&
                            request.reviewedAt
                    )
                    .map((request: any) =>
                        daysBetween(
                            request.requestedAt,
                            request.reviewedAt
                        )
                    )

            const logisticsData = {
                userId: user.id,
                week,
                month,
                year,
                weekStartDate,
                weekEndDate,
                snapshotDate: now,

                assignedRequests:
                    userAssignedRequests.length,
                pendingRequests:
                    userPendingRequests.length,
                inReviewRequests:
                    userInReviewRequests.length,
                approvedRequests:
                    userApprovedRequests.length,
                rejectedRequests:
                    userRejectedRequests.length,
                canceledRequests:
                    userCanceledRequests.length,

                requestsReceivedThisWeek:
                    requestsReceivedThisWeek.length,
                requestsAcceptedThisWeek: 0,
                requestsApprovedThisWeek:
                    requestsApprovedThisWeek.length,
                requestsRejectedThisWeek:
                    requestsRejectedThisWeek.length,
                requestsCanceledThisWeek:
                    userCanceledRequests.filter((request: any) =>
                        isBetween(
                            request.reviewedAt ||
                                request.updatedAt ||
                                null,
                            weekStartDate,
                            weekEndDate
                        )
                    ).length,

                partsUnderLogisticsReview: 0,
                partsApprovedThisWeek: 0,

                oldestPendingRequestDays,
                avgReviewDays: average(reviewDays),

                summary: toPrismaJsonObject({
                    approvedRequests: requestsApprovedThisWeek.map(
                        (request: any) => ({
                            id: request.id,
                            status: request.status,
                        })
                    ),
                    rejectedRequests: requestsRejectedThisWeek.map(
                        (request: any) => ({
                            id: request.id,
                            status: request.status,
                        })
                    ),
                }),
            }

            await tx.weeklyLogisticsSnapshot.upsert({
                where: {
                    userId_week_year: {
                        userId: user.id,
                        week,
                        year,
                    },
                },
                update: logisticsData,
                create: logisticsData,
            })
        }

        await tx.weeklySnapshotEvent.deleteMany({
            where: {
                week,
                year,
            },
        })

        const allEvents = [
            ...createdRiskEvents,
            ...closedRiskEvents,
            ...canceledRiskEvents,
            ...movementEvents,
        ]

        if (allEvents.length > 0) {
            await tx.weeklySnapshotEvent.createMany({
                data: allEvents,
            })
        }

        await tx.weeklyRiskStateSnapshot.deleteMany({
            where: {
                week,
                year,
            },
        })

        const riskStateSnapshotData: Prisma.WeeklyRiskStateSnapshotCreateManyInput[] =
            risks.map((risk) => ({
                week,
                month,
                year,
                weekStartDate,
                weekEndDate,
                snapshotDate: now,
                riskEventId: risk.id,
                code: risk.code,
                title: risk.title,
                riskLevel: risk.riskLevel,
                workflowStatus: risk.workflowStatus,
                assignedToId: risk.assignedToId,
                supplierId: risk.supplierId || null,
            }))

        await tx.weeklyRiskStateSnapshot.createMany({
            data: riskStateSnapshotData,
        })

        if (config) {
            await tx.weeklySnapshotConfig.update({
                where: {
                    id: config.id,
                },
                data: {
                    lastRunAt: now,
                    lastRunWeek: week,
                    lastRunYear: year,
                    updatedById: triggeredById,
                },
            })
        }

        await createAuditLog(tx, {
            entityType: "WeeklySnapshot",
            entityId: snapshot.id,
            action:
                mode === "AUTOMATIC"
                    ? "WEEKLY_SNAPSHOT_AUTO_GENERATE"
                    : "WEEKLY_SNAPSHOT_GENERATE",
            changedBy: triggeredById,
            oldValue: null,
            newValue: {
                week,
                month,
                year,
                snapshotId: snapshot.id,
                overwritten: true,
                totalRisks,
                openRisks: openRisks.length,
                events: allEvents.length,
                mode,
            },
            ipAddress: ipAddress || null,
        })

        return {
            snapshot,
            eventsCreated: allEvents.length,
            riskAnalystsProcessed: riskUsers.length,
            logisticsUsersProcessed: logisticsUsers.length,
            hasPreviousWeekState,
            previousWeek: previousWeekReference.week,
            previousYear: previousWeekReference.year,
            risksImprovedThisWeek,
            risksWorsenedThisWeek,
            comparisonMessage,
        }
    })

    return {
        message: "Snapshot semanal gerado com sucesso",
        comparisonMessage: result.comparisonMessage,
        comparison: {
            hasPreviousWeekState: result.hasPreviousWeekState,
            previousWeek: result.previousWeek,
            previousYear: result.previousYear,
            risksImprovedThisWeek: result.risksImprovedThisWeek,
            risksWorsenedThisWeek: result.risksWorsenedThisWeek,
        },
        week,
        month,
        year,
        weekStartDate,
        weekEndDate,
        overwritten: true,
        snapshot: result.snapshot,
        eventsCreated: result.eventsCreated,
        riskAnalystsProcessed: result.riskAnalystsProcessed,
        logisticsUsersProcessed: result.logisticsUsersProcessed,
    }
}