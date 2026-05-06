import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_SECRET!

export async function getUserFromRequest() {
  const cookieStore = await cookies()

  const token = cookieStore.get('token')?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    })

    return user
  } catch {
    return null
  }
}