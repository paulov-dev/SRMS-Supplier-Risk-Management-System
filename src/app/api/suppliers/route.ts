import { NextResponse } from 'next/server'

import { prisma } from '@/app/api/lib/prisma'

import { requirePermission } from '@/app/api/lib/requirePermission'

export async function POST(req: Request) {
  try {
    // 🔐 RBAC
    const user = await requirePermission(
      'SUPPLIER_CREATE'
    )

    const body = await req.json()

    const {
      name,
      supplierCodeSap,
      address,
      countryId,
      contacts,
    } = body

    // =========================
    // VALIDATIONS
    // =========================

    if (!name) {
      return NextResponse.json(
        {
          error: 'Nome obrigatório'
        },
        {
          status: 400
        }
      )
    }

    if (!countryId) {
      return NextResponse.json(
        {
          error: 'País obrigatório'
        },
        {
          status: 400
        }
      )
    }

    // =========================
    // COUNTRY EXISTS
    // =========================

    const country =
      await prisma.country.findUnique({
        where: {
          id: countryId
        }
      })

    if (!country) {
      return NextResponse.json(
        {
          error: 'País não encontrado'
        },
        {
          status: 404
        }
      )
    }

    // =========================
    // SAP CODE VALIDATION
    // =========================

    if (supplierCodeSap) {
      const supplierAlreadyExists =
        await prisma.supplier.findUnique({
          where: {
            supplierCodeSap
          }
        })

      if (supplierAlreadyExists) {
        return NextResponse.json(
          {
            error:
              'Já existe um fornecedor com este código SAP'
          },
          {
            status: 409
          }
        )
      }
    }

    // =========================
    // CREATE SUPPLIER
    // =========================

    const supplier =
      await prisma.supplier.create({
        data: {
          name,
          supplierCodeSap,
          address,
          countryId,

          contacts: contacts?.length
            ? {
                create: contacts.map(
                  (contact: any) => ({
                    name: contact.name,
                    email: contact.email,
                    phone: contact.phone,
                    position:
                      contact.position,
                  })
                )
              }
            : undefined,
        },

        include: {
          country: true,
          contacts: true,
        }
      })

    // =========================
    // AUDIT
    // =========================

    await prisma.auditLog.create({
      data: {
        entityType: 'SUPPLIER',
        entityId: supplier.id,
        action: 'CREATE',
        changedBy: user.id,

        newValue: supplier as any,
      }
    })

    return NextResponse.json(
      supplier,
      {
        status: 201
      }
    )

  } catch (error: any) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          error.message ||
          'Erro interno'
      },
      {
        status: 500
      }
    )
  }
}

export async function GET(req: Request) {
  try {
    await requirePermission(
      'SUPPLIER_VIEW'
    )

    const { searchParams } =
      new URL(req.url)

    const search =
      searchParams.get('search')

    const status =
      searchParams.get('status')

    const suppliers =
      await prisma.supplier.findMany({
        where: {
          ...(search && {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive'
                }
              },

              {
                supplierCodeSap: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            ]
          }),

          ...(status && {
            status: status as any
          })
        },

        include: {
          country: true,
          contacts: true
        },

        orderBy: {
          createdAt: 'desc'
        }
      })

    return NextResponse.json(
      suppliers
    )

  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          'Erro interno'
      },
      {
        status: 500
      }
    )
  }
}