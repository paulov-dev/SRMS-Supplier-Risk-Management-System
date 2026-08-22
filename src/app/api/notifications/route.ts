import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

export async function GET(req: Request) {
  try {
    const currentUser = await getUserFromRequest()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)

    const limitParam = Number(searchParams.get("limit") || 20)

    const limit = Number.isNaN(limitParam)
      ? 20
      : Math.min(Math.max(limitParam, 1), 100)

    const notifications =
      await prisma.notification.findMany({
        where: {
          userId: currentUser.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
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

export async function PATCH() {
  try {
    const currentUser = await getUserFromRequest()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    await prisma.notification.updateMany({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "ERRO AO MARCAR NOTIFICAÇÕES COMO LIDAS:",
      error
    )

    return NextResponse.json(
      {
        error: "Erro ao marcar notificações como lidas",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}