import { NextResponse } from 'next/server'
import { requirePermission } from '@/app/api/lib/requirePermission'

export async function GET(req: Request) {
  try {
    const user = await requirePermission(req, 'SUPPLIER_VIEW')

    return NextResponse.json({
      message: 'Acesso liberado 🚀',
      user: user.email
    })
  } catch (error: any) {
    return error
  }
}