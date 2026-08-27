import { NextRequest, NextResponse } from "next/server"
import { SnapshotWeekday } from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"
import { getRequestIp } from "@/app/api/lib/request-ip"

function getPermissions(user: any): string[] {
    const permissions =
        user.roles?.flatMap((ur: any) =>
            ur.role.permissions.map((rp: any) =>
                String(rp.permission.name)
            )
        ) || []

    return Array.from(new Set<string>(permissions))
}

function canManageSnapshotConfig(user: any) {
    const permissions = getPermissions(user)

    return (
        permissions.includes("USER_MANAGE") ||
        permissions.includes("ANALYTICS_VIEW") ||
        user.roles?.some((ur: any) =>
            ["ADMIN", "SUPER_ADMIN"].includes(ur.role.name)
        )
    )
}

function isValidWeekday(value: unknown): value is SnapshotWeekday {
    return Object.values(SnapshotWeekday).includes(
        value as SnapshotWeekday
    )
}

function formatConfig(config: any) {
    return {
        id: config.id,
        name: config.name,
        isEnabled: config.isEnabled,
        weekday: config.weekday,
        hour: config.hour,
        minute: config.minute,
        timezone: config.timezone,
        allowManualRun: config.allowManualRun,
        overwriteCurrentWeek: config.overwriteCurrentWeek,
        lastRunAt: config.lastRunAt,
        lastRunWeek: config.lastRunWeek,
        lastRunYear: config.lastRunYear,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        createdBy: config.createdBy
            ? {
                  id: config.createdBy.id,
                  name: config.createdBy.name,
                  email: config.createdBy.email,
              }
            : null,
        updatedBy: config.updatedBy
            ? {
                  id: config.updatedBy.id,
                  name: config.updatedBy.name,
                  email: config.updatedBy.email,
              }
            : null,
    }
}

async function getOrCreateConfig(userId?: string) {
    const existing = await prisma.weeklySnapshotConfig.findFirst({
        orderBy: {
            createdAt: "asc",
        },
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            updatedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    })

    if (existing) {
        return existing
    }

    return prisma.weeklySnapshotConfig.create({
        data: {
            name: "Configuração padrão",
            isEnabled: true,
            weekday: "FRIDAY",
            hour: 17,
            minute: 0,
            timezone: "America/Sao_Paulo",
            allowManualRun: true,
            overwriteCurrentWeek: true,
            createdById: userId || null,
            updatedById: userId || null,
        },
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            updatedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    })
}

export async function GET() {
    try {
        const currentUser = await getUserFromRequest()

        if (!currentUser) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            )
        }

        if (!canManageSnapshotConfig(currentUser)) {
            return NextResponse.json(
                { error: "Sem permissão para visualizar configuração de snapshot" },
                { status: 403 }
            )
        }

        const config = await getOrCreateConfig(currentUser.id)

        return NextResponse.json(formatConfig(config))
    } catch (error) {
        console.error(error)

        return NextResponse.json(
            { error: "Erro ao buscar configuração de snapshot" },
            { status: 500 }
        )
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const currentUser = await getUserFromRequest()

        if (!currentUser) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            )
        }

        if (!canManageSnapshotConfig(currentUser)) {
            return NextResponse.json(
                { error: "Sem permissão para alterar configuração de snapshot" },
                { status: 403 }
            )
        }

        const body = await req.json()

        const {
            name,
            isEnabled,
            weekday,
            hour,
            minute,
            timezone,
            allowManualRun,
            overwriteCurrentWeek,
        } = body

        if (weekday !== undefined && !isValidWeekday(weekday)) {
            return NextResponse.json(
                { error: "Dia da semana inválido" },
                { status: 400 }
            )
        }

        if (
            hour !== undefined &&
            (!Number.isInteger(hour) || hour < 0 || hour > 23)
        ) {
            return NextResponse.json(
                { error: "Hora inválida. Informe um valor entre 0 e 23." },
                { status: 400 }
            )
        }

        if (
            minute !== undefined &&
            (!Number.isInteger(minute) || minute < 0 || minute > 59)
        ) {
            return NextResponse.json(
                { error: "Minuto inválido. Informe um valor entre 0 e 59." },
                { status: 400 }
            )
        }

        const ipAddress = getRequestIp(req)

        const existing = await getOrCreateConfig(currentUser.id)

        const updated = await prisma.$transaction(async (tx) => {
            const config = await tx.weeklySnapshotConfig.update({
                where: {
                    id: existing.id,
                },
                data: {
                    name:
                        typeof name === "string" && name.trim()
                            ? name.trim()
                            : existing.name,
                    isEnabled:
                        typeof isEnabled === "boolean"
                            ? isEnabled
                            : existing.isEnabled,
                    weekday:
                        weekday !== undefined
                            ? weekday
                            : existing.weekday,
                    hour:
                        hour !== undefined
                            ? hour
                            : existing.hour,
                    minute:
                        minute !== undefined
                            ? minute
                            : existing.minute,
                    timezone:
                        typeof timezone === "string" && timezone.trim()
                            ? timezone.trim()
                            : existing.timezone,
                    allowManualRun:
                        typeof allowManualRun === "boolean"
                            ? allowManualRun
                            : existing.allowManualRun,
                    overwriteCurrentWeek:
                        typeof overwriteCurrentWeek === "boolean"
                            ? overwriteCurrentWeek
                            : existing.overwriteCurrentWeek,
                    updatedById: currentUser.id,
                },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    updatedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            })

            await createAuditLog(tx, {
                entityType: "WeeklySnapshotConfig",
                entityId: config.id,
                action: "WEEKLY_SNAPSHOT_CONFIG_UPDATE",
                changedBy: currentUser.id,
                oldValue: {
                    name: existing.name,
                    isEnabled: existing.isEnabled,
                    weekday: existing.weekday,
                    hour: existing.hour,
                    minute: existing.minute,
                    timezone: existing.timezone,
                    allowManualRun: existing.allowManualRun,
                    overwriteCurrentWeek: existing.overwriteCurrentWeek,
                },
                newValue: {
                    name: config.name,
                    isEnabled: config.isEnabled,
                    weekday: config.weekday,
                    hour: config.hour,
                    minute: config.minute,
                    timezone: config.timezone,
                    allowManualRun: config.allowManualRun,
                    overwriteCurrentWeek: config.overwriteCurrentWeek,
                },
                ipAddress,
            })

            return config
        })

        return NextResponse.json(formatConfig(updated))
    } catch (error) {
        console.error(error)

        return NextResponse.json(
            { error: "Erro ao atualizar configuração de snapshot" },
            { status: 500 }
        )
    }
}