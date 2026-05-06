import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário inválido' },
        { status: 401 }
      )
    }

    const validPassword = await bcrypt.compare(
      password,
      user.passwordHash
    )

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Senha inválida' },
        { status: 401 }
      )
    }

    // JWT
    const token = jwt.sign(
      {
        userId: user.id
      },
      JWT_SECRET,
      {
        expiresIn: '7d'
      }
    )

    // RESPONSE
    const response = NextResponse.json({
      message: 'Login realizado'
    })

    // 🍪 COOKIE
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    })

    return response
  } catch {
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}