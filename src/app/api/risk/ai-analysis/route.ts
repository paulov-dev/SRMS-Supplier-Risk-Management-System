import { createHash } from "node:crypto"

import { prisma } from "@/app/api/lib/prisma"

import {
    getUserFromRequest,
} from "@/app/api/lib/getUserFromToken"

import {
    buildPortfolioEvidence,
} from "@/lib/portfolio-ai"

import {
    SupplierAIError,
    requestSupplierAnalysis,
    type AIAnalysis,
} from "@/lib/supplier-ai"

export const runtime = "nodejs"
export const maxDuration = 60

type CachedAnalysis = {
    analysis: AIAnalysis
    generatedAt: string
    expires: number
}

const cache = new Map<string, CachedAnalysis>()
const attempts = new Map<string, number>()

export async function POST(request: Request) {
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

    try {
        const url = new URL(request.url)

        if (
            request.headers.get("origin") !==
            url.origin
        ) {
            return json(
                { error: "Origem inválida." },
                403
            )
        }

        const user = await getUserFromRequest()

        if (!user) {
            return json(
                { error: "Não autenticado." },
                401
            )
        }

        const canView = user.roles.some(
            (userRole) =>
                userRole.role.permissions.some(
                    (rolePermission) =>
                        rolePermission.permission.name ===
                        "RISK_VIEW"
                )
        )

        if (!canView) {
            return json(
                {
                    error:
                        "Sem permissão para visualizar RMs.",
                },
                403
            )
        }

        const scope =
            url.searchParams.get("scope") ?? "all"

        if (scope !== "all" && scope !== "mine") {
            return json(
                { error: "Escopo inválido." },
                400
            )
        }

        const now = new Date()

        const rows = await prisma.riskEvent.findMany({
            where: {
                workflowStatus: "OPEN",

                ...(scope === "mine"
                    ? { assignedToId: user.id }
                    : {}),
            },

            select: {
                id: true,
                code: true,
                supplierId: true,
                riskLevel: true,
                assignedToId: true,
                createdAt: true,

                _count: {
                    select: {
                        parts: true,

                        actionPlans: {
                            where: {
                                dueDate: {
                                    lt: now,
                                },
                                status: {
                                    notIn: [
                                        "COMPLETED",
                                        "CANCELED",
                                    ],
                                },
                            },
                        },

                        logistics: {
                            where: {
                                status: "PENDING",
                            },
                        },
                    },
                },
            },

            orderBy: {
                id: "asc",
            },
        })

        const evidence = buildPortfolioEvidence(
            rows,
            scope,
            now
        )

        if (rows.length === 0) {
            return json({
                analysis: {
                    summary:
                        "Não há RMs abertas neste escopo.",
                    priorities: [],
                    limitations: [
                        "Nenhuma chamada à OpenAI foi realizada.",
                    ],
                },

                evidence,
                generatedAt: now.toISOString(),
                cached: false,
            })
        }

        const key = process.env.OPENAI_API_KEY
        const model = process.env.OPENAI_MODEL

        if (!key || !model) {
            return json(
                {
                    error:
                        "Configure a chave e o modelo da OpenAI no servidor.",
                },
                503
            )
        }

        for (const [id, item] of cache) {
            if (item.expires <= now.getTime()) {
                cache.delete(id)
            }
        }

        for (const [id, expires] of attempts) {
            if (expires <= now.getTime()) {
                attempts.delete(id)
            }
        }

        const hash = createHash("sha256")
            .update(
                JSON.stringify({
                    version: 1,
                    user: user.id,
                    model,
                    scope,
                    evidence,
                })
            )
            .digest("hex")

        const cached = cache.get(hash)

        if (cached) {
            return json({
                ...cached,
                evidence,
                cached: true,
            })
        }

        if (
            attempts.has(user.id) ||
            attempts.size >= 1000
        ) {
            return json(
                {
                    error:
                        "Aguarde um minuto antes de gerar outra análise da carteira.",
                },
                429
            )
        }

        attempts.set(
            user.id,
            now.getTime() + 60000
        )

        const analysis =
            await requestSupplierAnalysis(
                key,
                model,
                evidence
            )

        const result: CachedAnalysis = {
            analysis,
            generatedAt: new Date().toISOString(),
            expires: Date.now() + 600000,
        }

        if (cache.size >= 100) {
            const oldestKey =
                cache.keys().next().value

            if (oldestKey) {
                cache.delete(oldestKey)
            }
        }

        cache.set(hash, result)

        return json({
            ...result,
            evidence,
            cached: false,
        })
    } catch (error) {
        const known =
            error instanceof SupplierAIError

        const timeout =
            error instanceof Error &&
            ["TimeoutError", "AbortError"].includes(
                error.name
            )

        console.error("[portfolio-ai]", {
            code: known
                ? error.code
                : timeout
                  ? "AI_TIMEOUT"
                  : "AI_INTERNAL",

            providerStatus: known
                ? error.providerStatus
                : undefined,

            providerCode: known
                ? error.providerCode
                : undefined,

            requestId: known
                ? error.requestId
                : undefined,
        })

        return json(
            {
                error: known
                    ? error.message
                    : "Não foi possível analisar a carteira. Tente novamente em um minuto.",
            },
            timeout ? 504 : 502
        )
    }
}