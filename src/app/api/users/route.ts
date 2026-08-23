import { NextResponse } from "next/server"

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
        user.roles?.map((ur: any) => String(ur.role.name)) || []

    return Array.from(new Set<string>(roles))
}

function canViewUsers(user: any) {
    const permissions = getPermissions(user)
    const roles = getRoles(user)

    return (
        permissions.includes("USER_VIEW") ||
        permissions.includes("USER_MANAGE") ||
        roles.includes("ADMIN") ||
        roles.includes("SUPER_ADMIN")
    )
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

        if (!canViewUsers(currentUser)) {
            return NextResponse.json(
                {
                    error:
                        "Você não possui permissão para visualizar usuários",
                },
                { status: 403 }
            )
        }

        const users = await prisma.user.findMany({
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },

                createdRisks: {
                    select: {
                        id: true,
                    },
                },

                assignedRisks: {
                    select: {
                        id: true,
                    },
                },

                logisticsRequested: {
                    select: {
                        id: true,
                    },
                },

                logisticsAssigned: {
                    select: {
                        id: true,
                    },
                },

                logisticsReviewed: {
                    select: {
                        id: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        })

        const formatted = users.map((user) => {
            const roles = user.roles.map((ur) => ({
                id: ur.role.id,
                name: ur.role.name,
            }))

            const permissions = [
                ...new Set(
                    user.roles.flatMap((ur) =>
                        ur.role.permissions.map(
                            (rp) => rp.permission.name
                        )
                    )
                ),
            ]

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
                isActive: user.isActive,
                status: user.isActive ? "active" : "inactive",
                createdAt: user.createdAt,

                roles,
                permissions,

                counters: {
                    createdRisks: user.createdRisks.length,
                    assignedRisks: user.assignedRisks.length,
                    requestedLogistics:
                        user.logisticsRequested.length,
                    assignedLogistics:
                        user.logisticsAssigned.length,
                    reviewedLogistics:
                        user.logisticsReviewed.length,
                },
            }
        })

        return NextResponse.json({
            data: formatted,
            summary: {
                total: formatted.length,
                active: formatted.filter(
                    (user) => user.isActive
                ).length,
                inactive: formatted.filter(
                    (user) => !user.isActive
                ).length,
                admins: formatted.filter((user) =>
                    user.roles.some((role) =>
                        ["ADMIN", "SUPER_ADMIN"].includes(
                            role.name
                        )
                    )
                ).length,
            },
        })
    } catch (error) {
        console.error("Erro ao buscar usuários:", error)

        return NextResponse.json(
            {
                error: "Erro ao buscar usuários",
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        )
    }
}