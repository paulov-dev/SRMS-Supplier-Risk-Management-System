"use client"

import { useEffect, useMemo, useState } from "react"

import Link from "next/link"

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

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    XAxis,
    YAxis,
} from "recharts"

import {
    AlertTriangle,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    Clock,
    Loader2,
    PackageCheck,
    Radio,
    RefreshCcw,
    ShieldAlert,
    TrendingDown,
    TrendingUp,
    Truck,
    Users,
} from "lucide-react"

type WeeklySnapshot = {
    id: string

    week: number
    month: number
    year: number

    weekStartDate: string
    weekEndDate: string
    snapshotDate: string

    totalRisks: number
    openRisks: number
    closedRisks: number
    canceledRisks: number

    redRisks: number
    yellowRisks: number
    greenRisks: number
    orangeRisks: number
    greyRisks: number
    blueRisks: number

    totalParts: number
    redParts: number
    yellowParts: number
    greenParts: number
    orangeParts: number
    greyParts: number
    blueParts: number

    totalActionPlans: number
    openActionPlans: number
    inProgressActionPlans: number
    waitingValidationActionPlans: number
    completedActionPlans: number
    canceledActionPlans: number
    overdueActionPlans: number

    totalLogisticsRequests: number
    pendingLogisticsRequests: number
    inReviewLogisticsRequests: number
    approvedLogisticsRequests: number
    rejectedLogisticsRequests: number
    canceledLogisticsRequests: number

    risksCreatedThisWeek: number
    risksClosedThisWeek: number
    risksCanceledThisWeek: number
    risksReopenedThisWeek: number

    risksImprovedThisWeek: number
    risksWorsenedThisWeek: number

    summary?: any

    createdAt: string
    updatedAt: string
}

type UserSummary = {
    id: string
    name: string
    email: string
    photoUrl?: string | null
} | null

type RiskAnalystSnapshot = {
    id: string

    userId: string
    user: UserSummary

    week: number
    month: number
    year: number

    assignedRisks: number
    openRisks: number
    closedRisks: number
    canceledRisks: number

    redRisks: number
    yellowRisks: number
    greenRisks: number
    orangeRisks: number
    greyRisks: number
    blueRisks: number

    risksCreatedThisWeek: number
    risksAssignedThisWeek: number
    risksClosedThisWeek: number
    risksCanceledThisWeek: number
    risksReopenedThisWeek: number

    risksImprovedThisWeek: number
    risksWorsenedThisWeek: number

    actionPlansTotal: number
    actionPlansOpen: number
    actionPlansOverdue: number
    actionPlansWaitingValidation: number

    oldestOpenRiskDays: number | null
    avgResolutionDays: number | null

    summary?: any
}

type LogisticsSnapshot = {
    id: string

    userId: string
    user: UserSummary

    week: number
    month: number
    year: number

    assignedRequests: number
    pendingRequests: number
    inReviewRequests: number
    approvedRequests: number
    rejectedRequests: number
    canceledRequests: number

    requestsReceivedThisWeek: number
    requestsAcceptedThisWeek: number
    requestsApprovedThisWeek: number
    requestsRejectedThisWeek: number
    requestsCanceledThisWeek: number

    partsUnderLogisticsReview: number
    partsApprovedThisWeek: number

    oldestPendingRequestDays: number | null
    avgReviewDays: number | null

    summary?: any
}

type WeeklyEvent = {
    id: string

    week: number
    month: number
    year: number

    eventType: string

    riskEventId: string | null
    riskEvent: {
        id: string
        code: string | null
        title: string
    } | null

    userId: string | null
    user: UserSummary

    oldValue: string | null
    newValue: string | null
    description: string | null

    createdAt: string
}

type CurrentRiskTeamAnalyst = {
    user: {
        id: string
        name: string
        email: string
        photoUrl?: string | null
    }

    risks: {
        open: number
        red: number
        yellow: number
        green: number
        orange: number
        grey: number
        blue: number
    }

    parts: {
        total: number
        red: number
        yellow: number
        green: number
        orange: number
        grey: number
        blue: number
        withoutDemand: number
        completed: number
    }
}

type TeamCurrentState = {
    generatedAt: string
    analysts: CurrentRiskTeamAnalyst[]
}

type WeeklySnapshotsResponse = {
    filters: {
        year: number
        month: number | null
        week: number | null
        availableYears: number[]
        availableMonths: number[]
        availableWeeks: number[]
    }
    snapshots: WeeklySnapshot[]
    riskAnalystSnapshots: RiskAnalystSnapshot[]
    logisticsSnapshots: LogisticsSnapshot[]
    events: WeeklyEvent[]
    teamCurrentState?: TeamCurrentState
}

const COLORS = {
    blue: "#2563eb",
    red: "#dc2626",
    yellow: "#f59e0b",
    green: "#16a34a",
    orange: "#f97316",
    purple: "#7c3aed",
    cyan: "#06b6d4",
    slate: "#64748b",
}

const chartConfig = {
    openRisks: {
        label: "RMs abertas",
        color: COLORS.blue,
    },
    redRisks: {
        label: "RMs Red",
        color: COLORS.red,
    },
    yellowRisks: {
        label: "RMs Yellow",
        color: COLORS.yellow,
    },
    greenRisks: {
        label: "RMs Green",
        color: COLORS.green,
    },
    created: {
        label: "Criadas",
        color: COLORS.blue,
    },
    closed: {
        label: "Fechadas",
        color: COLORS.green,
    },
    worsened: {
        label: "Pioraram",
        color: COLORS.red,
    },
    improved: {
        label: "Melhoraram",
        color: COLORS.green,
    },
    total: {
        label: "Total",
        color: COLORS.blue,
    },
} satisfies ChartConfig

function formatDate(value?: string | null) {
    if (!value) return "-"

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return "-"

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date)
}

function formatDateTime(value?: string | null) {
    if (!value) return "-"

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return "-"

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date)
}

function formatNumber(value?: number | null) {
    if (value === null || value === undefined) return "-"

    return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 1,
    }).format(value)
}

function getMonthLabel(month: number) {
    const date = new Date(2026, month - 1, 1)

    return new Intl.DateTimeFormat("pt-BR", {
        month: "long",
    }).format(date)
}

function getEventBadge(type: string) {
    switch (type) {
        case "RISK_CREATED":
            return (
                <Badge className="bg-blue-600">
                    RM criada
                </Badge>
            )

        case "RISK_CLOSED":
            return (
                <Badge className="bg-green-600">
                    RM fechada
                </Badge>
            )

        case "RISK_CANCELED":
            return (
                <Badge variant="secondary">
                    RM cancelada
                </Badge>
            )

        case "RISK_LEVEL_WORSENED":
            return (
                <Badge variant="destructive">
                    Piorou
                </Badge>
            )

        case "RISK_LEVEL_IMPROVED":
            return (
                <Badge className="bg-green-600">
                    Melhorou
                </Badge>
            )

        case "RISK_ASSIGNED":
            return (
                <Badge className="bg-purple-600">
                    Atribuição
                </Badge>
            )

        default:
            return (
                <Badge variant="outline">
                    {type}
                </Badge>
            )
    }
}

function EmptyState({
    message,
}: {
    message: string
}) {
    return (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {message}
        </div>
    )
}

function MetricCard({
    title,
    value,
    description,
    icon,
}: {
    title: string
    value: number
    description: string
    icon: React.ReactNode
}) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm text-muted-foreground">
                            {title}
                        </p>

                        <p className="mt-1 text-2xl font-bold">
                            {value}
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {description}
                        </p>
                    </div>

                    <div className="shrink-0 rounded-lg bg-muted p-2 text-muted-foreground">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ResponsiveTableWrapper({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {children}
        </div>
    )
}

