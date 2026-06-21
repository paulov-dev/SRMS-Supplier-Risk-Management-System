import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

import { prisma } from "@/app/api/lib/prisma"

import { Prisma } from "@prisma/client"

const JWT_SECRET = process.env.JWT_SECRET!

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

async function createAuditLog({
  userId,
  action,
  ipAddress,
  userAgent,
  newValue,
}: {
  userId: string
  action: string
  ipAddress: string | null
  userAgent: string | null
  newValue: Prisma.InputJsonObject
}) {
  try {
    const auditValue: Prisma.InputJsonObject = {
      ...newValue,
      ...(userAgent
        ? {
            userAgent,
          }
        : {}),
    }

    await prisma.auditLog.create({
      data: {
        entityType: "User",
        entityId: userId,
        action,
        newValue: auditValue,
        changedBy: userId,
        ipAddress,
      },
    })
  } catch (error) {
    console.error("Erro ao registrar audit log:", error)
  }
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuário inválido" },
        { status: 401 }
      )
    }

    const validPassword = await bcrypt.compare(
      password,
      user.passwordHash
    )

    if (!validPassword) {
      await createAuditLog({
        userId: user.id,
        action: "LOGIN_FAILED",
        ipAddress,
        userAgent,
        newValue: {
          email: user.email,
          success: false,
          reason: "INVALID_PASSWORD",
        },
      })

      return NextResponse.json(
        { error: "Senha inválida" },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      await createAuditLog({
        userId: user.id,
        action: "LOGIN_BLOCKED",
        ipAddress,
        userAgent,
        newValue: {
          email: user.email,
          success: false,
          reason: "USER_INACTIVE",
        },
      })

      return NextResponse.json(
        { error: "Usuário inativo" },
        { status: 403 }
      )
    }

    const token = jwt.sign(
      {
        userId: user.id,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    )

    await createAuditLog({
      userId: user.id,
      action: "LOGIN",
      ipAddress,
      userAgent,
      newValue: {
        email: user.email,
        name: user.name,
        success: true,
      },
    })

    const response = NextResponse.json({
      message: "Login realizado",
    })

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}