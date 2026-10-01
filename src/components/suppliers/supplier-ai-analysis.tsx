"use client"

import { useRef, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"

import type {
    AIAnalysis,
    Evidence,
} from "@/lib/supplier-ai"

type Result = {
    analysis: AIAnalysis
    evidence: Evidence[]
    generatedAt: string
    cached: boolean
}

export function SupplierAIAnalysis({
    supplierId,
    endpoint,
    title = "Análise por IA",
    description,
}: {
    supplierId?: string
    endpoint?: string
    title?: string
    description?: string
}) {
    const [result, setResult] =
        useState<Result | null>(null)

    const [error, setError] =
        useState<string | null>(null)

    const [loading, setLoading] =
        useState(false)

    const busy = useRef(false)

    async function generate() {
        if (busy.current) return

        busy.current = true

        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const response = await fetch(
                endpoint ??
                `/api/suppliers/${encodeURIComponent(supplierId ?? "")}/ai-analysis`,
                {
                    method: "POST",
                    credentials: "same-origin",
                    signal: AbortSignal.timeout(55000),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Falha ao gerar análise."
                )
            }

            setResult(data)
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Falha ao gerar análise."
            )
        } finally {
            busy.current = false
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {title}
                </CardTitle>

                <CardDescription>
                    {description ??
                        "Interpretação sob demanda dos indicadores e de até 30 RMs abertas, priorizando Red. Ao gerar, esses dados são enviados à OpenAI; nomes, contatos e descrições livres não são enviados. Nenhum registro é alterado."}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <Button
                    type="button"
                    disabled={loading}
                    onClick={generate}
                >
                    {loading
                        ? "Analisando…"
                        : "Gerar análise por IA"}
                </Button>

                {error && (
                    <p
                        role="alert"
                        className="text-sm text-destructive"
                    >
                        {error}
                    </p>
                )}

                <div
                    aria-live="polite"
                    aria-busy={loading}
                >
                    {result && (
                        <div className="space-y-4">
                            <p className="text-xs text-muted-foreground">
                                Gerada em{" "}
                                {new Date(
                                    result.generatedAt
                                ).toLocaleString("pt-BR")}

                                {result.cached
                                    ? " • Reutilizada: evidências sem alteração"
                                    : ""}

                                . Retrato dos dados consultados;
                                gere novamente após alterações.
                            </p>


                            <p className="text-sm">
                                {result.analysis.summary}
                            </p>

                            <ol className="space-y-3">
                                {result.analysis.priorities.map(
                                    (item, index) => (
                                        <li
                                            key={index}
                                            className="rounded-lg border p-3"
                                        >
                                            <p className="text-sm">
                                                {index + 1}.{" "}
                                                {item.action}
                                            </p>

                                            <div className="mt-2 flex flex-wrap gap-3">
                                                {item.evidenceIds.map(
                                                    (id) => {
                                                        const source =
                                                            result.evidence.find(
                                                                (evidence) =>
                                                                    evidence.id === id
                                                            )

                                                        return source?.href ? (
                                                            <Link
                                                                key={id}
                                                                href={source.href}
                                                                className="text-xs underline"
                                                            >
                                                                {source.label}
                                                            </Link>
                                                        ) : (
                                                            <span
                                                                key={id}
                                                                className="text-xs text-muted-foreground"
                                                            >
                                                                {source?.label}
                                                            </span>
                                                        )
                                                    }
                                                )}
                                            </div>
                                        </li>
                                    )
                                )}
                            </ol>

                            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                {result.analysis.limitations.map(
                                    (item, index) => (
                                        <li key={index}>
                                            {item}
                                        </li>
                                    )
                                )}
                            </ul>

                            <details>
                                <summary className="cursor-pointer text-sm">
                                    Conferir evidências utilizadas
                                </summary>

                                <div className="space-y-2">
                                    {result.evidence.map(
                                        (evidence) => (
                                            <div key={evidence.id}>
                                                <p className="mt-2 text-sm font-medium">
                                                    {evidence.label}
                                                </p>

                                                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">
                                                    {JSON.stringify(
                                                        evidence.value,
                                                        null,
                                                        2
                                                    )}
                                                </pre>
                                            </div>
                                        )
                                    )}
                                </div>
                            </details>

                            <p className="text-xs text-muted-foreground">
                                A IA pode interpretar incorretamente
                                as evidências. Revise as sugestões
                                antes de agir.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}