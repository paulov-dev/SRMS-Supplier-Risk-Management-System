"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"

import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"

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
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    Eye,
    Loader2,
    Mail,
    Package,
    Shield,
    ShieldAlert,
    Truck,
    UserCircle,
} from "lucide-react"

type Role = {
    id: string
    name: string
}

type RiskItem = {
    id: string
    code?: string | null
    title: string
    riskLevel: string
    workflowStatus?: string
    createdAt: string
    supplier: {
        id: string
        name: string
    }
    status: {
        id: string
        name: string
    }
}

type LogisticsItem = {
    id: string
    code?: string | null
    type?: string | null
    status: string
    requestedAt: string
    acceptedAt?: string | null
    reviewedAt?: string | null
    riskEvent: {
        id: string
        code?: string | null
        title: string
        riskLevel: string
        workflowStatus?: string
        supplier: {
            id: string
            name: string
        }
        status: {
            id: string
            name: string
        }
    }
}

type ActionPlanItem = {
    id: string
    title: string
    description: string | null
    requiredAction: string | null
    responsibleArea: string | null
    dueDate: string | null
    priority: string
    status: string
    submittedAt: string | null
    validatedAt: string | null
    evidenceUrl: string | null
    closingNotes: string | null
    isOverdue: boolean
    createdAt: string
    updatedAt: string
    riskEvent: {
        id: string
        code: string
        title: string
        riskLevel: string
        workflowStatus: string
        supplier: {
            id: string
            name: string
        }
    } | null
    riskEventPart: {
        id: string
        status: string
        partNumber: {
            id: string
            partNumber: string
            description: string | null
            vehicleProgram: string | null
        }
    } | null
    createdBy: {
        id: string
        name: string
        email: string
    } | null
    assignedTo: {
        id: string
        name: string
        email: string
    } | null
    validatedBy: {
        id: string
        name: string
        email: string
    } | null
}

type PendingActionItem = {
    id: string
    type: string
    typeLabel: string
    title: string
    description: string
    riskEventId: string
    riskCode: string
    supplierName: string
    pn: string | null
    status: string | null
    priority: string | null
    dueDate: string | null
    createdAt: string | null
    href: string
}

type AnalyticsChartItem = {
    name: string
    value?: string
    type?: string
    total: number
}

type UserAnalytics = {
    summary: {
        assignedRisks: number
        createdRisks: number
        openAssignedRisks: number
        closedAssignedRisks: number
        canceledAssignedRisks: number
        openRedRisks: number
        openWithoutParts: number
        openWithoutActionPlan: number

        assignedActionPlans: number
        pendingActionPlans: number
        overdueActionPlans: number
        waitingValidationActionPlans: number
        waitingValidationForUser: number
        completedActionPlans: number
        canceledActionPlans: number

        logisticsPendingRequests: number
        logisticsInReviewRequests: number
        logisticsPendingForReview: number

        pendingItems: number
    }
    pendingActions: PendingActionItem[]
    charts: {
        risksByLevel: AnalyticsChartItem[]
        risksByStatus: AnalyticsChartItem[]
        actionPlansByStatus: AnalyticsChartItem[]
        pendingActionsByType: AnalyticsChartItem[]
    }
}

type UserProfile = {
    id: string
    name: string
    email: string
    photoUrl?: string | null
    isActive: boolean
    createdAt: string

    roles: Role[]
    permissions: string[]

    createdRisks: RiskItem[]
    assignedRisks: RiskItem[]

    assignedActionPlans?: ActionPlanItem[]

    requestedLogistics: LogisticsItem[]
    assignedLogistics?: LogisticsItem[]
    reviewedLogistics: LogisticsItem[]
    logisticsPendingForReview?: LogisticsItem[]

    analytics?: UserAnalytics
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
    total: {
        label: "Total",
        color: COLORS.blue,
    },
} satisfies ChartConfig

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

