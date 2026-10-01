"use client"

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react"

import Link from "next/link"

import {
    Activity,
    ArrowLeft,
    ArrowRight,
    CircleAlert,
    Coins,
    Eye,
    Filter,
    History,
    Loader2,
    RotateCcw,
    Search,
    type LucideIcon,
} from "lucide-react"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import type { AIUsageSummary } from "@/lib/ai-audit"

import type {
    AIAnalysis,
    Evidence,
} from "@/lib/supplier-ai"

type Row = {
    id: string
    createdAt: string
    action: string
    entityType: string

    user: {
        name: string | null
    }

    newValue: {
        scope?: string
        model?: string
        durationMs?: number
        historyId?: string
        usage?: AIUsageSummary
    } | null
}

type Data = {
    rows: Row[]
    total: number
    page: number
    pageSize: number
}

type Detail = {
    createdAt: string

    newValue: {
        analysis: AIAnalysis
        evidence: Evidence[]
    }
}

type Filters = {
    from: string
    to: string
    type: string
}

const initialFilters: Filters = {
    from: "",
    to: "",
    type: "all",
}

const types: Record<string, string> = {
    Supplier: "Fornecedor",
    RiskPortfolio: "Carteira de RMs",
    PartNumberPortfolio: "Carteira de PNs",
}

const statuses: Record<
    string,
    {
        label: string
        color: string
    }
> = {
    AI_ANALYSIS_SUCCEEDED: {
        label: "Concluída",
        color:
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },

    AI_ANALYSIS_CACHED: {
        label: "Reutilizada",
        color:
            "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    },

    AI_ANALYSIS_EMPTY: {
        label: "Sem dados",
        color: "bg-muted text-muted-foreground",
    },

    AI_ANALYSIS_FAILED: {
        label: "Falha",
        color:
            "border-destructive/20 bg-destructive/10 text-destructive",
    },

    AI_ANALYSIS_RATE_LIMITED: {
        label: "Limite atingido",
        color:
            "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },

    AI_ANALYSIS_DENIED: {
        label: "Acesso negado",
        color:
            "border-destructive/20 bg-destructive/10 text-destructive",
    },
}

function money(value: number | null | undefined) {
    if (value == null) return "Não informado"

    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 6,
        maximumFractionDigits: 9,
    }).format(value)
}

function number(value: number | null | undefined) {
    return value == null
        ? "—"
        : value.toLocaleString("pt-BR")
}

function scopeLabel(scope?: string) {
    if (!scope) return "Escopo não informado"

    if (
        scope === "mine" ||
        scope.startsWith("mine-")
    ) {
        return "Responsabilidade do usuário"
    }

    if (
        scope === "all" ||
        scope.startsWith("all-")
    ) {
        return "Carteira completa"
    }

    return scope
}

function Metric({
    title,
    value,
    hint,
    icon: Icon,
}: {
    title: string
    value: string
    hint: string
    icon: LucideIcon
}) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">
                            {title}
                        </p>

                        <p className="mt-2 break-words text-2xl font-bold tabular-nums">
                            {value}
                        </p>
                    </div>

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                    {hint}
                </p>
            </CardContent>
        </Card>
    )
}

