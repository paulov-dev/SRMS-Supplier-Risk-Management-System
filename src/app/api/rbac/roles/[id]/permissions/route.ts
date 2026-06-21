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
        { error: "Sem permissão para gerenciar RBAC" },
        { status: 403 }
      )
    }

    const { id } = await params

    const body = await req.json()

    const permissionIds: string[] =
      body.permissionIds || []

    const role = await prisma.role.findUnique({
      where: {
        id,
      },
    })

    if (!role) {
      return NextResponse.json(
        { error: "Role não encontrada" },
        { status: 404 }
      )
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({
        where: {
          roleId: id,
        },
      }),

      prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
        skipDuplicates: true,
      }),
    ])

    return NextResponse.json({
      message: "Permissões da role atualizadas com sucesso",
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro ao atualizar permissões da role" },
      { status: 500 }
    )
  }
}