"use client"

import { useEffect, useState } from "react"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"

import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

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
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    Loader2,
    Play,
    RefreshCcw,
    Save,
} from "lucide-react"

import { toast } from "sonner"

type SnapshotWeekday =
    | "SUNDAY"
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"

type WeeklySnapshotConfig = {
    id: string
    name: string
    isEnabled: boolean
    weekday: SnapshotWeekday
    hour: number
    minute: number
    timezone: string
    allowManualRun: boolean
    overwriteCurrentWeek: boolean
    lastRunAt: string | null
    lastRunWeek: number | null
    lastRunYear: number | null
    createdAt: string
    updatedAt: string
    createdBy: {
        id: string
        name: string
        email: string
    } | null
    updatedBy: {
        id: string
        name: string
        email: string
    } | null
}

type SnapshotGenerateResponse = {
    message: string
    comparisonMessage?: string
    comparison?: {
        hasPreviousWeekState: boolean
        previousWeek: number
        previousYear: number
        risksImprovedThisWeek: number
        risksWorsenedThisWeek: number
    }
    week: number
    month: number
    year: number
    weekStartDate: string
    weekEndDate: string
    overwritten: boolean
    eventsCreated: number
    riskAnalystsProcessed: number
    logisticsUsersProcessed: number
}

const weekdayLabels: Record<SnapshotWeekday, string> = {
    SUNDAY: "Domingo",
    MONDAY: "Segunda-feira",
    TUESDAY: "Terça-feira",
    WEDNESDAY: "Quarta-feira",
    THURSDAY: "Quinta-feira",
    FRIDAY: "Sexta-feira",
    SATURDAY: "Sábado",
}

const timezones = [
    "America/Sao_Paulo",
    "America/Manaus",
    "America/Cuiaba",
    "America/Rio_Branco",
    "UTC",
]

function formatDateTime(value?: string | null) {
    if (!value) return "-"

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return "-"
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date)
}

function formatDate(value?: string | null) {
    if (!value) return "-"

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return "-"
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date)
}

function formatHourMinute(hour: number, minute: number) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function normalizeGenerateResponse(data: any): SnapshotGenerateResponse {
    const snapshot = data?.snapshot || {}

    return {
        message:
            data?.message ||
            "Snapshot semanal gerado com sucesso",

        comparisonMessage:
            data?.comparisonMessage || undefined,

        comparison:
            data?.comparison || undefined,

        week: Number(data?.week ?? snapshot?.week ?? 0),

        month: Number(data?.month ?? snapshot?.month ?? 0),

        year: Number(data?.year ?? snapshot?.year ?? 0),

        weekStartDate:
            data?.weekStartDate ||
            snapshot?.weekStartDate ||
            "",

        weekEndDate:
            data?.weekEndDate ||
            snapshot?.weekEndDate ||
            "",

        overwritten: Boolean(data?.overwritten ?? true),

        eventsCreated: Number(data?.eventsCreated ?? 0),

        riskAnalystsProcessed: Number(
            data?.riskAnalystsProcessed ?? 0
        ),

        logisticsUsersProcessed: Number(
            data?.logisticsUsersProcessed ?? 0
        ),
    }
}

