"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

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
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Eye,
    Flag,
    Globe2,
    Loader2,
    Mail,
    MapPin,
    Package,
    Phone,
    Plus,
    RefreshCw,
    ShieldAlert,
    Target,
    Trash2,
    Truck,
    UserRound,
    UsersRound,
} from "lucide-react"

import { toast } from "sonner"

type UserReference = {
    id: string
    name: string
    email: string
}

type Contact = {
    id: string
    name: string
    email: string | null
    phone: string | null
    position: string | null
    createdAt: string
}

type PartNumber = {
    id: string
    partNumber: string
    description: string | null
    vehicleProgram: string | null
}

type RiskPart = {
    id: string
    status: string
    statusLabel: string
    logisticsStatus: string
    createdAt: string
    updatedAt: string
    partNumber: PartNumber | null
    assignedTo: UserReference | null
}

type ActionPlan = {
    id: string
    title: string
    description: string | null
    requiredAction: string | null
    responsibleArea: string | null
    dueDate: string | null
    priority: string
    status: string
    statusLabel: string
    submittedAt: string | null
    validatedAt: string | null
    evidenceUrl: string | null
    closingNotes: string | null
    isCompleted: boolean
    completedAt: string | null
    isOverdue: boolean
    createdAt: string
    updatedAt: string
    createdBy: UserReference | null
    assignedTo: UserReference | null
    validatedBy: UserReference | null
    riskEventPart: {
        id: string
        status: string
        statusLabel: string
        partNumber: PartNumber | null
    } | null
}

type LogisticsRequest = {
    id: string
    code: string
    type: string
    status: string
    statusLabel: string
    priority: string
    requestedAt: string
    acceptedAt: string | null
    reviewedAt: string | null
    canceledAt: string | null
    requestNotes: string | null
    responseNotes: string | null
    rejectionReason: string | null
    requestedQuantity: number | null
    calculatedQuantity: number | null
    requestedBy: UserReference | null
    assignedTo: UserReference | null
    reviewedBy: UserReference | null
    riskEventPart: {
        id: string
        status: string
        statusLabel: string
        partNumber: PartNumber | null
    } | null
}

type RiskEvent = {
    id: string
    code: string
    sequenceNumber: number
    codePrefix: string
    title: string
    description: string | null
    openingReason: string
    commodity: string | null
    functionalGroup: string | null
    workflowStatus: string
    workflowStatusLabel: string
    riskLevel: string
    riskLevelLabel: string
    createdWeek: number
    createdYear: number
    createdAt: string
    updatedAt: string
    closedAt: string | null
    createdBy: UserReference | null
    assignedTo: UserReference | null
    closedBy: UserReference | null
    status: {
        id: string
        name: string
        label: string
    }
    parts: RiskPart[]
    actionPlans: ActionPlan[]
    logistics: LogisticsRequest[]
}

type AnalyticsChartItem = {
    name: string
    value: string
    total: number
}

type SupplierAnalytics = {
    summary: {
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
        openRedRisks: number
        totalParts: number
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
        risksWithoutParts: number
        risksWithoutActionPlan: number
        redRisksWithoutActionPlan: number
        oldestOpenRiskDays: number | null
        avgOpenRiskAgeDays: number | null
        avgResolutionDays: number | null
        oldestPendingLogisticsDays: number | null
        avgLogisticsReviewDays: number | null
    }
    charts: {
        risksByLevel: AnalyticsChartItem[]
        risksByWorkflowStatus: AnalyticsChartItem[]
        partsByStatus: AnalyticsChartItem[]
        actionPlansByStatus: AnalyticsChartItem[]
        logisticsByStatus: AnalyticsChartItem[]
    }
    insights: Array<{
        type: "critical" | "warning" | "success" | "info"
        title: string
        description: string
    }>
}

type Supplier = {
    id: string
    name: string
    supplierCodeSap: string | null
    status: string
    statusLabel: string
    address: string | null
    countryId: string
    riskScore: number | null
    lastRiskCalculation: string | null
    createdAt: string
    country: {
        id: string
        name: string
        isoCode: string
    } | null
    contacts: Contact[]
    analytics: SupplierAnalytics
    riskEvents: RiskEvent[]
}

type PartRow = RiskPart & {
    riskId: string
    riskCode: string
    riskTitle: string
}

type ActionPlanRow = ActionPlan & {
    riskId: string
    riskCode: string
    riskLevel: string
}

type LogisticsRow = LogisticsRequest & {
    riskId: string
    riskCode: string
    riskLevel: string
}

const COLORS = {
    blue: "#2563eb",
    red: "#dc2626",
    yellow: "#f59e0b",
    green: "#16a34a",
    orange: "#f97316",
    purple: "#7c3aed",
    cyan: "#0891b2",
    slate: "#64748b",
}

