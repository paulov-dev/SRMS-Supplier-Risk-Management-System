"use client"

import { Fragment, useEffect, useState } from "react"
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
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Boxes,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    CircleAlert,
    Gauge,
    Loader2,
    PackageSearch,
    RotateCcw,
    Search,
    ShieldAlert,
    SlidersHorizontal,
    Truck,
    UserX,
} from "lucide-react"

import { toast } from "sonner"

type UserSummary = {
    id: string
    name: string
    email: string
}

type SupplierSummary = {
    id: string
    name: string
}

type VehicleModelOption = {
    id: string
    familyId: string
    code: string
    name: string | null
    description: string | null
    isActive: boolean
}

type VehicleFamilyOption = {
    id: string
    name: string
    description: string | null
    isActive: boolean
    models: VehicleModelOption[]
}

type RiskEventSummary = {
    id: string
    code: string
    title: string | null
    workflowStatus: string
    riskLevel: string
    supplier: SupplierSummary
    assignedTo: UserSummary | null
}

type PartNumberOverviewItem = {
    id: string
    partNumber: string
    description: string | null
    vehicleProgram: string | null
    vehicleApplications: {
        id: string
        validFrom: string | null
        validTo: string | null
        isActive: boolean
        notes: string | null
        vehicleModel: {
            id: string
            code: string
            name: string | null
            family: {
                id: string
                name: string
            }
        }
    }[]

    suppliers: SupplierSummary[]
    commodities: string[]

    consolidatedStatus:
    | "RED"
    | "YELLOW"
    | "GREEN"
    | "ORANGE"
    | "GREY"
    | "BLUE"
    | null

    riskEvents: RiskEventSummary[]

    riskResponsibles: UserSummary[]
    pnResponsibles: UserSummary[]

    actionPlans: {
        total: number
        open: number
        completed: number
        overdue: number
        nextDueDate: string | null
    }

    usage: {
        totalRms: number
        openRms: number
        closedRms: number
    }

    analysis: {
        operationalStatus:
        | "IMMEDIATE_ACTION"
        | "ATTENTION"
        | "WAITING_LOGISTICS"
        | "REGISTRATION_ADJUSTMENT"
        | "MONITORING"
        | "COMPLETED"
        operationalReasons: string[]
        isCompleted: boolean
        withoutRiskResponsible: boolean
        withoutPnResponsible: boolean
        withoutActiveVehicleApplication: boolean
    }

    logistics: {
        consolidatedStatus:
        | "NOT_REQUESTED"
        | "REQUESTED"
        | "IN_LOGISTICS"
        | "APPROVED"
        | "REJECTED"
        | null
    }

    updatedAt: string
}

type OverviewStats = {
    totalPartNumbers: number
    partNumbersWithOpenRisks: number
    criticalPartNumbers: number
    partNumbersWithOverdueActions: number
    completedPartNumbers: number
    operationalQueuePartNumbers: number
    partNumbersWithoutRiskResponsible: number
    partNumbersWithoutPnResponsible: number
    partNumbersWithoutActiveApplication: number
    totalOpenActionPlans: number
    totalOverdueActionPlans: number
    statusDistribution: {
        red: number
        yellow: number
        green: number
        orange: number
        grey: number
        blue: number
        withoutStatus: number
    }
    logisticsDistribution: {
        notRequested: number
        requested: number
        inLogistics: number
        approved: number
        rejected: number
        withoutStatus: number
    }
}

type Pagination = {
    page: number
    pageSize: number
    total: number
    totalPages: number
}

type OverviewResponse = {
    data: PartNumberOverviewItem[]
    stats: OverviewStats
    pagination: Pagination
}

type FilterState = {
    search: string
    status: string
    vehicleFamilyId: string
    vehicleModelId: string
    riskResponsibleId: string
    pnResponsibleId: string
    onlyOpenRisks: string
    hasOverdueActions: string
    logisticsStatus: string
    operationalStatus: string
    sortBy: string
}

const initialFilters: FilterState = {
    search: "",
    status: "all",
    vehicleFamilyId: "all",
    vehicleModelId: "all",
    riskResponsibleId: "all",
    pnResponsibleId: "all",
    onlyOpenRisks: "true",
    hasOverdueActions: "false",
    logisticsStatus: "all",
    operationalStatus: "all",
    sortBy: "operationalStatus",
}

const initialStats: OverviewStats = {
    totalPartNumbers: 0,
    partNumbersWithOpenRisks: 0,
    criticalPartNumbers: 0,
    partNumbersWithOverdueActions: 0,
    completedPartNumbers: 0,
    operationalQueuePartNumbers: 0,
    partNumbersWithoutRiskResponsible: 0,
    partNumbersWithoutPnResponsible: 0,
    partNumbersWithoutActiveApplication: 0,
    totalOpenActionPlans: 0,
    totalOverdueActionPlans: 0,
    statusDistribution: {
        red: 0,
        yellow: 0,
        green: 0,
        orange: 0,
        grey: 0,
        blue: 0,
        withoutStatus: 0,
    },
    logisticsDistribution: {
        notRequested: 0,
        requested: 0,
        inLogistics: 0,
        approved: 0,
        rejected: 0,
        withoutStatus: 0,
    },
}

function getStatusLabel(status: string | null) {
    switch (status) {
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
            return "Concluído"

        default:
            return "Sem status"
    }
}

function getStatusClassName(status: string | null) {
    switch (status) {
        case "RED":
            return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"

        case "YELLOW":
            return "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300"

        case "GREEN":
            return "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"

        case "ORANGE":
            return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"

        case "GREY":
            return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"

        case "BLUE":
            return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"

        default:
            return "border-border bg-muted text-muted-foreground"
    }
}

