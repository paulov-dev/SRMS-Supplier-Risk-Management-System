import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

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

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url)

    const page =
      Number(searchParams.get("page")) || 1

    const pageSize =
      Number(searchParams.get("pageSize")) || 20

    const userId = searchParams.get("userId")
    const action = searchParams.get("action")
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const where: Prisma.AuditLogWhereInput = {}

    if (userId) {
      where.changedBy = userId
    }

    if (action) {
      where.action = action
    }

    if (entityType) {
      where.entityType = entityType
    }

    if (entityId) {
      where.entityId = {
        contains: entityId,
        mode: "insensitive",
      }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}

      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }

      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)

        where.createdAt.lte = endDate
      }
    }

    const skip = (page - 1) * pageSize

    const [total, logs] =
      await prisma.$transaction([
        prisma.auditLog.count({
          where,
        }),

        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: pageSize,
        }),
      ])

    return NextResponse.json({
      data: logs.map((log) => ({
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        oldValue: log.oldValue,
        newValue: log.newValue,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
        user: log.user,
      })),

      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro ao buscar audit logs" },
      { status: 500 }
    )
  }
}