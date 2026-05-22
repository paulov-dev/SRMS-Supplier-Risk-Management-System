import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"

export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(countries)
  } catch {
    return NextResponse.json(
      {
        error: "Erro ao buscar países",
      },
      {
        status: 500,
      }
    )
  }
}