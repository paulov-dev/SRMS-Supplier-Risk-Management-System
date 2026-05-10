import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/api/lib/getUserFromToken'

export async function GET() {
  try {
    const user = await getUserFromRequest()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map(
            (rp) => rp.permission.name
          )
        )
      )
    ]

    const roles = user.roles.map(
      (ur) => ur.role.name
    )

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.photoUrl,
      roles,
      permissions
    })

  } catch {
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}