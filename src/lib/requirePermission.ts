import { NextResponse } from 'next/server'
import { getUserFromRequest } from './getUserFromToken'
import { hasPermission } from './permissions'

export async function requirePermission(
  req: Request,
  permission: string
) {
  const user = await getUserFromRequest(req)

  if (!user) {
    throw NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    )
  }

  const allowed = hasPermission(user, permission)

  if (!allowed) {
    throw NextResponse.json(
      { error: 'Sem permissão' },
      { status: 403 }
    )
  }
  
  return user
}