"use client"

import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import {
    buildWeeklyForecast,
    FORECAST_METRICS,
    forecastWeekLabel,
    type ForecastSnapshot,
    type ForecastWeek,
} from "@/lib/weekly-forecast"

function count(value: number) {
    return value.toLocaleString("pt-BR")
}

export function WeeklyForecastCard({
    snapshots,
    current,
}: {
    snapshots: ForecastSnapshot[]
    current?: ForecastWeek
}) {
    const forecast = useMemo(
        () => buildWeeklyForecast(snapshots, current),
        [snapshots, current]
    )

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <CardTitle>
                            Tendências e projeção semanal
                        </CardTitle>

                        <CardDescription className="mt-1">
                            Projeção para a CW seguinte à semana
                            base, usando quatro CWs consecutivas
                            terminando nela.
                        </CardDescription>
                    </div>

                    <Badge
                        variant="outline"
                        className="w-fit"
                    >
                        Estimativa de tendência
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {!forecast.available ? (
                    <div
                        role="status"
                        className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
                    >
                        {forecast.reason}
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">
                                Histórico:{" "}
                                {forecastWeekLabel(
                                    forecast.weeks[0]
                                )}{" "}
                                a{" "}
                                {forecastWeekLabel(
                                    forecast.weeks[3]
                                )}
                            </Badge>

                            <Badge variant="outline">
                                Projeção:{" "}
                                {forecastWeekLabel(
                                    forecast.target
                                )}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {forecast.metrics.map(
                                ({ key, label, result }) => (
                                    <div
                                        key={key}
                                        className="rounded-lg border p-4"
                                    >
                                        <p className="text-sm text-muted-foreground">
                                            {label}
                                        </p>

                                        {result ? (
                                            <>
                                                <p className="mt-1 text-2xl font-bold">
                                                    {count(
                                                        result.projected
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Projeção · base:{" "}
                                                    {count(
                                                        result.current
                                                    )}
                                                </p>

                                                <Badge
                                                    className="mt-3"
                                                    variant="outline"
                                                >
                                                    {result.delta === 0
                                                        ? "Sem variação projetada"
                                                        : `${
                                                              result.delta > 0
                                                                  ? "+"
                                                                  : ""
                                                          }${count(
                                                              result.delta
                                                          )} em relação à base`}
                                                </Badge>

                                                {result.consecutiveIncreases && (
                                                    <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400">
                                                        Atenção: aumento
                                                        nas três comparações
                                                        semanais do período.
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="mt-3 text-sm text-muted-foreground">
                                                Dados incompletos ou inválidos
                                                para este indicador.
                                            </p>
                                        )}
                                    </div>
                                )
                            )}
                        </div>

                        <details className="rounded-lg border">
                            <summary className="cursor-pointer p-4 text-sm font-medium hover:bg-muted/40">
                                Ver histórico usado e método de cálculo
                            </summary>

                            <div className="space-y-3 border-t p-4">
                                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                                    <Table className="min-w-[700px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    Semana
                                                </TableHead>

                                                {FORECAST_METRICS.map(
                                                    (metric) => (
                                                        <TableHead
                                                            key={metric.key}
                                                            className="text-right"
                                                        >
                                                            {metric.label}
                                                        </TableHead>
                                                    )
                                                )}
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {forecast.weeks.map(
                                                (snapshot) => (
                                                    <TableRow
                                                        key={`${snapshot.year}-${snapshot.week}`}
                                                    >
                                                        <TableCell className="font-medium">
                                                            {forecastWeekLabel(
                                                                snapshot
                                                            )}
                                                        </TableCell>

                                                        {FORECAST_METRICS.map(
                                                            (metric) => (
                                                                <TableCell
                                                                    key={metric.key}
                                                                    className="text-right"
                                                                >
                                                                    {Number.isSafeInteger(
                                                                        snapshot[
                                                                            metric.key
                                                                        ]
                                                                    ) &&
                                                                    snapshot[
                                                                        metric.key
                                                                    ] >= 0
                                                                        ? count(
                                                                              snapshot[
                                                                                  metric.key
                                                                              ]
                                                                          )
                                                                        : "Indisponível"}
                                                                </TableCell>
                                                            )
                                                        )}
                                                    </TableRow>
                                                )
                                            )}

                                            <TableRow className="bg-muted/40">
                                                <TableCell className="font-medium">
                                                    {forecastWeekLabel(
                                                        forecast.target
                                                    )}{" "}
                                                    · projeção
                                                </TableCell>

                                                {forecast.metrics.map(
                                                    (metric) => (
                                                        <TableCell
                                                            key={metric.key}
                                                            className="text-right font-medium"
                                                        >
                                                            {metric.result
                                                                ? count(
                                                                      metric
                                                                          .result
                                                                          .projected
                                                                  )
                                                                : "Indisponível"}
                                                        </TableCell>
                                                    )
                                                )}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Ajustamos uma linha aos valores das
                                    quatro CWs consecutivas e estendemos
                                    essa tendência por uma semana.
                                    Arredondamos a projeção para um inteiro
                                    e limitamos o mínimo a zero. Cada
                                    indicador é calculado separadamente.
                                </p>
                            </div>
                        </details>

                        <p className="text-xs text-muted-foreground">
                            A estimativa não é uma previsão validada
                            nem uma probabilidade. Ela usa somente
                            snapshots até a semana base, sem considerar
                            ações futuras ou mudanças operacionais.
                            Se a base for histórica, a projeção também
                            se refere à CW seguinte àquela base.
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    )
}