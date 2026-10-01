import { AsyncLocalStorage } from "node:async_hooks"
import { createHash } from "node:crypto"

import type {
    PrismaClient,
    Prisma,
} from "@prisma/client"

import type {
    AIAnalysis,
    Evidence,
} from "./supplier-ai"

// Incremente quando mudar instruções, formato ou interpretação.
export const AI_ANALYSIS_VERSION = "2026-10-01-v1"

export type SavedAnalysis = {
    id: string
    generatedAt: string
    analysis: AIAnalysis
    cached: boolean
}

type Identity = {
    userId: string
    scope: string
    entityType: string
    entityId: string
}

export type HistoryStore = {
    find: (
        key: string,
        userId: string
    ) => Promise<SavedAnalysis | null>

    getOrCreate: (
        key: string,
        data: Identity & {
            model: string
            evidence: Evidence[]
        },
        generate: () => Promise<AIAnalysis>
    ) => Promise<SavedAnalysis>
}

export type HistorySession = Identity & {
    store?: HistoryStore
    result?: SavedAnalysis
}

const history = new AsyncLocalStorage<HistorySession>()

export function runWithHistory<T>(
    session: HistorySession,
    run: () => Promise<T>
) {
    return history.run(session, run)
}

function canonical(value: unknown): string {
    if (Array.isArray(value)) {
        return "[" + value.map(canonical).join(",") + "]"
    }

    if (value !== null && typeof value === "object") {
        return (
            "{" +
            Object.entries(value)
                .filter(([, item]) => item !== undefined)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(
                    ([key, item]) =>
                        JSON.stringify(key) +
                        ":" +
                        canonical(item)
                )
                .join(",") +
            "}"
        )
    }

    return JSON.stringify(value) ?? "null"
}

export function analysisKey(
    identity: Identity,
    model: string,
    evidence: Evidence[],
    version = AI_ANALYSIS_VERSION
) {
    return createHash("sha256")
        .update(
            canonical({
                ...identity,
                model,
                evidence,
                version,
            })
        )
        .digest("hex")
}

export async function withSavedAnalysis(
    model: string,
    evidence: Evidence[],
    generate: () => Promise<AIAnalysis>
) {
    const session = history.getStore()

    if (!session?.store) {
        return generate()
    }

    const identity: Identity = {
        userId: session.userId,
        scope: session.scope,
        entityType: session.entityType,
        entityId: session.entityId,
    }

    session.result = await session.store.getOrCreate(
        analysisKey(identity, model, evidence),
        {
            ...identity,
            model,
            evidence,
        },
        generate
    )

    return session.result.analysis
}

export function createAIHistoryStore(
    db: PrismaClient
): HistoryStore {
    return {
        async find(key, userId) {
            const record = await db.auditLog.findFirst({
                where: {
                    entityType: "AIAnalysisResult",
                    entityId: key,
                    changedBy: userId,
                    action: "AI_ANALYSIS_SAVED",
                },
                orderBy: {
                    createdAt: "desc",
                },
            })

            if (!record) return null

            const value = record.newValue as unknown as {
                analysis: AIAnalysis
            }

            return {
                id: record.id,
                generatedAt: record.createdAt.toISOString(),
                analysis: value.analysis,
                cached: true,
            }
        },

        async getOrCreate(key, data, generate) {
            return db.$transaction(
                async tx => {
                    // PostgreSQL: evita gerações simultâneas
                    // para a mesma combinação de dados.
                    const lock = BigInt.asIntN(
                        64,
                        BigInt("0x" + key.slice(0, 16))
                    )

                    const rows = await tx.$queryRaw<
                        { locked: boolean }[]
                    >`
                        SELECT
                            pg_try_advisory_xact_lock(${lock})
                            AS locked
                    `

                    if (!rows[0]?.locked) {
                        throw new Error(
                            "AI_ANALYSIS_IN_PROGRESS"
                        )
                    }

                    const previous =
                        await tx.auditLog.findFirst({
                            where: {
                                entityType: "AIAnalysisResult",
                                entityId: key,
                                changedBy: data.userId,
                                action: "AI_ANALYSIS_SAVED",
                            },
                            orderBy: {
                                createdAt: "desc",
                            },
                        })

                    if (previous) {
                        const value =
                            previous.newValue as unknown as {
                                analysis: AIAnalysis
                            }

                        return {
                            id: previous.id,
                            generatedAt:
                                previous.createdAt.toISOString(),
                            analysis: value.analysis,
                            cached: true,
                        }
                    }

                    const analysis = await generate()

                    const record = await tx.auditLog.create({
                        data: {
                            entityType: "AIAnalysisResult",
                            entityId: key,
                            action: "AI_ANALYSIS_SAVED",
                            changedBy: data.userId,

                            newValue: JSON.parse(
                                JSON.stringify({
                                    version: AI_ANALYSIS_VERSION,
                                    scope: data.scope,
                                    model: data.model,
                                    sourceType: data.entityType,
                                    sourceId: data.entityId,
                                    analysis,
                                    evidence: data.evidence,
                                })
                            ) as Prisma.InputJsonObject,
                        },
                    })

                    return {
                        id: record.id,
                        generatedAt:
                            record.createdAt.toISOString(),
                        analysis,
                        cached: false,
                    }
                },
                {
                    maxWait: 2000,
                    timeout: 55000,
                }
            )
        },
    }
}

export async function findSavedAnalysis(
    model: string,
    evidence: Evidence[]
) {
    const session = history.getStore()

    if (!session?.store) return null

    const identity: Identity = {
        userId: session.userId,
        scope: session.scope,
        entityType: session.entityType,
        entityId: session.entityId,
    }

    const result = await session.store.find(
        analysisKey(identity, model, evidence),
        session.userId
    )

    if (result) {
        session.result = result
    }

    return result
        ? {
            analysis: result.analysis,
            generatedAt: result.generatedAt,
            historyId: result.id,
        }
        : null
}