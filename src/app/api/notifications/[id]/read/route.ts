import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

export async function PATCH(
  _req: Request,
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

    const { id } = await params

    const notification =
      await prisma.notification.findFirst({
        where: {
          id,
          userId: currentUser.id,
        },
      })

    if (!notification) {
      return NextResponse.json(
        { error: "Notificação não encontrada" },
        { status: 404 }
      )
    }

    const updated =
      await prisma.notification.update({
        where: {
          id,
        },
        data: {
          isRead: true,
        },
      })

    return NextResponse.json(updated)
  } catch (error) {
    console.error(
      "ERRO AO MARCAR NOTIFICAÇÃO COMO LIDA:",
      error
    )

    return NextResponse.json(
      {
        error: "Erro ao marcar notificação como lida",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}