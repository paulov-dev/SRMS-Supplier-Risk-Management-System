import { NextResponse } from 'next/server'

import { prisma } from '@/app/api/lib/prisma'

import { requirePermission } from '@/app/api/lib/requirePermission'

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  req: Request,
  { params }: Params
) {
  try {
    await requirePermission(
      'SUPPLIER_VIEW'
    )

    const { id } = await params

    const supplier =
      await prisma.supplier.findUnique({
        where: {
          id
        },

        include: {
          country: true,
          contacts: true,
          riskEvents: true,
          riskScores: true
        }
      })

    if (!supplier) {
      return NextResponse.json(
        {
          error:
            'Fornecedor não encontrado'
        },
        {
          status: 404
        }
      )
    }

    return NextResponse.json(
      supplier
    )

  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message
      },
      {
        status: 500
      }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: Params
) {
  try {
    const user =
      await requirePermission(
        'SUPPLIER_UPDATE'
      )

    const { id } = await params

    const body = await req.json()

    const {
      name,
      supplierCodeSap,
      address,
      status,
      countryId
    } = body

    const supplier =
      await prisma.supplier.findUnique({
        where: {
          id
        }
      })

    if (!supplier) {
      return NextResponse.json(
        {
          error:
            'Fornecedor não encontrado'
        },
        {
          status: 404
        }
      )
    }

    // SAP UNIQUE
    if (
      supplierCodeSap &&
      supplierCodeSap !==
        supplier.supplierCodeSap
    ) {
      const existingSupplier =
        await prisma.supplier.findUnique({
          where: {
            supplierCodeSap
          }
        })

      if (existingSupplier) {
        return NextResponse.json(
          {
            error:
              'Código SAP já utilizado'
          },
          {
            status: 409
          }
        )
      }
    }

    const updatedSupplier =
      await prisma.supplier.update({
        where: {
          id
        },

        data: {
          name,
          supplierCodeSap,
          address,
          status,
          countryId
        },

        include: {
          country: true,
          contacts: true
        }
      })

    // AUDIT
    await prisma.auditLog.create({
      data: {
        entityType: 'SUPPLIER',
        entityId: id,
        action: 'UPDATE',
        changedBy: user.id,

        oldValue: supplier as any,
        newValue:
          updatedSupplier as any
      }
    })

    return NextResponse.json(
      updatedSupplier
    )

  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message
      },
      {
        status: 500
      }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: Params
) {
  try {
    const user =
      await requirePermission(
        'SUPPLIER_UPDATE'
      )

    const { id } = await params

    const supplier =
      await prisma.supplier.findUnique({
        where: {
          id
        }
      })

    if (!supplier) {
      return NextResponse.json(
        {
          error:
            'Fornecedor não encontrado'
        },
        {
          status: 404
        }
      )
    }

    const deletedSupplier =
      await prisma.supplier.update({
        where: {
          id
        },

        data: {
          status: 'INACTIVE'
        }
      })

    // AUDIT
    await prisma.auditLog.create({
      data: {
        entityType: 'SUPPLIER',
        entityId: id,
        action: 'INACTIVATE',
        changedBy: user.id,

        oldValue: supplier as any,
        newValue:
          deletedSupplier as any
      }
    })

    return NextResponse.json({
      message:
        'Fornecedor inativado com sucesso'
    })

  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message
      },
      {
        status: 500
      }
    )
  }
}