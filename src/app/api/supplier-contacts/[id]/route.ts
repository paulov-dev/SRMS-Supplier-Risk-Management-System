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

export async function DELETE(
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
            "Sem permissão para remover contato do fornecedor",
        },
        { status: 403 }
      )
    }

    const { id } = await params

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const contact =
      await prisma.supplierContact.findUnique({
        where: {
          id,
        },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              supplierCodeSap: true,
            },
          },
        },
      })

    if (!contact) {
      return NextResponse.json(
        { error: "Contato não encontrado" },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.supplierContact.delete({
        where: {
          id,
        },
      })

      const oldValue =
        toPrismaJsonObject({
          contact: {
            id: contact.id,
            supplierId: contact.supplierId,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            position: contact.position,
            createdAt: contact.createdAt,
          },

          supplier: {
            id: contact.supplier.id,
            name: contact.supplier.name,
            supplierCodeSap:
              contact.supplier.supplierCodeSap,
          },
        })

      const newValue =
        toPrismaJsonObject({
          deleted: true,
          deletedContactId: contact.id,

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
          entityId: contact.supplierId,
          action: "SUPPLIER_CONTACT_DELETE",
          oldValue,
          newValue,
          changedBy: currentUser.id,
          ipAddress,
        },
      })
    })

    return NextResponse.json({
      success: true,
      deletedContact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
      },
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro ao remover contato" },
      { status: 500 }
    )
  }
}