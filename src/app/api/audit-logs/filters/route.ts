import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

function getPermissions(user: any) {
  return [
    ...new Set(
      user.roles.flatMap((ur: any) =>
        ur.role.permissions.map(
          (rp: any) => rp.permission.name
        )
      )
    ),
  ]
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

    const permissions = getPermissions(currentUser)

    if (
      !permissions.includes("AUDIT_LOG_VIEW") &&
      !permissions.includes("USER_MANAGE")
    ) {
      return NextResponse.json(
        { error: "Sem permissão para visualizar logs" },
        { status: 403 }
      )
    }

    const [users, actions, entityTypes] =
      await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
          },
          orderBy: {
            name: "asc",
          },
        }),

        prisma.auditLog.findMany({
          distinct: ["action"],
          select: {
            action: true,
          },
          orderBy: {
            action: "asc",
          },
        }),

        prisma.auditLog.findMany({
          distinct: ["entityType"],
          select: {
            entityType: true,
          },
          orderBy: {
            entityType: "asc",
          },
        }),
      ])

    return NextResponse.json({
      users,
      actions: actions.map((item) => item.action),
      entityTypes: entityTypes.map(
        (item) => item.entityType
      ),
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro ao carregar filtros" },
      { status: 500 }
    )
  }
}