function getInitials(name: string) {
    const parts = name
        .trim()
        .split(" ")
        .filter(Boolean)

    if (parts.length === 0) return "U"

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase()
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function getStatusBadge(active: boolean) {
    return active ? (
        <Badge className="bg-green-600">
            Ativo
        </Badge>
    ) : (
        <Badge variant="destructive">
            Inativo
        </Badge>
    )
}

function getRiskBadge(level: string) {
    switch (level) {
        case "GREEN":
            return (
                <Badge className="bg-green-600">
                    Green
                </Badge>
            )

        case "YELLOW":
            return (
                <Badge className="bg-yellow-500 text-black">
                    Yellow
                </Badge>
            )

        case "RED":
            return (
                <Badge variant="destructive">
                    Red
                </Badge>
            )

        case "ORANGE":
            return (
                <Badge className="bg-orange-500">
                    Orange
                </Badge>
            )

        case "GREY":
            return (
                <Badge className="bg-slate-500">
                    Grey
                </Badge>
            )

        case "BLUE":
            return (
                <Badge className="bg-blue-600">
                    Blue
                </Badge>
            )

        default:
            return (
                <Badge variant="outline">
                    {level}
                </Badge>
            )
    }
}

function getWorkflowBadge(status: string) {
    switch (status) {
        case "OPEN":
            return (
                <Badge className="bg-blue-600">
                    Aberta
                </Badge>
            )

        case "CLOSED":
            return (
                <Badge className="bg-green-600">
                    Fechada
                </Badge>
            )

        case "CANCELED":
            return (
                <Badge variant="secondary">
                    Cancelada
                </Badge>
            )

        default:
            return (
                <Badge variant="outline">
                    {status}
                </Badge>
            )
    }
}

function getActionPlanStatusBadge(status: string, isOverdue?: boolean) {
    if (isOverdue) {
        return (
            <Badge variant="destructive">
                Atrasado
            </Badge>
        )
    }

    switch (status) {
        case "OPEN":
            return (
                <Badge className="bg-blue-600">
                    Aberto
                </Badge>
            )

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
            return (
                <Badge className="bg-green-600">
                    Concluído
                </Badge>
            )

        case "CANCELED":
            return (
                <Badge variant="secondary">
                    Cancelado
                </Badge>
            )

        default:
            return (
                <Badge variant="outline">
                    {status}
                </Badge>
            )
    }
}

function getPriorityBadge(priority?: string | null) {
    switch (priority) {
        case "CRITICAL":
            return (
                <Badge variant="destructive">
                    Crítica
                </Badge>
            )

        case "HIGH":
            return (
                <Badge className="bg-orange-500">
                    Alta
                </Badge>
            )

        case "MEDIUM":
            return (
                <Badge className="bg-blue-600">
                    Média
                </Badge>
            )

        case "LOW":
            return (
                <Badge className="bg-green-600">
                    Baixa
                </Badge>
            )

        default:
            return (
                <Badge variant="outline">
                    -
                </Badge>
            )
    }
}

function getPendingActionBadge(type: string) {
    switch (type) {
        case "ACTION_PLAN_OVERDUE":
            return (
                <Badge variant="destructive">
                    Plano atrasado
                </Badge>
            )

        case "ACTION_PLAN_VALIDATION":
            return (
                <Badge className="bg-purple-600">
                    Validação
                </Badge>
            )

        case "ACTION_PLAN":
            return (
                <Badge className="bg-blue-600">
                    Plano de ação
                </Badge>
            )

        case "CRITICAL_RISK":
            return (
                <Badge variant="destructive">
                    RM crítica
                </Badge>
            )

        case "RISK_WITHOUT_PARTS":
            return (
                <Badge className="bg-orange-500">
                    RM sem PN
                </Badge>
            )

        case "RISK_WITHOUT_ACTION_PLAN":
            return (
                <Badge className="bg-yellow-500 text-black">
                    Sem plano
                </Badge>
            )

        case "LOGISTICS_REQUEST":
            return (
                <Badge className="bg-cyan-600">
                    Logística
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

function getLogisticsStatusBadge(status: string) {
    switch (status) {
        case "PENDING":
            return (
                <Badge className="bg-yellow-500 text-black">
                    Pendente
                </Badge>
            )

        case "IN_REVIEW":
            return (
                <Badge className="bg-blue-600">
                    Em análise
                </Badge>
            )

        case "APPROVED":
            return (
                <Badge className="bg-green-600">
                    Aprovada
                </Badge>
            )

        case "REJECTED":
            return (
                <Badge variant="destructive">
                    Rejeitada
                </Badge>
            )

        case "CANCELED":
            return (
                <Badge variant="secondary">
                    Cancelada
                </Badge>
            )

        default:
            return (
                <Badge variant="outline">
                    {status}
                </Badge>
            )
    }
}

function getChartItemColor(item: AnalyticsChartItem) {
    const key = item.value || item.type || item.name

    switch (key) {
        case "RED":
        case "Red":
            return COLORS.red

        case "YELLOW":
        case "Yellow":
            return COLORS.yellow

        case "GREEN":
        case "Green":
            return COLORS.green

        case "ORANGE":
        case "Orange":
            return COLORS.orange

        case "GREY":
        case "Grey":
            return COLORS.slate

        case "BLUE":
        case "Blue":
            return COLORS.blue

        case "OPEN":
        case "Aberta":
        case "Aberto":
            return COLORS.blue

        case "CLOSED":
        case "Fechada":
            return COLORS.green

        case "CANCELED":
        case "Cancelada":
        case "Cancelado":
            return COLORS.slate

        case "IN_PROGRESS":
        case "Em andamento":
            return COLORS.yellow

        case "WAITING_VALIDATION":
        case "Aguardando validação":
            return COLORS.purple

        case "COMPLETED":
        case "Concluído":
            return COLORS.green

        case "ACTION_PLAN_OVERDUE":
        case "Plano atrasado":
            return COLORS.red

        case "ACTION_PLAN_VALIDATION":
            return COLORS.purple

        case "ACTION_PLAN":
        case "Plano de ação":
            return COLORS.blue

        case "CRITICAL_RISK":
        case "RM crítica":
            return COLORS.red

        case "RISK_WITHOUT_PARTS":
        case "RM sem PN":
            return COLORS.orange

        case "RISK_WITHOUT_ACTION_PLAN":
        case "RM sem plano de ação":
            return COLORS.yellow

        case "LOGISTICS_REQUEST":
        case "Logística pendente":
            return COLORS.cyan

        default:
            return COLORS.blue
    }
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
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {title}
                        </p>

                        <p className="mt-1 text-2xl font-bold">
                            {value}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                            {description}
                        </p>
                    </div>

                    <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
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

function FilterCard({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="mb-4 rounded-lg border bg-muted/20 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {children}
            </div>
        </div>
    )
}

function SmallBarChart({
    data,
}: {
    data: AnalyticsChartItem[]
}) {
    const chartData = data.filter((item) => item.total > 0)

    if (chartData.length === 0) {
        return (
            <EmptyState message="Sem dados para exibir." />
        )
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="h-[220px] w-full"
        >
            <BarChart
                accessibilityLayer
                data={chartData}
                margin={{
                    left: 0,
                    right: 8,
                    top: 8,
                    bottom: 0,
                }}
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
                    tickMargin={6}
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

                <Bar
                    dataKey="total"
                    radius={[6, 6, 0, 0]}
                >
                    {chartData.map((item, index) => (
                        <Cell
                            key={`${item.name}-${index}`}
                            fill={getChartItemColor(item)}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}

function SmallPieChart({
    data,
}: {
    data: AnalyticsChartItem[]
}) {
    const chartData = data.filter((item) => item.total > 0)

    if (chartData.length === 0) {
        return (
            <EmptyState message="Sem dados para exibir." />
        )
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="h-[220px] w-full"
        >
            <PieChart>
                <ChartTooltip
                    content={<ChartTooltipContent hideLabel />}
                />

                <Pie
                    data={chartData}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    strokeWidth={1}
                >
                    {chartData.map((item, index) => (
                        <Cell
                            key={`${item.name}-${index}`}
                            fill={getChartItemColor(item)}
                        />
                    ))}
                </Pie>
            </PieChart>
        </ChartContainer>
    )
}

export default function UserDetailsPage() {
    const params = useParams()
    const router = useRouter()

    const { user: loggedUser } = useAuth()

    const [profile, setProfile] =
        useState<UserProfile | null>(null)

    const [loading, setLoading] = useState(true)

    const [pendingSearch, setPendingSearch] = useState("")
    const [pendingTypeFilter, setPendingTypeFilter] = useState("all")

    const [assignedRiskSearch, setAssignedRiskSearch] = useState("")
    const [assignedRiskLevelFilter, setAssignedRiskLevelFilter] = useState("all")
    const [assignedRiskStatusFilter, setAssignedRiskStatusFilter] = useState("all")

    const [createdRiskSearch, setCreatedRiskSearch] = useState("")
    const [createdRiskLevelFilter, setCreatedRiskLevelFilter] = useState("all")
    const [createdRiskStatusFilter, setCreatedRiskStatusFilter] = useState("all")

    const [actionPlanSearch, setActionPlanSearch] = useState("")
    const [actionPlanStatusFilter, setActionPlanStatusFilter] = useState("all")
    const [actionPlanPriorityFilter, setActionPlanPriorityFilter] = useState("all")
    const [actionPlanOverdueFilter, setActionPlanOverdueFilter] = useState("all")

    const [logisticsSearch, setLogisticsSearch] = useState("")
    const [logisticsStatusFilter, setLogisticsStatusFilter] = useState("all")
    const [logisticsTypeFilter, setLogisticsTypeFilter] = useState("all")

    const userId = String(params.id)

    const isOwnProfile =
        loggedUser?.id === profile?.id

    const isAdmin =
        loggedUser?.permissions?.includes("USER_MANAGE") ||
        loggedUser?.permissions?.includes("USER_VIEW") ||
        loggedUser?.roles?.includes("ADMIN") ||
        loggedUser?.roles?.includes("SUPER_ADMIN")

    const canEditProfile =
        isOwnProfile || isAdmin

    const analytics = profile?.analytics

    const pendingActions =
        analytics?.pendingActions || []

    const assignedActionPlans =
        profile?.assignedActionPlans || []

    const logisticsItems = useMemo(() => {
        if (!profile) return []

        return [
            ...profile.requestedLogistics.map((item) => ({
                ...item,
                listType: "Solicitada",
            })),
            ...(profile.assignedLogistics || []).map((item) => ({
                ...item,
                listType: "Atribuída",
            })),
            ...profile.reviewedLogistics.map((item) => ({
                ...item,
                listType: "Revisada",
            })),
            ...(profile.logisticsPendingForReview || []).map((item) => ({
                ...item,
                listType: "Pendente para análise",
            })),
        ]
    }, [profile])

    const filteredPendingActions = useMemo(() => {
        const normalizedSearch = pendingSearch.trim().toLowerCase()

        return pendingActions.filter((item) => {
            const matchesSearch =
                !normalizedSearch ||
                item.title.toLowerCase().includes(normalizedSearch) ||
                item.description.toLowerCase().includes(normalizedSearch) ||
                item.riskCode.toLowerCase().includes(normalizedSearch) ||
                item.supplierName.toLowerCase().includes(normalizedSearch) ||
                item.pn?.toLowerCase().includes(normalizedSearch)

            const matchesType =
                pendingTypeFilter === "all" ||
                item.type === pendingTypeFilter

            return matchesSearch && matchesType
        })
    }, [pendingActions, pendingSearch, pendingTypeFilter])

    const filteredAssignedRisks = useMemo(() => {
        if (!profile) return []

        const normalizedSearch = assignedRiskSearch.trim().toLowerCase()

        return profile.assignedRisks.filter((risk) => {
            const workflowStatus =
                risk.workflowStatus || risk.status.name

            const matchesSearch =
                !normalizedSearch ||
                risk.title.toLowerCase().includes(normalizedSearch) ||
                risk.code?.toLowerCase().includes(normalizedSearch) ||
                risk.supplier.name.toLowerCase().includes(normalizedSearch)

            const matchesLevel =
                assignedRiskLevelFilter === "all" ||
                risk.riskLevel === assignedRiskLevelFilter

            const matchesStatus =
                assignedRiskStatusFilter === "all" ||
                workflowStatus === assignedRiskStatusFilter

            return matchesSearch && matchesLevel && matchesStatus
        })
    }, [
        profile,
        assignedRiskSearch,
        assignedRiskLevelFilter,
        assignedRiskStatusFilter,
    ])

    const filteredCreatedRisks = useMemo(() => {
        if (!profile) return []

        const normalizedSearch = createdRiskSearch.trim().toLowerCase()

        return profile.createdRisks.filter((risk) => {
            const workflowStatus =
                risk.workflowStatus || risk.status.name

            const matchesSearch =
                !normalizedSearch ||
                risk.title.toLowerCase().includes(normalizedSearch) ||
                risk.code?.toLowerCase().includes(normalizedSearch) ||
                risk.supplier.name.toLowerCase().includes(normalizedSearch)

            const matchesLevel =
                createdRiskLevelFilter === "all" ||
                risk.riskLevel === createdRiskLevelFilter

            const matchesStatus =
                createdRiskStatusFilter === "all" ||
                workflowStatus === createdRiskStatusFilter

            return matchesSearch && matchesLevel && matchesStatus
        })
    }, [
        profile,
        createdRiskSearch,
        createdRiskLevelFilter,
        createdRiskStatusFilter,
    ])

    const filteredActionPlans = useMemo(() => {
        const normalizedSearch = actionPlanSearch.trim().toLowerCase()

        return assignedActionPlans.filter((plan) => {
            const matchesSearch =
                !normalizedSearch ||
                plan.title.toLowerCase().includes(normalizedSearch) ||
                plan.requiredAction?.toLowerCase().includes(normalizedSearch) ||
                plan.description?.toLowerCase().includes(normalizedSearch) ||
                plan.riskEvent?.code.toLowerCase().includes(normalizedSearch) ||
                plan.riskEvent?.supplier.name.toLowerCase().includes(normalizedSearch) ||
                plan.riskEventPart?.partNumber.partNumber.toLowerCase().includes(normalizedSearch)

            const matchesStatus =
                actionPlanStatusFilter === "all" ||
                plan.status === actionPlanStatusFilter

            const matchesPriority =
                actionPlanPriorityFilter === "all" ||
                plan.priority === actionPlanPriorityFilter

            const matchesOverdue =
                actionPlanOverdueFilter === "all" ||
                (actionPlanOverdueFilter === "overdue" && plan.isOverdue) ||
                (actionPlanOverdueFilter === "not_overdue" && !plan.isOverdue)

            return (
                matchesSearch &&
                matchesStatus &&
                matchesPriority &&
                matchesOverdue
            )
        })
    }, [
        assignedActionPlans,
        actionPlanSearch,
        actionPlanStatusFilter,
        actionPlanPriorityFilter,
        actionPlanOverdueFilter,
    ])

    const filteredLogisticsItems = useMemo(() => {
        const normalizedSearch = logisticsSearch.trim().toLowerCase()

        return logisticsItems.filter((item) => {
            const matchesSearch =
                !normalizedSearch ||
                item.code?.toLowerCase().includes(normalizedSearch) ||
                item.riskEvent.code?.toLowerCase().includes(normalizedSearch) ||
                item.riskEvent.title.toLowerCase().includes(normalizedSearch) ||
                item.riskEvent.supplier.name.toLowerCase().includes(normalizedSearch)

            const matchesStatus =
                logisticsStatusFilter === "all" ||
                item.status === logisticsStatusFilter

            const matchesType =
                logisticsTypeFilter === "all" ||
                item.listType === logisticsTypeFilter

            return matchesSearch && matchesStatus && matchesType
        })
    }, [
        logisticsItems,
        logisticsSearch,
        logisticsStatusFilter,
        logisticsTypeFilter,
    ])

    useEffect(() => {
        loadUser()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    async function loadUser() {
        try {
            setLoading(true)

            const res = await fetch(
                `/api/users/${userId}`,
                {
                    credentials: "include",
                }
            )

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.details ||
                        data.error ||
                        "Erro ao buscar usuário"
                )
            }

            setProfile(data)
        } catch (error) {
            console.error(error)
            setProfile(null)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="flex h-screen items-center justify-center">
                Usuário não encontrado
            </div>
        )
    }

    return (
        <ProtectedRoute>
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-6 p-4 md:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                        router.push("/users")
                                    }
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>

                                <div>
                                    <h1 className="text-2xl font-semibold">
                                        Perfil do Usuário
                                    </h1>

                                    <p className="text-sm text-muted-foreground">
                                        Dados cadastrais, atuação operacional, pendências e indicadores individuais.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={loadUser}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <BarChart3 className="mr-2 h-4 w-4" />
                                    )}
                                    Atualizar
                                </Button>

                                {canEditProfile && (
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            router.push(
                                                `/users/${profile.id}/edit`
                                            )
                                        }
                                    >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Editar Usuário
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-12">
                            <Card className="xl:col-span-3">
                                <CardContent className="flex flex-col items-center p-6">
                                    <Avatar className="h-28 w-28">
                                        {profile.photoUrl && (
                                            <AvatarImage
                                                src={profile.photoUrl}
                                                alt={profile.name}
                                            />
                                        )}

                                        <AvatarFallback className="text-3xl">
                                            {profile.name ? (
                                                getInitials(profile.name)
                                            ) : (
                                                <UserCircle className="h-10 w-10" />
                                            )}
                                        </AvatarFallback>
                                    </Avatar>

                                    <h2 className="mt-4 text-center text-xl font-semibold">
                                        {profile.name}
                                    </h2>

                                    <p className="text-center text-sm text-muted-foreground">
                                        {profile.email}
                                    </p>

                                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                                        {getStatusBadge(profile.isActive)}

                                        {profile.roles.map((role) => (
                                            <Badge
                                                key={role.id}
                                                variant="secondary"
                                            >
                                                {role.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="xl:col-span-9">
                                <CardHeader>
                                    <CardTitle>
                                        Dados básicos
                                    </CardTitle>

                                    <CardDescription>
                                        Identificação e permissões principais do usuário.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent>
                                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <UserCircle className="h-4 w-4" />
                                                Nome
                                            </div>

                                            <p className="mt-1 font-medium">
                                                {profile.name}
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail className="h-4 w-4" />
                                                Email
                                            </div>

                                            <p className="mt-1 break-all font-medium">
                                                {profile.email}
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                Criado em
                                            </div>

                                            <p className="mt-1 font-medium">
                                                {formatDate(profile.createdAt)}
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Shield className="h-4 w-4" />
                                                ID do usuário
                                            </div>

                                            <p className="mt-1 break-all text-sm font-medium">
                                                {profile.id}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <p className="mb-2 text-sm font-medium">
                                            Permissões efetivas
                                        </p>

                                        {profile.permissions.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                Nenhuma permissão encontrada.
                                            </p>
                                        ) : (
                                            <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                                                {profile.permissions.map(
                                                    (permission) => (
                                                        <Badge
                                                            key={permission}
                                                            variant="outline"
                                                        >
                                                            {permission}
                                                        </Badge>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {analytics && (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                                <MetricCard
                                    title="Pendências"
                                    value={analytics.summary.pendingItems}
                                    description="Ações abertas para acompanhamento"
                                    icon={<AlertTriangle className="h-5 w-5" />}
                                />

                                <MetricCard
                                    title="RMs atribuídas"
                                    value={analytics.summary.assignedRisks}
                                    description={`${analytics.summary.openAssignedRisks} abertas`}
                                    icon={<Package className="h-5 w-5" />}
                                />

                                <MetricCard
                                    title="RMs Red abertas"
                                    value={analytics.summary.openRedRisks}
                                    description="Críticas sob responsabilidade"
                                    icon={<ShieldAlert className="h-5 w-5" />}
                                />

                                <MetricCard
                                    title="Planos pendentes"
                                    value={analytics.summary.pendingActionPlans}
                                    description={`${analytics.summary.overdueActionPlans} atrasados`}
                                    icon={<Clock className="h-5 w-5" />}
                                />

                                <MetricCard
                                    title="Aguardando validação"
                                    value={analytics.summary.waitingValidationForUser}
                                    description="Planos para validar/reabrir"
                                    icon={<CheckCircle2 className="h-5 w-5" />}
                                />

                                <MetricCard
                                    title="Logística"
                                    value={analytics.summary.logisticsPendingForReview}
                                    description="Pendências para análise"
                                    icon={<Truck className="h-5 w-5" />}
                                />
                            </div>
                        )}

                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle>
                                            Ações pendentes
                                        </CardTitle>

                                        <CardDescription>
                                            Planos de ação, validações, RMs críticas e pendências de logística relacionadas ao usuário.
                                        </CardDescription>
                                    </div>

                                    <Badge variant="outline">
                                        {filteredPendingActions.length} de {pendingActions.length} pendência(s)
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <FilterCard>
                                    <Input
                                        placeholder="Buscar por RM, fornecedor, PN ou ação..."
                                        value={pendingSearch}
                                        onChange={(e) =>
                                            setPendingSearch(e.target.value)
                                        }
                                        className="md:col-span-2"
                                    />

                                    <Select
                                        value={pendingTypeFilter}
                                        onValueChange={setPendingTypeFilter}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tipo" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectItem value="all">Todos os tipos</SelectItem>
                                            <SelectItem value="ACTION_PLAN_OVERDUE">Plano atrasado</SelectItem>
                                            <SelectItem value="ACTION_PLAN_VALIDATION">Validação</SelectItem>
                                            <SelectItem value="ACTION_PLAN">Plano de ação</SelectItem>
                                            <SelectItem value="CRITICAL_RISK">RM crítica</SelectItem>
                                            <SelectItem value="RISK_WITHOUT_PARTS">RM sem PN</SelectItem>
                                            <SelectItem value="RISK_WITHOUT_ACTION_PLAN">RM sem plano</SelectItem>
                                            <SelectItem value="LOGISTICS_REQUEST">Logística</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setPendingSearch("")
                                            setPendingTypeFilter("all")
                                        }}
                                    >
                                        Limpar
                                    </Button>
                                </FilterCard>

                                <PendingActionsTable
                                    actions={filteredPendingActions}
                                    onOpenRisk={(riskId) =>
                                        router.push(`/rms/${riskId}`)
                                    }
                                />
                            </CardContent>
                        </Card>

                        {analytics && (
                            <div className="grid gap-6 xl:grid-cols-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            RMs por farol
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent>
                                        <SmallPieChart
                                            data={analytics.charts.risksByLevel}
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
                                        <SmallBarChart
                                            data={analytics.charts.risksByStatus}
                                        />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            Planos por status
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent>
                                        <SmallBarChart
                                            data={analytics.charts.actionPlansByStatus}
                                        />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            Pendências por tipo
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent>
                                        <SmallBarChart
                                            data={analytics.charts.pendingActionsByType}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <Tabs defaultValue="pending">
                            <TabsList className="flex h-auto flex-wrap justify-start">
                                <TabsTrigger value="pending">
                                    Pendências
                                </TabsTrigger>

                                <TabsTrigger value="assigned">
                                    RMs atribuídas
                                </TabsTrigger>

                                <TabsTrigger value="created">
                                    RMs criadas
                                </TabsTrigger>

                                <TabsTrigger value="actions">
                                    Planos de ação
                                </TabsTrigger>

                                <TabsTrigger value="logistics">
                                    Logística
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="pending" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Ações pendentes do usuário
                                        </CardTitle>

                                        <CardDescription>
                                            {filteredPendingActions.length} de {pendingActions.length} item(ns) exibido(s)
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <FilterCard>
                                            <Input
                                                placeholder="Buscar por RM, fornecedor, PN ou ação..."
                                                value={pendingSearch}
                                                onChange={(e) =>
                                                    setPendingSearch(e.target.value)
                                                }
                                                className="md:col-span-2"
                                            />

                                            <Select
                                                value={pendingTypeFilter}
                                                onValueChange={setPendingTypeFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tipo" />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    <SelectItem value="all">Todos os tipos</SelectItem>
                                                    <SelectItem value="ACTION_PLAN_OVERDUE">Plano atrasado</SelectItem>
                                                    <SelectItem value="ACTION_PLAN_VALIDATION">Validação</SelectItem>
                                                    <SelectItem value="ACTION_PLAN">Plano de ação</SelectItem>
                                                    <SelectItem value="CRITICAL_RISK">RM crítica</SelectItem>
                                                    <SelectItem value="RISK_WITHOUT_PARTS">RM sem PN</SelectItem>
                                                    <SelectItem value="RISK_WITHOUT_ACTION_PLAN">RM sem plano</SelectItem>
                                                    <SelectItem value="LOGISTICS_REQUEST">Logística</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setPendingSearch("")
                                                    setPendingTypeFilter("all")
                                                }}
                                            >
                                                Limpar
                                            </Button>
                                        </FilterCard>

                                        <PendingActionsTable
                                            actions={filteredPendingActions}
                                            onOpenRisk={(riskId) =>
                                                router.push(`/rms/${riskId}`)
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="assigned" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            RMs atribuídas ao usuário
                                        </CardTitle>

                                        <CardDescription>
                                            {filteredAssignedRisks.length} de {profile.assignedRisks.length} RM(s) exibida(s)
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <FilterCard>
                                            <Input
                                                placeholder="Buscar por RM, título ou fornecedor..."
                                                value={assignedRiskSearch}
                                                onChange={(e) =>
                                                    setAssignedRiskSearch(e.target.value)
                                                }
                                            />

                                            <Select
                                                value={assignedRiskLevelFilter}
                                                onValueChange={setAssignedRiskLevelFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Farol" />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    <SelectItem value="all">Todos os faróis</SelectItem>
                                                    <SelectItem value="RED">Red</SelectItem>
                                                    <SelectItem value="YELLOW">Yellow</SelectItem>
                                                    <SelectItem value="GREEN">Green</SelectItem>
                                                    <SelectItem value="ORANGE">Orange</SelectItem>
                                                    <SelectItem value="GREY">Grey</SelectItem>
                                                    <SelectItem value="BLUE">Blue</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={assignedRiskStatusFilter}
                                                onValueChange={setAssignedRiskStatusFilter}
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
                                                    setAssignedRiskSearch("")
                                                    setAssignedRiskLevelFilter("all")
                                                    setAssignedRiskStatusFilter("all")
                                                }}
                                            >
                                                Limpar
                                            </Button>
                                        </FilterCard>

                                        <RiskTable
                                            risks={filteredAssignedRisks}
                                            onOpenRisk={(riskId) =>
                                                router.push(`/rms/${riskId}`)
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="created" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            RMs criadas pelo usuário
                                        </CardTitle>

                                        <CardDescription>
                                            {filteredCreatedRisks.length} de {profile.createdRisks.length} RM(s) exibida(s)
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <FilterCard>
                                            <Input
                                                placeholder="Buscar por RM, título ou fornecedor..."
                                                value={createdRiskSearch}
                                                onChange={(e) =>
                                                    setCreatedRiskSearch(e.target.value)
                                                }
                                            />

                                            <Select
                                                value={createdRiskLevelFilter}
                                                onValueChange={setCreatedRiskLevelFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Farol" />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    <SelectItem value="all">Todos os faróis</SelectItem>
                                                    <SelectItem value="RED">Red</SelectItem>
                                                    <SelectItem value="YELLOW">Yellow</SelectItem>
                                                    <SelectItem value="GREEN">Green</SelectItem>
                                                    <SelectItem value="ORANGE">Orange</SelectItem>
                                                    <SelectItem value="GREY">Grey</SelectItem>
                                                    <SelectItem value="BLUE">Blue</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={createdRiskStatusFilter}
                                                onValueChange={setCreatedRiskStatusFilter}
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
                                                    setCreatedRiskSearch("")
                                                    setCreatedRiskLevelFilter("all")
                                                    setCreatedRiskStatusFilter("all")
                                                }}
                                            >
                                                Limpar
                                            </Button>
                                        </FilterCard>

                                        <RiskTable
                                            risks={filteredCreatedRisks}
                                            onOpenRisk={(riskId) =>
                                                router.push(`/rms/${riskId}`)
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="actions" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Planos de ação atribuídos
                                        </CardTitle>

                                        <CardDescription>
                                            {filteredActionPlans.length} de {assignedActionPlans.length} plano(s) exibido(s)
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <FilterCard>
                                            <Input
                                                placeholder="Buscar por plano, PN, RM ou fornecedor..."
                                                value={actionPlanSearch}
                                                onChange={(e) =>
                                                    setActionPlanSearch(e.target.value)
                                                }
                                            />

                                            <Select
                                                value={actionPlanStatusFilter}
                                                onValueChange={setActionPlanStatusFilter}
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
                                                value={actionPlanPriorityFilter}
                                                onValueChange={setActionPlanPriorityFilter}
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
                                                value={actionPlanOverdueFilter}
                                                onValueChange={setActionPlanOverdueFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Atraso" />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="overdue">Somente atrasados</SelectItem>
                                                    <SelectItem value="not_overdue">Não atrasados</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setActionPlanSearch("")
                                                    setActionPlanStatusFilter("all")
                                                    setActionPlanPriorityFilter("all")
                                                    setActionPlanOverdueFilter("all")
                                                }}
                                            >
                                                Limpar
                                            </Button>
                                        </FilterCard>

                                        <ActionPlansTable
                                            plans={filteredActionPlans}
                                            onOpenRisk={(riskId) =>
                                                router.push(`/rms/${riskId}`)
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="logistics" className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Solicitações logísticas
                                        </CardTitle>

                                        <CardDescription>
                                            {filteredLogisticsItems.length} de {logisticsItems.length} solicitação(ões) exibida(s)
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <FilterCard>
                                            <Input
                                                placeholder="Buscar por código, RM ou fornecedor..."
                                                value={logisticsSearch}
                                                onChange={(e) =>
                                                    setLogisticsSearch(e.target.value)
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
                                                    <SelectItem value="Solicitada">Solicitada</SelectItem>
                                                    <SelectItem value="Atribuída">Atribuída</SelectItem>
                                                    <SelectItem value="Revisada">Revisada</SelectItem>
                                                    <SelectItem value="Pendente para análise">Pendente para análise</SelectItem>
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
                                                Limpar
                                            </Button>
                                        </FilterCard>

                                        <LogisticsTable
                                            logistics={filteredLogisticsItems}
                                            onOpenRisk={(riskId) =>
                                                router.push(`/rms/${riskId}`)
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

function PendingActionsTable({
    actions,
    onOpenRisk,
}: {
    actions: PendingActionItem[]
    onOpenRisk: (riskId: string) => void
}) {
    if (actions.length === 0) {
        return (
            <EmptyState message="Nenhuma ação pendente encontrada para este usuário." />
        )
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="min-w-[180px]">
                            Tipo
                        </TableHead>
                        <TableHead className="min-w-[260px]">
                            Ação
                        </TableHead>
                        <TableHead>RM</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>PN</TableHead>
                        <TableHead>Status/Prioridade</TableHead>
                        <TableHead>Prazo/Data</TableHead>
                        <TableHead className="text-right">
                            Abrir
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {actions.map((action) => (
                        <TableRow key={`${action.type}-${action.id}`}>
                            <TableCell>
                                {getPendingActionBadge(action.type)}
                            </TableCell>

                            <TableCell>
                                <div>
                                    <p className="font-medium">
                                        {action.title}
                                    </p>

                                    <p className="line-clamp-2 text-xs text-muted-foreground">
                                        {action.description}
                                    </p>
                                </div>
                            </TableCell>

                            <TableCell className="font-medium">
                                {action.riskCode}
                            </TableCell>

                            <TableCell>
                                {action.supplierName}
                            </TableCell>

                            <TableCell>
                                {action.pn || "-"}
                            </TableCell>

                            <TableCell>
                                {action.priority ? (
                                    getPriorityBadge(action.priority)
                                ) : action.status ? (
                                    <Badge variant="outline">
                                        {action.status}
                                    </Badge>
                                ) : (
                                    "-"
                                )}
                            </TableCell>

                            <TableCell>
                                {formatDate(action.dueDate || action.createdAt)}
                            </TableCell>

                            <TableCell className="text-right">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        onOpenRisk(action.riskEventId)
                                    }
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Abrir RM
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function RiskTable({
    risks,
    onOpenRisk,
}: {
    risks: RiskItem[]
    onOpenRisk: (riskId: string) => void
}) {
    if (risks.length === 0) {
        return (
            <EmptyState message="Nenhuma RM encontrada." />
        )
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>RM</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Farol</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">
                            Abrir
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {risks.map((risk) => (
                        <TableRow key={risk.id}>
                            <TableCell className="font-medium">
                                {risk.code || "-"}
                            </TableCell>

                            <TableCell className="font-medium">
                                {risk.title}
                            </TableCell>

                            <TableCell>
                                {risk.supplier.name}
                            </TableCell>

                            <TableCell>
                                {getWorkflowBadge(
                                    risk.workflowStatus ||
                                        risk.status.name
                                )}
                            </TableCell>

                            <TableCell>
                                {getRiskBadge(risk.riskLevel)}
                            </TableCell>

                            <TableCell>
                                {formatDate(risk.createdAt)}
                            </TableCell>

                            <TableCell className="text-right">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        onOpenRisk(risk.id)
                                    }
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
    onOpenRisk,
}: {
    plans: ActionPlanItem[]
    onOpenRisk: (riskId: string) => void
}) {
    if (plans.length === 0) {
        return (
            <EmptyState message="Nenhum plano de ação atribuído ao usuário." />
        )
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="min-w-[260px]">
                            Plano
                        </TableHead>
                        <TableHead>RM</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>PN</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Prazo</TableHead>
                        <TableHead className="text-right">
                            Abrir
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {plans.map((plan) => (
                        <TableRow key={plan.id}>
                            <TableCell>
                                <div>
                                    <p className="font-medium">
                                        {plan.title}
                                    </p>

                                    <p className="line-clamp-2 text-xs text-muted-foreground">
                                        {plan.requiredAction ||
                                            plan.description ||
                                            "-"}
                                    </p>
                                </div>
                            </TableCell>

                            <TableCell className="font-medium">
                                {plan.riskEvent?.code || "-"}
                            </TableCell>

                            <TableCell>
                                {plan.riskEvent?.supplier.name || "-"}
                            </TableCell>

                            <TableCell>
                                {plan.riskEventPart?.partNumber.partNumber ||
                                    "-"}
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

                            <TableCell>
                                {formatDate(plan.dueDate)}
                            </TableCell>

                            <TableCell className="text-right">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={!plan.riskEvent?.id}
                                    onClick={() => {
                                        if (plan.riskEvent?.id) {
                                            onOpenRisk(plan.riskEvent.id)
                                        }
                                    }}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Abrir RM
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
    logistics,
    onOpenRisk,
}: {
    logistics: Array<LogisticsItem & { listType: string }>
    onOpenRisk: (riskId: string) => void
}) {
    if (logistics.length === 0) {
        return (
            <EmptyState message="Nenhuma solicitação logística encontrada." />
        )
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>RM</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Solicitada em</TableHead>
                        <TableHead>Revisada em</TableHead>
                        <TableHead className="text-right">
                            Abrir
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {logistics.map((item) => (
                        <TableRow key={`${item.listType}-${item.id}`}>
                            <TableCell>
                                <Badge variant="secondary">
                                    {item.listType}
                                </Badge>
                            </TableCell>

                            <TableCell className="font-medium">
                                {item.code || "-"}
                            </TableCell>

                            <TableCell className="font-medium">
                                {item.riskEvent.code ||
                                    item.riskEvent.title}
                            </TableCell>

                            <TableCell>
                                {item.riskEvent.supplier.name}
                            </TableCell>

                            <TableCell>
                                {getLogisticsStatusBadge(item.status)}
                            </TableCell>

                            <TableCell>
                                {formatDateTime(item.requestedAt)}
                            </TableCell>

                            <TableCell>
                                {formatDateTime(item.reviewedAt)}
                            </TableCell>

                            <TableCell className="text-right">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        onOpenRisk(item.riskEvent.id)
                                    }
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Abrir RM
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}