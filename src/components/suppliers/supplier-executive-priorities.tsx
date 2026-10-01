"use client"

import Link from "next/link"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"

import {
    supplierWeekDelta,
    type SupplierWeek,
} from "@/lib/supplier-360"

type Props = {
    summary: {
        openRedRisks: number
        overdueActionPlans: number
        pendingLogisticsRequests: number
    }

    risks: {
        id: string
        code: string
        title: string
        workflowStatus: string
        riskLevel: string
    }[]

    weeks?: SupplierWeek[]

    onNavigate: (tab: string) => void
}

export function SupplierExecutivePriorities({
    summary,
    risks,
    weeks = [],
    onNavigate,
}: Props) {
    const ordered = [...weeks].sort(
        (a, b) =>
            b.year - a.year ||
            b.week - a.week
    )

    const current = ordered[0]
    const previous = ordered[1]

    const delta = current
        ? supplierWeekDelta(current, previous)
        : null

    const critical = risks.filter(
        (risk) =>
            risk.workflowStatus === "OPEN" &&
            risk.riskLevel === "RED"
    )

    const priorities = [
        {
            key: "risks",
            count: summary.openRedRisks,
            title: "RMs Red abertas",
            action:
                "Revisar contenção, responsáveis e próximos prazos das RMs críticas.",
            button: "Ver todas as RMs",
        },
        {
            key: "actions",
            count: summary.overdueActionPlans,
            title: "Planos atrasados",
            action:
                "Cobrar atualização dos planos vencidos e confirmar novos compromissos com os responsáveis.",
            button: "Ver todos os planos",
        },
        {
            key: "logistics",
            count: summary.pendingLogisticsRequests,
            title: "Logística pendente",
            action:
                "Revisar as solicitações pendentes e confirmar a ordem de atendimento.",
            button: "Ver toda a logística",
        },
    ].filter((item) => item.count > 0)

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    Prioridades e próximos passos
                </CardTitle>

                <CardDescription>
                    Regras sobre a posição atual do fornecedor.
                    Ordem fixa: RMs Red, planos atrasados e
                    logística. Os volumes podem se relacionar
                    e não devem ser somados.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                    <p className="font-medium">
                        Tendência histórica de RMs Red abertas
                    </p>

                    <p className="text-sm text-muted-foreground">
                        {delta === null ||
                        !current ||
                        !previous
                            ? "Comparação indisponível: são necessários dois snapshots de semanas consecutivas."
                            : `CW${previous.week}/${previous.year} → CW${current.week}/${current.year}: ${
                                  delta > 0
                                      ? `aumento de ${delta}`
                                      : delta < 0
                                        ? `redução de ${Math.abs(delta)}`
                                        : "estabilidade"
                              } (${previous.redRisks} → ${current.redRisks}).`}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                        A comparação descreve os últimos
                        snapshots disponíveis; não é uma
                        previsão nem a posição em tempo real.
                    </p>
                </div>

                {priorities.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Nenhuma ocorrência nas três regras
                        monitoradas. Consulte as demais
                        informações do fornecedor antes de
                        concluir a análise.
                    </p>
                )}

                <div className="grid gap-3 lg:grid-cols-3">
                    {priorities.map((item) => (
                        <div
                            key={item.key}
                            className="flex flex-col gap-3 rounded-lg border p-4"
                        >
                            <p className="font-medium">
                                {item.title}: {item.count}
                            </p>

                            <p className="flex-1 text-sm text-muted-foreground">
                                {item.action}
                            </p>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    onNavigate(item.key)
                                }
                            >
                                {item.button}
                            </Button>
                        </div>
                    ))}
                </div>

                {critical.length > 0 && (
                    <div>
                        <p className="mb-2 text-sm font-medium">
                            Acesso direto às RMs Red abertas
                            — até 5, na ordem da listagem
                        </p>

                        <ul className="space-y-2">
                            {critical
                                .slice(0, 5)
                                .map((risk) => (
                                    <li key={risk.id}>
                                        <Link
                                            href={`/rms/${encodeURIComponent(risk.id)}`}
                                            className="text-sm underline underline-offset-4"
                                        >
                                            {risk.code}
                                            {" — "}
                                            {risk.title}
                                        </Link>
                                    </li>
                                ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}