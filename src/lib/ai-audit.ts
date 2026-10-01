import { AsyncLocalStorage } from "node:async_hooks"
import { randomUUID } from "node:crypto"

import {
    runWithHistory,
    type HistorySession,
    type HistoryStore,
} from "./ai-history.ts"

export type AICallUsage = {
    requestedModel: string
    model: string | null
    requestId: string | null
    httpStatus: number | null
    durationMs: number
    serviceTier: string | null
    inputTokens: number | null
    cachedInputTokens: number | null
    outputTokens: number | null
    totalTokens: number | null
    estimatedCostUsd: number | null
    pricingVersion: string | null
}

export type AIUsageSummary = {
    source: "openai" | "srms_cache" | "no_call" | "unknown"
    providerAttempts: number
    durationMs: number
    currency: "USD"
    inputTokens: number | null
    cachedInputTokens: number | null
    outputTokens: number | null
    totalTokens: number | null
    estimatedCostUsd: number | null
    calls: AICallUsage[]
}

const context = new AsyncLocalStorage<AICallUsage[]>()

const count = (value: unknown): number | null =>
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
        ? value
        : null

const object = (
    value: unknown
): Record<string, unknown> =>
    value !== null && typeof value === "object"
        ? value as Record<string, unknown>
        : {}

export function parseAIUsage(
    payload: unknown,
    requestedModel: string
): AICallUsage {
    const body = object(payload)
    const usage = object(body.usage)
    const details = object(usage.input_tokens_details)

    const model =
        typeof body.model === "string"
            ? body.model
            : null

    const tier =
        typeof body.service_tier === "string"
            ? body.service_tier
            : null

    const input = count(usage.input_tokens)
    const output = count(usage.output_tokens)
    const rawCached = count(details.cached_tokens)

    const cached =
        input !== null &&
        rawCached !== null &&
        rawCached <= input
            ? rawCached
            : null

    const rawTotal = count(usage.total_tokens)

    const total =
        input !== null &&
        output !== null &&
        rawTotal === input + output
            ? rawTotal
            : null

    const knownModel =
        model === "gpt-4.1-mini" ||
        model === "gpt-4.1-mini-2025-04-14"

    // Standard, USD por milhão:
    // entrada: 0.40; entrada em cache: 0.10; saída: 1.60.
    const priced =
        knownModel &&
        (tier === "default" || tier === null) &&
        (
            details.cache_write_tokens === undefined ||
            details.cache_write_tokens === 0
        ) &&
        input !== null &&
        cached !== null &&
        output !== null &&
        total !== null

    return {
        requestedModel,
        model,
        serviceTier: tier,
        requestId: null,
        httpStatus: null,
        durationMs: 0,

        inputTokens: input,
        cachedInputTokens: cached,
        outputTokens: output,
        totalTokens: total,

        estimatedCostUsd: priced
            ? Number(
                (
                    (
                        (input! - cached!) * 0.4 +
                        cached! * 0.1 +
                        output! * 1.6
                    ) / 1e6
                ).toFixed(9)
            )
            : null,

        pricingVersion: priced
            ? "gpt-4.1-mini-standard-2026-09-30"
            : null,
    }
}

export function measureAIFetch(
    model: string,
    fetcher: typeof fetch = fetch
): typeof fetch {
    return async (input, init) => {
        const calls = context.getStore()
        const started = Date.now()

        let call = parseAIUsage(null, model)

        try {
            const response = await fetcher(input, init)

            call = parseAIUsage(
                await response
                    .clone()
                    .json()
                    .catch(() => null),
                model
            )

            call.httpStatus = response.status
            call.requestId =
                response.headers.get("x-request-id")

            return response
        } finally {
            call.durationMs = Date.now() - started
            calls?.push(call)
        }
    }
}

export function summarizeAIUsage(
    calls: AICallUsage[],
    source: AIUsageSummary["source"],
    durationMs: number
): AIUsageSummary {
    const sum = (
        field:
            | "inputTokens"
            | "cachedInputTokens"
            | "outputTokens"
            | "totalTokens"
            | "estimatedCostUsd"
    ) => {
        if (!calls.length) {
            return source === "unknown" ? null : 0
        }

        if (calls.some(call => call[field] === null)) {
            return null
        }

        return Number(
            calls
                .reduce(
                    (value, call) => value + call[field]!,
                    0
                )
                .toFixed(9)
        )
    }

    return {
        source: calls.length ? "openai" : source,
        providerAttempts: calls.length,
        durationMs,
        currency: "USD",

        inputTokens: sum("inputTokens"),
        cachedInputTokens: sum("cachedInputTokens"),
        outputTokens: sum("outputTokens"),
        totalTokens: sum("totalTokens"),
        estimatedCostUsd: sum("estimatedCostUsd"),

        calls,
    }
}

export type AIAuditEntry = {
    entityType: string
    entityId: string
    action: string
    changedBy: string
    ipAddress: string | null
    newValue: Record<string, unknown>
}

