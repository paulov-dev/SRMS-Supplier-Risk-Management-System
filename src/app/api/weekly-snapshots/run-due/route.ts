import { NextResponse } from "next/server"
import { SnapshotWeekday } from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { generateWeeklySnapshot } from "@/app/api/weekly-snapshots/lib/generateWeeklySnapshot"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type CronValidationResult =
    | {
          ok: true
      }
    | {
          ok: false
          status: number
          message: string
      }

type ZonedNow = {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    weekday: SnapshotWeekday
    isoWeek: number
    isoYear: number
    formatted: string
}

function getTokenFromRequest(req: Request) {
    const authorization = req.headers.get("authorization")

    if (!authorization) {
        return null
    }

    const match = authorization.match(/^Bearer\s+(.+)$/i)

    if (!match) {
        return null
    }

    return match[1]?.trim() || null
}

function validateCronSecret(req: Request): CronValidationResult {
    const expectedSecret =
        process.env.WEEKLY_SNAPSHOT_CRON_SECRET

    if (!expectedSecret) {
        return {
            ok: false,
            status: 500,
            message:
                "Variável WEEKLY_SNAPSHOT_CRON_SECRET não configurada no ambiente.",
        }
    }

    const receivedToken = getTokenFromRequest(req)

    if (
        !receivedToken ||
        receivedToken !== expectedSecret
    ) {
        return {
            ok: false,
            status: 401,
            message: "Não autorizado.",
        }
    }

    return {
        ok: true,
    }
}

function mapWeekday(value: string): SnapshotWeekday {
    const normalized = value.toLowerCase()

    if (normalized.includes("sunday")) {
        return SnapshotWeekday.SUNDAY
    }

    if (normalized.includes("monday")) {
        return SnapshotWeekday.MONDAY
    }

    if (normalized.includes("tuesday")) {
        return SnapshotWeekday.TUESDAY
    }

    if (normalized.includes("wednesday")) {
        return SnapshotWeekday.WEDNESDAY
    }

    if (normalized.includes("thursday")) {
        return SnapshotWeekday.THURSDAY
    }

    if (normalized.includes("friday")) {
        return SnapshotWeekday.FRIDAY
    }

    return SnapshotWeekday.SATURDAY
}

function getIsoWeekInfo(
    year: number,
    month: number,
    day: number
) {
    const date = new Date(
        Date.UTC(
            year,
            month - 1,
            day
        )
    )

    const dayOfWeek =
        date.getUTCDay() === 0
            ? 7
            : date.getUTCDay()

    date.setUTCDate(
        date.getUTCDate() + 4 - dayOfWeek
    )

    const isoYear = date.getUTCFullYear()

    const yearStart = new Date(
        Date.UTC(
            isoYear,
            0,
            1
        )
    )

    const isoWeek = Math.ceil(
        ((date.getTime() - yearStart.getTime()) /
            86400000 +
            1) /
            7
    )

    return {
        isoWeek,
        isoYear,
    }
}

