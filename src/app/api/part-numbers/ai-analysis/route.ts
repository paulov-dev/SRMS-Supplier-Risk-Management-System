import { createHash } from "node:crypto"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"

import { auditAIRequest } from "@/lib/ai-audit"
import { buildPNEvidence } from "@/lib/pn-ai"

import { checkRequestOrigin } from "@/lib/request-origin"

import {
    createAIHistoryStore,
    findSavedAnalysis,
} from "@/lib/ai-history"

import {
    requestSupplierAnalysis,
    SupplierAIError,
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
    const user = await getUserFromRequest()

    const rawScope =
        new URL(request.url)
            .searchParams.get("scope") ?? "mine"

    const scope =
        rawScope === "all" || rawScope === "mine"
            ? rawScope
            : "invalid"

    return auditAIRequest({
        request,
        entityType: "PartNumberPortfolio",
        entityId:
            scope === "mine"
                ? user?.id ?? "anonymous"
                : scope,
        userId: user?.id ?? null,
        model: process.env.OPENAI_MODEL,
        scope: `${scope}-pns-all-rms`,
        historyStore: createAIHistoryStore(prisma),

        write: (entry) =>
            createAuditLog(prisma, entry),

        run: async () => {
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
                const originValidation = checkRequestOrigin(request)

                if (!originValidation.ok) {
                    return json(
                        {
                            error: originValidation.error,
                            code: originValidation.code,
                        },
                        originValidation.status
                    )
                }

                if (!user) {
                    return json(
                        { error: "Não autenticado." },
                        401
                    )
                }

                if (scope === "invalid") {
                    return json(
                        {
                            error: "Escopo inválido.",
                            code: "AI_INVALID_SCOPE",
                        },
                        400
                    )
                }

                const allowed = [
                    "RISK_VIEW",
                    "RISK_CREATE",
                    "RISK_UPDATE",
                    "USER_MANAGE",
                ]

                const canView = user.roles.some(
                    (userRole) =>
                        userRole.role.permissions.some(
                            (rolePermission) =>
                                allowed.includes(
                                    rolePermission.permission.name
                                )
                        )
                )

                if (!canView) {
                    return json(
                        {
                            error:
                                "Sem permissão para consultar PNs.",
                        },
                        403
                    )
                }

                const parts =
                    await prisma.partNumber.findMany({
                        where:
                            scope === "mine"
                                ? {
                                    riskParts: {
                                        some: {
                                            OR: [
                                                {
                                                    assignedToId:
                                                        user.id,
                                                },
                                                {
                                                    riskEvent: {
                                                        is: {
                                                            assignedToId:
                                                                user.id,
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                }
                                : {},

                        orderBy: {
                            id: "asc",
                        },

                        select: {
                            id: true,
                            partNumber: true,
                            description: true,
                            vehicleProgram: true,

                            _count: {
                                select: {
                                    vehicleApplications: {
                                        where: {
                                            isActive: true,
                                        },
                                    },
                                },
                            },

                            riskParts: {
                                orderBy: {
                                    id: "asc",
                                },

                                select: {
                                    status: true,
                                    logisticsStatus: true,
                                    assignedToId: true,

                                    riskEvent: {
                                        select: {
                                            id: true,
                                            workflowStatus: true,
                                            assignedToId: true,
                                        },
                                    },

                                    assessment: true,

                                    actionPlans: {
                                        orderBy: {
                                            id: "asc",
                                        },

                                        select: {
                                            status: true,
                                            priority: true,
                                            dueDate: true,
                                            assignedToId: true,
                                        },
                                    },

                                    logisticsRequests: {
                                        orderBy: {
                                            id: "asc",
                                        },

                                        select: {
                                            status: true,
                                            priority: true,
                                        },
                                    },
                                },
                            },
                        },
                    })

                const evidence = buildPNEvidence(
                    parts,
                    new Date(),
                    {
                        scope,
                        userId: user.id,
                    }
                )

                if (parts.length === 0) {
                    return json({
                        analysis: {
                            summary:
                                scope === "mine"
                                    ? "Nenhum PN vinculado a uma RM ou a um vínculo PN–RM sob sua responsabilidade."
                                    : "Não há PNs cadastrados.",

                            priorities: [],

                            limitations: [
                                "Nenhuma chamada à OpenAI foi realizada.",
                            ],
                        },

                        evidence,
                        generatedAt:
                            new Date().toISOString(),
                        cached: false,
                        empty: true,
                    })
                }

                const key =
                    process.env.OPENAI_API_KEY

                const model =
                    process.env.OPENAI_MODEL

                if (!key || !model) {
                    return json(
                        {
                            error:
                                "Configure a chave e o modelo da OpenAI no servidor.",
                            code: "AI_NOT_CONFIGURED",
                        },
                        503
                    )
                }

                const now = Date.now()

                for (const [id, item] of cache) {
                    if (item.expires <= now) {
                        cache.delete(id)
                    }
                }

                for (const [id, expires] of attempts) {
                    if (expires <= now) {
                        attempts.delete(id)
                    }
                }

                const hash = createHash("sha256")
                    .update(
                        JSON.stringify({
                            version: 2,
                            user: user.id,
                            scope,
                            model,
                            evidence,
                        })
                    )
                    .digest("hex")

                const cached = await findSavedAnalysis(
                    model,
                    evidence
                )

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
                                "Aguarde um minuto antes de gerar outra análise dos PNs.",
                            code: "AI_LOCAL_RATE_LIMIT",
                        },
                        429
                    )
                }

                attempts.set(
                    user.id,
                    now + 60000
                )

                const analysis =
                    await requestSupplierAnalysis(
                        key,
                        model,
                        evidence
                    )

                const result: CachedAnalysis = {
                    analysis,
                    generatedAt:
                        new Date().toISOString(),
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
                    ["TimeoutError", "AbortError"]
                        .includes(error.name)

                const code = known
                    ? error.code
                    : timeout
                        ? "AI_TIMEOUT"
                        : "AI_INTERNAL"

                console.error("[pn-ai]", {
                    code,
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
                            : "Não foi possível analisar os PNs. Tente novamente em um minuto.",
                        code,
                    },
                    timeout ? 504 : 502
                )
            }
        },
    })
}