import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { getRequestIp } from "@/app/api/lib/request-ip"
import {
    generateWeeklySnapshot,
    getWeekInfo,
} from "@/app/api/weekly-snapshots/lib/generateWeeklySnapshot"

type WeekdayName =
    | "SUNDAY"
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"

const weekdayMap: Record<string, WeekdayName> = {
    Sun: "SUNDAY",
    Mon: "MONDAY",
    Tue: "TUESDAY",
    Wed: "WEDNESDAY",
    Thu: "THURSDAY",
    Fri: "FRIDAY",
    Sat: "SATURDAY",
}

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

function canRunDue(user: any) {
    const permissions = getPermissions(user)
    const roles = getRoles(user)

    return (
        permissions.includes("USER_MANAGE") ||
        roles.includes("RISK_MANAGER")
    )
}

function getDateTimeParts(timezone: string) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date())

    const weekdayShort =
        parts.find((part) => part.type === "weekday")?.value || "Mon"

    const hour =
        Number(parts.find((part) => part.type === "hour")?.value || 0)

    const minute =
        Number(parts.find((part) => part.type === "minute")?.value || 0)

    return {
        weekday: weekdayMap[weekdayShort] || "MONDAY",
        hour,
        minute,
    }
}

function isConfiguredTimeDue({
    currentWeekday,
    currentHour,
    currentMinute,
    configuredWeekday,
    configuredHour,
    configuredMinute,
}: {
    currentWeekday: string
    currentHour: number
    currentMinute: number
    configuredWeekday: string
    configuredHour: number
    configuredMinute: number
}) {
    if (currentWeekday !== configuredWeekday) {
        return false
    }

    const currentTotalMinutes =
        currentHour * 60 + currentMinute

    const configuredTotalMinutes =
        configuredHour * 60 + configuredMinute

    return currentTotalMinutes >= configuredTotalMinutes
}

export async function POST(req: NextRequest) {
    try {
        const config =
            await prisma.weeklySnapshotConfig.findFirst({
                orderBy: {
                    createdAt: "asc",
                },
            })

        if (!config) {
            return NextResponse.json({
                ran: false,
                reason:
                    "Nenhuma configuração de snapshot encontrada.",
            })
        }

        if (!config.isEnabled) {
            return NextResponse.json({
                ran: false,
                reason:
                    "Snapshot automático está desabilitado.",
            })
        }

        const cronSecret = process.env.WEEKLY_SNAPSHOT_CRON_SECRET
        const authorization = req.headers.get("authorization")

        const isCronAuthorized =
            Boolean(cronSecret) &&
            authorization === `Bearer ${cronSecret}`

        let triggeredById = config.updatedById || config.createdById

        if (!isCronAuthorized) {
            const currentUser = await getUserFromRequest()

            if (!currentUser) {
                return NextResponse.json(
                    { error: "Não autenticado" },
                    { status: 401 }
                )
            }

            if (!canRunDue(currentUser)) {
                return NextResponse.json(
                    {
                        error:
                            "Somente RISK_MANAGER ou USER_MANAGE pode executar verificação de snapshot.",
                    },
                    { status: 403 }
                )
            }

            triggeredById = currentUser.id
        }

        if (!triggeredById) {
            return NextResponse.json(
                {
                    ran: false,
                    reason:
                        "Não foi possível identificar usuário responsável pela execução.",
                },
                { status: 400 }
            )
        }

        const currentParts = getDateTimeParts(config.timezone)

        const due = isConfiguredTimeDue({
            currentWeekday: currentParts.weekday,
            currentHour: currentParts.hour,
            currentMinute: currentParts.minute,
            configuredWeekday: config.weekday,
            configuredHour: config.hour,
            configuredMinute: config.minute,
        })

        if (!due) {
            return NextResponse.json({
                ran: false,
                reason:
                    "Ainda não está no dia/horário configurado para o snapshot.",
                configured: {
                    weekday: config.weekday,
                    hour: config.hour,
                    minute: config.minute,
                    timezone: config.timezone,
                },
                current: currentParts,
            })
        }

        const { week, year } = getWeekInfo(new Date())

        if (
            config.lastRunWeek === week &&
            config.lastRunYear === year
        ) {
            return NextResponse.json({
                ran: false,
                reason:
                    "O snapshot automático desta semana já foi executado.",
                week,
                year,
                lastRunAt: config.lastRunAt,
            })
        }

        const result = await generateWeeklySnapshot({
            triggeredById,
            ipAddress: getRequestIp(req),
            mode: "AUTOMATIC",
            enforceManualAllowed: false,
        })

        return NextResponse.json({
            ran: true,
            reason:
                "Snapshot automático executado com sucesso.",
            ...result,
        })
    } catch (error) {
        console.error(error)

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Erro ao executar snapshot automático",
            },
            { status: 500 }
        )
    }
}