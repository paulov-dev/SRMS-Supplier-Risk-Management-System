"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import {
    buildWeeklyBacktest,
} from "@/lib/weekly-backtest"

import {
    forecastWeekLabel,
    type ForecastSnapshot,
    type ForecastWeek,
} from "@/lib/weekly-forecast"

function number(value: number | null) {
    return value === null
        ? "—"
        : value.toLocaleString("pt-BR", {
              maximumFractionDigits: 2,
          })
}

export function WeeklyBacktestCard({
    snapshots,
    current,
}: {
    snapshots: ForecastSnapshot[]
    current?: ForecastWeek
}) {
    const results = useMemo(
        () => buildWeeklyBacktest(snapshots, current),
        [snapshots, current]
    )

    const [selectedKey, setSelectedKey] =
        useState("openRisks")

    const selected =
        results.find(
            (metric) => metric.key === selectedKey
        ) || results[0]

    const hasResults = results.some(
        (metric) => metric.count > 0
    )

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <CardTitle>
                            Validação histórica das projeções
                        </CardTitle>

                        <CardDescription className="mt-1">
                            Para cada CW realizada, comparamos
                            a projeção das quatro semanas anteriores
                            com seu snapshot real.
                        </CardDescription>
                    </div>

                    <Badge
                        variant="outline"
                        className="w-fit"
                    >
                        Simulação retrospectiva
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {!current ? (
                    <div
                        role="status"
                        className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
                    >
                        Selecione uma semana base para limitar
                        a validação histórica.
                    </div>
                ) : !hasResults ? (
                    <div
                        role="status"
                        className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
                    >
                        Ainda não há comparações válidas até{" "}
                        {forecastWeekLabel(current)}.
                        São necessários pelo menos cinco snapshots
                        de CWs consecutivas: quatro para projetar
                        e o quinto para conferir o resultado.
                        Valores inválidos ou semanas duplicadas
                        são excluídos.
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">
                            Resultados reais até{" "}
                            {forecastWeekLabel(current)}.
                            Quanto menor o erro médio absoluto,
                            melhor o resultado observado.
                        </p>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {results.map((metric) => (
                                <div
                                    key={metric.key}
                                    className="rounded-lg border p-4"
                                >
                                    <p className="text-sm text-muted-foreground">
                                        {metric.label}
                                    </p>

                                    <p className="mt-1 text-2xl font-bold">
                                        {number(metric.meanError)}
                                    </p>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Erro médio absoluto da projeção
                                    </p>

                                    <p className="mt-3 text-xs">
                                        Repetir semana anterior:{" "}
                                        {number(
                                            metric.baselineMeanError
                                        )}
                                    </p>

                                    <Badge
                                        variant="outline"
                                        className="mt-3"
                                    >
                                        {metric.winner === null
                                            ? "Sem comparações válidas"
                                            : metric.winner === "tie"
                                                ? "Mesmo erro médio"
                                                : metric.winner === "trend"
                                                    ? "Menor erro: tendência"
                                                    : "Menor erro: repetir semana"}
                                    </Badge>

                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {metric.count}{" "}
                                        {metric.count === 1
                                            ? "semana avaliada"
                                            : "semanas avaliadas"}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <details className="rounded-lg border">
                            <summary className="cursor-pointer p-4 text-sm font-medium hover:bg-muted/40">
                                Ver projetado × realizado por semana
                            </summary>

                            <div className="space-y-4 border-t p-4">
                                <div className="max-w-xs space-y-2">
                                    <Label htmlFor="backtest-metric">
                                        Indicador
                                    </Label>

                                    <Select
                                        value={selectedKey}
                                        onValueChange={setSelectedKey}
                                    >
                                        <SelectTrigger id="backtest-metric">
                                            <SelectValue />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {results.map((metric) => (
                                                <SelectItem
                                                    key={metric.key}
                                                    value={metric.key}
                                                >
                                                    {metric.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selected.rows.length === 0 ? (
                                    <p
                                        role="status"
                                        className="text-sm text-muted-foreground"
                                    >
                                        Este indicador não possui
                                        comparações válidas.
                                    </p>
                                ) : (
                                    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                                        <Table className="min-w-[850px]">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>
                                                        CW realizada
                                                    </TableHead>

                                                    <TableHead>
                                                        Base da projeção
                                                    </TableHead>

                                                    <TableHead className="text-right">
                                                        Projetado
                                                    </TableHead>

                                                    <TableHead className="text-right">
                                                        Realizado
                                                    </TableHead>

                                                    <TableHead className="text-right">
                                                        Erro absoluto
                                                    </TableHead>

                                                    <TableHead className="text-right">
                                                        Repetir anterior
                                                    </TableHead>

                                                    <TableHead className="text-right">
                                                        Erro da referência
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>

                                            <TableBody>
                                                {selected.rows.map((row) => (
                                                    <TableRow
                                                        key={`${row.target.year}-${row.target.week}`}
                                                    >
                                                        <TableCell className="font-medium">
                                                            {forecastWeekLabel(
                                                                row.target
                                                            )}
                                                        </TableCell>

                                                        <TableCell>
                                                            {forecastWeekLabel(
                                                                row.base
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            {number(
                                                                row.projected
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            {number(
                                                                row.actual
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            {number(
                                                                row.error
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            {number(
                                                                row.baseline
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            {number(
                                                                row.baselineError
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        </details>

                        <p className="text-xs text-muted-foreground">
                            Erro absoluto = distância entre projetado
                            e realizado; erro médio = soma desses
                            erros dividida pelas semanas válidas.
                            Os dois métodos usam exatamente as mesmas
                            semanas por indicador. Os erros estão na
                            unidade do indicador, não em porcentagem.
                        </p>

                        <p className="text-xs text-muted-foreground">
                            Esta simulação recalcula o método atual
                            sobre os snapshots hoje salvos; não recupera
                            previsões registradas no passado.
                            Alterações nos snapshots afetam a avaliação.
                            Poucas semanas não demonstram precisão futura.
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    )
}