import { createHash } from "node:crypto"

import { GET as getSupplier } from "../route"

import {
    getUserFromRequest,
} from "@/app/api/lib/getUserFromToken"

import { auditAIRequest } from "@/lib/ai-audit"

import {
    createAuditLog,
} from "@/app/api/lib/createAuditLog"

import { prisma } from "@/app/api/lib/prisma"

import {
    SupplierAIError,
    buildAIEvidence,
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

type Context = {
    params: Promise<{
        id: string
    }>
}

async function runAnalysis(
    request: Request,
    context: Context
) {
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
        const origin = request.headers.get("origin")
        const expectedOrigin = new URL(request.url).origin

        if (origin !== expectedOrigin) {
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

        // Reutiliza autenticação, permissões e consulta existentes.
        const supplierResponse = await getSupplier(
            request,
            context
        )

        if (!supplierResponse.ok) {
            return supplierResponse
        }

        const key = process.env.OPENAI_API_KEY
        const model = process.env.OPENAI_MODEL

        if (!key || !model) {
            return json(
                {
                    error:
                        "A análise por IA ainda não foi configurada no servidor.",
                },
                503
            )
        }

        const supplier = await supplierResponse.json()
        const evidence = buildAIEvidence(supplier)
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
                    version: 1,
                    user: user.id,
                    supplier: supplier.id,
                    model,
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
                        "Aguarde um minuto antes de gerar outra análise.",
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
            generatedAt: new Date().toISOString(),
            expires: Date.now() + 10 * 60000,
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

        const network =
            error instanceof TypeError &&
            error.message === "fetch failed"

        const code = known
            ? error.code
            : timeout
                ? "AI_TIMEOUT"
                : network
                    ? "AI_NETWORK"
                    : "AI_INTERNAL"

        console.error("[supplier-ai]", {
            code,
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

        if (known) {
            return json(
                {
                    error: error.message,
                    code,
                },
                error.status
            )
        }

        if (timeout) {
            return json(
                {
                    error:
                        "A análise excedeu o tempo de espera. Tente novamente em um minuto.",
                    code,
                },
                504
            )
        }

        if (network) {
            return json(
                {
                    error:
                        "O servidor não conseguiu se conectar à OpenAI.",
                    code,
                },
                502
            )
        }

        return json(
            {
                error:
                    "Não foi possível gerar uma análise válida. Confira o diagnóstico no terminal do servidor.",
                code,
            },
            502
        )
    }
}

export async function POST(
    request: Request,
    context: {
        params: Promise<{
            id: string
        }>
    }
) {
    const user = await getUserFromRequest()
    const { id } = await context.params

    return auditAIRequest({
        request,

        entityType: "Supplier",
        entityId: id,

        userId: user?.id ?? null,
        model: process.env.OPENAI_MODEL,
        scope: "supplier",

        write: (entry) =>
            createAuditLog(prisma, entry),

        run: () =>
            runAnalysis(request, context),
    })
}