function getLogisticsStatusLabel(status: string | null) {
    switch (status) {
        case "NOT_REQUESTED":
            return "Não solicitado"

        case "REQUESTED":
            return "Solicitado"

        case "IN_LOGISTICS":
            return "Em Logística"

        case "APPROVED":
            return "Aprovado"

        case "REJECTED":
            return "Rejeitado"

        default:
            return "Sem situação"
    }
}

function getLogisticsStatusClassName(status: string | null) {
    switch (status) {
        case "NOT_REQUESTED":
            return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"

        case "REQUESTED":
            return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"

        case "IN_LOGISTICS":
            return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"

        case "APPROVED":
            return "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"

        case "REJECTED":
            return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"

        default:
            return "border-border bg-muted text-muted-foreground"
    }
}

function getOperationalStatusLabel(
    status: PartNumberOverviewItem["analysis"]["operationalStatus"]
) {
    switch (status) {
        case "IMMEDIATE_ACTION":
            return "Ação imediata"

        case "ATTENTION":
            return "Atenção"

        case "WAITING_LOGISTICS":
            return "Aguardando Logística"

        case "REGISTRATION_ADJUSTMENT":
            return "Ajuste cadastral"

        case "MONITORING":
            return "Monitoramento"

        default:
            return "Concluído"
    }
}

function getOperationalStatusClassName(
    status: PartNumberOverviewItem["analysis"]["operationalStatus"]
) {
    switch (status) {
        case "IMMEDIATE_ACTION":
            return "bg-red-600 text-white"

        case "ATTENTION":
            return "bg-orange-500 text-white"

        case "WAITING_LOGISTICS":
            return "bg-cyan-600 text-white"

        case "REGISTRATION_ADJUSTMENT":
            return "bg-violet-600 text-white"

        case "MONITORING":
            return "bg-emerald-600 text-white"

        default:
            return "bg-blue-600 text-white"
    }
}

function getPercentage(value: number, total: number) {
    if (total <= 0) return 0

    return Math.round((value / total) * 100)
}

function StatusBadge({
    status,
}: {
    status: PartNumberOverviewItem["consolidatedStatus"]
}) {
    return (
        <Badge
            variant="outline"
            className={getStatusClassName(status)}
        >
            {getStatusLabel(status)}
        </Badge>
    )
}

