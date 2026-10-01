const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
    auditAIRequest,
} = require("../src/lib/ai-audit.ts")

const base = {
    request: new Request(
        "https://srms.test/api/part-numbers/ai-analysis",
        { method: "POST" }
    ),

    entityType: "PartNumberPortfolio",
    entityId: "all",
    userId: "user-1",
    scope: "all-pns-all-rms",
}

test(
    "audita sucesso, cache, cadastro vazio e erros",
    async () => {
        const cases = [
            [{}, 200, "AI_ANALYSIS_SUCCEEDED"],

            [
                { cached: true },
                200,
                "AI_ANALYSIS_CACHED",
            ],

            [
                { empty: true },
                200,
                "AI_ANALYSIS_EMPTY",
            ],

            [
                { code: "AI_QUOTA" },
                502,
                "AI_ANALYSIS_FAILED",
            ],

            [{}, 403, "AI_ANALYSIS_DENIED"],
        ]

        for (const [body, status, action] of cases) {
            const entries = []

            const response = await auditAIRequest({
                ...base,

                write: async (entry) => {
                    entries.push(entry)
                },

                run: async () => {
                    assert.equal(
                        entries[0].action,
                        "AI_ANALYSIS_REQUESTED"
                    )

                    return Response.json(
                        body,
                        { status }
                    )
                },
            })

            assert.equal(response.status, status)
            assert.equal(entries[1].action, action)

            assert.equal(
                entries[0].newValue.requestId,
                entries[1].newValue.requestId
            )
        }
    }
)

test(
    "não executa a análise quando a auditoria inicial falha",
    async () => {
        let called = false

        const response = await auditAIRequest({
            ...base,

            write: async () => {
                throw new Error("Falha simulada")
            },

            run: async () => {
                called = true
                return Response.json({})
            },
        })

        assert.equal(response.status, 503)
        assert.equal(called, false)
    }
)