import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

import { prisma } from "@/app/api/lib/prisma"
import { createNotification } from "@/app/api/lib/createNotification"

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: "Corpo da requisição inválido.",
        },
        {
          status: 400,
        }
      )
    }

    const payload = body as Record<string, unknown>

    const name =
      typeof payload.name === "string"
        ? payload.name.trim()
        : ""

    const email =
      typeof payload.email === "string"
        ? payload.email.trim().toLowerCase()
        : ""

    const password =
      typeof payload.password === "string"
        ? payload.password
        : ""

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error: "Nome, e-mail e senha são obrigatórios.",
        },
        {
          status: 400,
        }
      )
    }

    if (name.length < 3) {
      return NextResponse.json(
        {
          error: "Informe um nome válido.",
        },
        {
          status: 400,
        }
      )
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        {
          error: "Informe um e-mail válido.",
        },
        {
          status: 400,
        }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "A senha deve possuir pelo menos 8 caracteres.",
        },
        {
          status: 400,
        }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          error: "Já existe uma conta cadastrada com este e-mail.",
        },
        {
          status: 409,
        }
      )
    }

    /*
     * O hash é calculado antes da transação para evitar que ela
     * permaneça aberta durante o processamento do bcrypt.
     */
    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.$transaction(async (tx) => {
      /*
       * USER_MANAGE é uma Permission, não uma Role.
       */
      const userManagePermission =
        await tx.permission.findUnique({
          where: {
            name: "USER_MANAGE",
          },
          select: {
            id: true,
          },
        })

      if (!userManagePermission) {
        throw new Error(
          'A permissão "USER_MANAGE" não foi encontrada.'
        )
      }

      /*
       * Encontra os usuários que recebem a permissão
       * USER_MANAGE através de alguma role.
       *
       * User
       *   -> UserRole
       *     -> Role
       *       -> RolePermission
       *         -> Permission
       */
      const usersWithManagePermission =
        await tx.user.findMany({
          where: {
            roles: {
              some: {
                role: {
                  permissions: {
                    some: {
                      permissionId:
                        userManagePermission.id,
                    },
                  },
                },
              },
            },
          },
          select: {
            id: true,
          },
        })

      if (usersWithManagePermission.length === 0) {
        throw new Error(
          'Nenhum usuário possui a permissão "USER_MANAGE".'
        )
      }

      /*
       * O cadastro público sempre cria uma conta inativa
       * e não atribui nenhuma role automaticamente.
       */
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          isActive: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
        },
      })

      /*
       * Cria uma notificação para cada usuário que possui
       * a permissão USER_MANAGE.
       */
      for (const manager of usersWithManagePermission) {
        await createNotification(tx, {
          userId: manager.id,
          title: "Nova solicitação de acesso",
          message: `${createdUser.name} (${createdUser.email}) criou uma conta e aguarda ativação.`,
          type: "SYSTEM_ALERT",
          entity: "User",
          entityId: createdUser.id,
        })
      }

      return createdUser
    })

    return NextResponse.json(
      {
        message:
          "Conta criada com sucesso. Aguarde a ativação por um administrador.",
        user,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    /*
     * Protege contra duas requisições simultâneas tentando
     * cadastrar o mesmo e-mail.
     */
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Já existe uma conta cadastrada com este e-mail.",
        },
        {
          status: 409,
        }
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Corpo da requisição inválido.",
        },
        {
          status: 400,
        }
      )
    }

    console.error("Erro ao cadastrar usuário:", error)

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Erro desconhecido ao cadastrar usuário."

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? errorMessage
            : "Não foi possível criar a conta.",
      },
      {
        status: 500,
      }
    )
  }
}