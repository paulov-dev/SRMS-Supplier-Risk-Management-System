import { NextResponse } from 'next/server'
import { getUserFromRequest } from './getUserFromToken'
import { hasPermission } from './permissions'

export async function requirePermission(permission: string) {
  const user = await getUserFromRequest()

  if (!user) {
    throw NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    )
  }

  if (!hasPermission(user, permission)) {
    throw NextResponse.json(
      { error: 'Sem permissão' },
      { status: 403 }
    )
  }

  return user
}