import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

function getPermissions(user: any): string[] {
    const permissions =
        user.roles?.flatMap((ur: any) =>
            ur.role.permissions.map((rp: any) =>
                String(rp.permission.name)
            )
        ) || []

    return Array.from(new Set<string>(permissions))
}

function getRoles(user: any): string[] {
    const roles =
        user.roles?.map((ur: any) =>
            String(ur.role?.name || ur.name || "")
        ) || []

    return Array.from(new Set<string>(roles))
}

function canViewWeeklySnapshots(user: any) {
    const permissions = getPermissions(user)
    const roles = getRoles(user)

    return (
        permissions.includes("USER_MANAGE") ||
        permissions.includes("DASHBOARD_VIEW") ||
        permissions.includes("ANALYTICS_VIEW") ||
        permissions.includes("RISK_VIEW") ||
        roles.includes("ADMIN") ||
        roles.includes("SUPER_ADMIN") ||
        roles.includes("RISK_MANAGER")
    )
}

function toNumberOrUndefined(value: string | null) {
    if (!value) return undefined

    const parsed = Number(value)

    if (!Number.isInteger(parsed)) {
        return undefined
    }

    return parsed
}

function buildCurrentRiskTeamState(users: any[]) {
    const analysts = users.map((user) => {
        const risks = user.assignedRisks || []
        const parts = risks.flatMap(
            (risk: any) => risk.parts || []
        )

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
            },

            risks: {
                open: risks.length,
                red: risks.filter(
                    (risk: any) => risk.riskLevel === "RED"
                ).length,
                yellow: risks.filter(
                    (risk: any) => risk.riskLevel === "YELLOW"
                ).length,
                green: risks.filter(
                    (risk: any) => risk.riskLevel === "GREEN"
                ).length,
                orange: risks.filter(
                    (risk: any) => risk.riskLevel === "ORANGE"
                ).length,
                grey: risks.filter(
                    (risk: any) => risk.riskLevel === "GREY"
                ).length,
                blue: risks.filter(
                    (risk: any) => risk.riskLevel === "BLUE"
                ).length,
            },

            parts: {
                total: parts.length,
                red: parts.filter(
                    (part: any) => part.status === "RED"
                ).length,
                yellow: parts.filter(
                    (part: any) => part.status === "YELLOW"
                ).length,
                green: parts.filter(
                    (part: any) => part.status === "GREEN"
                ).length,
                orange: parts.filter(
                    (part: any) => part.status === "ORANGE"
                ).length,
                grey: parts.filter(
                    (part: any) => part.status === "GREY"
                ).length,
                blue: parts.filter(
                    (part: any) => part.status === "BLUE"
                ).length,
                withoutDemand: parts.filter(
                    (part: any) =>
                        part.assessment?.hasDemand === false
                ).length,
                completed: parts.filter(
                    (part: any) => part.status === "BLUE"
                ).length,
            },
        }
    })

    analysts.sort((analystA, analystB) => {
        if (analystB.risks.open !== analystA.risks.open) {
            return analystB.risks.open - analystA.risks.open
        }

        if (analystB.risks.red !== analystA.risks.red) {
            return analystB.risks.red - analystA.risks.red
        }

        return analystA.user.name.localeCompare(
            analystB.user.name,
            "pt-BR"
        )
    })

    return {
        generatedAt: new Date().toISOString(),
        analysts,
    }
}

function formatSnapshot(snapshot: any) {
    return {
        id: snapshot.id,
        week: snapshot.week,
        month: snapshot.month,
        year: snapshot.year,

        weekStartDate: snapshot.weekStartDate,
        weekEndDate: snapshot.weekEndDate,
        snapshotDate: snapshot.snapshotDate,

        totalRisks: snapshot.totalRisks,
        openRisks: snapshot.openRisks,
        closedRisks: snapshot.closedRisks,
        canceledRisks: snapshot.canceledRisks,

        redRisks: snapshot.redRisks,
        yellowRisks: snapshot.yellowRisks,
        greenRisks: snapshot.greenRisks,
        orangeRisks: snapshot.orangeRisks,
        greyRisks: snapshot.greyRisks,
        blueRisks: snapshot.blueRisks,

        totalParts: snapshot.totalParts,
        redParts: snapshot.redParts,
        yellowParts: snapshot.yellowParts,
        greenParts: snapshot.greenParts,
        orangeParts: snapshot.orangeParts,
        greyParts: snapshot.greyParts,
        blueParts: snapshot.blueParts,

        totalActionPlans: snapshot.totalActionPlans,
        openActionPlans: snapshot.openActionPlans,
        inProgressActionPlans: snapshot.inProgressActionPlans,
        waitingValidationActionPlans:
            snapshot.waitingValidationActionPlans,
        completedActionPlans: snapshot.completedActionPlans,
        canceledActionPlans: snapshot.canceledActionPlans,
        overdueActionPlans: snapshot.overdueActionPlans,

        totalLogisticsRequests: snapshot.totalLogisticsRequests,
        pendingLogisticsRequests: snapshot.pendingLogisticsRequests,
        inReviewLogisticsRequests: snapshot.inReviewLogisticsRequests,
        approvedLogisticsRequests: snapshot.approvedLogisticsRequests,
        rejectedLogisticsRequests: snapshot.rejectedLogisticsRequests,
        canceledLogisticsRequests: snapshot.canceledLogisticsRequests,

        risksCreatedThisWeek: snapshot.risksCreatedThisWeek,
        risksClosedThisWeek: snapshot.risksClosedThisWeek,
        risksCanceledThisWeek: snapshot.risksCanceledThisWeek,
        risksReopenedThisWeek: snapshot.risksReopenedThisWeek,
        risksImprovedThisWeek: snapshot.risksImprovedThisWeek,
        risksWorsenedThisWeek: snapshot.risksWorsenedThisWeek,

        summary: snapshot.summary,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
    }
}

