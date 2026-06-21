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

export async function GET() {
  try {
    const currentUser = await getUserFromRequest()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const permissions = getPermissions(currentUser)

    if (!permissions.includes("SUPPLIER_VIEW")) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para visualizar fornecedores",
        },
        { status: 403 }
      )
    }

    const suppliers = await prisma.supplier.findMany({
      include: {
        country: true,
        contacts: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(
      suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        supplierCodeSap: supplier.supplierCodeSap,
        status: supplier.status,
        address: supplier.address,
        countryId: supplier.countryId,
        riskScore: supplier.riskScore,
        lastRiskCalculation:
          supplier.lastRiskCalculation,
        createdAt: supplier.createdAt,

        country: {
          id: supplier.country.id,
          name: supplier.country.name,
          isoCode: supplier.country.isoCode,
        },

        contacts: supplier.contacts.map((contact) => ({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          position: contact.position,
          createdAt: contact.createdAt,
        })),
      }))
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro ao buscar fornecedores" },
      { status: 500 }
    )
  }
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

    if (!permissions.includes("SUPPLIER_CREATE")) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para criar fornecedor",
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    const {
      name,
      supplierCodeSap,
      countryId,
      address,
      contacts,
    } = body

    const normalizedName =
      typeof name === "string" ? name.trim() : ""

    const normalizedSupplierCodeSap =
      typeof supplierCodeSap === "string" &&
      supplierCodeSap.trim()
        ? supplierCodeSap.trim()
        : null

    const normalizedAddress =
      typeof address === "string" && address.trim()
        ? address.trim()
        : null

    if (!normalizedName || !countryId) {
      return NextResponse.json(
        {
          error:
            "Nome e país do fornecedor são obrigatórios",
        },
        { status: 400 }
      )
    }

    const country = await prisma.country.findUnique({
      where: {
        id: countryId,
      },
      select: {
        id: true,
        name: true,
        isoCode: true,
      },
    })

    if (!country) {
      return NextResponse.json(
        {
          error: "País informado não foi encontrado",
        },
        { status: 404 }
      )
    }

    const contactsArray = Array.isArray(contacts)
      ? contacts
      : []

    const normalizedContacts = contactsArray
      .filter((contact: any) => {
        return (
          contact?.name?.trim() ||
          contact?.email?.trim() ||
          contact?.phone?.trim() ||
          contact?.position?.trim()
        )
      })
      .map((contact: any) => ({
        name:
          typeof contact.name === "string"
            ? contact.name.trim()
            : "",
        email:
          typeof contact.email === "string" &&
          contact.email.trim()
            ? contact.email.trim()
            : null,
        phone:
          typeof contact.phone === "string" &&
          contact.phone.trim()
            ? contact.phone.trim()
            : null,
        position:
          typeof contact.position === "string" &&
          contact.position.trim()
            ? contact.position.trim()
            : null,
      }))

    const invalidContact = normalizedContacts.find(
      (contact) => !contact.name
    )

    if (invalidContact) {
      return NextResponse.json(
        {
          error:
            "Todo contato preenchido precisa ter pelo menos o nome",
        },
        { status: 400 }
      )
    }

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const supplier = await prisma.$transaction(
      async (tx) => {
        const createdSupplier =
          await tx.supplier.create({
            data: {
              name: normalizedName,
              supplierCodeSap:
                normalizedSupplierCodeSap,
              countryId,
              address: normalizedAddress,

              contacts: {
                create: normalizedContacts.map(
                  (contact) => ({
                    name: contact.name,
                    email: contact.email,
                    phone: contact.phone,
                    position: contact.position,
                  })
                ),
              },
            },

            include: {
              country: true,
              contacts: true,
            },
          })

        const auditNewValue =
          toPrismaJsonObject({
            id: createdSupplier.id,
            name: createdSupplier.name,
            supplierCodeSap:
              createdSupplier.supplierCodeSap,
            status: createdSupplier.status,
            address: createdSupplier.address,
            countryId: createdSupplier.countryId,

            country: {
              id: createdSupplier.country.id,
              name: createdSupplier.country.name,
              isoCode: createdSupplier.country.isoCode,
            },

            contacts: createdSupplier.contacts.map(
              (contact) => ({
                id: contact.id,
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
                position: contact.position,
              })
            ),

            createdByUser: {
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
            entityId: createdSupplier.id,
            action: "SUPPLIER_CREATE",
            newValue: auditNewValue,
            changedBy: currentUser.id,
            ipAddress,
          },
        })

        return createdSupplier
      }
    )

    return NextResponse.json({
      id: supplier.id,
      name: supplier.name,
      supplierCodeSap: supplier.supplierCodeSap,
      status: supplier.status,
      address: supplier.address,
      countryId: supplier.countryId,
      riskScore: supplier.riskScore,
      lastRiskCalculation:
        supplier.lastRiskCalculation,
      createdAt: supplier.createdAt,

      country: {
        id: supplier.country.id,
        name: supplier.country.name,
        isoCode: supplier.country.isoCode,
      },

      contacts: supplier.contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        createdAt: contact.createdAt,
      })),
    })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Já existe um fornecedor com este código SAP",
        },
        { status: 409 }
      )
    }

    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Dados relacionados inválidos. Verifique o país informado.",
        },
        { status: 400 }
      )
    }

    console.error(error)

    return NextResponse.json(
      { error: "Erro ao criar fornecedor" },
      { status: 500 }
    )
  }
}