function SummaryCard({
    title,
    value,
    description,
    icon,
    tone = "default",
}: {
    title: string
    value: number
    description: string
    icon: React.ReactNode
    tone?: "default" | "danger" | "warning" | "success"
}) {
    const iconClassName =
        tone === "danger"
            ? "bg-red-50 text-red-600 dark:bg-red-950/40"
            : tone === "warning"
                ? "bg-orange-50 text-orange-600 dark:bg-orange-950/40"
                : tone === "success"
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                    : "bg-muted text-muted-foreground"

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {title}
                        </p>

                        <p className="mt-1 text-3xl font-bold tracking-tight">
                            {value}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                            {description}
                        </p>
                    </div>

                    <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
                    >
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function formatDate(value: string | null) {
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

function formatDateTime(value: string | null) {
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

function UserList({
    users,
}: {
    users: UserSummary[]
}) {
    if (users.length === 0) {
        return (
            <span className="text-muted-foreground">
                -
            </span>
        )
    }

    return (
        <div className="space-y-1">
            {users.slice(0, 2).map((user) => (
                <div key={user.id}>
                    <p className="font-medium">
                        {user.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                        {user.email}
                    </p>
                </div>
            ))}

            {users.length > 2 && (
                <p className="text-xs text-muted-foreground">
                    +{users.length - 2} responsável(is)
                </p>
            )}
        </div>
    )
}

function SupplierList({
    suppliers,
}: {
    suppliers: SupplierSummary[]
}) {
    if (suppliers.length === 0) {
        return (
            <span className="text-muted-foreground">
                -
            </span>
        )
    }

    return (
        <div className="space-y-1">
            {suppliers.slice(0, 2).map((supplier) => (
                <p key={supplier.id} className="font-medium">
                    {supplier.name}
                </p>
            ))}

            {suppliers.length > 2 && (
                <p className="text-xs text-muted-foreground">
                    +{suppliers.length - 2} fornecedor(es)
                </p>
            )}
        </div>
    )
}

function RiskEventList({
    riskEvents,
}: {
    riskEvents: RiskEventSummary[]
}) {
    if (riskEvents.length === 0) {
        return (
            <span className="text-muted-foreground">
                -
            </span>
        )
    }

    return (
        <div className="flex max-w-[260px] flex-wrap gap-1">
            {riskEvents.slice(0, 4).map((riskEvent) => (
                <Button
                    key={riskEvent.id}
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                >
                    <Link href={`/rms/${riskEvent.id}`}>
                        {riskEvent.code}
                    </Link>
                </Button>
            ))}

            {riskEvents.length > 4 && (
                <Badge variant="outline">
                    +{riskEvents.length - 4}
                </Badge>
            )}
        </div>
    )
}

function VehicleApplicationList({
    applications,
}: {
    applications: PartNumberOverviewItem["vehicleApplications"]
}) {
    if (applications.length === 0) {
        return (
            <span className="text-muted-foreground">
                Sem aplicação cadastrada
            </span>
        )
    }

    return (
        <div className="space-y-2">
            {applications.slice(0, 3).map((application) => {
                const familyName =
                    application.vehicleModel.family.name

                const modelCode =
                    application.vehicleModel.code

                return (
                    <div
                        key={application.id}
                        className="space-y-1"
                    >
                        <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline">
                                {familyName} / {modelCode}
                            </Badge>

                            {!application.isActive && (
                                <Badge variant="outline">
                                    Inativa
                                </Badge>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {application.validTo
                                ? `Válido até ${formatDate(application.validTo)}`
                                : "Sem data fim"}
                        </p>
                    </div>
                )
            })}

            {applications.length > 3 && (
                <p className="text-xs text-muted-foreground">
                    +{applications.length - 3} aplicação(ões)
                </p>
            )}
        </div>
    )
}

export default function PartNumbersPage() {
    const [parts, setParts] = useState<PartNumberOverviewItem[]>([])
    const [stats, setStats] =
        useState<OverviewStats>(initialStats)

    const [pagination, setPagination] =
        useState<Pagination>({
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 1,
        })

    const [filters, setFilters] =
        useState<FilterState>(initialFilters)

    const [loading, setLoading] = useState(true)

    const [vehicleFamilies, setVehicleFamilies] =
        useState<VehicleFamilyOption[]>([])

    const [users, setUsers] = useState<UserSummary[]>([])

    const [expandedPartId, setExpandedPartId] =
        useState<string | null>(null)

    useEffect(() => {
        loadParts(1, initialFilters)
        loadVehicleFamilies()
        loadUsers()
    }, [])

    function buildSearchParams(
        page: number,
        currentFilters: FilterState
    ) {
        const params = new URLSearchParams()

        params.set("page", String(page))
        params.set("pageSize", String(pagination.pageSize))

        if (currentFilters.search.trim()) {
            params.set("search", currentFilters.search.trim())
        }

        if (currentFilters.status !== "all") {
            params.set("status", currentFilters.status)
        }

        if (currentFilters.vehicleFamilyId !== "all") {
            params.set(
                "vehicleFamilyId",
                currentFilters.vehicleFamilyId
            )
        }

        if (currentFilters.vehicleModelId !== "all") {
            params.set(
                "vehicleModelId",
                currentFilters.vehicleModelId
            )
        }

        if (currentFilters.riskResponsibleId !== "all") {
            params.set(
                "riskResponsibleId",
                currentFilters.riskResponsibleId
            )
        }

        if (currentFilters.pnResponsibleId !== "all") {
            params.set(
                "pnResponsibleId",
                currentFilters.pnResponsibleId
            )
        }

        if (currentFilters.onlyOpenRisks === "true") {
            params.set("onlyOpenRisks", "true")
        }

        if (currentFilters.hasOverdueActions === "true") {
            params.set("hasOverdueActions", "true")
        }

        if (currentFilters.logisticsStatus !== "all") {
            params.set(
                "logisticsStatus",
                currentFilters.logisticsStatus
            )
        }

        if (currentFilters.operationalStatus !== "all") {
            params.set(
                "operationalStatus",
                currentFilters.operationalStatus
            )
        }

        params.set("sortBy", currentFilters.sortBy)

        return params
    }

    async function loadVehicleFamilies() {
        try {
            const res = await fetch("/api/vehicle-families", {
                credentials: "include",
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Erro ao carregar classes e modelos"
                )
            }

            setVehicleFamilies(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar classes e modelos"
            )
        }
    }

    async function loadUsers() {
        try {
            const res = await fetch("/api/users/options", {
                credentials: "include",
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error || "Erro ao carregar usuários"
                )
            }

            setUsers(Array.isArray(data) ? data : data.data || [])
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar usuários"
            )
        }
    }

    async function loadParts(
        page = pagination.page,
        currentFilters = filters
    ) {
        try {
            setLoading(true)

            const params = buildSearchParams(
                page,
                currentFilters
            )

            const res = await fetch(
                `/api/part-numbers/overview?${params.toString()}`,
                {
                    credentials: "include",
                }
            )

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error || "Erro ao carregar PNs"
                )
            }

            const response = data as OverviewResponse

            setParts(response.data)
            setStats(response.stats)
            setPagination(response.pagination)
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar PNs"
            )
        } finally {
            setLoading(false)
        }
    }

    function applyFilters() {
        loadParts(1, filters)
    }

    function resetFilters() {
        setFilters(initialFilters)
        loadParts(1, initialFilters)
    }

    function applyPreset(
        changes: Partial<FilterState>
    ) {
        const nextFilters = {
            ...filters,
            ...changes,
        }

        setFilters(nextFilters)
        loadParts(1, nextFilters)
    }

    function goToPage(page: number) {
        if (page < 1 || page > pagination.totalPages) {
            return
        }

        loadParts(page, filters)
    }

    const selectedVehicleFamily =
        filters.vehicleFamilyId === "all"
            ? null
            : vehicleFamilies.find(
                (family) => family.id === filters.vehicleFamilyId
            ) || null

    const availableVehicleModels = selectedVehicleFamily
        ? selectedVehicleFamily.models
        : vehicleFamilies.flatMap((family) => family.models)

    const activeFilterCount = [
        Boolean(filters.search.trim()),
        filters.status !== "all",
        filters.vehicleFamilyId !== "all",
        filters.vehicleModelId !== "all",
        filters.riskResponsibleId !== "all",
        filters.pnResponsibleId !== "all",
        filters.onlyOpenRisks === "true",
        filters.hasOverdueActions === "true",
        filters.logisticsStatus !== "all",
        filters.operationalStatus !== "all",
    ].filter(Boolean).length

    const statusDistribution = [
        {
            status: "RED",
            label: "Vermelho",
            value: stats.statusDistribution.red,
            barClassName: "bg-red-500",
        },
        {
            status: "YELLOW",
            label: "Amarelo",
            value: stats.statusDistribution.yellow,
            barClassName: "bg-yellow-500",
        },
        {
            status: "ORANGE",
            label: "Laranja",
            value: stats.statusDistribution.orange,
            barClassName: "bg-orange-500",
        },
        {
            status: "GREEN",
            label: "Verde",
            value: stats.statusDistribution.green,
            barClassName: "bg-green-500",
        },
        {
            status: "GREY",
            label: "Cinza",
            value: stats.statusDistribution.grey,
            barClassName: "bg-slate-500",
        },
        {
            status: "BLUE",
            label: "Concluído",
            value: stats.statusDistribution.blue,
            barClassName: "bg-blue-500",
        },
    ]

    const logisticsDistribution = [
        {
            status: "NOT_REQUESTED",
            label: "Não solicitado",
            description: "Ainda fora do fluxo logístico",
            value: stats.logisticsDistribution.notRequested,
            barClassName: "bg-slate-500",
            badgeClassName:
                "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        },
        {
            status: "REQUESTED",
            label: "Solicitado",
            description: "Solicitação enviada à Logística",
            value: stats.logisticsDistribution.requested,
            barClassName: "bg-amber-500",
            badgeClassName:
                "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
        },
        {
            status: "IN_LOGISTICS",
            label: "Em Logística",
            description: "Atualmente em análise logística",
            value: stats.logisticsDistribution.inLogistics,
            barClassName: "bg-blue-500",
            badgeClassName:
                "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
        },
        {
            status: "APPROVED",
            label: "Aprovado",
            description: "Análise logística aprovada",
            value: stats.logisticsDistribution.approved,
            barClassName: "bg-green-500",
            badgeClassName:
                "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
        },
        {
            status: "REJECTED",
            label: "Rejeitado",
            description: "Requer revisão ou nova solicitação",
            value: stats.logisticsDistribution.rejected,
            barClassName: "bg-red-500",
            badgeClassName:
                "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
        },
    ]

    const operationalStatusLegend: {
        status: PartNumberOverviewItem["analysis"]["operationalStatus"]
        description: string
    }[] = [
        {
            status: "IMMEDIATE_ACTION",
            description:
                "PN vermelho, PN amarelo sem plano, plano atrasado ou solicitação logística rejeitada.",
        },
        {
            status: "ATTENTION",
            description:
                "PN amarelo com plano de ação ou PN verde sem nenhum plano relacionado.",
        },
        {
            status: "WAITING_LOGISTICS",
            description:
                "Solicitação enviada ou atualmente em análise pela Logística.",
        },
        {
            status: "REGISTRATION_ADJUSTMENT",
            description:
                "Ausência de responsável ou aplicação ativa.",
        },
        {
            status: "MONITORING",
            description:
                "PN verde com plano de ação e sem outra pendência de maior precedência.",
        },
        {
            status: "COMPLETED",
            description:
                "PN concluído, identificado pelo status Blue.",
        },
    ]

    return (
        <ProtectedRoute permission="RISK_VIEW">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <div className="space-y-5 p-4 md:p-6">
                        <Card className="overflow-hidden border-none bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white shadow-lg">
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="max-w-3xl">
                                        <Badge className="mb-3 border-white/15 bg-white/10 text-white hover:bg-white/10">
                                            Visão operacional
                                        </Badge>

                                        <h1 className="text-3xl font-bold tracking-tight">
                                            Análise de PNs
                                        </h1>

                                        <p className="mt-2 text-sm leading-6 text-slate-300">
                                            Priorize os PNs que exigem ação, acompanhe a distribuição
                                            por status e identifique rapidamente atrasos, lacunas de
                                            responsabilidade e aplicações não cadastradas.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                            <Gauge className="h-4 w-4" />
                                            {stats.operationalQueuePartNumbers} PN(s) na fila operacional
                                        </div>

                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                loadParts(pagination.page, filters)
                                            }
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <RotateCcw className="mr-2 h-4 w-4" />
                                            )}
                                            Atualizar análise
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <SummaryCard
                                title="PNs monitorados"
                                value={stats.totalPartNumbers}
                                description={
                                    String(stats.partNumbersWithOpenRisks) +
                                    " em RMs abertas"
                                }
                                icon={<Boxes className="h-5 w-5" />}
                            />

                            <SummaryCard
                                title="Fila operacional"
                                value={stats.operationalQueuePartNumbers}
                                description={
                                    String(
                                        getPercentage(
                                            stats.operationalQueuePartNumbers,
                                            stats.totalPartNumbers
                                        )
                                    ) + "% dos PNs analisados"
                                }
                                icon={<CircleAlert className="h-5 w-5" />}
                                tone="warning"
                            />

                            <SummaryCard
                                title="PNs críticos"
                                value={stats.criticalPartNumbers}
                                description="Status consolidado vermelho"
                                icon={<ShieldAlert className="h-5 w-5" />}
                                tone="danger"
                            />

                            <SummaryCard
                                title="Planos atrasados"
                                value={stats.totalOverdueActionPlans}
                                description={
                                    String(
                                        stats.partNumbersWithOverdueActions
                                    ) + " PN(s) impactado(s)"
                                }
                                icon={<CalendarClock className="h-5 w-5" />}
                                tone="danger"
                            />
                        </div>

                        <div className="grid items-start gap-4 xl:grid-cols-12">
                            <div className="space-y-4 xl:col-span-7">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Distribuição do portfólio
                                    </CardTitle>

                                    <CardDescription>
                                        Status consolidado dos PNs dentro do recorte atual.
                                        Clique em uma categoria para filtrar.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-5">
                                    <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                                        {statusDistribution.map((item) =>
                                            item.value > 0 ? (
                                                <div
                                                    key={item.status}
                                                    className={item.barClassName}
                                                    style={{
                                                        width:
                                                            String(
                                                                getPercentage(
                                                                    item.value,
                                                                    stats.totalPartNumbers
                                                                )
                                                            ) + "%",
                                                    }}
                                                    title={
                                                        item.label +
                                                        ": " +
                                                        item.value
                                                    }
                                                />
                                            ) : null
                                        )}
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {statusDistribution.map((item) => (
                                            <button
                                                key={item.status}
                                                type="button"
                                                onClick={() =>
                                                    applyPreset({
                                                        status: item.status,
                                                    })
                                                }
                                                className="flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={
                                                            "h-2.5 w-2.5 rounded-full " +
                                                            item.barClassName
                                                        }
                                                    />

                                                    <span className="text-sm">
                                                        {item.label}
                                                    </span>
                                                </div>

                                                <div className="text-right">
                                                    <p className="font-semibold">
                                                        {item.value}
                                                    </p>

                                                    <p className="text-xs text-muted-foreground">
                                                        {getPercentage(
                                                            item.value,
                                                            stats.totalPartNumbers
                                                        )}%
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {stats.statusDistribution.withoutStatus > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {stats.statusDistribution.withoutStatus} PN(s)
                                            ainda estão sem status consolidado.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Truck className="h-5 w-5" />
                                                Distribuição dos PNs dentro da Logística
                                            </CardTitle>

                                            <CardDescription className="mt-1">
                                                Situação logística consolidada dos PNs no recorte atual.
                                                Clique em uma categoria para filtrar a fila.
                                            </CardDescription>
                                        </div>

                                        <Badge variant="outline">
                                            {stats.logisticsDistribution.requested +
                                                stats.logisticsDistribution.inLogistics} em andamento
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-5">
                                    <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                                        {logisticsDistribution.map((item) =>
                                            item.value > 0 ? (
                                                <div
                                                    key={item.status}
                                                    className={item.barClassName}
                                                    style={{
                                                        width:
                                                            String(
                                                                getPercentage(
                                                                    item.value,
                                                                    stats.totalPartNumbers
                                                                )
                                                            ) + "%",
                                                    }}
                                                    title={
                                                        item.label +
                                                        ": " +
                                                        item.value
                                                    }
                                                />
                                            ) : null
                                        )}
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-5">
                                        {logisticsDistribution.map((item) => (
                                            <button
                                                key={item.status}
                                                type="button"
                                                onClick={() =>
                                                    applyPreset({
                                                        logisticsStatus:
                                                            item.status,
                                                    })
                                                }
                                                className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span
                                                        className={
                                                            "h-2.5 w-2.5 rounded-full " +
                                                            item.barClassName
                                                        }
                                                    />

                                                    <span className="text-lg font-semibold">
                                                        {item.value}
                                                    </span>
                                                </div>

                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        "mt-3 " +
                                                        item.badgeClassName
                                                    }
                                                >
                                                    {item.label}
                                                </Badge>

                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    {item.description}
                                                </p>

                                                <p className="mt-2 text-xs font-medium">
                                                    {getPercentage(
                                                        item.value,
                                                        stats.totalPartNumbers
                                                    )}% do portfólio
                                                </p>
                                            </button>
                                        ))}
                                    </div>

                                    {stats.logisticsDistribution.withoutStatus > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {stats.logisticsDistribution.withoutStatus} PN(s)
                                            sem situação logística definida.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                            </div>

                            <Card className="xl:col-span-5">
                                <CardHeader>
                                    <CardTitle>
                                        Pontos para decisão
                                    </CardTitle>

                                    <CardDescription>
                                        Pendências que merecem validação operacional.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            applyPreset({
                                                status: "RED",
                                                hasOverdueActions: "false",
                                            })
                                        }
                                        className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-950/40">
                                                <AlertTriangle className="h-4 w-4" />
                                            </div>

                                            <div>
                                                <p className="text-sm font-medium">
                                                    Status vermelho
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    Exige contenção ou plano imediato
                                                </p>
                                            </div>
                                        </div>

                                        <span className="font-semibold">
                                            {stats.criticalPartNumbers}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            applyPreset({
                                                hasOverdueActions: "true",
                                                status: "all",
                                            })
                                        }
                                        className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-orange-50 p-2 text-orange-600 dark:bg-orange-950/40">
                                                <CalendarClock className="h-4 w-4" />
                                            </div>

                                            <div>
                                                <p className="text-sm font-medium">
                                                    Com plano atrasado
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    Prazo vencido e ação ainda aberta
                                                </p>
                                            </div>
                                        </div>

                                        <span className="font-semibold">
                                            {stats.partNumbersWithOverdueActions}
                                        </span>
                                    </button>

                                    <div className="flex items-center justify-between rounded-lg border p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                                                <UserX className="h-4 w-4" />
                                            </div>

                                            <div>
                                                <p className="text-sm font-medium">
                                                    Sem responsável Risk
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    RM relacionada sem ownership
                                                </p>
                                            </div>
                                        </div>

                                        <span className="font-semibold">
                                            {stats.partNumbersWithoutRiskResponsible}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-lg border p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                                                <UserX className="h-4 w-4" />
                                            </div>

                                            <div>
                                                <p className="text-sm font-medium">
                                                    Sem responsável PN
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    PN relacionado sem responsável
                                                </p>
                                            </div>
                                        </div>

                                        <span className="font-semibold">
                                            {stats.partNumbersWithoutPnResponsible}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-lg border p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                                                <PackageSearch className="h-4 w-4" />
                                            </div>

                                            <div>
                                                <p className="text-sm font-medium">
                                                    Sem aplicação ativa
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    Verifique classe e modelo
                                                </p>
                                            </div>
                                        </div>

                                        <span className="font-semibold">
                                            {stats.partNumbersWithoutActiveApplication}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            applyPreset({
                                                status: "BLUE",
                                                hasOverdueActions: "false",
                                            })
                                        }
                                        className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40">
                                                <CheckCircle2 className="h-4 w-4" />
                                            </div>

                                            <div>
                                                <p className="text-sm font-medium">
                                                    Concluídos
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    PNs com status Blue
                                                </p>
                                            </div>
                                        </div>

                                        <span className="font-semibold">
                                            {stats.completedPartNumbers}
                                        </span>
                                    </button>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <SlidersHorizontal className="h-5 w-5" />
                                            Filtros da análise
                                        </CardTitle>

                                        <CardDescription className="mt-1">
                                            Refine a fila por contexto, responsável e situação operacional.
                                        </CardDescription>
                                    </div>

                                    <Badge variant="outline">
                                        {activeFilterCount} filtro(s) ativo(s)
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-5">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                                    <div className="space-y-2 xl:col-span-2">
                                        <Label>Buscar PN</Label>

                                        <Input
                                            placeholder="Número ou descrição..."
                                            value={filters.search}
                                            onChange={(event) =>
                                                setFilters((previous) => ({
                                                    ...previous,
                                                    search: event.target.value,
                                                }))
                                            }
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    applyFilters()
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Status consolidado</Label>

                                        <Select
                                            value={filters.status}
                                            onValueChange={(value) =>
                                                setFilters((previous) => ({
                                                    ...previous,
                                                    status: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="RED">Vermelho</SelectItem>
                                                <SelectItem value="YELLOW">Amarelo</SelectItem>
                                                <SelectItem value="ORANGE">Laranja</SelectItem>
                                                <SelectItem value="GREEN">Verde</SelectItem>
                                                <SelectItem value="GREY">Cinza</SelectItem>
                                                <SelectItem value="BLUE">Concluído</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Situação / PN</Label>

                                        <Select
                                            value={filters.operationalStatus}
                                            onValueChange={(value) =>
                                                setFilters((previous) => ({
                                                    ...previous,
                                                    operationalStatus: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todas as situações
                                                </SelectItem>

                                                <SelectItem value="IMMEDIATE_ACTION">
                                                    Ação imediata
                                                </SelectItem>

                                                <SelectItem value="ATTENTION">
                                                    Atenção
                                                </SelectItem>

                                                <SelectItem value="WAITING_LOGISTICS">
                                                    Aguardando Logística
                                                </SelectItem>

                                                <SelectItem value="REGISTRATION_ADJUSTMENT">
                                                    Ajuste cadastral
                                                </SelectItem>

                                                <SelectItem value="MONITORING">
                                                    Monitoramento
                                                </SelectItem>

                                                <SelectItem value="COMPLETED">
                                                    Concluído
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Classe</Label>

                                        <Select
                                            value={filters.vehicleFamilyId}
                                            onValueChange={(value) =>
                                                setFilters((previous) => ({
                                                    ...previous,
                                                    vehicleFamilyId: value,
                                                    vehicleModelId: "all",
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">Todas</SelectItem>

                                                {vehicleFamilies.map((family) => (
                                                    <SelectItem
                                                        key={family.id}
                                                        value={family.id}
                                                    >
                                                        {family.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Modelo</Label>

                                        <Select
                                            value={filters.vehicleModelId}
                                            onValueChange={(value) =>
                                                setFilters((previous) => ({
                                                    ...previous,
                                                    vehicleModelId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>

                                                {availableVehicleModels.map((model) => (
                                                    <SelectItem
                                                        key={model.id}
                                                        value={model.id}
                                                    >
                                                        {model.code}
                                                        {model.name
                                                            ? " — " + model.name
                                                            : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Responsável Risk</Label>

                                        <Select
                                            value={filters.riskResponsibleId}
                                            onValueChange={(value) =>
                                                setFilters((previous) => ({
                                                    ...previous,
                                                    riskResponsibleId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>

                                                {users.map((user) => (
                                                    <SelectItem
                                                        key={user.id}
                                                        value={user.id}
                                                    >
                                                        {user.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Responsável PN</Label>

                                        <Select
                                            value={filters.pnResponsibleId}
                                            onValueChange={(value) =>
                                                setFilters((previous) => ({
                                                    ...previous,
                                                    pnResponsibleId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>

                                                {users.map((user) => (
                                                    <SelectItem
                                                        key={user.id}
                                                        value={user.id}
                                                    >
                                                        {user.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Escopo de RMs</Label>

                                        <Select
                                            value={filters.onlyOpenRisks}
                                            onValueChange={(value) =>
                                                setFilters((previous) => ({
                                                    ...previous,
                                                    onlyOpenRisks: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="true">
                                                    Somente RMs abertas
                                                </SelectItem>

                                                <SelectItem value="false">
                                                    Todas as RMs
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Planos de ação</Label>

                                        <Select
                                            value={filters.hasOverdueActions}
                                            onValueChange={(value) =>
                                                setFilters((previous) => ({
                                                    ...previous,
                                                    hasOverdueActions: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="false">
                                                    Todos
                                                </SelectItem>

                                                <SelectItem value="true">
                                                    Somente atrasados
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Situação logística</Label>

                                        <Select
                                            value={filters.logisticsStatus}
                                            onValueChange={(value) =>
                                                setFilters((previous) => ({
                                                    ...previous,
                                                    logisticsStatus: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todas
                                                </SelectItem>

                                                <SelectItem value="NOT_REQUESTED">
                                                    Não solicitado
                                                </SelectItem>

                                                <SelectItem value="REQUESTED">
                                                    Solicitado
                                                </SelectItem>

                                                <SelectItem value="IN_LOGISTICS">
                                                    Em Logística
                                                </SelectItem>

                                                <SelectItem value="APPROVED">
                                                    Aprovado
                                                </SelectItem>

                                                <SelectItem value="REJECTED">
                                                    Rejeitado
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Ordenação</Label>

                                        <Select
                                            value={filters.sortBy}
                                            onValueChange={(value) =>
                                                setFilters((previous) => ({
                                                    ...previous,
                                                    sortBy: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="operationalStatus">
                                                    Situação operacional
                                                </SelectItem>

                                                <SelectItem value="overdue">
                                                    Planos atrasados
                                                </SelectItem>

                                                <SelectItem value="openRms">
                                                    Quantidade de RMs abertas
                                                </SelectItem>

                                                <SelectItem value="updatedAt">
                                                    Atualização mais recente
                                                </SelectItem>

                                                <SelectItem value="partNumber">
                                                    Número do PN
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        onClick={applyFilters}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Search className="mr-2 h-4 w-4" />
                                        )}
                                        Aplicar filtros
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetFilters}
                                        disabled={loading}
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Limpar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <PackageSearch className="h-5 w-5" />
                                            Fila priorizada de PNs
                                        </CardTitle>

                                        <CardDescription className="mt-1">
                                            A situação indica a próxima atuação necessária para cada PN.
                                        </CardDescription>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary">
                                            {pagination.total} resultado(s)
                                        </Badge>

                                        <Badge variant="outline">
                                            Página {pagination.page} de {pagination.totalPages || 1}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="rounded-xl border bg-muted/20 p-4">
                                    <div className="mb-3 flex items-start gap-2">
                                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                                        <div>
                                            <p className="text-sm font-semibold">
                                                Legenda da situação operacional
                                            </p>

                                            <p className="text-xs text-muted-foreground">
                                                A classificação informa a próxima atuação necessária. Clique em uma situação para filtrar.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {operationalStatusLegend.map((item) => (
                                            <button
                                                key={item.status}
                                                type="button"
                                                onClick={() =>
                                                    applyPreset({
                                                        operationalStatus:
                                                            item.status,
                                                    })
                                                }
                                                className="flex items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/50"
                                            >
                                                <Badge
                                                    className={
                                                        "shrink-0 " +
                                                        getOperationalStatusClassName(
                                                            item.status
                                                        )
                                                    }
                                                >
                                                    {getOperationalStatusLabel(
                                                        item.status
                                                    )}
                                                </Badge>

                                                <p className="text-xs leading-5 text-muted-foreground">
                                                    {item.description}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-xl border">
                                    <table className="w-full min-w-[1180px] text-sm">
                                        <thead className="bg-muted/50">
                                            <tr className="border-b">
                                                <th className="w-[300px] px-4 py-3 text-left font-medium">
                                                    Situação / PN
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Status
                                                </th>

                                                <th className="w-[230px] px-4 py-3 text-left font-medium">
                                                    Fornecedor / aplicação
                                                </th>

                                                <th className="w-[220px] px-4 py-3 text-left font-medium">
                                                    RMs
                                                </th>

                                                <th className="w-[190px] px-4 py-3 text-left font-medium">
                                                    Responsável Risk
                                                </th>

                                                <th className="w-[190px] px-4 py-3 text-left font-medium">
                                                    Planos
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Atualização
                                                </th>

                                                <th className="w-12 px-2 py-3">
                                                    <span className="sr-only">
                                                        Detalhes
                                                    </span>
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td
                                                        colSpan={8}
                                                        className="px-4 py-12 text-center text-muted-foreground"
                                                    >
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Carregando análise...
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : parts.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={8}
                                                        className="px-4 py-12 text-center text-muted-foreground"
                                                    >
                                                        Nenhum PN encontrado para os filtros aplicados.
                                                    </td>
                                                </tr>
                                            ) : (
                                                parts.map((part) => {
                                                    const isExpanded =
                                                        expandedPartId === part.id

                                                    return (
                                                        <Fragment key={part.id}>
                                                            <tr className="border-b transition-colors hover:bg-muted/30">
                                                                <td className="px-4 py-4 align-top">
                                                                    <div className="space-y-2">
                                                                        <Badge
                                                                            className={getOperationalStatusClassName(
                                                                                part.analysis.operationalStatus
                                                                            )}
                                                                        >
                                                                            {getOperationalStatusLabel(
                                                                                part.analysis.operationalStatus
                                                                            )}
                                                                        </Badge>

                                                                        <div>
                                                                            <Button
                                                                                asChild
                                                                                variant="link"
                                                                                className="h-auto p-0 text-base font-semibold"
                                                                            >
                                                                                <Link href={"/pns/" + part.id}>
                                                                                    {part.partNumber}
                                                                                </Link>
                                                                            </Button>

                                                                            <p className="mt-1 line-clamp-2 max-w-[280px] text-xs text-muted-foreground">
                                                                                {part.description || "Sem descrição"}
                                                                            </p>
                                                                        </div>

                                                                        {part.commodities.length > 0 && (
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {part.commodities.join(", ")}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                <td className="px-4 py-4 align-top">
                                                                    <StatusBadge
                                                                        status={part.consolidatedStatus}
                                                                    />

                                                                    <div className="mt-3">
                                                                        <p className="mb-1 text-[11px] text-muted-foreground">
                                                                            Logística
                                                                        </p>

                                                                        <Badge
                                                                            variant="outline"
                                                                            className={getLogisticsStatusClassName(
                                                                                part.logistics
                                                                                    .consolidatedStatus
                                                                            )}
                                                                        >
                                                                            {getLogisticsStatusLabel(
                                                                                part.logistics
                                                                                    .consolidatedStatus
                                                                            )}
                                                                        </Badge>
                                                                    </div>

                                                                    {part.analysis.isCompleted && (
                                                                        <p className="mt-2 text-xs text-blue-600">
                                                                            Fluxo concluído
                                                                        </p>
                                                                    )}
                                                                </td>

                                                                <td className="px-4 py-4 align-top">
                                                                    <SupplierList
                                                                        suppliers={part.suppliers}
                                                                    />

                                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                                        {part.vehicleApplications
                                                                            .filter(
                                                                                (application) =>
                                                                                    application.isActive
                                                                            )
                                                                            .slice(0, 2)
                                                                            .map((application) => (
                                                                                <Badge
                                                                                    key={application.id}
                                                                                    variant="outline"
                                                                                    className="font-normal"
                                                                                >
                                                                                    {
                                                                                        application
                                                                                            .vehicleModel
                                                                                            .family.name
                                                                                    } / {
                                                                                        application
                                                                                            .vehicleModel
                                                                                            .code
                                                                                    }
                                                                                </Badge>
                                                                            ))}

                                                                        {part.analysis
                                                                            .withoutActiveVehicleApplication && (
                                                                            <Badge variant="secondary">
                                                                                Sem aplicação ativa
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                <td className="px-4 py-4 align-top">
                                                                    <RiskEventList
                                                                        riskEvents={part.riskEvents}
                                                                    />

                                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                                        {part.usage.openRms} aberta(s) ·{" "}
                                                                        {part.usage.closedRms} fechada(s)
                                                                    </p>
                                                                </td>

                                                                <td className="px-4 py-4 align-top">
                                                                    <UserList
                                                                        users={part.riskResponsibles}
                                                                    />
                                                                </td>

                                                                <td className="px-4 py-4 align-top">
                                                                    <p className="font-medium">
                                                                        {part.actionPlans.open} aberto(s)
                                                                    </p>

                                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                                        {part.actionPlans.completed} concluído(s)
                                                                    </p>

                                                                    {part.actionPlans.overdue > 0 && (
                                                                        <Badge
                                                                            variant="destructive"
                                                                            className="mt-2"
                                                                        >
                                                                            {part.actionPlans.overdue} atrasado(s)
                                                                        </Badge>
                                                                    )}

                                                                    {part.actionPlans.nextDueDate && (
                                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                                            Próximo:{" "}
                                                                            {formatDate(
                                                                                part.actionPlans.nextDueDate
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-4 align-top text-xs text-muted-foreground">
                                                                    {formatDateTime(part.updatedAt)}
                                                                </td>

                                                                <td className="px-2 py-4 align-top">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() =>
                                                                            setExpandedPartId(
                                                                                isExpanded
                                                                                    ? null
                                                                                    : part.id
                                                                            )
                                                                        }
                                                                        aria-label={
                                                                            isExpanded
                                                                                ? "Recolher detalhes"
                                                                                : "Expandir detalhes"
                                                                        }
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronUp className="h-4 w-4" />
                                                                        ) : (
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                </td>
                                                            </tr>

                                                            {isExpanded && (
                                                                <tr className="border-b bg-muted/20">
                                                                    <td
                                                                        colSpan={8}
                                                                        className="px-4 py-5"
                                                                    >
                                                                        <div className="grid gap-5 lg:grid-cols-3">
                                                                            <div>
                                                                                <p className="mb-3 text-sm font-semibold">
                                                                                    Motivos da situação
                                                                                </p>

                                                                                {part.analysis.operationalReasons.length ===
                                                                                0 ? (
                                                                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                                                                        <CheckCircle2 className="h-4 w-4" />
                                                                                        Nenhuma pendência relevante
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="space-y-2">
                                                                                        {part.analysis.operationalReasons.map(
                                                                                            (reason) => (
                                                                                                <div
                                                                                                    key={reason}
                                                                                                    className="flex items-start gap-2 text-sm"
                                                                                                >
                                                                                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                                                                                                    {reason}
                                                                                                </div>
                                                                                            )
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div>
                                                                                <p className="mb-3 text-sm font-semibold">
                                                                                    Aplicações
                                                                                </p>

                                                                                <VehicleApplicationList
                                                                                    applications={
                                                                                        part.vehicleApplications
                                                                                    }
                                                                                />
                                                                            </div>

                                                                            <div className="space-y-4">
                                                                                <div>
                                                                                    <p className="mb-2 text-sm font-semibold">
                                                                                        Responsável pelo PN
                                                                                    </p>

                                                                                    <UserList
                                                                                        users={
                                                                                            part.pnResponsibles
                                                                                        }
                                                                                    />
                                                                                </div>

                                                                                <div>
                                                                                    <p className="mb-2 text-sm font-semibold">
                                                                                        Uso nas RMs
                                                                                    </p>

                                                                                    <p className="text-sm text-muted-foreground">
                                                                                        {part.usage.totalRms} RM(s) no total,
                                                                                        {" "}{part.usage.openRms} aberta(s) e
                                                                                        {" "}{part.usage.closedRms} fechada(s).
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </Fragment>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Exibindo página {pagination.page} de{" "}
                                        {pagination.totalPages || 1} —{" "}
                                        {pagination.total} PN(s)
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                                loading || pagination.page <= 1
                                            }
                                            onClick={() =>
                                                goToPage(pagination.page - 1)
                                            }
                                        >
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Anterior
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                                loading ||
                                                pagination.page >=
                                                    pagination.totalPages
                                            }
                                            onClick={() =>
                                                goToPage(pagination.page + 1)
                                            }
                                        >
                                            Próxima
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}