function formatRiskAnalystSnapshot(snapshot: any) {
    return {
        id: snapshot.id,
        userId: snapshot.userId,
        user: snapshot.user
            ? {
                  id: snapshot.user.id,
                  name: snapshot.user.name,
                  email: snapshot.user.email,
                  photoUrl: snapshot.user.photoUrl,
              }
            : null,

        week: snapshot.week,
        month: snapshot.month,
        year: snapshot.year,

        weekStartDate: snapshot.weekStartDate,
        weekEndDate: snapshot.weekEndDate,
        snapshotDate: snapshot.snapshotDate,

        assignedRisks: snapshot.assignedRisks,
        openRisks: snapshot.openRisks,
        closedRisks: snapshot.closedRisks,
        canceledRisks: snapshot.canceledRisks,

        redRisks: snapshot.redRisks,
        yellowRisks: snapshot.yellowRisks,
        greenRisks: snapshot.greenRisks,
        orangeRisks: snapshot.orangeRisks,
        greyRisks: snapshot.greyRisks,
        blueRisks: snapshot.blueRisks,

        risksCreatedThisWeek: snapshot.risksCreatedThisWeek,
        risksAssignedThisWeek: snapshot.risksAssignedThisWeek,
        risksClosedThisWeek: snapshot.risksClosedThisWeek,
        risksCanceledThisWeek: snapshot.risksCanceledThisWeek,
        risksReopenedThisWeek: snapshot.risksReopenedThisWeek,
        risksImprovedThisWeek: snapshot.risksImprovedThisWeek,
        risksWorsenedThisWeek: snapshot.risksWorsenedThisWeek,

        actionPlansTotal: snapshot.actionPlansTotal,
        actionPlansOpen: snapshot.actionPlansOpen,
        actionPlansOverdue: snapshot.actionPlansOverdue,
        actionPlansWaitingValidation:
            snapshot.actionPlansWaitingValidation,

        oldestOpenRiskDays: snapshot.oldestOpenRiskDays,
        avgResolutionDays: snapshot.avgResolutionDays,

        summary: snapshot.summary,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
    }
}

function formatLogisticsSnapshot(snapshot: any) {
    return {
        id: snapshot.id,
        userId: snapshot.userId,
        user: snapshot.user
            ? {
                  id: snapshot.user.id,
                  name: snapshot.user.name,
                  email: snapshot.user.email,
                  photoUrl: snapshot.user.photoUrl,
              }
            : null,

        week: snapshot.week,
        month: snapshot.month,
        year: snapshot.year,

        weekStartDate: snapshot.weekStartDate,
        weekEndDate: snapshot.weekEndDate,
        snapshotDate: snapshot.snapshotDate,

        assignedRequests: snapshot.assignedRequests,
        pendingRequests: snapshot.pendingRequests,
        inReviewRequests: snapshot.inReviewRequests,
        approvedRequests: snapshot.approvedRequests,
        rejectedRequests: snapshot.rejectedRequests,
        canceledRequests: snapshot.canceledRequests,

        requestsReceivedThisWeek: snapshot.requestsReceivedThisWeek,
        requestsAcceptedThisWeek: snapshot.requestsAcceptedThisWeek,
        requestsApprovedThisWeek: snapshot.requestsApprovedThisWeek,
        requestsRejectedThisWeek: snapshot.requestsRejectedThisWeek,
        requestsCanceledThisWeek: snapshot.requestsCanceledThisWeek,

        partsUnderLogisticsReview:
            snapshot.partsUnderLogisticsReview,
        partsApprovedThisWeek: snapshot.partsApprovedThisWeek,

        oldestPendingRequestDays: snapshot.oldestPendingRequestDays,
        avgReviewDays: snapshot.avgReviewDays,

        summary: snapshot.summary,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
    }
}

