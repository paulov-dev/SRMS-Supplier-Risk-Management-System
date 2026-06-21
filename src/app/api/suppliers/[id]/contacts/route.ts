import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

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

function normalizeIp(ip: string | null) {
  if (!ip) return null

  const cleanIp = ip.split(",")[0]?.trim()

  if (!cleanIp) return null

  if (cleanIp.startsWith("::ffff:")) {
    return cleanIp.replace("::ffff:", "")
  }

  if (cleanIp === "::1") {
    return "127.0.0.1"
  }

  return cleanIp
}

function getRequestIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")
  const realIp = req.headers.get("x-real-ip")
  const cfIp = req.headers.get("cf-connecting-ip")

  return normalizeIp(
    forwardedFor || realIp || cfIp || null
  )
}

function toPrismaJsonObject(
  value: Record<string, unknown>
): Prisma.InputJsonObject {
  return JSON.parse(
    JSON.stringify(value)
  ) as Prisma.InputJsonObject
}

export async function POST(
  req: Request,
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

    const permissions = getPermissions(currentUser)

    if (!permissions.includes("SUPPLIER_UPDATE")) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para adicionar contato ao fornecedor",
        },
        { status: 403 }
      )
    }

    const { id: supplierId } = await params

    const body = await req.json()

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : ""

    const email =
      typeof body.email === "string" &&
      body.email.trim()
        ? body.email.trim()
        : null

    const phone =
      typeof body.phone === "string" &&
      body.phone.trim()
        ? body.phone.trim()
        : null

    const position =
      typeof body.position === "string" &&
      body.position.trim()
        ? body.position.trim()
        : null

    if (!name) {
      return NextResponse.json(
        {
          error: "O nome do contato é obrigatório",
        },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
      select: {
        id: true,
        name: true,
        supplierCodeSap: true,
      },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: "Fornecedor não encontrado" },
        { status: 404 }
      )
    }

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const contact = await prisma.$transaction(
      async (tx) => {
        const createdContact =
          await tx.supplierContact.create({
            data: {
              supplierId,
              name,
              email,
              phone,
              position,
            },
          })

        const newValue =
          toPrismaJsonObject({
            contact: {
              id: createdContact.id,
              supplierId: createdContact.supplierId,
              name: createdContact.name,
              email: createdContact.email,
              phone: createdContact.phone,
              position: createdContact.position,
              createdAt: createdContact.createdAt,
            },

            supplier: {
              id: supplier.id,
              name: supplier.name,
              supplierCodeSap:
                supplier.supplierCodeSap,
            },

            changedByUser: {
              id: currentUser.id,
            },

            ...(userAgent
              ? {
                  userAgent,
                }
              : {}),
          })

        await tx.auditLog.create({
          data: {
            entityType: "Supplier",
            entityId: supplierId,
            action: "SUPPLIER_CONTACT_CREATE",
            newValue,
            changedBy: currentUser.id,
            ipAddress,
          },
        })

        return createdContact
      }
    )

    return NextResponse.json({
      id: contact.id,
      supplierId: contact.supplierId,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      position: contact.position,
      createdAt: contact.createdAt,
    })
  } catch (error: any) {
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Fornecedor inválido ou não encontrado",
        },
        { status: 400 }
      )
    }

    console.error(error)

    return NextResponse.json(
      { error: "Erro ao criar contato" },
      { status: 500 }
    )
  }
}