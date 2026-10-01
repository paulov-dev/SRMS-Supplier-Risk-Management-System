import { randomUUID } from "node:crypto"

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
        // AuditLog exige um usuário existente.
        // Não atribuímos tentativas anônimas a outro usuário.
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

    const ipAddress =
        rawIp
            ?.replace(/^::ffff:/, "")
            .slice(0, 64) ?? null

    const common = {
        requestId,
        scope: options.scope,
        model: options.model ?? null,
        path: new URL(options.request.url).pathname,

        userAgent:
            options.request.headers
                .get("user-agent")
                ?.slice(0, 512) ?? null,
    }

    const write = (
        action: string,
        details: Record<string, unknown>
    ) =>
        options.write({
            entityType: options.entityType,
            entityId: options.entityId,
            changedBy: options.userId!,
            ipAddress,
            action,

            newValue: {
                ...common,
                ...details,
            },
        })

    // A execução só começa depois que o início foi persistido.
    try {
        await write("AI_ANALYSIS_REQUESTED", {
            status: "STARTED",
        })
    } catch {
        console.error("[ai-audit]", {
            requestId,
            stage: "START",
            code: "AI_AUDIT_UNAVAILABLE",
        })

        return failure()
    }

    let response: Response
    let unexpected = false

    try {
        response = await options.run()
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
        body?.cached === true

    const evidenceCount =
        Array.isArray(body?.evidence)
            ? body.evidence.length
            : 0

    const empty =
        response.ok &&
        Array.isArray(body?.evidence) &&
        body.evidence.some(
            (evidence: {
                id?: string
                value?: {
                    totalOpenRisks?: number
                }
            }) =>
                evidence?.id === "scope" &&
                evidence.value?.totalOpenRisks === 0
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

    try {
        await write(action, {
            status:
                response.ok
                    ? "COMPLETED"
                    : "FAILED",

            httpStatus: response.status,
            durationMs: Date.now() - started,
            cached,
            evidenceCount,
            unexpected,

            errorCode:
                typeof body?.code === "string" &&
                /^[A-Z0-9_]{1,80}$/.test(body.code)
                    ? body.code
                    : null,
        })
    } catch {
        console.error("[ai-audit]", {
            requestId,
            stage: "RESULT",
            code: "AI_AUDIT_UNAVAILABLE",
        })

        return failure()
    }

    response.headers.set(
        "X-Audit-Request-Id",
        requestId
    )

    response.headers.set(
        "Cache-Control",
        "no-store"
    )

    return response
}