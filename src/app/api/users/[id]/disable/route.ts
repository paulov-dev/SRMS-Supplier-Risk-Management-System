import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"

import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(
  req: Request,
  { params }: Params
) {
  try {
    const user = await getUserFromRequest()

    // AUTH
    if (!user) {
      return NextResponse.json(
        {
          error: "Não autenticado",
        },
        {
          status: 401,
        }
      )
    }

    // PERMISSION
    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map(
            (rp) =>
              rp.permission.name
          )
        )
      ),
    ]

    const canManageUsers =
      permissions.includes(
        "USER_MANAGE"
      )

    if (!canManageUsers) {
      return NextResponse.json(
        {
          error: "Sem permissão",
        },
        {
          status: 403,
        }
      )
    }

    const { id } = await params

    // Não permitir desativar a si mesmo
    if (id === user.id) {
      return NextResponse.json(
        {
          error:
            "Você não pode desativar seu próprio usuário",
        },
        {
          status: 400,
        }
      )
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id,
        },
      })

    if (!existingUser) {
      return NextResponse.json(
        {
          error:
            "Usuário não encontrado",
        },
        {
          status: 404,
        }
      )
    }

    // INATIVAR
    await prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive: !existingUser.isActive,
        },
    })

    return NextResponse.json({
      message:
        "Usuário inativado com sucesso",
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: "Erro interno",
      },
      {
        status: 500,
      }
    )
  }
}