function LastGeneratedCard({
    lastGenerated,
}: {
    lastGenerated: SnapshotGenerateResponse
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Último snapshot gerado
                </CardTitle>

                <CardDescription>
                    Resultado da execução manual mais recente.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                            Semana
                        </p>

                        <p className="mt-1 font-medium">
                            {lastGenerated.week && lastGenerated.year
                                ? `CW${lastGenerated.week} / ${lastGenerated.year}`
                                : "Semana não informada"}
                        </p>

                        <p className="text-xs text-muted-foreground">
                            {formatDate(lastGenerated.weekStartDate)} até{" "}
                            {formatDate(lastGenerated.weekEndDate)}
                        </p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                            Eventos criados
                        </p>

                        <p className="mt-1 text-2xl font-bold">
                            {lastGenerated.eventsCreated}
                        </p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                            Analistas processados
                        </p>

                        <p className="mt-1 text-2xl font-bold">
                            {lastGenerated.riskAnalystsProcessed}
                        </p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                            Logística processada
                        </p>

                        <p className="mt-1 text-2xl font-bold">
                            {lastGenerated.logisticsUsersProcessed}
                        </p>
                    </div>
                </div>

                {lastGenerated.comparisonMessage && (
                    <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-sm">
                        <p className="font-medium">
                            Comparação com semana anterior
                        </p>

                        <p className="mt-1 text-muted-foreground">
                            {lastGenerated.comparisonMessage}
                        </p>
                    </div>
                )}

                {lastGenerated.overwritten && (
                    <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                        Se já existia snapshot para esta semana, os dados foram sobrescritos.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function WeeklySnapshotSettingsPage() {
    const [config, setConfig] =
        useState<WeeklySnapshotConfig | null>(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [generating, setGenerating] = useState(false)

    const [lastGenerated, setLastGenerated] =
        useState<SnapshotGenerateResponse | null>(null)

    useEffect(() => {
        loadConfig()
    }, [])

    async function loadConfig() {
        try {
            setLoading(true)

            const res = await fetch(
                "/api/weekly-snapshots/config",
                {
                    credentials: "include",
                }
            )

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error ||
                        "Erro ao buscar configuração de snapshot"
                )
            }

            setConfig(data)
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao buscar configuração de snapshot"
            )
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        if (!config) return

        if (config.hour < 0 || config.hour > 23) {
            toast.error("A hora deve estar entre 0 e 23.")
            return
        }

        if (config.minute < 0 || config.minute > 59) {
            toast.error("O minuto deve estar entre 0 e 59.")
            return
        }

        try {
            setSaving(true)

            const res = await fetch(
                "/api/weekly-snapshots/config",
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: config.name,
                        isEnabled: config.isEnabled,
                        weekday: config.weekday,
                        hour: config.hour,
                        minute: config.minute,
                        timezone: config.timezone,
                        allowManualRun: config.allowManualRun,
                        overwriteCurrentWeek:
                            config.overwriteCurrentWeek,
                    }),
                }
            )

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error ||
                        "Erro ao salvar configuração de snapshot"
                )
            }

            setConfig(data)

            toast.success("Configuração salva com sucesso")
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao salvar configuração de snapshot"
            )
        } finally {
            setSaving(false)
        }
    }

    async function handleGenerateNow() {
        if (!config) return

        if (!config.allowManualRun) {
            toast.error("A execução manual está desabilitada.")
            return
        }

        const confirmed = window.confirm(
            "Deseja gerar o snapshot desta semana agora? Se já existir snapshot para esta semana, os dados serão sobrescritos."
        )

        if (!confirmed) return

        try {
            setGenerating(true)

            const res = await fetch(
                "/api/weekly-snapshots/generate",
                {
                    method: "POST",
                    credentials: "include",
                }
            )

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error ||
                        "Erro ao gerar snapshot semanal"
                )
            }

            setLastGenerated(normalizeGenerateResponse(data))

            toast.success("Snapshot semanal gerado com sucesso")

            await loadConfig()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao gerar snapshot semanal"
            )
        } finally {
            setGenerating(false)
        }
    }

    function updateConfig<K extends keyof WeeklySnapshotConfig>(
        key: K,
        value: WeeklySnapshotConfig[K]
    ) {
        setConfig((current) => {
            if (!current) return current

            return {
                ...current,
                [key]: value,
            }
        })
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!config) {
        return (
            <div className="flex h-screen items-center justify-center p-4 text-center">
                Não foi possível carregar a configuração de snapshot.
            </div>
        )
    }

    return (
        <ProtectedRoute permission="RISK_CREATE">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 p-4 md:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold">
                                    Configuração de Snapshot Semanal
                                </h1>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Defina quando o sistema deve capturar o histórico semanal das RMs, analistas de Risk e logística.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={loadConfig}
                                    disabled={loading || saving || generating}
                                >
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Recarregar
                                </Button>

                                <Button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving || generating}
                                >
                                    {saving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Salvar
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-3">
                            <Card className="xl:col-span-2">
                                <CardHeader>
                                    <CardTitle>
                                        Agendamento automático
                                    </CardTitle>

                                    <CardDescription>
                                        Configure o dia da semana e o horário em que o snapshot deve ser executado automaticamente.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>
                                                Nome da configuração
                                            </Label>

                                            <Input
                                                value={config.name}
                                                onChange={(e) =>
                                                    updateConfig(
                                                        "name",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Configuração padrão"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>
                                                Timezone
                                            </Label>

                                            <Select
                                                value={config.timezone}
                                                onValueChange={(value) =>
                                                    updateConfig(
                                                        "timezone",
                                                        value
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Timezone" />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    {timezones.map((timezone) => (
                                                        <SelectItem
                                                            key={timezone}
                                                            value={timezone}
                                                        >
                                                            {timezone}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label>
                                                Dia da semana
                                            </Label>

                                            <Select
                                                value={config.weekday}
                                                onValueChange={(value) =>
                                                    updateConfig(
                                                        "weekday",
                                                        value as SnapshotWeekday
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Dia da semana" />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    {Object.entries(
                                                        weekdayLabels
                                                    ).map(([value, label]) => (
                                                        <SelectItem
                                                            key={value}
                                                            value={value}
                                                        >
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>
                                                Hora
                                            </Label>

                                            <Input
                                                type="number"
                                                min={0}
                                                max={23}
                                                value={config.hour}
                                                onChange={(e) =>
                                                    updateConfig(
                                                        "hour",
                                                        Number(e.target.value)
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>
                                                Minuto
                                            </Label>

                                            <Input
                                                type="number"
                                                min={0}
                                                max={59}
                                                value={config.minute}
                                                onChange={(e) =>
                                                    updateConfig(
                                                        "minute",
                                                        Number(e.target.value)
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="rounded-lg border p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-medium">
                                                        Snapshot automático
                                                    </p>

                                                    <p className="text-sm text-muted-foreground">
                                                        Habilita a execução automática no horário configurado.
                                                    </p>
                                                </div>

                                                <Switch
                                                    checked={config.isEnabled}
                                                    onCheckedChange={(checked) =>
                                                        updateConfig(
                                                            "isEnabled",
                                                            checked
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-lg border p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-medium">
                                                        Execução manual
                                                    </p>

                                                    <p className="text-sm text-muted-foreground">
                                                        Permite disparar o snapshot pelo botão.
                                                    </p>
                                                </div>

                                                <Switch
                                                    checked={config.allowManualRun}
                                                    onCheckedChange={(checked) =>
                                                        updateConfig(
                                                            "allowManualRun",
                                                            checked
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-lg border p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-medium">
                                                        Sobrescrever semana
                                                    </p>

                                                    <p className="text-sm text-muted-foreground">
                                                        Se já existir snapshot da semana, atualiza os dados.
                                                    </p>
                                                </div>

                                                <Switch
                                                    checked={
                                                        config.overwriteCurrentWeek
                                                    }
                                                    onCheckedChange={(checked) =>
                                                        updateConfig(
                                                            "overwriteCurrentWeek",
                                                            checked
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CalendarClock className="h-5 w-5" />
                                        Status
                                    </CardTitle>

                                    <CardDescription>
                                        Informações da última execução e próxima configuração.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="rounded-lg border p-4">
                                        <p className="text-sm text-muted-foreground">
                                            Status do agendamento
                                        </p>

                                        <div className="mt-2">
                                            {config.isEnabled ? (
                                                <Badge className="bg-green-600">
                                                    Ativo
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    Desativado
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border p-4">
                                        <p className="text-sm text-muted-foreground">
                                            Execução configurada
                                        </p>

                                        <p className="mt-1 font-medium">
                                            {weekdayLabels[config.weekday]} às{" "}
                                            {formatHourMinute(
                                                config.hour,
                                                config.minute
                                            )}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {config.timezone}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border p-4">
                                        <p className="text-sm text-muted-foreground">
                                            Última execução
                                        </p>

                                        <p className="mt-1 font-medium">
                                            {formatDateTime(config.lastRunAt)}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {config.lastRunWeek && config.lastRunYear
                                                ? `CW${config.lastRunWeek} / ${config.lastRunYear}`
                                                : "Ainda não executado"}
                                        </p>
                                    </div>

                                    <Button
                                        type="button"
                                        className="w-full"
                                        onClick={handleGenerateNow}
                                        disabled={
                                            generating ||
                                            saving ||
                                            !config.allowManualRun
                                        }
                                    >
                                        {generating ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Play className="mr-2 h-4 w-4" />
                                        )}
                                        Gerar snapshot agora
                                    </Button>

                                    {!config.allowManualRun && (
                                        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
                                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />

                                            <p>
                                                A execução manual está desabilitada nesta configuração.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {lastGenerated ? (
                            <LastGeneratedCard
                                lastGenerated={lastGenerated}
                            />
                        ) : null}
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}