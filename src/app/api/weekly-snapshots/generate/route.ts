import { NextRequest, NextResponse } from "next/server"

import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { getRequestIp } from "@/app/api/lib/request-ip"
import { generateWeeklySnapshot } from "@/app/api/weekly-snapshots/lib/generateWeeklySnapshot"

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

function canGenerateSnapshot(user: any) {
    const permissions = getPermissions(user)
    const roles = getRoles(user)

    return (
        permissions.includes("USER_MANAGE") ||
        roles.includes("RISK_MANAGER")
    )
}

export async function POST(req: NextRequest) {
    try {
        const currentUser = await getUserFromRequest()

        if (!currentUser) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            )
        }

        if (!canGenerateSnapshot(currentUser)) {
            return NextResponse.json(
                {
                    error:
                        "Somente RISK_MANAGER ou USER_MANAGE pode gerar snapshot semanal.",
                },
                { status: 403 }
            )
        }

        const result = await generateWeeklySnapshot({
            triggeredById: currentUser.id,
            ipAddress: getRequestIp(req),
            mode: "MANUAL",
            enforceManualAllowed: true,
        })

        return NextResponse.json({
            message: result.message,
            comparisonMessage: result.comparisonMessage,
            comparison: result.comparison,

            week: result.week,
            month: result.month,
            year: result.year,
            weekStartDate: result.weekStartDate,
            weekEndDate: result.weekEndDate,

            overwritten: result.overwritten,
            eventsCreated: result.eventsCreated,
            riskAnalystsProcessed: result.riskAnalystsProcessed,
            logisticsUsersProcessed: result.logisticsUsersProcessed,

            snapshot: result.snapshot,
        })
    } catch (error) {
        console.error(error)

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Erro ao gerar snapshot semanal",
            },
            { status: 500 }
        )
    }
}