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

    if (!permissions.includes("USER_MANAGE")) {
      return NextResponse.json(
        { error: "Sem permissão" },
        { status: 403 }
      )
    }

    const [users, roles, permissionsList] =
      await Promise.all([
        prisma.user.findMany({
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),

        prisma.role.findMany({
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
            _count: {
              select: {
                users: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        }),

        prisma.permission.findMany({
          include: {
            _count: {
              select: {
                roles: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        }),
      ])

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        roles: user.roles.map((ur) => ur.role.name),
      })),

      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        usersCount: role._count.users,
        permissions: role.permissions.map(
          (rp) => rp.permission.name
        ),
      })),

      permissions: permissionsList.map((permission) => ({
        id: permission.id,
        name: permission.name,
        rolesCount: permission._count.roles,
      })),
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro ao carregar RBAC" },
      { status: 500 }
    )
  }
}