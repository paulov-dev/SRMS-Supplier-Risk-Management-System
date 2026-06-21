import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

function getPermissions(user: any): string[] {
  const permissions = user.roles.flatMap((ur: any) =>
    ur.role.permissions.map((rp: any) =>
      String(rp.permission.name)
    )
  )

  return Array.from(new Set<string>(permissions))
}

function hasAnyPermission(
  permissions: string[],
  allowed: string[]
) {
  return allowed.some((permission) =>
    permissions.includes(permission)
  )
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
      !hasAnyPermission(permissions, [
        "RISK_VIEW",
        "RISK_CREATE",
        "RISK_UPDATE",
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para consultar PNs",
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)

    const search = searchParams.get("search") || ""

    const where: Prisma.PartNumberWhereInput = {}

    if (search.trim()) {
      where.OR = [
        {
          partNumber: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
        {
          vehicleProgram: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
      ]
    }

    const partNumbers =
      await prisma.partNumber.findMany({
        where,
        orderBy: {
          partNumber: "asc",
        },
        take: 20,
      })

    return NextResponse.json(
      partNumbers.map((part) => ({
        id: part.id,
        partNumber: part.partNumber,
        description: part.description,
        vehicleProgram: part.vehicleProgram,
        createdAt: part.createdAt,
      }))
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro ao buscar PNs" },
      { status: 500 }
    )
  }
}