const chartConfig = {
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

function formatDays(value: number | null) {
    if (value === null || Number.isNaN(value)) return "-"

    const rounded = Math.round(value * 10) / 10
    return `${rounded.toLocaleString("pt-BR")} dia(s)`
}

function formatPercentage(value: number) {
    return `${Math.round(value)}%`
}

function normalize(value?: string | null) {
    return (value || "").trim().toLocaleLowerCase("pt-BR")
}

function getSupplierStatusLabel(status: string) {
    switch (status) {
        case "ACTIVE":
            return "Ativo"
        case "UNDER_MONITORING":
            return "Em monitoramento"
        case "AT_RISK":
            return "Em risco"
        case "BLOCKED":
            return "Bloqueado"
        case "INACTIVE":
            return "Inativo"
        default:
            return status
    }
}

function getSupplierStatusBadge(status: string) {
    switch (status) {
        case "ACTIVE":
            return <Badge className="bg-green-600">Ativo</Badge>
        case "UNDER_MONITORING":
            return (
                <Badge className="bg-yellow-500 text-black">
                    Em monitoramento
                </Badge>
            )
        case "AT_RISK":
            return (
                <Badge className="bg-orange-600">Em risco</Badge>
            )
        case "BLOCKED":
            return <Badge variant="destructive">Bloqueado</Badge>
        case "INACTIVE":
            return <Badge variant="outline">Inativo</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}

function getRiskBadge(level: string) {
    switch (level) {
        case "RED":
            return <Badge variant="destructive">Vermelho</Badge>
        case "YELLOW":
            return (
                <Badge className="bg-yellow-500 text-black">
                    Amarelo
                </Badge>
            )
        case "GREEN":
            return <Badge className="bg-green-600">Verde</Badge>
        case "ORANGE":
            return <Badge className="bg-orange-500">Laranja</Badge>
        case "GREY":
            return <Badge className="bg-slate-500">Cinza</Badge>
        case "BLUE":
            return <Badge className="bg-blue-600">Azul</Badge>
        default:
            return <Badge variant="outline">{level}</Badge>
    }
}

function getWorkflowBadge(status: string) {
    switch (status) {
        case "OPEN":
            return <Badge className="bg-blue-600">Aberta</Badge>
        case "CLOSED":
            return <Badge className="bg-green-600">Fechada</Badge>
        case "CANCELED":
            return <Badge variant="secondary">Cancelada</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}

function getPriorityBadge(priority: string) {
    switch (priority) {
        case "CRITICAL":
            return <Badge variant="destructive">Crítica</Badge>
        case "HIGH":
            return <Badge className="bg-orange-500">Alta</Badge>
        case "MEDIUM":
            return <Badge className="bg-blue-600">Média</Badge>
        case "LOW":
            return <Badge className="bg-green-600">Baixa</Badge>
        default:
            return <Badge variant="outline">{priority || "-"}</Badge>
    }
}

function getActionPlanStatusBadge(status: string, overdue: boolean) {
    if (overdue) {
        return <Badge variant="destructive">Atrasado</Badge>
    }

    switch (status) {
        case "OPEN":
            return <Badge className="bg-blue-600">Aberto</Badge>
        case "IN_PROGRESS":
            return (
                <Badge className="bg-yellow-500 text-black">
                    Em andamento
                </Badge>
            )
        case "WAITING_VALIDATION":
            return (
                <Badge className="bg-purple-600">
                    Aguardando validação
                </Badge>
            )
        case "COMPLETED":
            return <Badge className="bg-green-600">Concluído</Badge>
        case "CANCELED":
            return <Badge variant="secondary">Cancelado</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}

function getLogisticsStatusBadge(status: string) {
    switch (status) {
        case "PENDING":
            return (
                <Badge className="bg-yellow-500 text-black">
                    Pendente
                </Badge>
            )
        case "IN_REVIEW":
            return <Badge className="bg-blue-600">Em análise</Badge>
        case "APPROVED":
            return <Badge className="bg-green-600">Aprovada</Badge>
        case "REJECTED":
            return <Badge variant="destructive">Rejeitada</Badge>
        case "CANCELED":
            return <Badge variant="secondary">Cancelada</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}

function formatLogisticsType(type: string) {
    switch (type) {
        case "BOOK_INCLUSION":
            return "Inclusão no book"
        case "BUFFER_CALCULATION":
            return "Cálculo de buffer"
        default:
            return type
    }
}

function getChartItemColor(item: AnalyticsChartItem) {
    switch (item.value) {
        case "RED":
        case "OVERDUE":
        case "REJECTED":
            return COLORS.red
        case "YELLOW":
        case "PENDING":
        case "IN_PROGRESS":
            return COLORS.yellow
        case "GREEN":
        case "CLOSED":
        case "COMPLETED":
        case "APPROVED":
            return COLORS.green
        case "ORANGE":
            return COLORS.orange
        case "GREY":
        case "CANCELED":
            return COLORS.slate
        case "BLUE":
        case "OPEN":
        case "IN_REVIEW":
            return COLORS.blue
        case "WAITING_VALIDATION":
            return COLORS.purple
        default:
            return COLORS.cyan
    }
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            {message}
        </div>
    )
}

function MetricCard({
    title,
    value,
    description,
    icon,
    attention = false,
}: {
    title: string
    value: string | number
    description: string
    icon: React.ReactNode
    attention?: boolean
}) {
    return (
        <Card className={attention ? "border-red-200 dark:border-red-900" : ""}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {title}
                        </p>

                        <p className="mt-1 text-2xl font-bold">{value}</p>

                        <p className="mt-1 text-xs text-muted-foreground">
                            {description}
                        </p>
                    </div>

                    <div
                        className={
                            attention
                                ? "rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-950/40"
                                : "rounded-lg bg-muted p-2 text-muted-foreground"
                        }
                    >
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function FilterCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-4 rounded-lg border bg-muted/20 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {children}
            </div>
        </div>
    )
}

function BarSummaryChart({ data }: { data: AnalyticsChartItem[] }) {
    const chartData = data.filter((item) => item.total > 0)

    if (chartData.length === 0) {
        return <EmptyState message="Sem dados para exibir." />
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="h-[240px] w-full"
        >
            <BarChart
                accessibilityLayer
                data={chartData}
                margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
                <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    className="stroke-muted"
                />

                <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    className="fill-muted-foreground"
                />

                <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    fontSize={11}
                    className="fill-muted-foreground"
                />

                <ChartTooltip
                    cursor={{
                        fill: "hsl(var(--muted))",
                        opacity: 0.25,
                    }}
                    content={<ChartTooltipContent />}
                />

                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {chartData.map((item, index) => (
                        <Cell
                            key={`${item.value}-${index}`}
                            fill={getChartItemColor(item)}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}

function DonutSummaryChart({ data }: { data: AnalyticsChartItem[] }) {
    const chartData = data.filter((item) => item.total > 0)

    if (chartData.length === 0) {
        return <EmptyState message="Sem dados para exibir." />
    }

    return (
        <div>
            <ChartContainer
                config={chartConfig}
                className="h-[200px] w-full"
            >
                <PieChart>
                    <ChartTooltip
                        content={<ChartTooltipContent hideLabel />}
                    />

                    <Pie
                        data={chartData}
                        dataKey="total"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={3}
                        strokeWidth={1}
                    >
                        {chartData.map((item, index) => (
                            <Cell
                                key={`${item.value}-${index}`}
                                fill={getChartItemColor(item)}
                            />
                        ))}
                    </Pie>
                </PieChart>
            </ChartContainer>

            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">
                {chartData.map((item) => (
                    <div
                        key={item.value}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                        <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                                backgroundColor: getChartItemColor(item),
                            }}
                        />
                        {item.name}: {item.total}
                    </div>
                ))}
            </div>
        </div>
    )
}

function InsightItem({
    insight,
}: {
    insight: SupplierAnalytics["insights"][number]
}) {
    const styles = {
        critical:
            "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100",
        warning:
            "border-yellow-200 bg-yellow-50 text-yellow-950 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100",
        success:
            "border-green-200 bg-green-50 text-green-950 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100",
        info: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
    }

    const icon = {
        critical: <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />,
        warning: <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />,
        success: <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />,
        info: <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />,
    }

    return (
        <div className={`flex gap-3 rounded-lg border p-4 ${styles[insight.type]}`}>
            {icon[insight.type]}

            <div>
                <p className="font-medium">{insight.title}</p>
                <p className="mt-1 text-sm opacity-80">
                    {insight.description}
                </p>
            </div>
        </div>
    )
}

function getDecision(supplier: Supplier) {
    const summary = supplier.analytics.summary

    if (supplier.status === "BLOCKED") {
        return {
            title: "Fornecedor bloqueado",
            description:
                "Não avance com novas decisões de fornecimento sem uma revisão formal do bloqueio e das medidas de contenção.",
            className:
                "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
            icon: <ShieldAlert className="h-6 w-6 text-red-600" />,
        }
    }

    if (
        supplier.status === "AT_RISK" ||
        summary.openRedRisks > 0 ||
        summary.redRisksWithoutActionPlan > 0
    ) {
        return {
            title: "Escalonamento imediato recomendado",
            description:
                "Há exposição crítica aberta. Priorize contenção, responsável definido e plano de ação antes de ampliar a dependência deste fornecedor.",
            className:
                "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
            icon: <ShieldAlert className="h-6 w-6 text-red-600" />,
        }
    }

    if (
        supplier.status === "UNDER_MONITORING" ||
        summary.overdueActionPlans > 0 ||
        summary.pendingLogisticsRequests > 0
    ) {
        return {
            title: "Manter sob monitoramento",
            description:
                "Existem pendências que podem afetar a decisão. Condicione novos compromissos à regularização dos prazos e das solicitações abertas.",
            className:
                "border-yellow-300 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30",
            icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
        }
    }

    if (summary.openRisks === 0) {
        return {
            title: "Cenário operacional controlado",
            description:
                "Não há RMs abertas nem pendências críticas identificadas. Mantenha a rotina normal de acompanhamento.",
            className:
                "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/30",
            icon: <CheckCircle2 className="h-6 w-6 text-green-600" />,
        }
    }

    return {
        title: "Acompanhamento regular recomendado",
        description:
            "Há ocorrências abertas, mas sem gatilhos críticos no momento. Revise evolução, responsáveis e prazos periodicamente.",
        className:
            "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30",
        icon: <Target className="h-6 w-6 text-blue-600" />,
    }
}

export default function SupplierDetailsPage() {
    const params = useParams<{ id: string }>()
    const router = useRouter()

    const supplierId = params.id

    const [supplier, setSupplier] = useState<Supplier | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusLoading, setStatusLoading] = useState(false)

    const [contactDialogOpen, setContactDialogOpen] = useState(false)
    const [contactSaving, setContactSaving] = useState(false)
    const [deletingContactId, setDeletingContactId] = useState<string | null>(null)
    const [contact, setContact] = useState({
        name: "",
        email: "",
        phone: "",
        position: "",
    })

    const [riskSearch, setRiskSearch] = useState("")
    const [riskLevelFilter, setRiskLevelFilter] = useState("all")
    const [riskStatusFilter, setRiskStatusFilter] = useState("all")

    const [partSearch, setPartSearch] = useState("")
    const [partStatusFilter, setPartStatusFilter] = useState("all")
    const [partLogisticsFilter, setPartLogisticsFilter] = useState("all")

    const [actionSearch, setActionSearch] = useState("")
    const [actionStatusFilter, setActionStatusFilter] = useState("all")
    const [actionPriorityFilter, setActionPriorityFilter] = useState("all")
    const [actionDeadlineFilter, setActionDeadlineFilter] = useState("all")

    const [logisticsSearch, setLogisticsSearch] = useState("")
    const [logisticsStatusFilter, setLogisticsStatusFilter] = useState("all")
    const [logisticsTypeFilter, setLogisticsTypeFilter] = useState("all")

    const loadSupplier = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/suppliers/${supplierId}`, {
                credentials: "include",
                cache: "no-store",
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.details ||
                        data.error ||
                        "Erro ao buscar fornecedor"
                )
            }

            setSupplier(data)
        } catch (loadError) {
            console.error(loadError)
            setSupplier(null)
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "Erro ao buscar fornecedor"
            )
        } finally {
            setLoading(false)
        }
    }, [supplierId])

    useEffect(() => {
        void loadSupplier()
    }, [loadSupplier])

    const partRows = useMemo<PartRow[]>(() => {
        if (!supplier) return []

        return supplier.riskEvents.flatMap((risk) =>
            risk.parts.map((part) => ({
                ...part,
                riskId: risk.id,
                riskCode: risk.code,
                riskTitle: risk.title,
            }))
        )
    }, [supplier])

    const actionPlanRows = useMemo<ActionPlanRow[]>(() => {
        if (!supplier) return []

        return supplier.riskEvents.flatMap((risk) =>
            risk.actionPlans.map((plan) => ({
                ...plan,
                riskId: risk.id,
                riskCode: risk.code,
                riskLevel: risk.riskLevel,
            }))
        )
    }, [supplier])

    const logisticsRows = useMemo<LogisticsRow[]>(() => {
        if (!supplier) return []

        return supplier.riskEvents.flatMap((risk) =>
            risk.logistics.map((request) => ({
                ...request,
                riskId: risk.id,
                riskCode: risk.code,
                riskLevel: risk.riskLevel,
            }))
        )
    }, [supplier])

    const filteredRisks = useMemo(() => {
        if (!supplier) return []

        const search = normalize(riskSearch)

        return supplier.riskEvents.filter((risk) => {
            const matchesSearch =
                !search ||
                normalize(risk.code).includes(search) ||
                normalize(risk.title).includes(search) ||
                normalize(risk.description).includes(search) ||
                normalize(risk.assignedTo?.name).includes(search)

            const matchesLevel =
                riskLevelFilter === "all" ||
                risk.riskLevel === riskLevelFilter

            const matchesStatus =
                riskStatusFilter === "all" ||
                risk.workflowStatus === riskStatusFilter

            return matchesSearch && matchesLevel && matchesStatus
        })
    }, [supplier, riskSearch, riskLevelFilter, riskStatusFilter])

    const filteredParts = useMemo(() => {
        const search = normalize(partSearch)

        return partRows.filter((part) => {
            const matchesSearch =
                !search ||
                normalize(part.partNumber?.partNumber).includes(search) ||
                normalize(part.partNumber?.description).includes(search) ||
                normalize(part.partNumber?.vehicleProgram).includes(search) ||
                normalize(part.riskCode).includes(search) ||
                normalize(part.assignedTo?.name).includes(search)

            const matchesStatus =
                partStatusFilter === "all" ||
                part.status === partStatusFilter

            const matchesLogistics =
                partLogisticsFilter === "all" ||
                part.logisticsStatus === partLogisticsFilter

            return matchesSearch && matchesStatus && matchesLogistics
        })
    }, [partRows, partSearch, partStatusFilter, partLogisticsFilter])

    const filteredActionPlans = useMemo(() => {
        const search = normalize(actionSearch)

        return actionPlanRows.filter((plan) => {
            const matchesSearch =
                !search ||
                normalize(plan.title).includes(search) ||
                normalize(plan.description).includes(search) ||
                normalize(plan.requiredAction).includes(search) ||
                normalize(plan.riskCode).includes(search) ||
                normalize(plan.riskEventPart?.partNumber?.partNumber).includes(search) ||
                normalize(plan.assignedTo?.name).includes(search)

            const matchesStatus =
                actionStatusFilter === "all" ||
                plan.status === actionStatusFilter

            const matchesPriority =
                actionPriorityFilter === "all" ||
                plan.priority === actionPriorityFilter

            const matchesDeadline =
                actionDeadlineFilter === "all" ||
                (actionDeadlineFilter === "overdue" && plan.isOverdue) ||
                (actionDeadlineFilter === "on_time" && !plan.isOverdue)

            return (
                matchesSearch &&
                matchesStatus &&
                matchesPriority &&
                matchesDeadline
            )
        })
    }, [
        actionPlanRows,
        actionSearch,
        actionStatusFilter,
        actionPriorityFilter,
        actionDeadlineFilter,
    ])

    const filteredLogistics = useMemo(() => {
        const search = normalize(logisticsSearch)

        return logisticsRows.filter((request) => {
            const matchesSearch =
                !search ||
                normalize(request.code).includes(search) ||
                normalize(request.riskCode).includes(search) ||
                normalize(request.riskEventPart?.partNumber?.partNumber).includes(search) ||
                normalize(request.assignedTo?.name).includes(search)

            const matchesStatus =
                logisticsStatusFilter === "all" ||
                request.status === logisticsStatusFilter

            const matchesType =
                logisticsTypeFilter === "all" ||
                request.type === logisticsTypeFilter

            return matchesSearch && matchesStatus && matchesType
        })
    }, [
        logisticsRows,
        logisticsSearch,
        logisticsStatusFilter,
        logisticsTypeFilter,
    ])

    async function updateStatus(status: string) {
        if (!supplier || status === supplier.status) return

        try {
            setStatusLoading(true)

            const response = await fetch(
                `/api/suppliers/${supplierId}/status`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ status }),
                }
            )

            const data = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(
                    data?.details ||
                        data?.error ||
                        "Erro ao atualizar status"
                )
            }

            setSupplier((current) =>
                current
                    ? {
                          ...current,
                          status,
                          statusLabel: getSupplierStatusLabel(status),
                      }
                    : current
            )

            toast.success("Status do fornecedor atualizado.")
        } catch (statusError) {
            console.error(statusError)
            toast.error(
                statusError instanceof Error
                    ? statusError.message
                    : "Erro ao atualizar status"
            )
        } finally {
            setStatusLoading(false)
        }
    }

    async function createContact() {
        if (!contact.name.trim()) {
            toast.error("Informe o nome do contato.")
            return
        }

        try {
            setContactSaving(true)

            const response = await fetch(
                `/api/suppliers/${supplierId}/contacts`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: contact.name.trim(),
                        email: contact.email.trim() || null,
                        phone: contact.phone.trim() || null,
                        position: contact.position.trim() || null,
                    }),
                }
            )

            const data = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(
                    data?.details ||
                        data?.error ||
                        "Erro ao adicionar contato"
                )
            }

            setContact({
                name: "",
                email: "",
                phone: "",
                position: "",
            })
            setContactDialogOpen(false)
            await loadSupplier()
            toast.success("Contato adicionado.")
        } catch (contactError) {
            console.error(contactError)
            toast.error(
                contactError instanceof Error
                    ? contactError.message
                    : "Erro ao adicionar contato"
            )
        } finally {
            setContactSaving(false)
        }
    }

    async function deleteContact(contactId: string) {
        const confirmed = window.confirm(
            "Deseja realmente excluir este contato?"
        )

        if (!confirmed) return

        try {
            setDeletingContactId(contactId)

            const response = await fetch(
                `/api/supplier-contacts/${contactId}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            )

            const data = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(
                    data?.details ||
                        data?.error ||
                        "Erro ao excluir contato"
                )
            }

            setSupplier((current) =>
                current
                    ? {
                          ...current,
                          contacts: current.contacts.filter(
                              (item) => item.id !== contactId
                          ),
                      }
                    : current
            )

            toast.success("Contato excluído.")
        } catch (deleteError) {
            console.error(deleteError)
            toast.error(
                deleteError instanceof Error
                    ? deleteError.message
                    : "Erro ao excluir contato"
            )
        } finally {
            setDeletingContactId(null)
        }
    }

    if (loading && !supplier) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!supplier) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Fornecedor não encontrado</CardTitle>
                        <CardDescription>
                            {error ||
                                "Não foi possível carregar os dados do fornecedor."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push("/suppliers")}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>

                        <Button onClick={() => void loadSupplier()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Tentar novamente
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const summary = supplier.analytics.summary
    const decision = getDecision(supplier)

    const riskClosureRate =
        summary.openRisks + summary.closedRisks > 0
            ? (summary.closedRisks /
                  (summary.openRisks + summary.closedRisks)) *
              100
            : 0

    const actionCompletionRate =
        summary.totalActionPlans > 0
            ? (summary.completedActionPlans /
                  summary.totalActionPlans) *
              100
            : 0

    return (
        <ProtectedRoute permission="SUPPLIER_VIEW">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-6 p-4 md:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => router.push("/suppliers")}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>

                                <div>
                                    <h1 className="text-2xl font-semibold">
                                        Análise do fornecedor
                                    </h1>

                                    <p className="text-sm text-muted-foreground">
                                        Visão executiva, exposição a risco e pendências operacionais.
                                    </p>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void loadSupplier()}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                Atualizar análise
                            </Button>
                        </div>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-xl bg-muted p-3">
                                            <Building2 className="h-8 w-8 text-muted-foreground" />
                                        </div>

                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-2xl font-bold">
                                                    {supplier.name}
                                                </h2>
                                                {getSupplierStatusBadge(
                                                    supplier.status
                                                )}
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1.5">
                                                    <Flag className="h-4 w-4" />
                                                    SAP: {supplier.supplierCodeSap || "-"}
                                                </span>

                                                <span className="flex items-center gap-1.5">
                                                    <Globe2 className="h-4 w-4" />
                                                    {supplier.country
                                                        ? `${supplier.country.name} (${supplier.country.isoCode})`
                                                        : "País não informado"}
                                                </span>

                                                <span className="flex items-center gap-1.5">
                                                    <UsersRound className="h-4 w-4" />
                                                    {supplier.contacts.length} contato(s)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full xl:w-[280px]">
                                        <Label htmlFor="supplier-status">
                                            Status do fornecedor
                                        </Label>

                                        <Select
                                            value={supplier.status}
                                            onValueChange={(value) =>
                                                void updateStatus(value)
                                            }
                                            disabled={statusLoading}
                                        >
                                            <SelectTrigger
                                                id="supplier-status"
                                                className="mt-2 w-full"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="ACTIVE">
                                                    Ativo
                                                </SelectItem>
                                                <SelectItem value="UNDER_MONITORING">
                                                    Em monitoramento
                                                </SelectItem>
                                                <SelectItem value="AT_RISK">
                                                    Em risco
                                                </SelectItem>
                                                <SelectItem value="BLOCKED">
                                                    Bloqueado
                                                </SelectItem>
                                                <SelectItem value="INACTIVE">
                                                    Inativo
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                            <MetricCard
                                title="Risk score"
                                value={supplier.riskScore ?? "-"}
                                description={`Calculado em ${formatDate(
                                    supplier.lastRiskCalculation
                                )}`}
                                icon={<BarChart3 className="h-5 w-5" />}
                            />

                            <MetricCard
                                title="RMs abertas"
                                value={summary.openRisks}
                                description={`${summary.totalRisks} RM(s) no histórico`}
                                icon={<Flag className="h-5 w-5" />}
                            />

                            <MetricCard
                                title="Críticas abertas"
                                value={summary.openRedRisks}
                                description="RMs abertas em vermelho"
                                attention={summary.openRedRisks > 0}
                                icon={<ShieldAlert className="h-5 w-5" />}
                            />

                            <MetricCard
                                title="Planos atrasados"
                                value={summary.overdueActionPlans}
                                description={`${summary.totalActionPlans} plano(s) no total`}
                                attention={summary.overdueActionPlans > 0}
                                icon={<Clock3 className="h-5 w-5" />}
                            />

                            <MetricCard
                                title="Logística pendente"
                                value={summary.pendingLogisticsRequests}
                                description={`${summary.inReviewLogisticsRequests} em análise`}
                                attention={summary.pendingLogisticsRequests > 0}
                                icon={<Truck className="h-5 w-5" />}
                            />

                            <MetricCard
                                title="PNs monitorados"
                                value={summary.totalParts}
                                description={`${summary.risksWithoutParts} RM(s) sem PN`}
                                icon={<Package className="h-5 w-5" />}
                            />
                        </div>

                        <Tabs defaultValue="overview" className="w-full">
                            <div className="overflow-x-auto pb-1">
                                <TabsList className="w-max min-w-full justify-start">
                                    <TabsTrigger value="overview">
                                        Visão executiva
                                    </TabsTrigger>
                                    <TabsTrigger value="risks">
                                        RMs ({supplier.riskEvents.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="parts">
                                        PNs ({partRows.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="actions">
                                        Planos ({actionPlanRows.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="logistics">
                                        Logística ({logisticsRows.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="contacts">
                                        Contatos ({supplier.contacts.length})
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="overview" className="mt-4 space-y-6">
                                <div className="grid gap-6 xl:grid-cols-12">
                                    <Card className={`xl:col-span-5 ${decision.className}`}>
                                        <CardHeader>
                                            <div className="flex items-start gap-3">
                                                {decision.icon}
                                                <div>
                                                    <CardTitle>
                                                        Recomendação executiva
                                                    </CardTitle>
                                                    <CardDescription className="mt-1 text-current opacity-75">
                                                        Síntese baseada nas pendências e riscos atuais.
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent>
                                            <p className="font-semibold">
                                                {decision.title}
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                {decision.description}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="xl:col-span-7">
                                        <CardHeader>
                                            <CardTitle>Insights prioritários</CardTitle>
                                            <CardDescription>
                                                Pontos que merecem atenção na tomada de decisão.
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="grid gap-3 md:grid-cols-2">
                                            {supplier.analytics.insights.length > 0 ? (
                                                supplier.analytics.insights.map(
                                                    (insight, index) => (
                                                        <InsightItem
                                                            key={`${insight.type}-${insight.title}-${index}`}
                                                            insight={insight}
                                                        />
                                                    )
                                                )
                                            ) : (
                                                <div className="md:col-span-2">
                                                    <EmptyState message="Nenhum insight disponível." />
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">
                                                RMs por farol
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <DonutSummaryChart
                                                data={
                                                    supplier.analytics.charts
                                                        .risksByLevel
                                                }
                                            />
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">
                                                RMs por status
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <DonutSummaryChart
                                                data={
                                                    supplier.analytics.charts
                                                        .risksByWorkflowStatus
                                                }
                                            />
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">
                                                PNs por farol
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <DonutSummaryChart
                                                data={
                                                    supplier.analytics.charts
                                                        .partsByStatus
                                                }
                                            />
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">
                                                Logística por status
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <DonutSummaryChart
                                                data={
                                                    supplier.analytics.charts
                                                        .logisticsByStatus
                                                }
                                            />
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid gap-6 xl:grid-cols-12">
                                    <Card className="xl:col-span-7">
                                        <CardHeader>
                                            <CardTitle>Planos de ação</CardTitle>
                                            <CardDescription>
                                                Distribuição por estágio e atraso.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <BarSummaryChart
                                                data={
                                                    supplier.analytics.charts
                                                        .actionPlansByStatus
                                                }
                                            />
                                        </CardContent>
                                    </Card>

                                    <Card className="xl:col-span-5">
                                        <CardHeader>
                                            <CardTitle>Indicadores de desempenho</CardTitle>
                                            <CardDescription>
                                                Idade, resolução e eficiência operacional.
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="grid gap-4 sm:grid-cols-2">
                                            <div className="rounded-lg border p-4">
                                                <p className="text-sm text-muted-foreground">
                                                    RM aberta mais antiga
                                                </p>
                                                <p className="mt-1 text-xl font-semibold">
                                                    {formatDays(
                                                        summary.oldestOpenRiskDays
                                                    )}
                                                </p>
                                            </div>

                                            <div className="rounded-lg border p-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Idade média das RMs abertas
                                                </p>
                                                <p className="mt-1 text-xl font-semibold">
                                                    {formatDays(
                                                        summary.avgOpenRiskAgeDays
                                                    )}
                                                </p>
                                            </div>

                                            <div className="rounded-lg border p-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Tempo médio de resolução
                                                </p>
                                                <p className="mt-1 text-xl font-semibold">
                                                    {formatDays(
                                                        summary.avgResolutionDays
                                                    )}
                                                </p>
                                            </div>

                                            <div className="rounded-lg border p-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Pendência logística mais antiga
                                                </p>
                                                <p className="mt-1 text-xl font-semibold">
                                                    {formatDays(
                                                        summary.oldestPendingLogisticsDays
                                                    )}
                                                </p>
                                            </div>

                                            <div className="rounded-lg border p-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Taxa de fechamento de RMs
                                                </p>
                                                <p className="mt-1 text-xl font-semibold">
                                                    {formatPercentage(
                                                        riskClosureRate
                                                    )}
                                                </p>
                                            </div>

                                            <div className="rounded-lg border p-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Conclusão dos planos
                                                </p>
                                                <p className="mt-1 text-xl font-semibold">
                                                    {formatPercentage(
                                                        actionCompletionRate
                                                    )}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Dados cadastrais</CardTitle>
                                        <CardDescription>
                                            Informações de identificação e localização.
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Globe2 className="h-4 w-4" />
                                                País
                                            </div>
                                            <p className="mt-1 font-medium">
                                                {supplier.country?.name || "-"}
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Flag className="h-4 w-4" />
                                                Código SAP
                                            </div>
                                            <p className="mt-1 font-medium">
                                                {supplier.supplierCodeSap || "-"}
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="h-4 w-4" />
                                                Endereço
                                            </div>
                                            <p className="mt-1 font-medium">
                                                {supplier.address || "-"}
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <CalendarDays className="h-4 w-4" />
                                                Cadastrado em
                                            </div>
                                            <p className="mt-1 font-medium">
                                                {formatDate(supplier.createdAt)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="risks" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>RMs do fornecedor</CardTitle>
                                        <CardDescription>
                                            {filteredRisks.length} de {supplier.riskEvents.length} RM(s) exibida(s).
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <FilterCard>
                                            <Input
                                                placeholder="Buscar por RM, título ou responsável..."
                                                value={riskSearch}
                                                onChange={(event) =>
                                                    setRiskSearch(event.target.value)
                                                }
                                            />

                                            <Select
                                                value={riskLevelFilter}
                                                onValueChange={setRiskLevelFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Farol" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos os faróis</SelectItem>
                                                    <SelectItem value="RED">Vermelho</SelectItem>
                                                    <SelectItem value="YELLOW">Amarelo</SelectItem>
                                                    <SelectItem value="GREEN">Verde</SelectItem>
                                                    <SelectItem value="ORANGE">Laranja</SelectItem>
                                                    <SelectItem value="GREY">Cinza</SelectItem>
                                                    <SelectItem value="BLUE">Azul</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={riskStatusFilter}
                                                onValueChange={setRiskStatusFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos os status</SelectItem>
                                                    <SelectItem value="OPEN">Aberta</SelectItem>
                                                    <SelectItem value="CLOSED">Fechada</SelectItem>
                                                    <SelectItem value="CANCELED">Cancelada</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setRiskSearch("")
                                                    setRiskLevelFilter("all")
                                                    setRiskStatusFilter("all")
                                                }}
                                            >
                                                Limpar filtros
                                            </Button>
                                        </FilterCard>

                                        <RiskTable
                                            risks={filteredRisks}
                                            onOpen={(riskId) =>
                                                router.push(`/rms/${riskId}`)
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="parts" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Part numbers monitorados</CardTitle>
                                        <CardDescription>
                                            {filteredParts.length} de {partRows.length} vínculo(s) exibido(s).
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <FilterCard>
                                            <Input
                                                placeholder="Buscar por PN, descrição, veículo ou RM..."
                                                value={partSearch}
                                                onChange={(event) =>
                                                    setPartSearch(event.target.value)
                                                }
                                            />

                                            <Select
                                                value={partStatusFilter}
                                                onValueChange={setPartStatusFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Farol" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos os faróis</SelectItem>
                                                    <SelectItem value="RED">Vermelho</SelectItem>
                                                    <SelectItem value="YELLOW">Amarelo</SelectItem>
                                                    <SelectItem value="GREEN">Verde</SelectItem>
                                                    <SelectItem value="ORANGE">Laranja</SelectItem>
                                                    <SelectItem value="GREY">Cinza</SelectItem>
                                                    <SelectItem value="BLUE">Azul</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={partLogisticsFilter}
                                                onValueChange={setPartLogisticsFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Logística" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos os status logísticos</SelectItem>
                                                    <SelectItem value="NOT_REQUESTED">Não solicitada</SelectItem>
                                                    <SelectItem value="REQUESTED">Solicitada</SelectItem>
                                                    <SelectItem value="IN_LOGISTICS">Em logística</SelectItem>
                                                    <SelectItem value="APPROVED">Aprovada</SelectItem>
                                                    <SelectItem value="REJECTED">Rejeitada</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setPartSearch("")
                                                    setPartStatusFilter("all")
                                                    setPartLogisticsFilter("all")
                                                }}
                                            >
                                                Limpar filtros
                                            </Button>
                                        </FilterCard>

                                        <PartsTable
                                            parts={filteredParts}
                                            onOpen={(riskId) =>
                                                router.push(`/rms/${riskId}`)
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="actions" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Planos de ação</CardTitle>
                                        <CardDescription>
                                            {filteredActionPlans.length} de {actionPlanRows.length} plano(s) exibido(s).
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <FilterCard>
                                            <Input
                                                placeholder="Buscar por plano, PN, RM ou responsável..."
                                                value={actionSearch}
                                                onChange={(event) =>
                                                    setActionSearch(event.target.value)
                                                }
                                            />

                                            <Select
                                                value={actionStatusFilter}
                                                onValueChange={setActionStatusFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos os status</SelectItem>
                                                    <SelectItem value="OPEN">Aberto</SelectItem>
                                                    <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
                                                    <SelectItem value="WAITING_VALIDATION">Aguardando validação</SelectItem>
                                                    <SelectItem value="COMPLETED">Concluído</SelectItem>
                                                    <SelectItem value="CANCELED">Cancelado</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={actionPriorityFilter}
                                                onValueChange={setActionPriorityFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Prioridade" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todas as prioridades</SelectItem>
                                                    <SelectItem value="CRITICAL">Crítica</SelectItem>
                                                    <SelectItem value="HIGH">Alta</SelectItem>
                                                    <SelectItem value="MEDIUM">Média</SelectItem>
                                                    <SelectItem value="LOW">Baixa</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={actionDeadlineFilter}
                                                onValueChange={setActionDeadlineFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Prazo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos os prazos</SelectItem>
                                                    <SelectItem value="overdue">Somente atrasados</SelectItem>
                                                    <SelectItem value="on_time">Não atrasados</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FilterCard>

                                        <ActionPlansTable
                                            plans={filteredActionPlans}
                                            onOpen={(riskId) =>
                                                router.push(`/rms/${riskId}`)
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="logistics" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Solicitações logísticas</CardTitle>
                                        <CardDescription>
                                            {filteredLogistics.length} de {logisticsRows.length} solicitação(ões) exibida(s).
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <FilterCard>
                                            <Input
                                                placeholder="Buscar por solicitação, PN, RM ou responsável..."
                                                value={logisticsSearch}
                                                onChange={(event) =>
                                                    setLogisticsSearch(event.target.value)
                                                }
                                            />

                                            <Select
                                                value={logisticsStatusFilter}
                                                onValueChange={setLogisticsStatusFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos os status</SelectItem>
                                                    <SelectItem value="PENDING">Pendente</SelectItem>
                                                    <SelectItem value="IN_REVIEW">Em análise</SelectItem>
                                                    <SelectItem value="APPROVED">Aprovada</SelectItem>
                                                    <SelectItem value="REJECTED">Rejeitada</SelectItem>
                                                    <SelectItem value="CANCELED">Cancelada</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={logisticsTypeFilter}
                                                onValueChange={setLogisticsTypeFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos os tipos</SelectItem>
                                                    <SelectItem value="BOOK_INCLUSION">Inclusão no book</SelectItem>
                                                    <SelectItem value="BUFFER_CALCULATION">Cálculo de buffer</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setLogisticsSearch("")
                                                    setLogisticsStatusFilter("all")
                                                    setLogisticsTypeFilter("all")
                                                }}
                                            >
                                                Limpar filtros
                                            </Button>
                                        </FilterCard>

                                        <LogisticsTable
                                            requests={filteredLogistics}
                                            onOpen={(riskId) =>
                                                router.push(`/rms/${riskId}`)
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="contacts" className="mt-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                                        <div>
                                            <CardTitle>Contatos do fornecedor</CardTitle>
                                            <CardDescription>
                                                Pontos de contato para escalonamento e acompanhamento.
                                            </CardDescription>
                                        </div>

                                        <Dialog
                                            open={contactDialogOpen}
                                            onOpenChange={setContactDialogOpen}
                                        >
                                            <DialogTrigger asChild>
                                                <Button type="button">
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Adicionar contato
                                                </Button>
                                            </DialogTrigger>

                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        Adicionar contato
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Cadastre um ponto de contato do fornecedor.
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="grid gap-4 py-2">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="contact-name">
                                                            Nome
                                                        </Label>
                                                        <Input
                                                            id="contact-name"
                                                            value={contact.name}
                                                            onChange={(event) =>
                                                                setContact((current) => ({
                                                                    ...current,
                                                                    name: event.target.value,
                                                                }))
                                                            }
                                                            placeholder="Nome completo"
                                                        />
                                                    </div>

                                                    <div className="grid gap-2">
                                                        <Label htmlFor="contact-position">
                                                            Cargo/Função
                                                        </Label>
                                                        <Input
                                                            id="contact-position"
                                                            value={contact.position}
                                                            onChange={(event) =>
                                                                setContact((current) => ({
                                                                    ...current,
                                                                    position: event.target.value,
                                                                }))
                                                            }
                                                            placeholder="Ex.: Key Account Manager"
                                                        />
                                                    </div>

                                                    <div className="grid gap-2">
                                                        <Label htmlFor="contact-email">
                                                            E-mail
                                                        </Label>
                                                        <Input
                                                            id="contact-email"
                                                            type="email"
                                                            value={contact.email}
                                                            onChange={(event) =>
                                                                setContact((current) => ({
                                                                    ...current,
                                                                    email: event.target.value,
                                                                }))
                                                            }
                                                            placeholder="nome@fornecedor.com"
                                                        />
                                                    </div>

                                                    <div className="grid gap-2">
                                                        <Label htmlFor="contact-phone">
                                                            Telefone
                                                        </Label>
                                                        <Input
                                                            id="contact-phone"
                                                            value={contact.phone}
                                                            onChange={(event) =>
                                                                setContact((current) => ({
                                                                    ...current,
                                                                    phone: event.target.value,
                                                                }))
                                                            }
                                                            placeholder="+55 ..."
                                                        />
                                                    </div>

                                                    <Button
                                                        type="button"
                                                        className="w-full"
                                                        onClick={() => void createContact()}
                                                        disabled={contactSaving}
                                                    >
                                                        {contactSaving && (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        )}
                                                        Salvar contato
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </CardHeader>

                                    <CardContent>
                                        <ContactsTable
                                            contacts={supplier.contacts}
                                            deletingContactId={deletingContactId}
                                            onDelete={(contactId) =>
                                                void deleteContact(contactId)
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}

function RiskTable({
    risks,
    onOpen,
}: {
    risks: RiskEvent[]
    onOpen: (riskId: string) => void
}) {
    if (risks.length === 0) {
        return <EmptyState message="Nenhuma RM encontrada." />
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>RM</TableHead>
                        <TableHead className="min-w-[240px]">Título</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Farol</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>PNs</TableHead>
                        <TableHead>Planos</TableHead>
                        <TableHead>Aberta em</TableHead>
                        <TableHead className="text-right">Abrir</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {risks.map((risk) => (
                        <TableRow key={risk.id}>
                            <TableCell className="font-medium">
                                {risk.code}
                            </TableCell>
                            <TableCell>
                                <p className="font-medium">{risk.title}</p>
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                    {risk.description || "-"}
                                </p>
                            </TableCell>
                            <TableCell>
                                {getWorkflowBadge(risk.workflowStatus)}
                            </TableCell>
                            <TableCell>{getRiskBadge(risk.riskLevel)}</TableCell>
                            <TableCell>{risk.assignedTo?.name || "-"}</TableCell>
                            <TableCell>{risk.parts.length}</TableCell>
                            <TableCell>{risk.actionPlans.length}</TableCell>
                            <TableCell>{formatDate(risk.createdAt)}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpen(risk.id)}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Abrir
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function PartsTable({
    parts,
    onOpen,
}: {
    parts: PartRow[]
    onOpen: (riskId: string) => void
}) {
    if (parts.length === 0) {
        return <EmptyState message="Nenhum PN encontrado." />
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>PN</TableHead>
                        <TableHead className="min-w-[220px]">Descrição</TableHead>
                        <TableHead>Veículo/Programa</TableHead>
                        <TableHead>RM</TableHead>
                        <TableHead>Farol</TableHead>
                        <TableHead>Status logístico</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead className="text-right">Abrir RM</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {parts.map((part) => (
                        <TableRow key={part.id}>
                            <TableCell className="font-medium">
                                {part.partNumber?.partNumber || "-"}
                            </TableCell>
                            <TableCell>
                                {part.partNumber?.description || "-"}
                            </TableCell>
                            <TableCell>
                                {part.partNumber?.vehicleProgram || "-"}
                            </TableCell>
                            <TableCell className="font-medium">
                                {part.riskCode}
                            </TableCell>
                            <TableCell>{getRiskBadge(part.status)}</TableCell>
                            <TableCell>
                                <Badge variant="outline">
                                    {part.logisticsStatus}
                                </Badge>
                            </TableCell>
                            <TableCell>{part.assignedTo?.name || "-"}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpen(part.riskId)}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Abrir
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function ActionPlansTable({
    plans,
    onOpen,
}: {
    plans: ActionPlanRow[]
    onOpen: (riskId: string) => void
}) {
    if (plans.length === 0) {
        return <EmptyState message="Nenhum plano de ação encontrado." />
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="min-w-[260px]">Plano</TableHead>
                        <TableHead>RM</TableHead>
                        <TableHead>PN</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Prazo</TableHead>
                        <TableHead className="text-right">Abrir RM</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {plans.map((plan) => (
                        <TableRow key={plan.id}>
                            <TableCell>
                                <p className="font-medium">{plan.title}</p>
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                    {plan.requiredAction ||
                                        plan.description ||
                                        "-"}
                                </p>
                            </TableCell>
                            <TableCell className="font-medium">
                                {plan.riskCode}
                            </TableCell>
                            <TableCell>
                                {plan.riskEventPart?.partNumber?.partNumber || "-"}
                            </TableCell>
                            <TableCell>
                                {getActionPlanStatusBadge(
                                    plan.status,
                                    plan.isOverdue
                                )}
                            </TableCell>
                            <TableCell>
                                {getPriorityBadge(plan.priority)}
                            </TableCell>
                            <TableCell>{plan.assignedTo?.name || "-"}</TableCell>
                            <TableCell>
                                <span
                                    className={
                                        plan.isOverdue
                                            ? "font-medium text-red-600"
                                            : ""
                                    }
                                >
                                    {formatDate(plan.dueDate)}
                                </span>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpen(plan.riskId)}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Abrir
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function LogisticsTable({
    requests,
    onOpen,
}: {
    requests: LogisticsRow[]
    onOpen: (riskId: string) => void
}) {
    if (requests.length === 0) {
        return <EmptyState message="Nenhuma solicitação logística encontrada." />
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>RM</TableHead>
                        <TableHead>PN</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Solicitada em</TableHead>
                        <TableHead className="text-right">Abrir RM</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {requests.map((request) => (
                        <TableRow key={request.id}>
                            <TableCell className="font-medium">
                                {request.code || "-"}
                            </TableCell>
                            <TableCell className="font-medium">
                                {request.riskCode}
                            </TableCell>
                            <TableCell>
                                {request.riskEventPart?.partNumber?.partNumber || "-"}
                            </TableCell>
                            <TableCell>
                                {formatLogisticsType(request.type)}
                            </TableCell>
                            <TableCell>
                                {getLogisticsStatusBadge(request.status)}
                            </TableCell>
                            <TableCell>
                                {getPriorityBadge(request.priority)}
                            </TableCell>
                            <TableCell>
                                {request.assignedTo?.name || "-"}
                            </TableCell>
                            <TableCell>
                                {formatDateTime(request.requestedAt)}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpen(request.riskId)}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Abrir
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function ContactsTable({
    contacts,
    deletingContactId,
    onDelete,
}: {
    contacts: Contact[]
    deletingContactId: string | null
    onDelete: (contactId: string) => void
}) {
    if (contacts.length === 0) {
        return <EmptyState message="Nenhum contato cadastrado." />
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cargo/Função</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Cadastrado em</TableHead>
                        <TableHead className="text-right">Excluir</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="rounded-full bg-muted p-2">
                                        <UserRound className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">
                                        {contact.name}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>{contact.position || "-"}</TableCell>
                            <TableCell>
                                {contact.email ? (
                                    <a
                                        href={`mailto:${contact.email}`}
                                        className="inline-flex items-center gap-1.5 hover:underline"
                                    >
                                        <Mail className="h-4 w-4" />
                                        {contact.email}
                                    </a>
                                ) : (
                                    "-"
                                )}
                            </TableCell>
                            <TableCell>
                                {contact.phone ? (
                                    <a
                                        href={`tel:${contact.phone}`}
                                        className="inline-flex items-center gap-1.5 hover:underline"
                                    >
                                        <Phone className="h-4 w-4" />
                                        {contact.phone}
                                    </a>
                                ) : (
                                    "-"
                                )}
                            </TableCell>
                            <TableCell>{formatDate(contact.createdAt)}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={deletingContactId === contact.id}
                                    onClick={() => onDelete(contact.id)}
                                >
                                    {deletingContactId === contact.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