function formatEvent(event: any) {
    return {
        id: event.id,
        week: event.week,
        month: event.month,
        year: event.year,

        weekStartDate: event.weekStartDate,
        weekEndDate: event.weekEndDate,
        eventType: event.eventType,

        riskEventId: event.riskEventId,
        riskEvent: event.riskEvent
            ? {
                  id: event.riskEvent.id,
                  code: event.riskEvent.code,
                  title: event.riskEvent.title,
              }
            : null,

        riskEventPartId: event.riskEventPartId,
        logisticsRequestId: event.logisticsRequestId,
        actionPlanId: event.actionPlanId,

        userId: event.userId,
        user: event.user
            ? {
                  id: event.user.id,
                  name: event.user.name,
                  email: event.user.email,
                  photoUrl: event.user.photoUrl,
              }
            : null,

        oldValue: event.oldValue,
        newValue: event.newValue,
        description: event.description,
        createdAt: event.createdAt,
    }
}

export async function GET(req: NextRequest) {
    try {
        const currentUser = await getUserFromRequest()

        if (!currentUser) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            )
        }

        if (!canViewWeeklySnapshots(currentUser)) {
            return NextResponse.json(
                {
                    error:
                        "Sem permissão para visualizar snapshots semanais",
                },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(req.url)

        // Consulta opcional para comparar snapshots de qualquer ano.
        // As consultas existentes continuam usando os filtros habituais.
        if (searchParams.get("view") === "history") {
            const snapshots = await prisma.weeklySnapshot.findMany({
                orderBy: [
                    { year: "desc" },
                    { week: "desc" },
                ],
            })

            return NextResponse.json(
                {
                    snapshots: snapshots.map(formatSnapshot),
                },
                {
                    headers: {
                        "Cache-Control": "private, no-store",
                    },
                }
            )
        }

        const year =
            toNumberOrUndefined(searchParams.get("year")) ||
            new Date().getFullYear()

        const month =
            toNumberOrUndefined(searchParams.get("month"))

        const week =
            toNumberOrUndefined(searchParams.get("week"))

        const where = {
            year,
            ...(month ? { month } : {}),
            ...(week ? { week } : {}),
        }

        const [
            snapshots,
            riskAnalystSnapshots,
            logisticsSnapshots,
            events,
            availableYears,
            availableMonths,
            availableWeeks,
            riskTeamUsers,
        ] = await Promise.all([
            prisma.weeklySnapshot.findMany({
                where,
                orderBy: [
                    { year: "desc" },
                    { week: "desc" },
                ],
            }),

            prisma.weeklyRiskAnalystSnapshot.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            photoUrl: true,
                        },
                    },
                },
                orderBy: [
                    { year: "desc" },
                    { week: "desc" },
                    { openRisks: "desc" },
                ],
            }),

            prisma.weeklyLogisticsSnapshot.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            photoUrl: true,
                        },
                    },
                },
                orderBy: [
                    { year: "desc" },
                    { week: "desc" },
                    { pendingRequests: "desc" },
                ],
            }),

            prisma.weeklySnapshotEvent.findMany({
                where,
                include: {
                    riskEvent: {
                        select: {
                            id: true,
                            code: true,
                            title: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            photoUrl: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 300,
            }),

            prisma.weeklySnapshot.findMany({
                select: {
                    year: true,
                },
                distinct: ["year"],
                orderBy: {
                    year: "desc",
                },
            }),

            prisma.weeklySnapshot.findMany({
                where: {
                    year,
                },
                select: {
                    month: true,
                },
                distinct: ["month"],
                orderBy: {
                    month: "asc",
                },
            }),

            prisma.weeklySnapshot.findMany({
                where: {
                    year,
                    ...(month ? { month } : {}),
                },
                select: {
                    week: true,
                },
                distinct: ["week"],
                orderBy: {
                    week: "asc",
                },
            }),

            // Posição atual do time; não depende da CW selecionada.
            prisma.user.findMany({
                where: {
                    isActive: true,
                    roles: {
                        some: {
                            role: {
                                name: "RISK_ANALYST",
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    photoUrl: true,

                    assignedRisks: {
                        where: {
                            workflowStatus: "OPEN",
                        },
                        select: {
                            id: true,
                            riskLevel: true,
                            parts: {
                                select: {
                                    id: true,
                                    status: true,
                                    assessment: {
                                        select: {
                                            hasDemand: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    name: "asc",
                },
            }),
        ])

        return NextResponse.json({
            filters: {
                year,
                month: month || null,
                week: week || null,
                availableYears:
                    availableYears.map((item) => item.year),
                availableMonths:
                    availableMonths.map((item) => item.month),
                availableWeeks:
                    availableWeeks.map((item) => item.week),
            },
            snapshots: snapshots.map(formatSnapshot),
            riskAnalystSnapshots:
                riskAnalystSnapshots.map(formatRiskAnalystSnapshot),
            logisticsSnapshots:
                logisticsSnapshots.map(formatLogisticsSnapshot),
            events: events.map(formatEvent),
            teamCurrentState:
                buildCurrentRiskTeamState(riskTeamUsers),
        })
    } catch (error) {
        console.error(error)

        return NextResponse.json(
            { error: "Erro ao buscar snapshots semanais" },
            { status: 500 }
        )
    }
}