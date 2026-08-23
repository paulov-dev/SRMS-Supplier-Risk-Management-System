import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"
import { createNotification } from "@/app/api/lib/createNotification"
import { getRequestIp } from "@/app/api/lib/request-ip"

type Params = {
    params: Promise<{
        id: string
    }>
}

function getUserPermissions(user: any): string[] {
    const permissions =
        user.roles?.flatMap((ur: any) =>
            ur.role.permissions.map((rp: any) =>
                String(rp.permission.name)
            )
        ) || []

    return Array.from(new Set<string>(permissions))
}

function getUserRoles(user: any): string[] {
    const roles =
        user.roles?.map((ur: any) => String(ur.role.name)) || []

    return Array.from(new Set<string>(roles))
}

function formatRisk(risk: any) {
    return {
        id: risk.id,
        code: risk.code,
        title: risk.title || risk.code,
        riskLevel: risk.riskLevel,
        workflowStatus: risk.workflowStatus,
        createdAt: risk.createdAt,
        supplier: {
            id: risk.supplier.id,
            name: risk.supplier.name,
        },
        status: {
            id: risk.workflowStatus,
            name: risk.workflowStatus,
        },
    }
}

function formatLogisticsRequest(request: any) {
    return {
        id: request.id,
        code: request.code,
        type: request.type,
        status: request.status,
        requestedAt: request.requestedAt,
        acceptedAt: request.acceptedAt,
        reviewedAt: request.reviewedAt,
        riskEvent: {
            id: request.riskEvent.id,
            code: request.riskEvent.code,
            title:
                request.riskEvent.title ||
                request.riskEvent.code,
            riskLevel: request.riskEvent.riskLevel,
            workflowStatus:
                request.riskEvent.workflowStatus,
            supplier: {
                id: request.riskEvent.supplier.id,
                name: request.riskEvent.supplier.name,
            },
            status: {
                id: request.riskEvent.workflowStatus,
                name: request.riskEvent.workflowStatus,
            },
        },
    }
}

function formatUserResponse(user: any) {
    const roles =
        user.roles?.map((ur: any) => ({
            id: ur.role.id,
            name: ur.role.name,
        })) || []

    const permissions = [
        ...new Set(
            user.roles?.flatMap((ur: any) =>
                ur.role.permissions.map(
                    (rp: any) => rp.permission.name
                )
            ) || []
        ),
    ]

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
        isActive: user.isActive,
        createdAt: user.createdAt,

        roles,
        permissions,

        createdRisks:
            user.createdRisks?.map((risk: any) =>
                formatRisk(risk)
            ) || [],

        assignedRisks:
            user.assignedRisks?.map((risk: any) =>
                formatRisk(risk)
            ) || [],

        requestedLogistics:
            user.logisticsRequested?.map((request: any) =>
                formatLogisticsRequest(request)
            ) || [],

        assignedLogistics:
            user.logisticsAssigned?.map((request: any) =>
                formatLogisticsRequest(request)
            ) || [],

        reviewedLogistics:
            user.logisticsReviewed?.map((request: any) =>
                formatLogisticsRequest(request)
            ) || [],
    }
}

const userInclude = {
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
        include: {
            supplier: true,
        },
        orderBy: {
            createdAt: "desc" as const,
        },
    },

    assignedRisks: {
        include: {
            supplier: true,
        },
        orderBy: {
            createdAt: "desc" as const,
        },
    },

    logisticsRequested: {
        include: {
            riskEvent: {
                include: {
                    supplier: true,
                },
            },
        },
        orderBy: {
            requestedAt: "desc" as const,
        },
    },

    logisticsAssigned: {
        include: {
            riskEvent: {
                include: {
                    supplier: true,
                },
            },
        },
        orderBy: {
            requestedAt: "desc" as const,
        },
    },

    logisticsReviewed: {
        include: {
            riskEvent: {
                include: {
                    supplier: true,
                },
            },
        },
        orderBy: {
            requestedAt: "desc" as const,
        },
    },
}

