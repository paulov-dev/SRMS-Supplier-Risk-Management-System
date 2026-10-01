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
    supplierWeekDelta,
    type SupplierWeek,
} from "@/lib/supplier-360"

type TimelineRisk = {
    id: string
    code: string
    title: string
    createdAt: string
    closedAt: string | null
}

type Supplier360HistoryProps = {
    weeks?: SupplierWeek[]
    risks: TimelineRisk[]
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
})

export function Supplier360History({
    weeks,
    risks,
}: Supplier360HistoryProps) {
    const timeline = risks
        .flatMap((risk) => [
            {
                key: `${risk.id}-created`,
                date: risk.createdAt,
                label:
                    `RM ${risk.code}: abertura — ${risk.title}`,
            },

            ...(risk.closedAt
                ? [
                      {
                          key: `${risk.id}-closed`,
                          date: risk.closedAt,
                          label:
                              `RM ${risk.code}: encerramento — ${risk.title}`,
                      },
                  ]
                : []),
        ])
        .filter((event) =>
            Number.isFinite(Date.parse(event.date))
        )
        .sort(
            (a, b) =>
                Date.parse(b.date) - Date.parse(a.date)
        )
        .slice(0, 20)

    return (
        <div className="grid gap-4 xl:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>
                        Evolução semanal do fornecedor
                    </CardTitle>

                    <CardDescription>
                        Últimas 12 semanas com registros por RM.
                        Red considera somente RMs abertas.
                        Semanas sem registros não representam zero.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {!weeks?.length ? (
                        <p className="text-sm text-muted-foreground">
                            Histórico individual indisponível.
                            Gere snapshots que registrem as RMs
                            deste fornecedor.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th
                                            scope="col"
                                            className="p-2 text-left"
                                        >
                                            Semana
                                        </th>

                                        <th scope="col">
                                            Abertas
                                        </th>

                                        <th scope="col">
                                            Red
                                        </th>

                                        <th scope="col">
                                            Δ Red semanal
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {weeks.map((week, index) => {
                                        const delta =
                                            supplierWeekDelta(
                                                week,
                                                weeks[index + 1]
                                            )

                                        return (
                                            <tr
                                                key={`${week.year}-${week.week}`}
                                                className="border-b"
                                            >
                                                <th
                                                    scope="row"
                                                    className="p-2 text-left font-normal"
                                                >
                                                    CW{week.week}
                                                    {" / "}
                                                    {week.year}
                                                </th>

                                                <td className="text-center">
                                                    {week.openRisks}
                                                </td>

                                                <td className="text-center">
                                                    {week.redRisks}
                                                </td>

                                                <td className="text-center">
                                                    {delta === null
                                                        ? "Indisponível"
                                                        : `${delta > 0 ? "+" : ""}${delta}`}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Link
                        href="/analytics/weekly"
                        className="mt-4 inline-block text-sm underline underline-offset-4"
                    >
                        Ver Weekly Risk Intelligence
                    </Link>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        Timeline do fornecedor
                    </CardTitle>

                    <CardDescription>
                        Até 20 marcos recentes de abertura e
                        encerramento, conforme as datas disponíveis
                        nas RMs atuais. Não substitui o histórico
                        completo de auditoria.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {timeline.length > 0 ? (
                        <ol className="space-y-3">
                            {timeline.map((event) => (
                                <li
                                    key={event.key}
                                    className="border-l-2 pl-3"
                                >
                                    <p className="text-sm">
                                        {event.label}
                                    </p>

                                    <time
                                        dateTime={event.date}
                                        className="text-xs text-muted-foreground"
                                    >
                                        {dateFormatter.format(
                                            new Date(event.date)
                                        )}
                                        {" "}(São Paulo)
                                    </time>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Nenhum marco disponível.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}