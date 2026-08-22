import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

export async function GET() {
  try {
    const currentUser = await getUserFromRequest()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const notifications =
      await prisma.notification.findMany({
        where: {
          userId: currentUser.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      })

    const unreadCount =
      await prisma.notification.count({
        where: {
          userId: currentUser.id,
          isRead: false,
        },
      })

    return NextResponse.json({
      data: notifications,
      unreadCount,
    })
  } catch (error) {
    console.error(
      "ERRO AO BUSCAR NOTIFICAÇÕES:",
      error
    )

    return NextResponse.json(
      {
        error: "Erro ao buscar notificações",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}