const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
    auditAIRequest,
    measureAIFetch,
    parseAIUsage,
} = require("../src/lib/ai-audit.ts")

const payload = {
    model: "gpt-4.1-mini-2025-04-14",
    service_tier: "default",

    usage: {
        input_tokens: 1000,
        input_tokens_details: {
            cached_tokens: 200,
        },
        output_tokens: 100,
        total_tokens: 1100,
    },
}

async function audited(run, entries = []) {
    const response = await auditAIRequest({
        request: new Request(
            "https://srms.test/api/part-numbers/ai-analysis"
        ),
        entityType: "PartNumberPortfolio",
        entityId: "all",
        userId: "user-1",
        scope: "mine",
        model: "gpt-4.1-mini",

        write: async entry => entries.push(entry),
        run,
    })

    return {
        response,
        body: await response.json(),
        entries,
    }
}

test("calcula cache de entrada sem contagem duplicada", () => {
    const result = parseAIUsage(
        payload,
        "gpt-4.1-mini"
    )

    assert.equal(result.estimatedCostUsd, 0.0005)
    assert.equal(result.totalTokens, 1100)
    assert.equal(result.cachedInputTokens, 200)
})

test("dados ausentes, incoerentes e modelo desconhecido não viram custo zero", () => {
    assert.equal(
        parseAIUsage(null, "gpt-4.1-mini")
            .estimatedCostUsd,
        null
    )

    assert.equal(
        parseAIUsage(
            { ...payload, model: "unknown" },
            "unknown"
        ).estimatedCostUsd,
        null
    )

    assert.equal(
        parseAIUsage(
            { ...payload, service_tier: "priority" },
            "gpt-4.1-mini"
        ).estimatedCostUsd,
        null
    )

    assert.equal(
        parseAIUsage(
            {
                ...payload,
                usage: {
                    ...payload.usage,
                    input_tokens_details: {
                        cached_tokens: 2000,
                    },
                },
            },
            "gpt-4.1-mini"
        ).estimatedCostUsd,
        null
    )
})

test("persiste consumo mesmo quando a análise é rejeitada depois da resposta", async () => {
    const result = await audited(async () => {
        await measureAIFetch(
            "gpt-4.1-mini",
            async () => Response.json(payload)
        )("https://example.test")

        return Response.json(
            {
                code: "AI_VALIDATION",
                error: "Resposta inválida",
            },
            { status: 502 }
        )
    })

    assert.equal(
        result.body.usage.estimatedCostUsd,
        0.0005
    )

    assert.equal(
        result.entries[1].action,
        "AI_ANALYSIS_FAILED"
    )

    assert.deepEqual(
        result.entries[1].newValue.usage,
        result.body.usage
    )
})

test("cache do SRMS registra zero novas chamadas e zero custo adicional", async () => {
    const result = await audited(
        async () => Response.json({ cached: true })
    )

    assert.equal(
        result.body.usage.source,
        "srms_cache"
    )

    assert.equal(
        result.body.usage.providerAttempts,
        0
    )

    assert.equal(
        result.body.usage.estimatedCostUsd,
        0
    )
})

test("timeout é tentativa com consumo desconhecido", async () => {
    const result = await audited(async () => {
        await measureAIFetch(
            "gpt-4.1-mini",
            async () => {
                throw new Error("timeout")
            }
        )("https://example.test")

        return Response.json({})
    })

    assert.equal(
        result.body.usage.providerAttempts,
        1
    )

    assert.equal(
        result.body.usage.estimatedCostUsd,
        null
    )
})

test("requisições concorrentes não misturam o consumo", async () => {
    const results = await Promise.all(
        [1, 2].map(amount =>
            audited(async () => {
                for (let i = 0; i < amount; i++) {
                    await measureAIFetch(
                        "gpt-4.1-mini",
                        async () => Response.json(payload)
                    )("https://example.test")
                }

                return Response.json({
                    cached: false,
                })
            })
        )
    )

    assert.equal(
        results[0].body.usage.providerAttempts,
        1
    )

    assert.equal(
        results[1].body.usage.providerAttempts,
        2
    )

    assert.equal(
        results[1].body.usage.estimatedCostUsd,
        0.001
    )
})