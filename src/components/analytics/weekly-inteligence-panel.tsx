"use client"

import Link from "next/link"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    buildWeeklyIntelligence,
    type IntelligenceSnapshot,
} from "@/lib/weekly-intelligence"

const signed = (value: number) =>
    `${value > 0 ? "+" : ""}${value}`

const count = (value: number) =>
    Number.isSafeInteger(value) && value >= 0
        ? value
        : "Indisponível"

export function WeeklyIntelligencePanel({
    snapshots,
    current,
}: {
    snapshots: IntelligenceSnapshot[]
    current?: IntelligenceSnapshot
}) {
    const model = buildWeeklyIntelligence(
        snapshots,
        current
    )

    if (!model || !current) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>
                        Inteligência semanal indisponível
                    </CardTitle>

                    <CardDescription>
                        Selecione uma semana com snapshot.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <section
            aria-label="Weekly Risk Intelligence"
            className="space-y-4"
        >
            <div className="text-sm text-muted-foreground">
                Base: CW{current.week} / {current.year}.
                Sinais por regra, sem probabilidade de
                ocorrência.

                {model.previous
                    ? ` Deltas contra CW${model.previous.week} / ${model.previous.year}.`
                    : " Sem snapshot da semana imediatamente anterior: deltas indisponíveis."}

                {" "}
                Esta análise usa a semana base e suas
                antecessoras, independentemente da comparação
                manual abaixo.
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Carteira de risco
                        </CardTitle>

                        <CardDescription>
                            Volumes no snapshot selecionado
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <p className="text-3xl font-semibold">
                            {count(current.openRisks)}
                        </p>

                        <p className="text-sm text-muted-foreground">
                            RMs abertas •{" "}
                            {count(current.redRisks)} RMs Red
                            {" "}•{" "}
                            {count(current.redParts)} PNs Red
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Risk Acceleration
                        </CardTitle>

                        <CardDescription>
                            Aceleração das RMs Red
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <p className="text-3xl font-semibold">
                            {model.acceleration === null
                                ? "Indisponível"
                                : signed(model.acceleration)}
                        </p>

                        <p className="text-sm text-muted-foreground">
                            {model.acceleration === null
                                ? "Requer três snapshots semanais consecutivos."
                                : "RMs/semana². Positivo: a variação semanal aumentou; negativo: diminuiu."}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Deterioração semanal
                        </CardTitle>

                        <CardDescription>
                            Pioraram menos melhoraram
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <p className="text-3xl font-semibold">
                            {model.deterioration === null
                                ? "Indisponível"
                                : signed(model.deterioration)}
                        </p>

                        <p className="text-sm text-muted-foreground">
                            {count(
                                current.risksWorsenedThisWeek
                            )}{" "}
                            pioraram •{" "}
                            {count(
                                current.risksImprovedThisWeek
                            )}{" "}
                            melhoraram. Saldo de movimentações
                            da semana.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Alertas de deterioração
                        </CardTitle>

                        <CardDescription>
                            Indicadores com aumento semanal
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <p className="text-3xl font-semibold">
                            {model.signals.every(
                                (signal) =>
                                    signal.delta !== null
                            )
                                ? model.signals.filter(
                                      (signal) =>
                                          (signal.delta ?? 0) >
                                          0
                                  ).length
                                : "Indisponível"}
                        </p>

                        <p className="text-sm text-muted-foreground">
                            Entre RMs Red, PNs Red, planos
                            atrasados e logística pendente.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        Top sinais críticos e recomendações
                    </CardTitle>

                    <CardDescription>
                        Aumentos primeiro; depois exposição
                        existente. Ordem por domínio: RMs,
                        PNs, planos e logística. Volumes não
                        são somados.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                    {model.topSignals.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            {model.signals.some(
                                (signal) =>
                                    signal.value === null
                            )
                                ? "Há indicadores indisponíveis; não é possível concluir ausência de sinais."
                                : "Nenhum volume positivo nos quatro indicadores monitorados. Isso não garante ausência de risco."}
                        </p>
                    )}

                    {model.topSignals.map(
                        (signal, index) => (
                            <div
                                key={signal.key}
                                className={`rounded-lg border p-4 ${
                                    (signal.delta ?? 0) > 0
                                        ? "border-red-500/40 bg-red-500/5"
                                        : "border-amber-500/40 bg-amber-500/5"
                                }`}
                            >
                                <p className="font-medium">
                                    {index + 1}.{" "}
                                    {signal.label}:{" "}
                                    {signal.value}{" "}

                                    <span className="text-sm font-normal">
                                        •{" "}
                                        {signal.delta === null
                                            ? "Comparação indisponível"
                                            : `${signed(signal.delta)} vs. semana anterior`}
                                    </span>
                                </p>

                                <p className="mt-1 text-sm">
                                    {signal.action}
                                </p>
                            </div>
                        )
                    )}

                    <details className="text-sm text-muted-foreground">
                        <summary className="cursor-pointer">
                            Como interpretar Risk Acceleration
                        </summary>

                        <p className="mt-2">
                            (Red atual − Red anterior) −
                            (Red anterior − Red de duas
                            semanas atrás). Mede mudança no
                            ritmo das RMs Red, não um score
                            global nem uma previsão validada.
                            Semanas ausentes e dados inválidos
                            não são tratados como zero.
                        </p>
                    </details>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        Supplier 360
                    </CardTitle>

                    <CardDescription>
                        Preparação para análise individual
                        do fornecedor
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <p className="mb-3 text-sm text-muted-foreground">
                        Os snapshots agregados não identificam
                        a deterioração por fornecedor.
                        O drilldown semanal será habilitado
                        quando houver dados associados ao
                        fornecedor e uma tela 360 disponível.
                    </p>

                    <Link
                        href="/suppliers"
                        className="text-sm font-medium underline underline-offset-4"
                    >
                        Consultar fornecedores
                    </Link>
                </CardContent>
            </Card>
        </section>
    )
}