import { NextResponse } from "next/server"
import { prisma } from "@/app/api/lib/prisma"

export async function GET() {
  try {
    const users = await prisma.user.findMany({
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
    })

    const formatted = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.isActive ? "active" : "inactive",
      roles: user.roles.map((r) => r.role.name),
      createdAt: user.createdAt,
    }))

    return NextResponse.json(formatted)
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 }
    )
  }
}