function WeeklyEvolutionChart({
    snapshots,
}: {
    snapshots: WeeklySnapshot[]
}) {
    const data = snapshots
        .slice()
        .sort((a, b) => a.week - b.week)
        .map((snapshot) => ({
            label: `CW${snapshot.week}`,
            openRisks: snapshot.openRisks,
            redRisks: snapshot.redRisks,
            yellowRisks: snapshot.yellowRisks,
            greenRisks: snapshot.greenRisks,
        }))

    if (data.length === 0) {
        return (
            <EmptyState message="Nenhum snapshot encontrado para montar o gráfico." />
        )
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="h-[280px] w-full"
        >
            <AreaChart
                data={data}
                margin={{
                    left: -12,
                    right: 12,
                    top: 10,
                    bottom: 0,
                }}
            >
                <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    className="stroke-muted"
                />

                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                />

                <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    fontSize={11}
                    width={28}
                />

                <ChartTooltip
                    content={<ChartTooltipContent />}
                />

                <Area
                    type="monotone"
                    dataKey="openRisks"
                    stroke={COLORS.blue}
                    fill={COLORS.blue}
                    fillOpacity={0.18}
                    strokeWidth={2}
                />

                <Area
                    type="monotone"
                    dataKey="redRisks"
                    stroke={COLORS.red}
                    fill={COLORS.red}
                    fillOpacity={0.16}
                    strokeWidth={2}
                />

                <Area
                    type="monotone"
                    dataKey="yellowRisks"
                    stroke={COLORS.yellow}
                    fill={COLORS.yellow}
                    fillOpacity={0.12}
                    strokeWidth={2}
                />
            </AreaChart>
        </ChartContainer>
    )
}

