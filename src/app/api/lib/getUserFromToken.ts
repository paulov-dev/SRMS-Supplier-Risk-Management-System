import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

import { prisma } from "@/app/api/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET!

type TokenPayload = {
  userId: string
}

export async function getUserFromRequest() {
  try {
    const cookieStore = await cookies()

    const token = cookieStore.get("token")?.value

    if (!token) {
      return null
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as TokenPayload

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
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

    return user
  } catch {
    return null
  }
}