function getZonedNow(timezone: string): ZonedNow {
    const formatter = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: timezone,
            weekday: "long",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        }
    )

    const parts =
        formatter.formatToParts(new Date())

    const getPart = (type: string) =>
        parts.find((part) => part.type === type)
            ?.value || ""

    const year = Number(getPart("year"))
    const month = Number(getPart("month"))
    const day = Number(getPart("day"))
    const hour = Number(getPart("hour"))
    const minute = Number(getPart("minute"))

    const weekday = mapWeekday(
        getPart("weekday")
    )

    const { isoWeek, isoYear } =
        getIsoWeekInfo(
            year,
            month,
            day
        )

    return {
        year,
        month,
        day,
        hour,
        minute,
        weekday,
        isoWeek,
        isoYear,
        formatted: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${timezone}`,
    }
}

function hasReachedScheduledTime(params: {
    currentHour: number
    currentMinute: number
    scheduledHour: number
    scheduledMinute: number
}) {
    const currentTotalMinutes =
        params.currentHour * 60 +
        params.currentMinute

    const scheduledTotalMinutes =
        params.scheduledHour * 60 +
        params.scheduledMinute

    return (
        currentTotalMinutes >=
        scheduledTotalMinutes
    )
}

async function getFallbackTriggeredById() {
    const fallbackUser =
        await prisma.user.findFirst({
            where: {
                isActive: true,
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
            select: {
                id: true,
            },
        })

    return fallbackUser?.id || null
}

async function handleRunDue(req: Request) {
    try {
        const secretValidation =
            validateCronSecret(req)

        if (!secretValidation.ok) {
            return NextResponse.json(
                {
                    ran: false,
                    error: secretValidation.message,
                },
                {
                    status: secretValidation.status,
                }
            )
        }

        const config =
            await prisma.weeklySnapshotConfig.findFirst({
                where: {
                    isEnabled: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            })

        if (!config) {
            return NextResponse.json({
                ran: false,
                reason:
                    "Nenhuma configuração ativa de snapshot semanal foi encontrada.",
            })
        }

        const timezone =
            config.timezone ||
            "America/Sao_Paulo"

        const now = getZonedNow(timezone)

        const scheduledHour = Number(config.hour)
        const scheduledMinute = Number(config.minute)

        if (now.weekday !== config.weekday) {
            return NextResponse.json({
                ran: false,
                reason:
                    "Hoje não é o dia configurado para execução do snapshot.",
                now,
                schedule: {
                    weekday: config.weekday,
                    hour: scheduledHour,
                    minute: scheduledMinute,
                    timezone,
                },
            })
        }

        const reachedScheduledTime =
            hasReachedScheduledTime({
                currentHour: now.hour,
                currentMinute: now.minute,
                scheduledHour,
                scheduledMinute,
            })

        if (!reachedScheduledTime) {
            return NextResponse.json({
                ran: false,
                reason:
                    "Ainda não chegou o horário configurado para execução do snapshot.",
                now,
                schedule: {
                    weekday: config.weekday,
                    hour: scheduledHour,
                    minute: scheduledMinute,
                    timezone,
                },
            })
        }

        const alreadyRanThisWeek =
            config.lastRunWeek === now.isoWeek &&
            config.lastRunYear === now.isoYear

        if (alreadyRanThisWeek) {
            return NextResponse.json({
                ran: false,
                reason:
                    "Snapshot automático desta semana já foi executado.",
                week: now.isoWeek,
                year: now.isoYear,
                lastRunAt: config.lastRunAt,
            })
        }

        const existingSnapshot =
            await prisma.weeklySnapshot.findFirst({
                where: {
                    week: now.isoWeek,
                    year: now.isoYear,
                },
                select: {
                    id: true,
                    week: true,
                    year: true,
                    createdAt: true,
                },
            })

        if (
            existingSnapshot &&
            !config.overwriteCurrentWeek
        ) {
            await prisma.weeklySnapshotConfig.update({
                where: {
                    id: config.id,
                },
                data: {
                    lastRunAt: new Date(),
                    lastRunWeek: now.isoWeek,
                    lastRunYear: now.isoYear,
                },
            })

            return NextResponse.json({
                ran: false,
                reason:
                    "Snapshot desta semana já existe. Como overwriteCurrentWeek está desativado, a execução automática foi ignorada.",
                week: now.isoWeek,
                year: now.isoYear,
                existingSnapshotId:
                    existingSnapshot.id,
            })
        }

        const fallbackTriggeredById =
            await getFallbackTriggeredById()

        const triggeredById =
            config.updatedById ??
            config.createdById ??
            fallbackTriggeredById

        if (!triggeredById) {
            return NextResponse.json(
                {
                    ran: false,
                    error:
                        "Não foi possível identificar um usuário responsável para executar o snapshot automático.",
                    details:
                        "A configuração não possui updatedById/createdById e nenhum usuário ativo com USER_MANAGE foi encontrado.",
                },
                {
                    status: 500,
                }
            )
        }

        const result =
            await generateWeeklySnapshot({
                mode: "AUTOMATIC",
                triggeredById,
            })

        const resultData = result as any

        await prisma.weeklySnapshotConfig.update({
            where: {
                id: config.id,
            },
            data: {
                lastRunAt: new Date(),
                lastRunWeek:
                    resultData.week || now.isoWeek,
                lastRunYear:
                    resultData.year || now.isoYear,
            },
        })

        return NextResponse.json({
            ran: true,
            reason:
                "Snapshot automático executado com sucesso.",
            mode: "AUTOMATIC",
            triggeredById,
            week: resultData.week || now.isoWeek,
            month: resultData.month,
            year: resultData.year || now.isoYear,
            weekStartDate:
                resultData.weekStartDate,
            weekEndDate:
                resultData.weekEndDate,
            overwritten:
                resultData.overwritten ?? false,
            eventsCreated:
                resultData.eventsCreated ?? 0,
            riskAnalystsProcessed:
                resultData.riskAnalystsProcessed ?? 0,
            logisticsUsersProcessed:
                resultData.logisticsUsersProcessed ?? 0,
            comparison:
                resultData.comparison ?? null,
            snapshotId:
                resultData.snapshot?.id ?? null,
        })
    } catch (error) {
        console.error(
            "ERRO AO EXECUTAR SNAPSHOT AUTOMÁTICO:",
            error
        )

        return NextResponse.json(
            {
                ran: false,
                error:
                    "Erro ao executar snapshot automático.",
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            {
                status: 500,
            }
        )
    }
}

export async function POST(req: Request) {
    return handleRunDue(req)
}

export async function GET(req: Request) {
    return handleRunDue(req)
}