type Options = {
    request: Request
    entityType: string
    entityId: string
    userId: string | null
    model?: string
    scope: string
    historyStore?: HistoryStore

    write: (
        entry: AIAuditEntry
    ) => Promise<unknown>

    run: () => Promise<Response>
}

export async function auditAIRequest(
    options: Options
): Promise<Response> {
    const requestId = randomUUID()
    const started = Date.now()

    const failure = () =>
        Response.json(
            {
                error:
                    "Não foi possível registrar a auditoria. A análise não será disponibilizada. Contate o administrador.",
                code: "AI_AUDIT_UNAVAILABLE",
                requestId,
            },
            {
                status: 503,
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        )

    if (!options.userId) {
        console.warn("[ai-audit]", {
            requestId,
            action: "AI_ANALYSIS_UNAUTHENTICATED",
        })

        return Response.json(
            { error: "Não autenticado." },
            {
                status: 401,
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        )
    }

    const rawIp =
        options.request.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() ||
        options.request.headers.get("x-real-ip") ||
        null

    const write = (
        action: string,
        details: Record<string, unknown>
    ) =>
        options.write({
            entityType: options.entityType,
            entityId: options.entityId,
            changedBy: options.userId!,
            action,

            ipAddress:
                rawIp
                    ?.replace(/^::ffff:/, "")
                    .slice(0, 64) ?? null,

            newValue: {
                requestId,
                scope: options.scope,
                model: options.model ?? null,
                path: new URL(options.request.url).pathname,

                userAgent:
                    options.request.headers
                        .get("user-agent")
                        ?.slice(0, 512) ?? null,

                ...details,
            },
        })

    try {
        await write("AI_ANALYSIS_REQUESTED", {
            status: "STARTED",
        })
    } catch {
        return failure()
    }

    const calls: AICallUsage[] = []

    const historySession: HistorySession = {
        userId: options.userId,
        scope: options.scope,
        entityType: options.entityType,
        entityId: options.entityId,
        store: options.historyStore,
    }

    let response: Response
    let unexpected = false

    try {
        response = await context.run(
            calls,
            () =>
                runWithHistory(
                    historySession,
                    options.run
                )
        )
    } catch {
        unexpected = true

        response = Response.json(
            {
                error: "Falha interna ao gerar análise.",
                code: "AI_INTERNAL",
            },
            { status: 500 }
        )
    }

    const body = await response
        .clone()
        .json()
        .catch(() => null)

    const cached =
        response.ok &&
        (
            body?.cached === true ||
            historySession.result?.cached === true
        )

    const evidenceCount =
        Array.isArray(body?.evidence)
            ? body.evidence.length
            : 0

    const empty =
        response.ok &&
        (
            body?.empty === true ||
            (
                Array.isArray(body?.evidence) &&
                body.evidence.some(
                    (e: {
                        id?: string
                        value?: {
                            totalOpenRisks?: number
                        }
                    }) =>
                        e?.id === "scope" &&
                        e.value?.totalOpenRisks === 0
                )
            )
        )

    const usage = summarizeAIUsage(
        calls,
        cached
            ? "srms_cache"
            : empty || !response.ok
                ? "no_call"
                : "unknown",
        Date.now() - started
    )

    const action = response.ok
        ? cached
            ? "AI_ANALYSIS_CACHED"
            : empty
                ? "AI_ANALYSIS_EMPTY"
                : "AI_ANALYSIS_SUCCEEDED"
        : [401, 403].includes(response.status)
            ? "AI_ANALYSIS_DENIED"
            : response.status === 429
                ? "AI_ANALYSIS_RATE_LIMITED"
                : "AI_ANALYSIS_FAILED"

    const historyId =
        historySession.result?.id ??
        body?.historyId ??
        null

    try {
        await write(action, {
            status:
                response.ok
                    ? "COMPLETED"
                    : "FAILED",

            httpStatus: response.status,
            durationMs: usage.durationMs,
            cached,
            evidenceCount,
            unexpected,
            usage,
            historyId,

            errorCode:
                typeof body?.code === "string" &&
                /^[A-Z0-9_]{1,80}$/.test(body.code)
                    ? body.code
                    : null,
        })
    } catch {
        return failure()
    }

    const headers = new Headers(response.headers)

    headers.delete("Content-Length")
    headers.set("X-Audit-Request-Id", requestId)
    headers.set("Cache-Control", "no-store")

    if (
        body &&
        typeof body === "object" &&
        !Array.isArray(body)
    ) {
        return Response.json(
            {
                ...body,

                // Consumo fica apenas na auditoria administrativa.
                usage: undefined,

                cached,
                historyId,

                generatedAt:
                    historySession.result?.generatedAt ??
                    body.generatedAt,
            },
            {
                status: response.status,
                headers,
            }
        )
    }

    return new Response(response.body, {
        status: response.status,
        headers,
    })
}