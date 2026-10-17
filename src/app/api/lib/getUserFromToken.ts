import jwt from "jsonwebtoken"
import { cookies, headers } from "next/headers"

import { prisma } from "@/app/api/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET!

type TokenPayload = {
  userId: string
}

export async function getUserFromRequest() {
  try {
    const requestHeaders = await headers()
    const authorization = requestHeaders.get("authorization")

    let token: string | undefined

    if (authorization !== null) {
      const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim())

      if (!match) {
        return null
      }

      token = match[1]
    } else {
      const cookieStore = await cookies()
      token = cookieStore.get("token")?.value
    }

    if (!token) {
      return null
    }

    const decoded = jwt.verify(token, JWT_SECRET)

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string"
    ) {
      return null
    }

    const { userId } = decoded as TokenPayload

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user?.isActive) {
      return null
    }

    return user
  } catch {
    return null
  }
}