function CreatedClosedChart({
    snapshots,
}: {
    snapshots: WeeklySnapshot[]
}) {
    const data = snapshots
        .slice()
        .sort((a, b) => a.week - b.week)
        .map((snapshot) => ({
            label: `CW${snapshot.week}`,
            created: snapshot.risksCreatedThisWeek,
            closed: snapshot.risksClosedThisWeek,
        }))

    if (data.length === 0) {
        return (
            <EmptyState message="Nenhum dado encontrado." />
        )
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="h-[260px] w-full"
        >
            <BarChart
                data={data}
                margin={{
                    left: -12,
                    right: 12,
                    top: 10,
                    bottom: 0,
                }}
            >
                <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    className="stroke-muted"
                />

                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                />

                <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    fontSize={11}
                    width={28}
                />

                <ChartTooltip
                    content={<ChartTooltipContent />}
                />

                <Bar
                    dataKey="created"
                    fill={COLORS.blue}
                    radius={[6, 6, 0, 0]}
                />

                <Bar
                    dataKey="closed"
                    fill={COLORS.green}
                    radius={[6, 6, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    )
}

function ImprovedWorsenedChart({
    snapshots,
}: {
    snapshots: WeeklySnapshot[]
}) {
    const data = snapshots
        .slice()
        .sort((a, b) => a.week - b.week)
        .map((snapshot) => ({
            label: `CW${snapshot.week}`,
            improved: snapshot.risksImprovedThisWeek,
            worsened: snapshot.risksWorsenedThisWeek,
        }))

    if (data.length === 0) {
        return (
            <EmptyState message="Nenhum dado encontrado." />
        )
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="h-[260px] w-full"
        >
            <BarChart
                data={data}
                margin={{
                    left: -12,
                    right: 12,
                    top: 10,
                    bottom: 0,
                }}
            >
                <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    className="stroke-muted"
                />

                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                />

                <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    fontSize={11}
                    width={28}
                />

                <ChartTooltip
                    content={<ChartTooltipContent />}
                />

                <Bar
                    dataKey="improved"
                    fill={COLORS.green}
                    radius={[6, 6, 0, 0]}
                />

                <Bar
                    dataKey="worsened"
                    fill={COLORS.red}
                    radius={[6, 6, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    )
}

function RiskDistributionChart({
    snapshot,
}: {
    snapshot?: WeeklySnapshot
}) {
    if (!snapshot) {
        return (
            <EmptyState message="Nenhum snapshot selecionado." />
        )
    }

    const data = [
        {
            name: "Red",
            total: snapshot.redRisks,
            color: COLORS.red,
        },
        {
            name: "Yellow",
            total: snapshot.yellowRisks,
            color: COLORS.yellow,
        },
        {
            name: "Green",
            total: snapshot.greenRisks,
            color: COLORS.green,
        },
        {
            name: "Orange",
            total: snapshot.orangeRisks,
            color: COLORS.orange,
        },
        {
            name: "Grey",
            total: snapshot.greyRisks,
            color: COLORS.slate,
        },
        {
            name: "Blue",
            total: snapshot.blueRisks,
            color: COLORS.blue,
        },
    ].filter((item) => item.total > 0)

    if (data.length === 0) {
        return (
            <EmptyState message="Não há RMs para exibir neste snapshot." />
        )
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="h-[260px] w-full"
        >
            <PieChart>
                <ChartTooltip
                    content={<ChartTooltipContent hideLabel />}
                />

                <Pie
                    data={data}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    strokeWidth={1}
                >
                    {data.map((item) => (
                        <Cell
                            key={item.name}
                            fill={item.color}
                        />
                    ))}
                </Pie>
            </PieChart>
        </ChartContainer>
    )
}

function getDelta(current?: number | null, previous?: number | null) {
    const currentValue = current || 0
    const previousValue = previous || 0

    return currentValue - previousValue
}

function DeltaBadge({
    value,
    inverse = false,
}: {
    value: number
    inverse?: boolean
}) {
    if (value === 0) {
        return (
            <Badge variant="outline">
                0
            </Badge>
        )
    }

    const isPositive = value > 0

    const isGood = inverse ? !isPositive : isPositive

    return (
        <Badge
            className={
                isGood
                    ? "bg-green-600"
                    : "bg-red-600"
            }
        >
            {isPositive ? "+" : ""}
            {value}
        </Badge>
    )
}

function getSummaryItems(snapshot: WeeklySnapshot | undefined, key: string) {
    if (!snapshot?.summary) return []

    const value = snapshot.summary[key]

    if (!Array.isArray(value)) return []

    return value
}

function formatRiskLevelLabel(value?: string | null) {
    switch (value) {
        case "RED":
            return "Vermelho"
        case "YELLOW":
            return "Amarelo"
        case "GREEN":
            return "Verde"
        case "ORANGE":
            return "Laranja"
        case "GREY":
            return "Cinza"
        case "BLUE":
            return "Azul"
        default:
            return value || "-"
    }
}

function WeeklyChangeList({
    title,
    items,
    emptyMessage,
    variant = "default",
    showStatusChange = false,
}: {
    title: string
    items: any[]
    emptyMessage: string
    variant?: "default" | "success" | "danger" | "warning"
    showStatusChange?: boolean
}) {
    const badgeClassName =
        variant === "success"
            ? "bg-green-600"
            : variant === "danger"
                ? "bg-red-600"
                : variant === "warning"
                    ? "bg-yellow-500 text-black"
                    : "bg-blue-600"

    return (
        <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="font-medium">
                    {title}
                </h4>

                <Badge className={badgeClassName}>
                    {items.length}
                </Badge>
            </div>

            {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {emptyMessage}
                </p>
            ) : (
                <div className="space-y-2">
                    {items.map((item, index) => {
                        const rmLabel =
                            item.code ||
                            item.riskCode ||
                            item.description?.split(" ")[0] ||
                            "RM sem código"

                        return (
                            <div
                                key={`${item.id || item.riskEventId || index}`}
                                className="rounded-md bg-muted/40 p-3"
                            >
                                <div className="flex flex-col gap-1">
                                    {item.id || item.riskEventId ? (
                                        <Link
                                            href={`/rms/${item.id || item.riskEventId}`}
                                            className="text-sm font-medium text-primary hover:underline"
                                        >
                                            {rmLabel}
                                        </Link>
                                    ) : (
                                        <p className="text-sm font-medium">
                                            {rmLabel}
                                        </p>
                                    )}

                                    {item.title && (
                                        <p className="line-clamp-2 text-xs text-muted-foreground">
                                            {item.title}
                                        </p>
                                    )}

                                    {showStatusChange &&
                                        (item.oldValue || item.newValue) && (
                                            <p className="text-xs font-medium">
                                                Mudou de{" "}
                                                <span className="text-muted-foreground">
                                                    {formatRiskLevelLabel(item.oldValue)}
                                                </span>{" "}
                                                para{" "}
                                                <span className="text-muted-foreground">
                                                    {formatRiskLevelLabel(item.newValue)}
                                                </span>
                                            </p>
                                        )}

                                    {!showStatusChange &&
                                        (item.oldValue || item.newValue) && (
                                            <p className="text-xs text-muted-foreground">
                                                {formatRiskLevelLabel(item.oldValue)} →{" "}
                                                {formatRiskLevelLabel(item.newValue)}
                                            </p>
                                        )}

                                    {item.description && (
                                        <p className="line-clamp-2 text-xs text-muted-foreground">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function WeeklyChangesDetails({
    current,
}: {
    current?: WeeklySnapshot
}) {
    const createdRisks = getSummaryItems(current, "createdRisks")
    const closedRisks = getSummaryItems(current, "closedRisks")
    const canceledRisks = getSummaryItems(current, "canceledRisks")
    const improvedRisks = getSummaryItems(current, "improvedRisks")
    const worsenedRisks = getSummaryItems(current, "worsenedRisks")

    if (!current) return null

    const totalChanges =
        createdRisks.length +
        closedRisks.length +
        canceledRisks.length +
        improvedRisks.length +
        worsenedRisks.length

    return (
        <details className="mt-6 rounded-lg border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 hover:bg-muted/40">
                <div>
                    <h3 className="text-base font-semibold">
                        Mudanças da CW{current.week} / {current.year}
                    </h3>

                    <p className="text-sm text-muted-foreground">
                        Clique para visualizar inclusões, saídas e alterações de farol da semana.
                    </p>
                </div>

                <Badge variant="secondary">
                    {totalChanges} alterações
                </Badge>
            </summary>

            <div className="border-t p-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <WeeklyChangeList
                        title="RMs incluídas"
                        items={createdRisks}
                        emptyMessage="Nenhuma RM incluída nesta semana."
                        variant="default"
                    />

                    <WeeklyChangeList
                        title="RMs fechadas"
                        items={closedRisks}
                        emptyMessage="Nenhuma RM fechada nesta semana."
                        variant="success"
                    />

                    <WeeklyChangeList
                        title="RMs canceladas"
                        items={canceledRisks}
                        emptyMessage="Nenhuma RM cancelada nesta semana."
                        variant="warning"
                    />

                    <WeeklyChangeList
                        title="RMs que melhoraram"
                        items={improvedRisks}
                        emptyMessage="Nenhuma RM melhorou de farol nesta semana."
                        variant="success"
                        showStatusChange
                    />

                    <WeeklyChangeList
                        title="RMs que pioraram"
                        items={worsenedRisks}
                        emptyMessage="Nenhuma RM piorou de farol nesta semana."
                        variant="danger"
                        showStatusChange
                    />
                </div>
            </div>
        </details>
    )
}

function WeeklyComparisonCard({
    current,
    previous,
}: {
    current?: WeeklySnapshot
    previous?: WeeklySnapshot
}) {
    if (!current) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>
                        Comparativo semanal
                    </CardTitle>

                    <CardDescription>
                        Compare a semana selecionada com a semana anterior.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <EmptyState message="Nenhum snapshot disponível para comparação." />
                </CardContent>
            </Card>
        )
    }

    if (!previous) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>
                        Comparativo semanal
                    </CardTitle>

                    <CardDescription>
                        Compare a semana selecionada com a semana anterior.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <EmptyState message="Existe snapshot para a semana atual, mas não foi encontrado snapshot da semana anterior." />
                </CardContent>
            </Card>
        )
    }

    const rows = [
        {
            label: "Total de RMs",
            current: current.totalRisks,
            previous: previous.totalRisks,
            inverse: false,
        },
        {
            label: "RMs abertas",
            current: current.openRisks,
            previous: previous.openRisks,
            inverse: true,
        },
        {
            label: "RMs fechadas",
            current: current.closedRisks,
            previous: previous.closedRisks,
            inverse: false,
        },
        {
            label: "RMs Red",
            current: current.redRisks,
            previous: previous.redRisks,
            inverse: true,
        },
        {
            label: "RMs Yellow",
            current: current.yellowRisks,
            previous: previous.yellowRisks,
            inverse: true,
        },
        {
            label: "RMs Green",
            current: current.greenRisks,
            previous: previous.greenRisks,
            inverse: false,
        },
        {
            label: "RMs criadas na semana",
            current: current.risksCreatedThisWeek,
            previous: previous.risksCreatedThisWeek,
            inverse: true,
        },
        {
            label: "RMs fechadas na semana",
            current: current.risksClosedThisWeek,
            previous: previous.risksClosedThisWeek,
            inverse: false,
        },
        {
            label: "RMs que melhoraram",
            current: current.risksImprovedThisWeek,
            previous: previous.risksImprovedThisWeek,
            inverse: false,
        },
        {
            label: "RMs que pioraram",
            current: current.risksWorsenedThisWeek,
            previous: previous.risksWorsenedThisWeek,
            inverse: true,
        },
        {
            label: "Planos atrasados",
            current: current.overdueActionPlans,
            previous: previous.overdueActionPlans,
            inverse: true,
        },
        {
            label: "Logística pendente",
            current: current.pendingLogisticsRequests,
            previous: previous.pendingLogisticsRequests,
            inverse: true,
        },
    ]

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                        <CardTitle>
                            Comparativo semanal
                        </CardTitle>

                        <CardDescription>
                            Semana atual comparada com a semana anterior.
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                            Atual: CW{current.week} / {current.year}
                        </Badge>

                        <Badge variant="secondary">
                            Anterior: CW{previous.week} / {previous.year}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <ResponsiveTableWrapper>
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Indicador</TableHead>
                                <TableHead className="text-right">
                                    Semana atual
                                </TableHead>
                                <TableHead className="text-right">
                                    Semana anterior
                                </TableHead>
                                <TableHead className="text-right">
                                    Diferença
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {rows.map((row) => {
                                const delta = getDelta(
                                    row.current,
                                    row.previous
                                )

                                return (
                                    <TableRow key={row.label}>
                                        <TableCell className="font-medium">
                                            {row.label}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {row.current}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {row.previous}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <DeltaBadge
                                                value={delta}
                                                inverse={row.inverse}
                                            />
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </ResponsiveTableWrapper>

                <WeeklyChangesDetails current={current} />
            </CardContent>
        </Card>
    )
}

function WeeklyComparisonSelector({
    snapshots,
    currentValue,
    previousValue,
    onCurrentChange,
    onPreviousChange,
}: {
    snapshots: WeeklySnapshot[]
    currentValue: string
    previousValue: string
    onCurrentChange: (value: string) => void
    onPreviousChange: (value: string) => void
}) {
    const options = snapshots
        .slice()
        .sort((a, b) => {
            if (b.year !== a.year) {
                return b.year - a.year
            }

            return b.week - a.week
        })

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    Escolher semanas para comparação
                </CardTitle>

                <CardDescription>
                    Selecione duas semanas do histórico para comparar os indicadores e visualizar as mudanças.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>
                            Semana base
                        </Label>

                        <Select
                            value={currentValue}
                            onValueChange={onCurrentChange}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Semana base" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="latest">
                                    Semana mais recente
                                </SelectItem>

                                {options.map((snapshot) => (
                                    <SelectItem
                                        key={`${snapshot.year}-${snapshot.week}-current`}
                                        value={`${snapshot.year}-${snapshot.week}`}
                                    >
                                        CW{snapshot.week} / {snapshot.year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>
                            Comparar com
                        </Label>

                        <Select
                            value={previousValue}
                            onValueChange={onPreviousChange}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Comparar com" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="previous">
                                    Semana anterior à base
                                </SelectItem>

                                {options.map((snapshot) => (
                                    <SelectItem
                                        key={`${snapshot.year}-${snapshot.week}-previous`}
                                        value={`${snapshot.year}-${snapshot.week}`}
                                    >
                                        CW{snapshot.week} / {snapshot.year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function getPercentDelta(current?: number | null, previous?: number | null) {
    const currentValue = current || 0
    const previousValue = previous || 0

    if (previousValue === 0) {
        if (currentValue === 0) return 0
        return 100
    }

    return ((currentValue - previousValue) / previousValue) * 100
}

function formatPercent(value: number) {
    return `${value > 0 ? "+" : ""}${formatNumber(value)}%`
}

function ExecutiveStatusCard({
    current,
    previous,
}: {
    current?: WeeklySnapshot
    previous?: WeeklySnapshot
}) {
    if (!current || !previous) {
        return null
    }

    const redDelta = getDelta(current.redRisks, previous.redRisks)
    const openDelta = getDelta(current.openRisks, previous.openRisks)
    const overdueDelta = getDelta(
        current.overdueActionPlans,
        previous.overdueActionPlans
    )
    const logisticsDelta = getDelta(
        current.pendingLogisticsRequests,
        previous.pendingLogisticsRequests
    )
    const worsenedDelta = getDelta(
        current.risksWorsenedThisWeek,
        previous.risksWorsenedThisWeek
    )
    const improvedDelta = getDelta(
        current.risksImprovedThisWeek,
        previous.risksImprovedThisWeek
    )

    let negativePoints = 0
    let positivePoints = 0

    if (redDelta > 0) negativePoints += 2
    if (openDelta > 0) negativePoints += 1
    if (overdueDelta > 0) negativePoints += 1
    if (logisticsDelta > 0) negativePoints += 1
    if (worsenedDelta > 0) negativePoints += 1

    if (redDelta < 0) positivePoints += 2
    if (openDelta < 0) positivePoints += 1
    if (overdueDelta < 0) positivePoints += 1
    if (logisticsDelta < 0) positivePoints += 1
    if (improvedDelta > 0) positivePoints += 1

    const status =
        negativePoints >= 4
            ? "Crítica"
            : negativePoints >= 2
                ? "Atenção"
                : positivePoints >= 3
                    ? "Melhorando"
                    : "Estável"

    const badgeClassName =
        status === "Crítica"
            ? "bg-red-600"
            : status === "Atenção"
                ? "bg-yellow-500 text-black"
                : status === "Melhorando"
                    ? "bg-green-600"
                    : "bg-blue-600"

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <CardTitle>
                            Semáforo executivo da semana
                        </CardTitle>

                        <CardDescription>
                            Leitura consolidada da semana base em comparação com a semana escolhida.
                        </CardDescription>
                    </div>

                    <Badge className={badgeClassName}>
                        {status}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <InsightItem
                        label="RMs Red"
                        current={current.redRisks}
                        previous={previous.redRisks}
                        inverse
                    />

                    <InsightItem
                        label="RMs abertas"
                        current={current.openRisks}
                        previous={previous.openRisks}
                        inverse
                    />

                    <InsightItem
                        label="Planos atrasados"
                        current={current.overdueActionPlans}
                        previous={previous.overdueActionPlans}
                        inverse
                    />

                    <InsightItem
                        label="Logística pendente"
                        current={current.pendingLogisticsRequests}
                        previous={previous.pendingLogisticsRequests}
                        inverse
                    />

                    <InsightItem
                        label="RMs que melhoraram"
                        current={current.risksImprovedThisWeek}
                        previous={previous.risksImprovedThisWeek}
                    />

                    <InsightItem
                        label="RMs que pioraram"
                        current={current.risksWorsenedThisWeek}
                        previous={previous.risksWorsenedThisWeek}
                        inverse
                    />
                </div>
            </CardContent>
        </Card>
    )
}

function CurrentStateMetric({
    label,
    value,
    description,
    icon,
}: {
    label: string
    value: number
    description: string
    icon: React.ReactNode
}) {
    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm text-muted-foreground">
                        {label}
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                        {formatNumber(value)}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                        {description}
                    </p>
                </div>

                <div className="rounded-lg bg-muted p-2">
                    {icon}
                </div>
            </div>
        </div>
    )
}

function CurrentStateCountBadge({
    value,
    className,
}: {
    value: number
    className: string
}) {
    if (value === 0) {
        return (
            <Badge
                variant="outline"
                className="min-w-9 justify-center text-muted-foreground"
            >
                0
            </Badge>
        )
    }

    return (
        <Badge
            className={`min-w-9 justify-center ${className}`}
        >
            {value}
        </Badge>
    )
}

function CurrentRiskTeamStateCard({
    state,
}: {
    state?: TeamCurrentState
}) {
    const analysts = state?.analysts || []

    const totals = analysts.reduce(
        (accumulator, analyst) => {
            accumulator.openRisks += analyst.risks.open
            accumulator.redRisks += analyst.risks.red
            accumulator.parts += analyst.parts.total
            accumulator.completedParts += analyst.parts.completed

            return accumulator
        },
        {
            openRisks: 0,
            redRisks: 0,
            parts: 0,
            completedParts: 0,
        }
    )

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <CardTitle>
                                Disposição atual do time de Risk
                            </CardTitle>

                            <Badge className="gap-1 bg-emerald-600">
                                <Radio className="h-3 w-3" />
                                Ao vivo
                            </Badge>
                        </div>

                        <CardDescription className="mt-1">
                            Carga operacional atual dos analistas de Risk.
                            Os PNs são agrupados pelo responsável da RM em que estão.
                        </CardDescription>
                    </div>

                    {state?.generatedAt && (
                        <p className="whitespace-nowrap text-xs text-muted-foreground">
                            Atualizado em {formatDateTime(state.generatedAt)}
                        </p>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-5">
                {analysts.length === 0 ? (
                    <EmptyState message="Nenhum usuário ativo com a role Risk_Analyst foi encontrado." />
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <CurrentStateMetric
                                label="Analistas ativos"
                                value={analysts.length}
                                description="Role Risk_Analyst"
                                icon={<Users className="h-5 w-5 text-blue-600" />}
                            />

                            <CurrentStateMetric
                                label="RMs abertas"
                                value={totals.openRisks}
                                description="Atribuídas ao time"
                                icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
                            />

                            <CurrentStateMetric
                                label="RMs Red"
                                value={totals.redRisks}
                                description="Prioridade imediata"
                                icon={<ShieldAlert className="h-5 w-5 text-red-600" />}
                            />

                            <CurrentStateMetric
                                label="PNs acompanhados"
                                value={totals.parts}
                                description="Vinculados a RMs abertas"                                
                                icon={<PackageCheck className="h-5 w-5 text-violet-600" />}
                            />

                            <CurrentStateMetric
                                label="PNs concluídos"
                                value={totals.completedParts}
                                description="Status Blue"
                                icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}
                            />
                        </div>

                        <Tabs
                            defaultValue="current-risks"
                            className="w-full"
                        >
                            <div className="overflow-x-auto pb-1">
                                <TabsList className="w-max">
                                    <TabsTrigger value="current-risks">
                                        RMs por analista
                                    </TabsTrigger>

                                    <TabsTrigger value="current-parts">
                                        PNs por analista
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent
                                value="current-risks"
                                className="mt-4"
                            >
                                <ResponsiveTableWrapper>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Analista</TableHead>
                                                <TableHead className="text-center">Abertas</TableHead>
                                                <TableHead className="text-center">Red</TableHead>
                                                <TableHead className="text-center">Yellow</TableHead>
                                                <TableHead className="text-center">Green</TableHead>
                                                <TableHead className="text-center">Orange</TableHead>
                                                <TableHead className="text-center">Grey</TableHead>
                                                <TableHead className="text-center">Blue</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {analysts.map((analyst) => (
                                                <TableRow key={analyst.user.id}>
                                                    <TableCell className="min-w-56">
                                                        <Link
                                                            href={`/users/${analyst.user.id}`}
                                                            className="font-medium hover:underline"
                                                        >
                                                            {analyst.user.name}
                                                        </Link>

                                                        <p className="text-xs text-muted-foreground">
                                                            {analyst.user.email}
                                                        </p>
                                                    </TableCell>

                                                    <TableCell className="text-center font-semibold">
                                                        {analyst.risks.open}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.risks.red} className="bg-red-600" />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.risks.yellow} className="bg-yellow-500 text-black" />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.risks.green} className="bg-green-600" />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.risks.orange} className="bg-orange-500" />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.risks.grey} className="bg-slate-500" />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.risks.blue} className="bg-blue-600" />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ResponsiveTableWrapper>
                            </TabsContent>

                            <TabsContent
                                value="current-parts"
                                className="mt-4"
                            >
                                <ResponsiveTableWrapper>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Analista</TableHead>
                                                <TableHead className="text-center">Total</TableHead>
                                                <TableHead className="text-center">Red</TableHead>
                                                <TableHead className="text-center">Yellow</TableHead>
                                                <TableHead className="text-center">Green</TableHead>
                                                <TableHead className="text-center">Orange</TableHead>
                                                <TableHead className="text-center">Grey</TableHead>
                                                <TableHead className="text-center">Concluídos</TableHead>
                                                <TableHead className="text-center">Sem demanda</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {analysts.map((analyst) => (
                                                <TableRow key={analyst.user.id}>
                                                    <TableCell className="min-w-56">
                                                        <Link
                                                            href={`/users/${analyst.user.id}`}
                                                            className="font-medium hover:underline"
                                                        >
                                                            {analyst.user.name}
                                                        </Link>

                                                        <p className="text-xs text-muted-foreground">
                                                            {analyst.user.email}
                                                        </p>
                                                    </TableCell>

                                                    <TableCell className="text-center font-semibold">
                                                        {analyst.parts.total}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.parts.red} className="bg-red-600" />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.parts.yellow} className="bg-yellow-500 text-black" />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.parts.green} className="bg-green-600" />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.parts.orange} className="bg-orange-500" />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.parts.grey} className="bg-slate-500" />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.parts.completed} className="bg-blue-600" />
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <CurrentStateCountBadge value={analyst.parts.withoutDemand} className="bg-zinc-700" />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ResponsiveTableWrapper>

                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </CardContent>
        </Card>
    )
}

function InsightItem({
    label,
    current,
    previous,
    inverse = false,
}: {
    label: string
    current: number
    previous: number
    inverse?: boolean
}) {
    const delta = getDelta(current, previous)
    const percent = getPercentDelta(current, previous)

    const isPositive = delta > 0
    const isGood = delta === 0 ? null : inverse ? !isPositive : isPositive

    const icon =
        delta === 0 ? (
            <Clock className="h-4 w-4" />
        ) : isGood ? (
            <TrendingDown className="h-4 w-4 text-green-600" />
        ) : (
            <TrendingUp className="h-4 w-4 text-red-600" />
        )

    return (
        <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm text-muted-foreground">
                        {label}
                    </p>

                    <p className="mt-1 text-xl font-bold">
                        {current}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Anterior: {previous}
                    </p>
                </div>

                <div className="rounded-lg bg-muted p-2">
                    {icon}
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
                <DeltaBadge
                    value={delta}
                    inverse={inverse}
                />

                <span className="text-xs text-muted-foreground">
                    {formatPercent(percent)}
                </span>
            </div>
        </div>
    )
}

function WeeklyComparisonBarChart({
    current,
    previous,
}: {
    current?: WeeklySnapshot
    previous?: WeeklySnapshot
}) {
    if (!current || !previous) {
        return (
            <EmptyState message="Selecione duas semanas para visualizar o gráfico comparativo." />
        )
    }

    const data = [
        {
            indicator: "RMs abertas",
            current: current.openRisks,
            previous: previous.openRisks,
        },
        {
            indicator: "RMs Red",
            current: current.redRisks,
            previous: previous.redRisks,
        },
        {
            indicator: "RMs Yellow",
            current: current.yellowRisks,
            previous: previous.yellowRisks,
        },
        {
            indicator: "Criadas",
            current: current.risksCreatedThisWeek,
            previous: previous.risksCreatedThisWeek,
        },
        {
            indicator: "Fechadas",
            current: current.risksClosedThisWeek,
            previous: previous.risksClosedThisWeek,
        },
        {
            indicator: "Planos atrasados",
            current: current.overdueActionPlans,
            previous: previous.overdueActionPlans,
        },
        {
            indicator: "Logística pendente",
            current: current.pendingLogisticsRequests,
            previous: previous.pendingLogisticsRequests,
        },
    ]

    const comparisonChartConfig = {
        current: {
            label: `CW${current.week} / ${current.year}`,
            color: COLORS.blue,
        },
        previous: {
            label: `CW${previous.week} / ${previous.year}`,
            color: COLORS.slate,
        },
    } satisfies ChartConfig

    return (
        <ChartContainer
            config={comparisonChartConfig}
            className="h-[320px] w-full"
        >
            <BarChart
                data={data}
                margin={{
                    left: 4,
                    right: 12,
                    top: 10,
                    bottom: 0,
                }}
            >
                <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    className="stroke-muted"
                />

                <XAxis
                    dataKey="indicator"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    interval={0}
                />

                <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    fontSize={11}
                    width={28}
                />

                <ChartTooltip
                    content={<ChartTooltipContent />}
                />

                <Bar
                    dataKey="previous"
                    fill={COLORS.slate}
                    radius={[6, 6, 0, 0]}
                />

                <Bar
                    dataKey="current"
                    fill={COLORS.blue}
                    radius={[6, 6, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    )
}

function RankingCards({
    riskAnalystSnapshots,
    logisticsSnapshots,
    current,
}: {
    riskAnalystSnapshots: RiskAnalystSnapshot[]
    logisticsSnapshots: LogisticsSnapshot[]
    current?: WeeklySnapshot
}) {
    const currentRiskAnalysts = current
        ? riskAnalystSnapshots.filter(
            (snapshot) =>
                snapshot.week === current.week &&
                snapshot.year === current.year
        )
        : []

    const currentLogistics = current
        ? logisticsSnapshots.filter(
            (snapshot) =>
                snapshot.week === current.week &&
                snapshot.year === current.year
        )
        : []

    const topOpenRisks = currentRiskAnalysts
        .slice()
        .sort((a, b) => b.openRisks - a.openRisks)
        .slice(0, 5)

    const topRedRisks = currentRiskAnalysts
        .slice()
        .sort((a, b) => b.redRisks - a.redRisks)
        .slice(0, 5)

    const topPendingLogistics = currentLogistics
        .slice()
        .sort((a, b) => b.pendingRequests - a.pendingRequests)
        .slice(0, 5)

    const topAvgReview = currentLogistics
        .filter((snapshot) => snapshot.avgReviewDays !== null)
        .slice()
        .sort(
            (a, b) =>
                (b.avgReviewDays || 0) -
                (a.avgReviewDays || 0)
        )
        .slice(0, 5)

    return (
        <div className="grid gap-4 xl:grid-cols-2">
            <RankingCard
                title="Top analistas com mais RMs abertas"
                description="Carga atual por responsável na semana base."
                items={topOpenRisks.map((item) => ({
                    id: item.id,
                    name: item.user?.name || "Usuário não encontrado",
                    detail: item.user?.email || "",
                    value: item.openRisks,
                    suffix: "RMs abertas",
                }))}
            />

            <RankingCard
                title="Top analistas com mais RMs Red"
                description="Concentração de criticidade por responsável."
                items={topRedRisks.map((item) => ({
                    id: item.id,
                    name: item.user?.name || "Usuário não encontrado",
                    detail: item.user?.email || "",
                    value: item.redRisks,
                    suffix: "RMs Red",
                }))}
            />

            <RankingCard
                title="Top logística com mais pendências"
                description="Solicitações pendentes por responsável logístico."
                items={topPendingLogistics.map((item) => ({
                    id: item.id,
                    name: item.user?.name || "Usuário não encontrado",
                    detail: item.user?.email || "",
                    value: item.pendingRequests,
                    suffix: "pendências",
                }))}
            />

            <RankingCard
                title="Top logística por tempo médio de análise"
                description="Maiores tempos médios registrados na semana base."
                items={topAvgReview.map((item) => ({
                    id: item.id,
                    name: item.user?.name || "Usuário não encontrado",
                    detail: item.user?.email || "",
                    value: item.avgReviewDays || 0,
                    suffix: "dias",
                    decimal: true,
                }))}
            />
        </div>
    )
}

function RankingCard({
    title,
    description,
    items,
}: {
    title: string
    description: string
    items: {
        id: string
        name: string
        detail: string
        value: number
        suffix: string
        decimal?: boolean
    }[]
}) {
    const maxValue = Math.max(
        ...items.map((item) => item.value),
        1
    )

    function getPositionClass(index: number) {
        switch (index) {
            case 0:
                return "bg-yellow-500 text-black"
            case 1:
                return "bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-white"
            case 2:
                return "bg-orange-500 text-white"
            default:
                return "bg-muted text-muted-foreground"
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle>
                        {title}
                    </CardTitle>

                    <CardDescription className="mt-1">
                        {description}
                    </CardDescription>
                </div>

                <Badge variant="secondary">
                    Top 5
                </Badge>
            </CardHeader>

            <CardContent>
                {items.length === 0 ? (
                    <EmptyState message="Nenhum dado encontrado para este ranking." />
                ) : (
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className="group flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <div
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${getPositionClass(
                                            index
                                        )}`}
                                    >
                                        {index + 1}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                            {item.name}
                                        </p>

                                        <p className="truncate text-xs text-muted-foreground">
                                            {item.detail}
                                        </p>

                                        <div className="mt-2 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-primary transition-[width]"
                                                style={{
                                                    width: `${Math.max(
                                                        4,
                                                        (item.value /
                                                            maxValue) *
                                                            100
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="font-bold">
                                        {item.decimal
                                            ? formatNumber(item.value)
                                            : item.value}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                        {item.suffix}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function WeeklyAnalyticsPage() {
    const [data, setData] =
        useState<WeeklySnapshotsResponse | null>(null)

    const [loading, setLoading] = useState(true)

    const [selectedYear, setSelectedYear] =
        useState(String(new Date().getFullYear()))

    const [selectedMonth, setSelectedMonth] = useState("all")
    const [selectedWeek, setSelectedWeek] = useState("all")

    const [comparisonCurrentWeek, setComparisonCurrentWeek] = useState("latest")
    const [comparisonPreviousWeek, setComparisonPreviousWeek] = useState("previous")

    useEffect(() => {
        loadSnapshots()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear, selectedMonth, selectedWeek])

    async function loadSnapshots() {
        try {
            setLoading(true)

            const params = new URLSearchParams()

            params.set("year", selectedYear)

            if (selectedMonth !== "all") {
                params.set("month", selectedMonth)
            }

            if (selectedWeek !== "all") {
                params.set("week", selectedWeek)
            }

            const res = await fetch(
                `/api/weekly-snapshots?${params.toString()}`,
                {
                    credentials: "include",
                }
            )

            const response = await res.json()

            if (!res.ok) {
                throw new Error(
                    response.error ||
                    "Erro ao buscar snapshots semanais"
                )
            }

            setData(response)
        } catch (error) {
            console.error(error)
            setData(null)
        } finally {
            setLoading(false)
        }
    }

    const snapshots =
        data?.snapshots || []

    const sortedSnapshots = useMemo(() => {
        return snapshots
            .slice()
            .sort((a, b) => {
                if (b.year !== a.year) {
                    return b.year - a.year
                }

                return b.week - a.week
            })
    }, [snapshots])

    const latestSnapshot = useMemo(() => {
        if (sortedSnapshots.length === 0) return undefined

        if (comparisonCurrentWeek !== "latest") {
            return sortedSnapshots.find(
                (snapshot) =>
                    `${snapshot.year}-${snapshot.week}` ===
                    comparisonCurrentWeek
            )
        }

        return sortedSnapshots[0]
    }, [sortedSnapshots, comparisonCurrentWeek])

    const previousSnapshot = useMemo(() => {
        if (!latestSnapshot) return undefined

        if (comparisonPreviousWeek !== "previous") {
            return sortedSnapshots.find(
                (snapshot) =>
                    `${snapshot.year}-${snapshot.week}` ===
                    comparisonPreviousWeek
            )
        }

        return sortedSnapshots.find((snapshot) => {
            if (snapshot.year === latestSnapshot.year) {
                return snapshot.week < latestSnapshot.week
            }

            return snapshot.year < latestSnapshot.year
        })
    }, [sortedSnapshots, latestSnapshot, comparisonPreviousWeek])

    const totalCreated = snapshots.reduce(
        (sum, snapshot) =>
            sum + snapshot.risksCreatedThisWeek,
        0
    )

    const totalClosed = snapshots.reduce(
        (sum, snapshot) =>
            sum + snapshot.risksClosedThisWeek,
        0
    )

    const totalImproved = snapshots.reduce(
        (sum, snapshot) =>
            sum + snapshot.risksImprovedThisWeek,
        0
    )

    const totalWorsened = snapshots.reduce(
        (sum, snapshot) =>
            sum + snapshot.risksWorsenedThisWeek,
        0
    )

    return (
        <ProtectedRoute>
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-4 p-3 sm:gap-5 sm:p-4 md:gap-6 md:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold">
                                    Histórico Semanal
                                </h1>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Analise snapshots semanais, evolução das RMs, movimentações, analistas de Risk e logística.
                                </p>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-4 lg:flex lg:items-center">
                                <Select
                                    value={selectedYear}
                                    onValueChange={(value) => {
                                        setSelectedYear(value)
                                        setSelectedMonth("all")
                                        setSelectedWeek("all")
                                    }}
                                >
                                    <SelectTrigger className="w-full lg:w-[120px]">
                                        <SelectValue placeholder="Ano" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {(data?.filters.availableYears.length
                                            ? data.filters.availableYears
                                            : [Number(selectedYear)]
                                        ).map((year) => (
                                            <SelectItem
                                                key={year}
                                                value={String(year)}
                                            >
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={selectedMonth}
                                    onValueChange={(value) => {
                                        setSelectedMonth(value)
                                        setSelectedWeek("all")
                                    }}
                                >
                                    <SelectTrigger className="w-full lg:w-[170px]">
                                        <SelectValue placeholder="Mês" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="all">
                                            Todos os meses
                                        </SelectItem>

                                        {(data?.filters.availableMonths || []).map(
                                            (month) => (
                                                <SelectItem
                                                    key={month}
                                                    value={String(month)}
                                                >
                                                    {getMonthLabel(month)}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={selectedWeek}
                                    onValueChange={setSelectedWeek}
                                >
                                    <SelectTrigger className="w-full lg:w-[140px]">
                                        <SelectValue placeholder="Semana" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="all">
                                            Todas as semanas
                                        </SelectItem>

                                        {(data?.filters.availableWeeks || []).map(
                                            (week) => (
                                                <SelectItem
                                                    key={week}
                                                    value={String(week)}
                                                >
                                                    CW{week}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={loadSnapshots}
                                    disabled={loading}
                                    className="w-full lg:w-auto"
                                >
                                    {loading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCcw className="mr-2 h-4 w-4" />
                                    )}
                                    Atualizar
                                </Button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex min-h-[300px] items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : !data ? (
                            <EmptyState message="Não foi possível carregar os snapshots semanais." />
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                                    <MetricCard
                                        title="RMs abertas"
                                        value={latestSnapshot?.openRisks || 0}
                                        description="Quantidade atual no último snapshot"
                                        icon={<BarChart3 className="h-5 w-5" />}
                                    />

                                    <MetricCard
                                        title="RMs Red"
                                        value={latestSnapshot?.redRisks || 0}
                                        description="RMs críticas no último snapshot"
                                        icon={<ShieldAlert className="h-5 w-5" />}
                                    />

                                    <MetricCard
                                        title="Criadas"
                                        value={totalCreated}
                                        description="RMs criadas no período filtrado"
                                        icon={<CalendarDays className="h-5 w-5" />}
                                    />

                                    <MetricCard
                                        title="Fechadas"
                                        value={totalClosed}
                                        description="RMs fechadas no período filtrado"
                                        icon={<CheckCircle2 className="h-5 w-5" />}
                                    />

                                    <MetricCard
                                        title="Melhoraram"
                                        value={totalImproved}
                                        description="Mudanças positivas de farol"
                                        icon={<TrendingDown className="h-5 w-5" />}
                                    />

                                    <MetricCard
                                        title="Pioraram"
                                        value={totalWorsened}
                                        description="Mudanças negativas de farol"
                                        icon={<TrendingUp className="h-5 w-5" />}
                                    />
                                </div>

                                <WeeklyComparisonSelector
                                    snapshots={snapshots}
                                    currentValue={comparisonCurrentWeek}
                                    previousValue={comparisonPreviousWeek}
                                    onCurrentChange={setComparisonCurrentWeek}
                                    onPreviousChange={setComparisonPreviousWeek}
                                />

                                <Tabs
                                    defaultValue="executive"
                                    className="w-full"
                                >
                                    <div className="-mx-3 overflow-x-auto overflow-y-hidden px-3 sm:mx-0 sm:px-0">
                                        <TabsList className="flex h-12 w-max min-w-full justify-start gap-1 sm:w-full sm:flex-wrap">
                                            <TabsTrigger
                                                value="executive"
                                                className="whitespace-nowrap"
                                            >
                                                Visão executiva
                                            </TabsTrigger>

                                            <TabsTrigger
                                                value="evolution"
                                                className="whitespace-nowrap"
                                            >
                                                Evolução
                                            </TabsTrigger>

                                            <TabsTrigger
                                                value="rankings"
                                                className="whitespace-nowrap"
                                            >
                                                Rankings
                                            </TabsTrigger>

                                            <TabsTrigger
                                                value="details"
                                                className="whitespace-nowrap"
                                            >
                                                Dados detalhados
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <TabsContent
                                        value="executive"
                                        className="mt-4 space-y-4"
                                    >
                                        <ExecutiveStatusCard
                                            current={latestSnapshot}
                                            previous={previousSnapshot}
                                        />

                                        <CurrentRiskTeamStateCard
                                            state={data.teamCurrentState}
                                        />

                                        <div className="grid grid-cols-1 items-start gap-4 2xl:grid-cols-12">
                                            <div className="min-w-0 2xl:col-span-7">
                                                <WeeklyComparisonCard
                                                    current={latestSnapshot}
                                                    previous={previousSnapshot}
                                                />
                                            </div>

                                            <Card className="min-w-0 2xl:col-span-5">
                                                <CardHeader>
                                                    <CardTitle>
                                                        Comparativo visual
                                                    </CardTitle>

                                                    <CardDescription>
                                                        Comparação direta entre a semana base e a semana escolhida.
                                                    </CardDescription>
                                                </CardHeader>

                                                <CardContent>
                                                    <WeeklyComparisonBarChart
                                                        current={latestSnapshot}
                                                        previous={previousSnapshot}
                                                    />
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </TabsContent>

                                    <TabsContent
                                        value="evolution"
                                        className="mt-4"
                                    >
                                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>
                                                        Evolução semanal das RMs
                                                    </CardTitle>

                                                    <CardDescription>
                                                        Acompanhe RMs abertas, Red, Yellow e Green ao longo das semanas.
                                                    </CardDescription>
                                                </CardHeader>

                                                <CardContent>
                                                    <WeeklyEvolutionChart
                                                        snapshots={snapshots}
                                                    />
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>
                                                        Distribuição do último snapshot
                                                    </CardTitle>

                                                    <CardDescription>
                                                        Visão por farol da semana mais recente selecionada.
                                                    </CardDescription>
                                                </CardHeader>

                                                <CardContent>
                                                    <RiskDistributionChart
                                                        snapshot={latestSnapshot}
                                                    />
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>
                                                        RMs criadas vs fechadas
                                                    </CardTitle>

                                                    <CardDescription>
                                                        Comparativo semanal de entrada e saída de RMs.
                                                    </CardDescription>
                                                </CardHeader>

                                                <CardContent>
                                                    <CreatedClosedChart
                                                        snapshots={snapshots}
                                                    />
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>
                                                        RMs que melhoraram vs pioraram
                                                    </CardTitle>

                                                    <CardDescription>
                                                        Mudanças de farol detectadas nos snapshots.
                                                    </CardDescription>
                                                </CardHeader>

                                                <CardContent>
                                                    <ImprovedWorsenedChart
                                                        snapshots={snapshots}
                                                    />
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </TabsContent>

                                    <TabsContent
                                        value="rankings"
                                        className="mt-4"
                                    >
                                        <RankingCards
                                            riskAnalystSnapshots={data.riskAnalystSnapshots}
                                            logisticsSnapshots={data.logisticsSnapshots}
                                            current={latestSnapshot}
                                        />
                                    </TabsContent>

                                    <TabsContent
                                        value="details"
                                        className="mt-4"
                                    >
                                    <Tabs defaultValue="snapshots">
                                        <div className="-mx-3 overflow-x-auto overflow-y-hidden px-3 sm:mx-0 sm:px-0">
                                            <TabsList className="flex h-12 w-max min-w-full justify-start gap-1 sm:w-full sm:flex-wrap">
                                                <TabsTrigger
                                                    value="snapshots"
                                                    className="whitespace-nowrap"
                                                >
                                                    Snapshots
                                                </TabsTrigger>
    
                                                <TabsTrigger
                                                    value="risk"
                                                    className="whitespace-nowrap"
                                                >
                                                    Analistas de Risk
                                                </TabsTrigger>
    
                                                <TabsTrigger
                                                    value="logistics"
                                                    className="whitespace-nowrap"
                                                >
                                                    Logística
                                                </TabsTrigger>
    
                                                <TabsTrigger
                                                    value="events"
                                                    className="whitespace-nowrap"
                                                >
                                                    Eventos da semana
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>
    
                                        <TabsContent value="snapshots" className="mt-4">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>
                                                        Snapshots semanais
                                                    </CardTitle>
    
                                                    <CardDescription>
                                                        Visão agregada das RMs, PNs, planos de ação e logística por semana.
                                                    </CardDescription>
                                                </CardHeader>
    
                                                <CardContent>
                                                    <SnapshotsTable
                                                        snapshots={snapshots}
                                                    />
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
    
                                        <TabsContent value="risk" className="mt-4">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>
                                                        Histórico por analista de Risk
                                                    </CardTitle>
    
                                                    <CardDescription>
                                                        Carga de RMs, farol, movimentações e planos de ação por responsável.
                                                    </CardDescription>
                                                </CardHeader>
    
                                                <CardContent>
                                                    <RiskAnalystTable
                                                        snapshots={
                                                            data.riskAnalystSnapshots
                                                        }
                                                    />
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
    
                                        <TabsContent value="logistics" className="mt-4">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>
                                                        Histórico por logística
                                                    </CardTitle>
    
                                                    <CardDescription>
                                                        Solicitações pendentes, em análise, aprovadas, rejeitadas e tempo médio.
                                                    </CardDescription>
                                                </CardHeader>
    
                                                <CardContent>
                                                    <LogisticsTable
                                                        snapshots={
                                                            data.logisticsSnapshots
                                                        }
                                                    />
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
    
                                        <TabsContent value="events" className="mt-4">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>
                                                        Eventos e movimentações
                                                    </CardTitle>
    
                                                    <CardDescription>
                                                        Detalhes das RMs criadas, fechadas, atribuídas e mudanças de farol.
                                                    </CardDescription>
                                                </CardHeader>
    
                                                <CardContent>
                                                    <EventsTable
                                                        events={data.events}
                                                    />
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                    </Tabs>
                                    </TabsContent>
                                </Tabs>
                            </>
                        )}
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}

function SnapshotsTable({
    snapshots,
}: {
    snapshots: WeeklySnapshot[]
}) {
    if (snapshots.length === 0) {
        return (
            <EmptyState message="Nenhum snapshot encontrado." />
        )
    }

    return (
        <ResponsiveTableWrapper>
            <Table className="min-w-[1150px]">
                <TableHeader>
                    <TableRow>
                        <TableHead>Semana</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Total RMs</TableHead>
                        <TableHead>Abertas</TableHead>
                        <TableHead>Fechadas</TableHead>
                        <TableHead>Red</TableHead>
                        <TableHead>Yellow</TableHead>
                        <TableHead>Green</TableHead>
                        <TableHead>Criadas</TableHead>
                        <TableHead>Fechadas na semana</TableHead>
                        <TableHead>Melhoraram</TableHead>
                        <TableHead>Pioraram</TableHead>
                        <TableHead>Planos atrasados</TableHead>
                        <TableHead>Logística pendente</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {snapshots.map((snapshot) => (
                        <TableRow key={snapshot.id}>
                            <TableCell className="font-medium">
                                CW{snapshot.week} / {snapshot.year}
                            </TableCell>

                            <TableCell>
                                {formatDate(snapshot.weekStartDate)} até{" "}
                                {formatDate(snapshot.weekEndDate)}
                            </TableCell>

                            <TableCell>
                                {snapshot.totalRisks}
                            </TableCell>

                            <TableCell>
                                {snapshot.openRisks}
                            </TableCell>

                            <TableCell>
                                {snapshot.closedRisks}
                            </TableCell>

                            <TableCell>
                                <Badge variant="destructive">
                                    {snapshot.redRisks}
                                </Badge>
                            </TableCell>

                            <TableCell>
                                <Badge className="bg-yellow-500 text-black">
                                    {snapshot.yellowRisks}
                                </Badge>
                            </TableCell>

                            <TableCell>
                                <Badge className="bg-green-600">
                                    {snapshot.greenRisks}
                                </Badge>
                            </TableCell>

                            <TableCell>
                                {snapshot.risksCreatedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.risksClosedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.risksImprovedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.risksWorsenedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.overdueActionPlans}
                            </TableCell>

                            <TableCell>
                                {snapshot.pendingLogisticsRequests}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ResponsiveTableWrapper>
    )
}

function RiskAnalystTable({
    snapshots,
}: {
    snapshots: RiskAnalystSnapshot[]
}) {
    if (snapshots.length === 0) {
        return (
            <EmptyState message="Nenhum snapshot por analista encontrado." />
        )
    }

    return (
        <ResponsiveTableWrapper>
            <Table className="min-w-[1200px]">
                <TableHeader>
                    <TableRow>
                        <TableHead>Semana</TableHead>
                        <TableHead>Analista</TableHead>
                        <TableHead>Atribuídas</TableHead>
                        <TableHead>Abertas</TableHead>
                        <TableHead>Red</TableHead>
                        <TableHead>Yellow</TableHead>
                        <TableHead>Criadas</TableHead>
                        <TableHead>Atribuídas na semana</TableHead>
                        <TableHead>Fechadas</TableHead>
                        <TableHead>Melhoraram</TableHead>
                        <TableHead>Pioraram</TableHead>
                        <TableHead>Planos abertos</TableHead>
                        <TableHead>Planos atrasados</TableHead>
                        <TableHead>RM mais antiga</TableHead>
                        <TableHead>Tempo médio fechamento</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {snapshots.map((snapshot) => (
                        <TableRow key={snapshot.id}>
                            <TableCell className="font-medium">
                                CW{snapshot.week} / {snapshot.year}
                            </TableCell>

                            <TableCell>
                                <div>
                                    <p className="font-medium">
                                        {snapshot.user?.name || "Usuário não encontrado"}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                        {snapshot.user?.email}
                                    </p>
                                </div>
                            </TableCell>

                            <TableCell>
                                {snapshot.assignedRisks}
                            </TableCell>

                            <TableCell>
                                {snapshot.openRisks}
                            </TableCell>

                            <TableCell>
                                <Badge variant="destructive">
                                    {snapshot.redRisks}
                                </Badge>
                            </TableCell>

                            <TableCell>
                                <Badge className="bg-yellow-500 text-black">
                                    {snapshot.yellowRisks}
                                </Badge>
                            </TableCell>

                            <TableCell>
                                {snapshot.risksCreatedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.risksAssignedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.risksClosedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.risksImprovedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.risksWorsenedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.actionPlansOpen}
                            </TableCell>

                            <TableCell>
                                {snapshot.actionPlansOverdue}
                            </TableCell>

                            <TableCell>
                                {snapshot.oldestOpenRiskDays !== null
                                    ? `${snapshot.oldestOpenRiskDays} dias`
                                    : "-"}
                            </TableCell>

                            <TableCell>
                                {snapshot.avgResolutionDays !== null
                                    ? `${formatNumber(snapshot.avgResolutionDays)} dias`
                                    : "-"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ResponsiveTableWrapper>
    )
}

function LogisticsTable({
    snapshots,
}: {
    snapshots: LogisticsSnapshot[]
}) {
    if (snapshots.length === 0) {
        return (
            <EmptyState message="Nenhum snapshot de logística encontrado." />
        )
    }

    return (
        <ResponsiveTableWrapper>
            <Table className="min-w-[1100px]">
                <TableHeader>
                    <TableRow>
                        <TableHead>Semana</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Atribuídas</TableHead>
                        <TableHead>Pendentes</TableHead>
                        <TableHead>Em análise</TableHead>
                        <TableHead>Aprovadas</TableHead>
                        <TableHead>Rejeitadas</TableHead>
                        <TableHead>Recebidas na semana</TableHead>
                        <TableHead>Aprovadas na semana</TableHead>
                        <TableHead>Rejeitadas na semana</TableHead>
                        <TableHead>Mais antiga pendente</TableHead>
                        <TableHead>Tempo médio análise</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {snapshots.map((snapshot) => (
                        <TableRow key={snapshot.id}>
                            <TableCell className="font-medium">
                                CW{snapshot.week} / {snapshot.year}
                            </TableCell>

                            <TableCell>
                                <div>
                                    <p className="font-medium">
                                        {snapshot.user?.name || "Usuário não encontrado"}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                        {snapshot.user?.email}
                                    </p>
                                </div>
                            </TableCell>

                            <TableCell>
                                {snapshot.assignedRequests}
                            </TableCell>

                            <TableCell>
                                {snapshot.pendingRequests}
                            </TableCell>

                            <TableCell>
                                {snapshot.inReviewRequests}
                            </TableCell>

                            <TableCell>
                                {snapshot.approvedRequests}
                            </TableCell>

                            <TableCell>
                                {snapshot.rejectedRequests}
                            </TableCell>

                            <TableCell>
                                {snapshot.requestsReceivedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.requestsApprovedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.requestsRejectedThisWeek}
                            </TableCell>

                            <TableCell>
                                {snapshot.oldestPendingRequestDays !== null
                                    ? `${snapshot.oldestPendingRequestDays} dias`
                                    : "-"}
                            </TableCell>

                            <TableCell>
                                {snapshot.avgReviewDays !== null
                                    ? `${formatNumber(snapshot.avgReviewDays)} dias`
                                    : "-"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ResponsiveTableWrapper>
    )
}

function EventsTable({
    events,
}: {
    events: WeeklyEvent[]
}) {
    if (events.length === 0) {
        return (
            <EmptyState message="Nenhum evento semanal encontrado." />
        )
    }

    return (
        <ResponsiveTableWrapper>
            <Table className="min-w-[1000px]">
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Semana</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>RM</TableHead>
                        <TableHead>Alteração</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Descrição</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {events.map((event) => (
                        <TableRow key={event.id}>
                            <TableCell>
                                {formatDateTime(event.createdAt)}
                            </TableCell>

                            <TableCell className="font-medium">
                                CW{event.week} / {event.year}
                            </TableCell>

                            <TableCell>
                                {getEventBadge(event.eventType)}
                            </TableCell>

                            <TableCell>
                                {event.riskEvent ? (
                                    <div>
                                        <p className="font-medium">
                                            {event.riskEvent.code || "-"}
                                        </p>

                                        <p className="line-clamp-1 text-xs text-muted-foreground">
                                            {event.riskEvent.title}
                                        </p>
                                    </div>
                                ) : (
                                    "-"
                                )}
                            </TableCell>

                            <TableCell>
                                {event.oldValue || event.newValue ? (
                                    <span>
                                        {event.oldValue || "-"} → {event.newValue || "-"}
                                    </span>
                                ) : (
                                    "-"
                                )}
                            </TableCell>

                            <TableCell>
                                {event.user ? (
                                    <div>
                                        <p className="font-medium">
                                            {event.user.name}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {event.user.email}
                                        </p>
                                    </div>
                                ) : (
                                    "-"
                                )}
                            </TableCell>

                            <TableCell>
                                <span className="line-clamp-2">
                                    {event.description || "-"}
                                </span>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ResponsiveTableWrapper>
    )
}