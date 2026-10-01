import { Prisma } from "@prisma/client"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"

export const runtime = "nodejs"

export async function GET(request: Request) {
    const json = (
        body: unknown,
        status = 200
    ) =>
        Response.json(body, {
            status,
            headers: {
                "Cache-Control": "no-store",
            },
        })

    const user = await getUserFromRequest()

    if (!user) {
        return json({ error: "Não autenticado." }, 401)
    }

    try {
        const admin = user.roles.some(
            item => item.role.name === "ADMIN"
        )

        await createAuditLog(prisma, {
            entityType: "AIAdministration",
            entityId: user.id,
            changedBy: user.id,

            action: admin
                ? "AI_ADMIN_HISTORY_VIEW"
                : "AI_ADMIN_HISTORY_DENIED",

            newValue: {
                allowed: admin,
            },
        })

        if (!admin) {
            return json(
                {
                    error:
                        "Acesso exclusivo de administradores.",
                },
                403
            )
        }

        const query = new URL(request.url).searchParams
        const id = query.get("resultId")

        if (id) {
            const result = await prisma.auditLog.findFirst({
                where: {
                    id,
                    entityType: "AIAnalysisResult",
                    action: "AI_ANALYSIS_SAVED",
                },
                select: {
                    id: true,
                    createdAt: true,
                    newValue: true,
                },
            })

            return result
                ? json({ result })
                : json(
                    { error: "Resultado não encontrado." },
                    404
                )
        }

        const page = Math.max(
            1,
            Math.min(
                100000,
                Math.floor(Number(query.get("page")) || 1)
            )
        )

        const from = query.get("from")
        const to = query.get("to")

        const parseDate = (value: string) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                throw new Error("INVALID_DATE")
            }

            const date = new Date(
                value + "T00:00:00.000Z"
            )

            if (
                !Number.isFinite(date.getTime()) ||
                date.toISOString().slice(0, 10) !== value
            ) {
                throw new Error("INVALID_DATE")
            }

            return date
        }

        const where: Prisma.AuditLogWhereInput = {
            action: {
                in: [
                    "AI_ANALYSIS_SUCCEEDED",
                    "AI_ANALYSIS_CACHED",
                    "AI_ANALYSIS_EMPTY",
                    "AI_ANALYSIS_FAILED",
                    "AI_ANALYSIS_RATE_LIMITED",
                    "AI_ANALYSIS_DENIED",
                ],
            },

            entityType: {
                in: [
                    "Supplier",
                    "RiskPortfolio",
                    "PartNumberPortfolio",
                ],
            },
        }

        if (from || to) {
            where.createdAt = {
                ...(from
                    ? { gte: parseDate(from) }
                    : {}),

                ...(to
                    ? {
                        lt: new Date(
                            parseDate(to).getTime() +
                            86400000
                        ),
                    }
                    : {}),
            }
        }

        const type = query.get("type")

        if (
            type &&
            [
                "Supplier",
                "RiskPortfolio",
                "PartNumberPortfolio",
            ].includes(type)
        ) {
            where.entityType = type
        }

        const [total, rows] = await prisma.$transaction([
            prisma.auditLog.count({ where }),

            prisma.auditLog.findMany({
                where,
                orderBy: [
                    { createdAt: "desc" },
                    { id: "desc" },
                ],
                skip: (page - 1) * 25,
                take: 25,

                select: {
                    id: true,
                    createdAt: true,
                    action: true,
                    entityType: true,
                    newValue: true,

                    user: {
                        select: {
                            name: true,
                        },
                    },
                },
            }),
        ])

        return json({
            total,
            page,
            pageSize: 25,
            rows,
        })
    } catch (error) {
        const invalidDate =
            error instanceof Error &&
            error.message === "INVALID_DATE"

        return json(
            {
                error: invalidDate
                    ? "Data inválida."
                    : "Não foi possível consultar ou auditar o histórico.",
            },
            invalidDate ? 400 : 503
        )
    }
}