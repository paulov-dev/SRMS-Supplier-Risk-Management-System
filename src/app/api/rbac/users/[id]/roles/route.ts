import { NextResponse } from "next/server"

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

type RequestBody = {
  roleIds?: unknown
}

function getPermissions(user: any): string[] {
  const permissions = user.roles.flatMap((ur: any) =>
    ur.role.permissions.map((rp: any) =>
      String(rp.permission.name)
    )
  )

  return Array.from(new Set<string>(permissions))
}

function normalizeRoleIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const roleIds: string[] = []

  for (const item of value) {
    if (typeof item === "string") {
      const trimmed = item.trim()

      if (trimmed) {
        roleIds.push(trimmed)
      }
    }
  }

  return Array.from(new Set(roleIds))
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

    const permissions = getPermissions(currentUser)

    if (!permissions.includes("USER_MANAGE")) {
      return NextResponse.json(
        { error: "Sem permissão" },
        { status: 403 }
      )
    }

    const { id } = await params

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const body = (await req.json()) as RequestBody

    const roleIds: string[] = normalizeRoleIds(
      body.roleIds
    )

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

    const existingRoles = await prisma.role.findMany({
      where: {
        id: {
          in: roleIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (existingRoles.length !== roleIds.length) {
      return NextResponse.json(
        {
          error:
            "Um ou mais cargos informados não existem",
        },
        { status: 400 }
      )
    }

    const oldRoleIds: string[] = targetUser.roles.map(
      (item) => item.roleId
    )

    const oldRoleNames: string[] = targetUser.roles.map(
      (item) => item.role.name
    )

    const newRoleIds: string[] = roleIds

    const newRoleNames: string[] = existingRoles.map(
      (role) => role.name
    )

    const addedRoleIds: string[] = newRoleIds.filter(
      (roleId) => !oldRoleIds.includes(roleId)
    )

    const removedRoleIds: string[] = oldRoleIds.filter(
      (roleId) => !newRoleIds.includes(roleId)
    )

    const addedRoleNames: string[] = existingRoles
      .filter((role) => addedRoleIds.includes(role.id))
      .map((role) => role.name)

    const removedRoleNames: string[] = targetUser.roles
      .filter((item) =>
        removedRoleIds.includes(item.roleId)
      )
      .map((item) => item.role.name)

    const hasChanges =
      addedRoleIds.length > 0 ||
      removedRoleIds.length > 0

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: {
          userId: id,
        },
      })

      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: id,
            roleId,
          })),
          skipDuplicates: true,
        })
      }

      if (!hasChanges) {
        return
      }

      if (addedRoleIds.length > 0) {
        await createAuditLog(tx, {
          entityType: "User",
          entityId: targetUser.id,
          action: "USER_ROLE_ADD",
          changedBy: currentUser.id,
          ipAddress,
          oldValue: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            roleIds: oldRoleIds,
            roleNames: oldRoleNames,
          },
          newValue: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
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

        if (targetUser.id !== currentUser.id) {
          await createNotification(tx, {
            userId: targetUser.id,
            title: "Novo cargo adicionado",
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
            name: targetUser.name,
            email: targetUser.email,
            roleIds: oldRoleIds,
            roleNames: oldRoleNames,
          },
          newValue: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
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

        if (targetUser.id !== currentUser.id) {
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
    })

    return NextResponse.json({
      message: "Roles atualizadas",
      changed: hasChanges,
      addedRoleIds,
      addedRoleNames,
      removedRoleIds,
      removedRoleNames,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: "Erro ao atualizar roles",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}