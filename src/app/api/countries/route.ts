import { NextResponse } from "next/server"
import { prisma } from "@/app/api/lib/prisma"

export async function GET() {
  const countries = await prisma.country.findMany({
    orderBy: {
      name: "asc",
    },
  })

  return NextResponse.json(countries)
}