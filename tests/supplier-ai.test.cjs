const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
    buildAIEvidence,
    validateAnalysis,
    requestSupplierAnalysis,
} = require("../src/lib/supplier-ai.ts")

const analysis = {
    summary: "Revisar prioridades.",
    priorities: [
        {
            action: "Revisar RMs.",
            evidenceIds: ["current"],
        },
    ],
    limitations: [
        "Revisão humana necessária.",
    ],
}

const evidence = [
    {
        id: "current",
        label: "Indicadores",
        value: {
            openRedRisks: 2,
        },
    },
]

test(
    "rejects invented references, absent evidence and invalid shape",
    () => {
        assert.deepEqual(
            validateAnalysis(analysis, ["current"]),
            analysis
        )

        assert.throws(() =>
            validateAnalysis(
                {
                    ...analysis,
                    priorities: [
                        {
                            action: "Ação",
                            evidenceIds: ["invented"],
                        },
                    ],
                },
                ["current"]
            )
        )

        assert.throws(() =>
            validateAnalysis(
                {
                    ...analysis,
                    priorities: [
                        {
                            action: "Ação",
                            evidenceIds: [],
                        },
                    ],
                },
                ["current"]
            )
        )

        assert.throws(() =>
            validateAnalysis(null, ["current"])
        )
    }
)

test(
    "bounds detail and omits personal and free-text fields",
    () => {
        const input = {
            riskScore: null,
            lastRiskCalculation: null,

            analytics: {
                summary: {
                    openRisks: 31,
                },
            },

            name: "PRIVATE",
            contacts: [
                { email: "PRIVATE" },
            ],

            riskEvents: Array.from(
                { length: 31 },
                (_, index) => ({
                    id: String(index),
                    code: "RM",
                    title: "PRIVATE",
                    workflowStatus: "OPEN",
                    riskLevel:
                        index === 30 ? "RED" : "GREEN",
                    parts: [],
                    actionPlans: [],
                    logistics: [],
                })
            ),
        }

        const result = buildAIEvidence(input)

        assert.equal(result.length, 34)
        assert.equal(result[4].value.level, "RED")

        assert.equal(
            JSON.stringify(result).includes("PRIVATE"),
            false
        )
    }
)

test(
    "sends structured schema without labels and validates response",
    async () => {
        const fetcher = async (url, options) => {
            assert.equal(
                url,
                "https://api.openai.com/v1/responses"
            )

            const body = JSON.parse(options.body)

            assert.equal(body.store, false)
            assert.equal(body.text.format.strict, true)

            assert.equal(
                body.input.includes("Indicadores"),
                false
            )

            return Response.json({
                status: "completed",
                output: [
                    {
                        type: "message",
                        content: [
                            {
                                type: "output_text",
                                text: JSON.stringify(analysis),
                            },
                        ],
                    },
                ],
            })
        }

        const result = await requestSupplierAnalysis(
            "fake",
            "test-model",
            evidence,
            fetcher
        )

        assert.deepEqual(result, analysis)
    }
)

test(
    "rejects provider errors, incomplete output, refusal and malformed JSON",
    async () => {
        const responses = [
            new Response("", { status: 429 }),

            Response.json({
                status: "incomplete",
                output: [],
            }),

            Response.json({
                status: "completed",
                output: [
                    {
                        type: "message",
                        content: [
                            { type: "refusal" },
                        ],
                    },
                ],
            }),

            Response.json({
                status: "completed",
                output: [
                    {
                        type: "message",
                        content: [
                            {
                                type: "output_text",
                                text: "invalid",
                            },
                        ],
                    },
                ],
            }),
        ]

        for (const response of responses) {
            await assert.rejects(() =>
                requestSupplierAnalysis(
                    "fake",
                    "test-model",
                    evidence,
                    async () => response
                )
            )
        }

        await assert.rejects(() =>
            requestSupplierAnalysis(
                "fake",
                "test-model",
                evidence,
                async () => {
                    throw new Error("timeout")
                }
            )
        )
    }
)