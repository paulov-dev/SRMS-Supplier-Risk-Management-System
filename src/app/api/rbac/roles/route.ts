import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

function normalizeName(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
}

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

export async function POST(req: Request) {
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

    const body = await req.json()

    const name = normalizeName(body.name)

    if (!name) {
      return NextResponse.json(
        { error: "Nome da role é obrigatório" },
        { status: 400 }
      )
    }

    const role = await prisma.role.create({
      data: {
        name,
      },
    })

    return NextResponse.json(role)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Esta role já existe" },
        { status: 409 }
      )
    }

    console.error(error)

    return NextResponse.json(
      { error: "Erro ao criar role" },
      { status: 500 }
    )
  }
}