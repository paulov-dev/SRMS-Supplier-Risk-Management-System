import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"

import bcrypt from "bcryptjs"

type Params = {
  params: Promise<{
    id: string
  }>
}

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

export async function GET(
  _req: Request,
  { params }: Params
) {
  try {
    const currentUser = await getUserFromRequest()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const { id } = await params

    const currentUserPermissions = [
      ...new Set(
        currentUser.roles.flatMap((ur) =>
          ur.role.permissions.map(
            (rp) => rp.permission.name
          )
        )
      ),
    ]

    const isOwnProfile = currentUser.id === id

    const canManageUsers =
      currentUserPermissions.includes("USER_MANAGE")

    if (!isOwnProfile && !canManageUsers) {
      return NextResponse.json(
        { error: "Sem permissão" },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: {
        id,
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

        createdRisks: {
          include: {
            supplier: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },

        assignedRisks: {
          include: {
            supplier: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },

        requestedLogistics: {
          include: {
            riskEvent: {
              include: {
                supplier: true,
              },
            },
          },
          orderBy: {
            requestedAt: "desc",
          },
        },

        reviewedLogistics: {
          include: {
            riskEvent: {
              include: {
                supplier: true,
              },
            },
          },
          orderBy: {
            requestedAt: "desc",
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    const roles = user.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
    }))

    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map(
            (rp) => rp.permission.name
          )
        )
      ),
    ]

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl,
      isActive: user.isActive,
      createdAt: user.createdAt,

      roles,
      permissions,

      createdRisks: user.createdRisks.map((risk) => ({
        id: risk.id,
        code: risk.code,
        title: risk.title || risk.code,
        riskLevel: risk.riskLevel,
        workflowStatus: risk.workflowStatus,
        createdAt: risk.createdAt,
        supplier: {
          id: risk.supplier.id,
          name: risk.supplier.name,
        },

        status: {
          id: risk.workflowStatus,
          name: risk.workflowStatus,
        },
      })),

      assignedRisks: user.assignedRisks.map((risk) => ({
        id: risk.id,
        code: risk.code,
        title: risk.title || risk.code,
        riskLevel: risk.riskLevel,
        workflowStatus: risk.workflowStatus,
        createdAt: risk.createdAt,
        supplier: {
          id: risk.supplier.id,
          name: risk.supplier.name,
        },

        status: {
          id: risk.workflowStatus,
          name: risk.workflowStatus,
        },
      })),

      requestedLogistics: user.requestedLogistics.map((request) => ({
        id: request.id,
        status: request.status,
        requestedAt: request.requestedAt,
        riskEvent: {
          id: request.riskEvent.id,
          code: request.riskEvent.code,
          title:
            request.riskEvent.title ||
            request.riskEvent.code,
          riskLevel: request.riskEvent.riskLevel,
          workflowStatus:
            request.riskEvent.workflowStatus,
          supplier: {
            id: request.riskEvent.supplier.id,
            name: request.riskEvent.supplier.name,
          },

          status: {
            id: request.riskEvent.workflowStatus,
            name: request.riskEvent.workflowStatus,
          },
        },
      })),

      reviewedLogistics: user.reviewedLogistics.map((request) => ({
        id: request.id,
        status: request.status,
        requestedAt: request.requestedAt,
        reviewedAt: request.reviewedAt,
        riskEvent: {
          id: request.riskEvent.id,
          code: request.riskEvent.code,
          title:
            request.riskEvent.title ||
            request.riskEvent.code,
          riskLevel: request.riskEvent.riskLevel,
          workflowStatus:
            request.riskEvent.workflowStatus,
          supplier: {
            id: request.riskEvent.supplier.id,
            name: request.riskEvent.supplier.name,
          },

          status: {
            id: request.riskEvent.workflowStatus,
            name: request.riskEvent.workflowStatus,
          },
        },
      })),
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const currentUser = await getUserFromRequest()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const { id } = await params

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const currentUserPermissions = [
      ...new Set(
        currentUser.roles.flatMap((ur) =>
          ur.role.permissions.map(
            (rp) => rp.permission.name
          )
        )
      ),
    ]

    const currentUserRoles =
      currentUser.roles.map((ur) => ur.role.name)

    const isOwnProfile =
      currentUser.id === id

    const isAdmin =
      currentUserPermissions.includes("USER_MANAGE") ||
      currentUserRoles.includes("ADMIN")

    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json(
        {
          error:
            "Você não possui permissão para editar este usuário",
        },
        { status: 403 }
      )
    }

    const targetUser =
      await prisma.user.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          isActive: true,
        },
      })

    if (!targetUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    const body = await req.json()

    const {
      name,
      email,
      photoUrl,
      isActive,
      currentPassword,
      newPassword,
    } = body

    if (!name || !email) {
      return NextResponse.json(
        {
          error: "Nome e email são obrigatórios",
        },
        { status: 400 }
      )
    }

    const existingEmailUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      })

    if (
      existingEmailUser &&
      existingEmailUser.id !== id
    ) {
      return NextResponse.json(
        {
          error:
            "Este email já está sendo usado por outro usuário",
        },
        { status: 409 }
      )
    }

    const normalizedPhotoUrl =
      photoUrl || null

    const dataToUpdate: {
      name: string
      email: string
      photoUrl: string | null
      isActive?: boolean
      passwordHash?: string
    } = {
      name,
      email,
      photoUrl: normalizedPhotoUrl,
    }

    if (isAdmin && typeof isActive === "boolean") {
      if (isOwnProfile && isActive === false) {
        return NextResponse.json(
          {
            error:
              "Você não pode inativar o próprio usuário",
          },
          { status: 400 }
        )
      }

      dataToUpdate.isActive = isActive
    }

    let passwordChanged = false

    if (newPassword) {
      if (!isOwnProfile) {
        return NextResponse.json(
          {
            error:
              "Administradores não podem alterar a senha de outro usuário por esta rota",
          },
          { status: 403 }
        )
      }

      if (!currentPassword) {
        return NextResponse.json(
          {
            error:
              "Informe a senha atual para alterar a senha",
          },
          { status: 400 }
        )
      }

      const validPassword =
        await bcrypt.compare(
          currentPassword,
          currentUser.passwordHash
        )

      if (!validPassword) {
        return NextResponse.json(
          {
            error: "Senha atual incorreta",
          },
          { status: 400 }
        )
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          {
            error:
              "A nova senha deve ter pelo menos 6 caracteres",
          },
          { status: 400 }
        )
      }

      dataToUpdate.passwordHash =
        await bcrypt.hash(newPassword, 10)

      passwordChanged = true
    }

    const oldFields: Record<
      string,
      Prisma.InputJsonValue | null
    > = {}

    const newFields: Record<
      string,
      Prisma.InputJsonValue | null
    > = {}

    if (targetUser.name !== name) {
      oldFields.name = targetUser.name
      newFields.name = name
    }

    if (targetUser.email !== email) {
      oldFields.email = targetUser.email
      newFields.email = email
    }

    if (targetUser.photoUrl !== normalizedPhotoUrl) {
      oldFields.photoUrl = targetUser.photoUrl
      newFields.photoUrl = normalizedPhotoUrl
    }

    if (
      typeof dataToUpdate.isActive === "boolean" &&
      targetUser.isActive !== dataToUpdate.isActive
    ) {
      oldFields.isActive = targetUser.isActive
      newFields.isActive = dataToUpdate.isActive
    }

    if (passwordChanged) {
      oldFields.password = "********"
      newFields.password = "UPDATED"
    }

    const changedFields = Object.keys(newFields)

    let auditAction = "USER_UPDATE"

    if (
      changedFields.length === 1 &&
      changedFields.includes("isActive")
    ) {
      auditAction = "USER_STATUS_CHANGE"
    }

    if (
      changedFields.length === 1 &&
      changedFields.includes("password")
    ) {
      auditAction = "PASSWORD_CHANGE"
    }

    const updatedUser =
      await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: {
            id,
          },
          data: dataToUpdate,
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            isActive: true,
            createdAt: true,
          },
        })

        if (changedFields.length > 0) {
          const oldValue: Prisma.InputJsonObject = {
            fields: oldFields,
          }

          const newValue: Prisma.InputJsonObject = {
            fields: newFields,
            changedFields,
            targetUser: {
              id: targetUser.id,
              email: targetUser.email,
            },
            changedByUser: {
              id: currentUser.id,
            },
            ...(userAgent
              ? {
                  userAgent,
                }
              : {}),
          }

          await tx.auditLog.create({
            data: {
              entityType: "User",
              entityId: id,
              action: auditAction,
              oldValue,
              newValue,
              changedBy: currentUser.id,
              ipAddress,
            },
          })
        }

        return updated
      })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: "Erro ao atualizar usuário",
      },
      { status: 500 }
    )
  }
}