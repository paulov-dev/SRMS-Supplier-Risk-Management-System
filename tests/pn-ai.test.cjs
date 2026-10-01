const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
    buildPNEvidence,
    assessmentFields,
} = require("../src/lib/pn-ai.ts")

const now = new Date(2026, 9, 1, 12)

const pn = (id, links = []) => ({
    id: String(id),
    partNumber: `PN-${id}`,
    description: null,
    vehicleProgram: null,

    _count: {
        vehicleApplications: 0,
    },

    riskParts: links,
})

const link = (status = "OPEN", extra = {}) => ({
    status: "RED",
    logisticsStatus: "NOT_REQUESTED",
    assignedToId: null,

    riskEvent: {
        id: "same-rm",
        workflowStatus: status,
    },

    assessment: null,
    actionPlans: [],
    logisticsRequests: [],

    ...extra,
})

test(
    "inclui todos os PNs sem RM sem atribuir um farol",
    () => {
        const evidence = buildPNEvidence(
            Array.from(
                { length: 51 },
                (_, index) => pn(index)
            ),
            now
        )

        assert.equal(evidence.length, 52)
        assert.equal(evidence[0].value.totalPNs, 51)
        assert.equal(evidence[0].value.pnsWithoutRM, 51)
        assert.equal(evidence[0].value.noRMIsNormal, true)

        assert.equal(
            evidence[1].value.rmRelationship,
            "NO_RM_NORMAL"
        )

        assert.deepEqual(
            evidence[1].value.riskLinks,
            []
        )
    }
)

test(
    "separa RMs encerradas e canceladas da exposição Red em RMs abertas",
    () => {
        const evidence = buildPNEvidence(
            [
                pn(1, [link("CLOSED")]),

                pn(2, [
                    link("CANCELED", {
                        riskEvent: {
                            id: "cancel",
                            workflowStatus: "CANCELED",
                        },
                    }),
                ]),
            ],
            now
        )

        assert.equal(
            evidence[0].value.pnsWithRedInOpenRM,
            0
        )

        assert.equal(
            evidence[0].value.uniqueRMsByWorkflow.CLOSED,
            1
        )

        assert.equal(
            evidence[1].value.riskLinks[0].workflowStatus,
            "CLOSED"
        )
    }
)

test(
    "conta PNs únicos e RMs únicas separadamente dos vínculos",
    () => {
        const evidence = buildPNEvidence(
            [
                pn(1, [link()]),
                pn(2, [link()]),
            ],
            now
        )

        assert.equal(evidence[0].value.totalPNs, 2)
        assert.equal(evidence[0].value.uniqueRMs, 1)
        assert.equal(evidence[0].value.riskLinks, 2)
    }
)

test(
    "preserva avaliações desconhecidas e calcula atrasos dos planos",
    () => {
        const assessment = Object.fromEntries(
            assessmentFields.map(
                (field) => [field, null]
            )
        )

        assessment.hasDemand = false

        const plan = {
            status: "OPEN",
            priority: "HIGH",
            assignedToId: null,
            dueDate: new Date(2026, 8, 30),
        }

        const evidence = buildPNEvidence(
            [
                pn(1, [
                    link("OPEN", {
                        assessment,

                        actionPlans: [
                            plan,

                            {
                                ...plan,
                                status: "COMPLETED",
                            },

                            {
                                ...plan,
                                status: "CANCELED",
                            },

                            {
                                ...plan,
                                dueDate: null,
                            },

                            {
                                ...plan,
                                dueDate: new Date(
                                    2026, 9, 1
                                ),
                            },
                        ],
                    }),
                ]),
            ],
            now
        )

        const details =
            evidence[1].value.riskLinks[0]

        assert.equal(
            details.assessment.sourceNamed,
            null
        )

        assert.equal(
            details.assessment.hasDemand,
            false
        )

        assert.deepEqual(
            details.actionPlans.map(
                (item) => item.overdue
            ),
            [true, false, false, false, false]
        )
    }
)

test(
    "não envia IDs internos, responsáveis ou descrições ao modelo",
    () => {
        const evidence = buildPNEvidence(
            [
                {
                    ...pn("PRIVATE"),
                    description: "PRIVATE",

                    riskParts: [
                        link("OPEN", {
                            assignedToId: "PRIVATE",

                            riskEvent: {
                                id: "PRIVATE",
                                workflowStatus: "OPEN",
                            },
                        }),
                    ],
                },
            ],
            now
        )

        const input = JSON.stringify(
            evidence.map(({ id, value }) => ({
                id,
                value,
            }))
        )

        assert.equal(
            input.includes("PRIVATE"),
            false
        )
    }
)

test(
    "escopo pessoal usa responsável da RM OU do vínculo PN sem duplicar PNs",
    () => {
        const mineRM = link("CLOSED", {
            riskEvent: {
                id: "my-rm",
                workflowStatus: "CLOSED",
                assignedToId: "me",
            },
        })

        const minePN = link("OPEN", {
            assignedToId: "me",
        })

        const other = link("OPEN", {
            assignedToId: "someone-else",
        })

        const parts = [
            pn(1),
            pn(2, [mineRM]),
            pn(3, [minePN]),
            pn(4, [mineRM, minePN, other]),
            pn(5, [other]),
        ]

        const evidence = buildPNEvidence(
            parts,
            now,
            {
                scope: "mine",
                userId: "me",
            }
        )

        const details = evidence.filter(
            (item) => /^pn-/.test(item.id)
        )

        assert.equal(details.length, 3)

        assert.deepEqual(
            details.map((item) => item.label),
            ["PN-2", "PN-3", "PN-4"]
        )

        assert.equal(
            details[2].value.riskLinks.length,
            3
        )

        assert.deepEqual(
            details[2].value.riskLinks.map(
                (item) =>
                    item.matchesUserResponsibility
            ),
            [true, true, false]
        )

        assert.equal(
            evidence[0].value.selectedScope,
            "mine"
        )

        const all = buildPNEvidence(
            parts,
            now,
            {
                scope: "all",
                userId: "me",
            }
        )

        assert.equal(all[0].value.totalPNs, 5)
    }
)

test(
    "escopo pessoal exige usuário e trata ausência de PNs correspondentes",
    () => {
        assert.throws(() =>
            buildPNEvidence(
                [pn(1)],
                now,
                { scope: "mine" }
            )
        )

        const evidence = buildPNEvidence(
            [pn(1, [link()])],
            now,
            {
                scope: "mine",
                userId: "me",
            }
        )

        assert.equal(
            evidence[0].value.totalPNs,
            0
        )
    }
)