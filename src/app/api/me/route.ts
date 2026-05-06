import { NextResponse } from 'next/server'
import { getUserFromRequest } from '../lib/getUserFromToken'

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req)

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Flatten das permissões
    const permissions = [
    ...new Set(
        user.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission.name)
        )
    )
    ]

    const roles = user.roles.map((ur) => ur.role.name)

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.photoUrl,
      roles,
      permissions
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}