export async function GET(
    _req: Request,
    { params }: Params
) {
    try {
        const currentUser = await getUserFromRequest()

        if (!currentUser) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            )
        }

        const { id } = await params

        const currentUserPermissions =
            getUserPermissions(currentUser)

        const currentUserRoles =
            getUserRoles(currentUser)

        const isOwnProfile = currentUser.id === id

        const canViewUsers =
            currentUserPermissions.includes("USER_VIEW") ||
            currentUserPermissions.includes("USER_MANAGE") ||
            currentUserRoles.includes("ADMIN") ||
            currentUserRoles.includes("SUPER_ADMIN")

        if (!isOwnProfile && !canViewUsers) {
            return NextResponse.json(
                {
                    error:
                        "Você não possui permissão para visualizar este usuário",
                },
                { status: 403 }
            )
        }

        const user = await prisma.user.findUnique({
            where: {
                id,
            },
            include: userInclude,
        })

        if (!user) {
            return NextResponse.json(
                { error: "Usuário não encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json(formatUserResponse(user))
    } catch (error) {
        console.error("Erro ao buscar usuário:", error)

        return NextResponse.json(
            {
                error: "Erro ao buscar usuário",
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        )
    }
}

export async function PATCH(
    req: Request,
    { params }: Params
) {
    try {
        const currentUser = await getUserFromRequest()

        if (!currentUser) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            )
        }

        const { id } = await params

        const ipAddress = getRequestIp(req)
        const userAgent = req.headers.get("user-agent")

        const currentUserPermissions =
            getUserPermissions(currentUser)

        const currentUserRoles =
            getUserRoles(currentUser)

        const isOwnProfile = currentUser.id === id

        const isAdmin =
            currentUserPermissions.includes("USER_MANAGE") ||
            currentUserRoles.includes("ADMIN") ||
            currentUserRoles.includes("SUPER_ADMIN")

        if (!isOwnProfile && !isAdmin) {
            return NextResponse.json(
                {
                    error:
                        "Você não possui permissão para editar este usuário",
                },
                { status: 403 }
            )
        }

        const targetUser = await prisma.user.findUnique({
            where: {
                id,
            },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        })

        if (!targetUser) {
            return NextResponse.json(
                { error: "Usuário não encontrado" },
                { status: 404 }
            )
        }

        const body = await req.json()

        const {
            name,
            email,
            photoUrl,
            isActive,
            currentPassword,
            newPassword,
            roleIds,
        } = body

        if (!name || !email) {
            return NextResponse.json(
                {
                    error: "Nome e email são obrigatórios",
                },
                { status: 400 }
            )
        }

        const normalizedName = String(name).trim()
        const normalizedEmail = String(email).trim()
        const normalizedPhotoUrl = photoUrl || null

        if (!normalizedName || !normalizedEmail) {
            return NextResponse.json(
                {
                    error: "Nome e email são obrigatórios",
                },
                { status: 400 }
            )
        }

        const existingEmailUser =
            await prisma.user.findUnique({
                where: {
                    email: normalizedEmail,
                },
            })

        if (
            existingEmailUser &&
            existingEmailUser.id !== id
        ) {
            return NextResponse.json(
                {
                    error:
                        "Este email já está sendo usado por outro usuário",
                },
                { status: 409 }
            )
        }

        const dataToUpdate: {
            name: string
            email: string
            photoUrl: string | null
            isActive?: boolean
            passwordHash?: string
        } = {
            name: normalizedName,
            email: normalizedEmail,
            photoUrl: normalizedPhotoUrl,
        }

        if (typeof isActive === "boolean") {
            if (!isAdmin) {
                return NextResponse.json(
                    {
                        error:
                            "Somente administradores podem bloquear ou desbloquear usuários",
                    },
                    { status: 403 }
                )
            }

            if (isOwnProfile && isActive === false) {
                return NextResponse.json(
                    {
                        error:
                            "Você não pode inativar o próprio usuário",
                    },
                    { status: 400 }
                )
            }

            dataToUpdate.isActive = isActive
        }

        let normalizedRoleIds: string[] | null = null

        if (roleIds !== undefined) {
            if (!isAdmin) {
                return NextResponse.json(
                    {
                        error:
                            "Somente administradores podem alterar cargos do usuário",
                    },
                    { status: 403 }
                )
            }

            if (!Array.isArray(roleIds)) {
                return NextResponse.json(
                    {
                        error: "Lista de cargos inválida",
                    },
                    { status: 400 }
                )
            }

            normalizedRoleIds = Array.from(
                new Set(
                    roleIds
                        .filter(
                            (roleId) =>
                                typeof roleId === "string"
                        )
                        .map((roleId) => roleId.trim())
                        .filter(Boolean)
                )
            )

            const existingRoles =
                await prisma.role.findMany({
                    where: {
                        id: {
                            in: normalizedRoleIds,
                        },
                    },
                    select: {
                        id: true,
                    },
                })

            if (
                existingRoles.length !==
                normalizedRoleIds.length
            ) {
                return NextResponse.json(
                    {
                        error:
                            "Um ou mais cargos informados não existem",
                    },
                    { status: 400 }
                )
            }
        }

        let passwordChanged = false

        if (newPassword) {
            if (!isOwnProfile) {
                return NextResponse.json(
                    {
                        error:
                            "Administradores não podem alterar a senha de outro usuário por esta rota",
                    },
                    { status: 403 }
                )
            }

            if (!currentPassword) {
                return NextResponse.json(
                    {
                        error:
                            "Informe a senha atual para alterar a senha",
                    },
                    { status: 400 }
                )
            }

            const validPassword = await bcrypt.compare(
                currentPassword,
                currentUser.passwordHash
            )

            if (!validPassword) {
                return NextResponse.json(
                    {
                        error: "Senha atual incorreta",
                    },
                    { status: 400 }
                )
            }

            if (newPassword.length < 6) {
                return NextResponse.json(
                    {
                        error:
                            "A nova senha deve ter pelo menos 6 caracteres",
                    },
                    { status: 400 }
                )
            }

            dataToUpdate.passwordHash = await bcrypt.hash(
                newPassword,
                10
            )

            passwordChanged = true
        }

        const oldRoleIds = targetUser.roles.map(
            (ur) => ur.roleId
        )

        const oldRoleNames = targetUser.roles.map(
            (ur) => ur.role.name
        )

        const newRoleIds =
            normalizedRoleIds ?? oldRoleIds

        const addedRoleIds = newRoleIds.filter(
            (roleId) => !oldRoleIds.includes(roleId)
        )

        const removedRoleIds = oldRoleIds.filter(
            (roleId) => !newRoleIds.includes(roleId)
        )

        const roleChanged =
            normalizedRoleIds !== null &&
            (addedRoleIds.length > 0 ||
                removedRoleIds.length > 0)

        const oldFields: Record<string, unknown> = {}
        const newFields: Record<string, unknown> = {}

        if (targetUser.name !== normalizedName) {
            oldFields.name = targetUser.name
            newFields.name = normalizedName
        }

        if (targetUser.email !== normalizedEmail) {
            oldFields.email = targetUser.email
            newFields.email = normalizedEmail
        }

        if (targetUser.photoUrl !== normalizedPhotoUrl) {
            oldFields.photoUrl = targetUser.photoUrl
            newFields.photoUrl = normalizedPhotoUrl
        }

        if (
            typeof dataToUpdate.isActive === "boolean" &&
            targetUser.isActive !== dataToUpdate.isActive
        ) {
            oldFields.isActive = targetUser.isActive
            newFields.isActive = dataToUpdate.isActive
        }

        if (passwordChanged) {
            oldFields.password = "********"
            newFields.password = "UPDATED"
        }

        const changedFields = Object.keys(newFields)

        const profileChangedFields =
            changedFields.filter(
                (field) =>
                    field !== "isActive" &&
                    field !== "password"
            )

        const isBlocking =
            targetUser.isActive === true &&
            dataToUpdate.isActive === false

        const isUnblocking =
            targetUser.isActive === false &&
            dataToUpdate.isActive === true

        const updatedUser =
            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: {
                        id,
                    },
                    data: dataToUpdate,
                })

                if (normalizedRoleIds !== null) {
                    await tx.userRole.deleteMany({
                        where: {
                            userId: targetUser.id,
                        },
                    })

                    if (normalizedRoleIds.length > 0) {
                        await tx.userRole.createMany({
                            data: normalizedRoleIds.map(
                                (roleId) => ({
                                    userId: targetUser.id,
                                    roleId,
                                })
                            ),
                            skipDuplicates: true,
                        })
                    }
                }

                const refreshedUser =
                    await tx.user.findUniqueOrThrow({
                        where: {
                            id,
                        },
                        include: userInclude,
                    })

                if (profileChangedFields.length > 0) {
                    await createAuditLog(tx, {
                        entityType: "User",
                        entityId: targetUser.id,
                        action: "USER_UPDATE",
                        changedBy: currentUser.id,
                        ipAddress,
                        oldValue: {
                            id: targetUser.id,
                            fields: Object.fromEntries(
                                Object.entries(oldFields).filter(
                                    ([key]) =>
                                        key !== "isActive" &&
                                        key !== "password"
                                )
                            ),
                        },
                        newValue: {
                            id: refreshedUser.id,
                            fields: Object.fromEntries(
                                Object.entries(newFields).filter(
                                    ([key]) =>
                                        key !== "isActive" &&
                                        key !== "password"
                                )
                            ),
                            changedFields:
                                profileChangedFields,
                            changedByUser: {
                                id: currentUser.id,
                                name: currentUser.name,
                                email: currentUser.email,
                            },
                            userAgent,
                        },
                    })

                    if (targetUser.id !== currentUser.id) {
                        await createNotification(tx, {
                            userId: targetUser.id,
                            title:
                                "Seu cadastro foi atualizado",
                            message:
                                "Suas informações de usuário foram atualizadas no SRMS.",
                            type: "USER_PROFILE_UPDATED",
                            entity: "User",
                            entityId: targetUser.id,
                        })
                    }
                }

                if (passwordChanged) {
                    await createAuditLog(tx, {
                        entityType: "User",
                        entityId: targetUser.id,
                        action: "PASSWORD_CHANGE",
                        changedBy: currentUser.id,
                        ipAddress,
                        oldValue: {
                            id: targetUser.id,
                            password: "********",
                        },
                        newValue: {
                            id: targetUser.id,
                            password: "UPDATED",
                            changedByUser: {
                                id: currentUser.id,
                                name: currentUser.name,
                                email: currentUser.email,
                            },
                            userAgent,
                        },
                    })
                }

                if (isBlocking || isUnblocking) {
                    await createAuditLog(tx, {
                        entityType: "User",
                        entityId: targetUser.id,
                        action: isBlocking
                            ? "USER_BLOCK"
                            : "USER_UNBLOCK",
                        changedBy: currentUser.id,
                        ipAddress,
                        oldValue: {
                            id: targetUser.id,
                            name: targetUser.name,
                            email: targetUser.email,
                            isActive: targetUser.isActive,
                        },
                        newValue: {
                            id: refreshedUser.id,
                            name: refreshedUser.name,
                            email: refreshedUser.email,
                            isActive: refreshedUser.isActive,
                            changedByUser: {
                                id: currentUser.id,
                                name: currentUser.name,
                                email: currentUser.email,
                            },
                            userAgent,
                        },
                    })

                    if (targetUser.id !== currentUser.id) {
                        await createNotification(tx, {
                            userId: targetUser.id,
                            title: isBlocking
                                ? "Seu usuário foi bloqueado"
                                : "Seu usuário foi desbloqueado",
                            message: isBlocking
                                ? "Seu acesso ao SRMS foi bloqueado por um administrador."
                                : "Seu acesso ao SRMS foi desbloqueado.",
                            type: isBlocking
                                ? "USER_BLOCKED"
                                : "USER_UNBLOCKED",
                            entity: "User",
                            entityId: targetUser.id,
                        })
                    }
                }

                if (roleChanged) {
                    const newRoleNames =
                        refreshedUser.roles.map(
                            (ur: any) => ur.role.name
                        )

                    const addedRoleNames =
                        refreshedUser.roles
                            .filter((ur: any) =>
                                addedRoleIds.includes(
                                    ur.roleId
                                )
                            )
                            .map((ur: any) => ur.role.name)

                    const removedRoleNames =
                        targetUser.roles
                            .filter((ur) =>
                                removedRoleIds.includes(
                                    ur.roleId
                                )
                            )
                            .map((ur) => ur.role.name)

                    if (addedRoleIds.length > 0) {
                        await createAuditLog(tx, {
                            entityType: "User",
                            entityId: targetUser.id,
                            action: "USER_ROLE_ADD",
                            changedBy: currentUser.id,
                            ipAddress,
                            oldValue: {
                                id: targetUser.id,
                                roleIds: oldRoleIds,
                                roleNames: oldRoleNames,
                            },
                            newValue: {
                                id: targetUser.id,
                                roleIds: newRoleIds,
                                roleNames: newRoleNames,
                                addedRoleIds,
                                addedRoleNames,
                                changedByUser: {
                                    id: currentUser.id,
                                    name: currentUser.name,
                                    email: currentUser.email,
                                },
                                userAgent,
                            },
                        })

                        if (
                            targetUser.id !== currentUser.id
                        ) {
                            await createNotification(tx, {
                                userId: targetUser.id,
                                title:
                                    "Novo cargo adicionado",
                                message:
                                    addedRoleNames.length > 0
                                        ? `Foi adicionado ao seu usuário o cargo: ${addedRoleNames.join(", ")}.`
                                        : "Um novo cargo/perfil foi adicionado ao seu usuário no SRMS.",
                                type: "USER_ROLE_ADDED",
                                entity: "User",
                                entityId: targetUser.id,
                            })
                        }
                    }

                    if (removedRoleIds.length > 0) {
                        await createAuditLog(tx, {
                            entityType: "User",
                            entityId: targetUser.id,
                            action: "USER_ROLE_REMOVE",
                            changedBy: currentUser.id,
                            ipAddress,
                            oldValue: {
                                id: targetUser.id,
                                roleIds: oldRoleIds,
                                roleNames: oldRoleNames,
                            },
                            newValue: {
                                id: targetUser.id,
                                roleIds: newRoleIds,
                                roleNames: newRoleNames,
                                removedRoleIds,
                                removedRoleNames,
                                changedByUser: {
                                    id: currentUser.id,
                                    name: currentUser.name,
                                    email: currentUser.email,
                                },
                                userAgent,
                            },
                        })

                        if (
                            targetUser.id !== currentUser.id
                        ) {
                            await createNotification(tx, {
                                userId: targetUser.id,
                                title: "Cargo removido",
                                message:
                                    removedRoleNames.length > 0
                                        ? `Foi removido do seu usuário o cargo: ${removedRoleNames.join(", ")}.`
                                        : "Um cargo/perfil foi removido do seu usuário no SRMS.",
                                type: "USER_ROLE_REMOVED",
                                entity: "User",
                                entityId: targetUser.id,
                            })
                        }
                    }
                }

                return refreshedUser
            })

        return NextResponse.json(
            formatUserResponse(updatedUser)
        )
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error)

        return NextResponse.json(
            {
                error: "Erro ao atualizar usuário",
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        )
    }
}