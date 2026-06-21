// src/app/api/suppliers/[id]/status/route.ts

import { prisma } from "@/app/api/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const { id } = await params

    const body = await request.json()

    const supplier = await prisma.supplier.update({
      where: {
        id,
      },
      data: {
        status: body.status,
      },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: "Failed to update supplier status",
      },
      {
        status: 500,
      }
    )
  }
}