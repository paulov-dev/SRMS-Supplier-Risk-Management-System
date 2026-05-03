import { PrismaClient } from '@prisma/client'
import { verifyToken } from './auth'

const prisma = new PrismaClient()

export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('authorization')

  if (!authHeader) return null

  const token = authHeader.split(' ')[1]

  const decoded = verifyToken(token) as any

  if (!decoded) return null

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
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
}