export function AIHistoryPanel() {
    const [data, setData] = useState<Data | null>(null)

    const [draft, setDraft] =
        useState<Filters>(initialFilters)

    const [applied, setApplied] =
        useState<Filters>(initialFilters)

    const [busy, setBusy] = useState(true)
    const [error, setError] = useState("")

    const [dialogOpen, setDialogOpen] = useState(false)
    const [detail, setDetail] = useState<Detail | null>(null)
    const [detailBusy, setDetailBusy] = useState(false)
    const [detailError, setDetailError] = useState("")

    const sequence = useRef(0)
    const detailSequence = useRef(0)

    const load = useCallback(
        async (page: number, filters: Filters) => {
            const request = ++sequence.current

            setBusy(true)
            setError("")

            try {
                const query = new URLSearchParams({
                    page: String(page),
                    from: filters.from,
                    to: filters.to,
                    type:
                        filters.type === "all"
                            ? ""
                            : filters.type,
                })

                const response = await fetch(
                    `/api/admin/ai-history?${query}`,
                    {
                        cache: "no-store",
                    }
                )

                const body = await response.json()

                if (!response.ok) {
                    throw new Error(
                        body.error ||
                        "Não foi possível carregar o histórico."
                    )
                }

                if (request === sequence.current) {
                    setData(body)
                    setApplied(filters)
                }
            } catch (failure) {
                if (request === sequence.current) {
                    setError(
                        failure instanceof Error
                            ? failure.message
                            : "Falha ao consultar histórico."
                    )
                }
            } finally {
                if (request === sequence.current) {
                    setBusy(false)
                }
            }
        },
        []
    )

    useEffect(() => {
        void load(1, initialFilters)

        return () => {
            sequence.current++
            detailSequence.current++
        }
    }, [load])

    async function openResult(id: string) {
        const request = ++detailSequence.current

        setDialogOpen(true)
        setDetail(null)
        setDetailBusy(true)
        setDetailError("")

        try {
            const response = await fetch(
                `/api/admin/ai-history?resultId=${encodeURIComponent(id)}`,
                {
                    cache: "no-store",
                }
            )

            const body = await response.json()

            if (!response.ok) {
                throw new Error(
                    body.error || "Resultado indisponível."
                )
            }

            if (request === detailSequence.current) {
                setDetail(body.result)
            }
        } catch (failure) {
            if (request === detailSequence.current) {
                setDetailError(
                    failure instanceof Error
                        ? failure.message
                        : "Falha ao consultar resultado."
                )
            }
        } finally {
            if (request === detailSequence.current) {
                setDetailBusy(false)
            }
        }
    }

    const rows = data?.rows ?? []

    const known = rows.filter(
        row =>
            row.newValue?.usage?.estimatedCostUsd != null
    )

    const subtotal = known.reduce(
        (sum, row) =>
            sum + row.newValue!.usage!.estimatedCostUsd!,
        0
    )

    const reused = rows.filter(
        row => row.action === "AI_ANALYSIS_CACHED"
    ).length

    const pages = Math.max(
        1,
        Math.ceil(
            (data?.total ?? 0) /
            (data?.pageSize ?? 25)
        )
    )

    const metricValue = (value: string) =>
        !data ? "—" : value

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Histórico e consumo de IA
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Acompanhe solicitações, resultados salvos
                        e consumo das análises do sistema.
                    </p>
                </div>

                <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                        void load(data?.page ?? 1, applied)
                    }
                >
                    {busy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                    )}

                    Atualizar
                </Button>
            </div>

            <div
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                aria-busy={busy}
            >
                <Metric
                    title="Total filtrado"
                    value={metricValue(number(data?.total))}
                    hint="Solicitações finalizadas no filtro aplicado"
                    icon={Activity}
                />

                <Metric
                    title="Reutilizadas na página"
                    value={metricValue(number(reused))}
                    hint="Resultados consultados sem nova geração"
                    icon={History}
                />

                <Metric
                    title="Custo conhecido na página"
                    value={metricValue(
                        known.length
                            ? money(subtotal)
                            : "Não informado"
                    )}
                    hint="Estimativa em USD dos registros exibidos"
                    icon={Coins}
                />

                <Metric
                    title="Sem custo informado"
                    value={metricValue(
                        number(rows.length - known.length)
                    )}
                    hint="Registros desta página sem estimativa disponível"
                    icon={CircleAlert}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros
                    </CardTitle>

                    <CardDescription>
                        Selecione o período e o tipo de análise.
                        Os limites das datas utilizam UTC.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form
                        className="space-y-5"
                        onSubmit={event => {
                            event.preventDefault()
                            void load(1, draft)
                        }}
                    >
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="ai-from">
                                    Data inicial
                                </Label>

                                <Input
                                    id="ai-from"
                                    type="date"
                                    value={draft.from}
                                    max={draft.to || undefined}
                                    onChange={event =>
                                        setDraft({
                                            ...draft,
                                            from: event.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ai-to">
                                    Data final
                                </Label>

                                <Input
                                    id="ai-to"
                                    type="date"
                                    value={draft.to}
                                    min={draft.from || undefined}
                                    onChange={event =>
                                        setDraft({
                                            ...draft,
                                            to: event.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ai-type">
                                    Tipo de análise
                                </Label>

                                <Select
                                    value={draft.type}
                                    onValueChange={type =>
                                        setDraft({
                                            ...draft,
                                            type,
                                        })
                                    }
                                >
                                    <SelectTrigger
                                        id="ai-type"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="all">
                                            Todos os tipos
                                        </SelectItem>

                                        {Object.entries(types).map(
                                            ([value, label]) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="submit"
                                disabled={busy}
                            >
                                {busy ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Search className="mr-2 h-4 w-4" />
                                )}

                                Aplicar filtros
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                disabled={busy}
                                onClick={() => {
                                    setDraft(initialFilters)
                                    void load(1, initialFilters)
                                }}
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Limpar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
                >
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>
                            Solicitações de análise
                        </CardTitle>

                        <CardDescription className="mt-1">
                            O cache de entrada da OpenAI já está
                            incluído nos tokens de entrada.
                        </CardDescription>
                    </div>

                    <Badge variant="secondary">
                        {number(data?.total ?? 0)} registros
                    </Badge>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div
                        className="overflow-x-auto rounded-lg border"
                        aria-busy={busy}
                    >
                        <table className="w-full min-w-[1100px] text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    {[
                                        "Data e usuário",
                                        "Análise",
                                        "Status",
                                        "Modelo",
                                        "Tokens",
                                        "Duração",
                                        "Custo estimado",
                                        "Resultado",
                                    ].map(label => (
                                        <th
                                            key={label}
                                            className="px-4 py-3 text-left font-medium text-muted-foreground"
                                        >
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {busy ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-14 text-center text-muted-foreground"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Carregando solicitações…
                                            </div>
                                        </td>
                                    </tr>
                                ) : !rows.length ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-14 text-center"
                                        >
                                            <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                                            <p className="font-medium">
                                                Nenhuma solicitação encontrada
                                            </p>

                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Ajuste os filtros ou gere uma
                                                análise para iniciar o histórico.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map(row => {
                                        const value =
                                            row.newValue ?? {}

                                        const usage = value.usage

                                        const status =
                                            statuses[row.action] ?? {
                                                label: "Não identificado",
                                                color:
                                                    "bg-muted text-muted-foreground",
                                            }

                                        const date =
                                            new Date(row.createdAt)

                                        return (
                                            <tr
                                                key={row.id}
                                                className="border-t transition-colors hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-4">
                                                    <p className="whitespace-nowrap font-medium">
                                                        {date.toLocaleDateString(
                                                            "pt-BR"
                                                        )}{" "}

                                                        <span className="font-normal text-muted-foreground">
                                                            {date.toLocaleTimeString(
                                                                "pt-BR",
                                                                {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                }
                                                            )}
                                                        </span>
                                                    </p>

                                                    <p
                                                        className="mt-1 max-w-48 truncate text-xs text-muted-foreground"
                                                        title={
                                                            row.user.name ??
                                                            undefined
                                                        }
                                                    >
                                                        {row.user.name ||
                                                            "Usuário não informado"}
                                                    </p>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <p className="font-medium">
                                                        {types[row.entityType] ??
                                                            row.entityType}
                                                    </p>

                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {scopeLabel(value.scope)}
                                                    </p>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <Badge
                                                        variant="outline"
                                                        className={`whitespace-nowrap ${status.color}`}
                                                    >
                                                        {status.label}
                                                    </Badge>
                                                </td>

                                                <td className="px-4 py-4 text-xs">
                                                    {value.model ??
                                                        "Não informado"}
                                                </td>

                                                <td className="px-4 py-4 text-xs tabular-nums">
                                                    <div className="space-y-1 whitespace-nowrap">
                                                        <p>
                                                            <span className="text-muted-foreground">
                                                                Entrada{" "}
                                                            </span>
                                                            {number(
                                                                usage?.inputTokens
                                                            )}
                                                        </p>

                                                        <p>
                                                            <span className="text-muted-foreground">
                                                                Cache{" "}
                                                            </span>
                                                            {number(
                                                                usage?.cachedInputTokens
                                                            )}
                                                        </p>

                                                        <p>
                                                            <span className="text-muted-foreground">
                                                                Saída{" "}
                                                            </span>
                                                            {number(
                                                                usage?.outputTokens
                                                            )}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                                                    {value.durationMs == null
                                                        ? "—"
                                                        : `${(
                                                            value.durationMs /
                                                            1000
                                                        ).toLocaleString(
                                                            "pt-BR",
                                                            {
                                                                maximumFractionDigits: 1,
                                                            }
                                                        )} s`}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-4 font-medium tabular-nums">
                                                    {money(
                                                        usage?.estimatedCostUsd
                                                    )}
                                                </td>

                                                <td className="px-4 py-4">
                                                    {value.historyId ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                void openResult(
                                                                    value.historyId!
                                                                )
                                                            }
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Ver análise
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            Sem resultado salvo
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Página {data?.page ?? 1} de {pages}
                            {" · "}
                            {number(data?.total ?? 0)} registros
                        </p>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    busy ||
                                    !data ||
                                    data.page <= 1
                                }
                                onClick={() =>
                                    void load(
                                        (data?.page ?? 1) - 1,
                                        applied
                                    )
                                }
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Anterior
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    busy ||
                                    !data ||
                                    data.page >= pages
                                }
                                onClick={() =>
                                    void load(
                                        (data?.page ?? 1) + 1,
                                        applied
                                    )
                                }
                            >
                                Próxima
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Os valores são estimativas, não substituem
                        o faturamento da OpenAI. Registros sem
                        medição permanecem como “Não informado”.
                    </p>
                </CardContent>
            </Card>

            <Dialog
                open={dialogOpen}
                onOpenChange={open => {
                    setDialogOpen(open)

                    if (!open) {
                        detailSequence.current++
                    }
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Análise salva
                        </DialogTitle>

                        <DialogDescription>
                            {detail
                                ? `Gerada em ${new Date(
                                    detail.createdAt
                                ).toLocaleString(
                                    "pt-BR"
                                )}. Retrato dos dados daquela solicitação.`
                                : "Consulte o resultado e as referências da análise."}
                        </DialogDescription>
                    </DialogHeader>

                    {detailBusy ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Carregando resultado…
                        </div>
                    ) : detailError ? (
                        <p
                            role="alert"
                            className="text-sm text-destructive"
                        >
                            {detailError}
                        </p>
                    ) : detail && (
                        <div className="space-y-6">
                            <div className="rounded-lg border bg-muted/30 p-4">
                                <h3 className="mb-2 text-sm font-semibold">
                                    Resumo executivo
                                </h3>

                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {detail.newValue.analysis.summary}
                                </p>
                            </div>

                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold">
                                    Recomendações
                                </h3>

                                {!detail.newValue.analysis.priorities.length && (
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma recomendação registrada
                                        nesta análise.
                                    </p>
                                )}

                                <ol className="space-y-3">
                                    {detail.newValue.analysis.priorities.map(
                                        (priority, index) => (
                                            <li
                                                key={index}
                                                className="rounded-lg border p-4"
                                            >
                                                <div className="flex gap-3">
                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                                        {index + 1}
                                                    </span>

                                                    <div className="min-w-0 space-y-3">
                                                        <p className="text-sm leading-relaxed">
                                                            {priority.action}
                                                        </p>

                                                        <div className="flex flex-wrap gap-2">
                                                            {priority.evidenceIds.map(
                                                                id => {
                                                                    const source =
                                                                        detail.newValue.evidence.find(
                                                                            item =>
                                                                                item.id === id
                                                                        )

                                                                    return source?.href ? (
                                                                        <Link
                                                                            key={id}
                                                                            href={source.href}
                                                                            className="rounded-md border px-2 py-1 text-xs text-primary underline-offset-4 hover:bg-muted hover:underline"
                                                                        >
                                                                            {source.label}
                                                                        </Link>
                                                                    ) : (
                                                                        <Badge
                                                                            key={id}
                                                                            variant="secondary"
                                                                        >
                                                                            {source?.label ?? id}
                                                                        </Badge>
                                                                    )
                                                                }
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        )
                                    )}
                                </ol>
                            </section>

                            <section className="rounded-lg bg-muted/50 p-4">
                                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                    <CircleAlert className="h-4 w-4" />
                                    Limitações da análise
                                </h3>

                                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                                    {detail.newValue.analysis.limitations.map(
                                        (text, index) => (
                                            <li key={index}>{text}</li>
                                        )
                                    )}
                                </ul>
                            </section>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}