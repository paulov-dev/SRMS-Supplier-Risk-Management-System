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

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
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

    const body = await req.json()

    const roleIds: string[] = body.roleIds || []

    await prisma.$transaction([
      prisma.userRole.deleteMany({
        where: {
          userId: id,
        },
      }),

      prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId: id,
          roleId,
        })),
        skipDuplicates: true,
      }),
    ])

    return NextResponse.json({
      message: "Roles atualizadas",
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro ao atualizar roles" },
      { status: 500 }
    )
  }
}