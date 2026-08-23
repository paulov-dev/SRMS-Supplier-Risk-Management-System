"use client"

import { useEffect, useState } from "react"
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
    Activity,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Boxes,
    CalendarClock,
    Filter,
    Loader2,
    PackageSearch,
    RotateCcw,
    Search,
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

    updatedAt: string
}

type OverviewStats = {
    totalPartNumbers: number
    partNumbersWithOpenRisks: number
    criticalPartNumbers: number
    partNumbersWithOverdueActions: number
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
}

const initialFilters: FilterState = {
    search: "",
    status: "all",
    vehicleFamilyId: "all",
    vehicleModelId: "all",
    riskResponsibleId: "all",
    pnResponsibleId: "all",
    onlyOpenRisks: "false",
    hasOverdueActions: "false",
}

const initialStats: OverviewStats = {
    totalPartNumbers: 0,
    partNumbersWithOpenRisks: 0,
    criticalPartNumbers: 0,
    partNumbersWithOverdueActions: 0,
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
            return "Azul"

        default:
            return "Sem status"
    }
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

    return (
        <ProtectedRoute permission="RISK_VIEW">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <div className="space-y-6 p-6">



                        <Card className="overflow-hidden border-none bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                    <div className="space-y-2">


                                        <div>
                                            <h1 className="text-3xl font-bold tracking-tight">
                                                PNs
                                            </h1>

                                            <p className="mt-2 max-w-2xl text-sm text-slate-300">
                                                Visão consolidada dos PNs cadastrados,
                                                suas RMs vinculadas, responsáveis e planos
                                                de ação.
                                            </p>
                                        </div>

                                    </div>

                                    <div className="flex flex-wrap gap-2">
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
                                            Atualizar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Total de PNs
                                            </p>

                                            <p className="mt-2 text-3xl font-bold">
                                                {stats.totalPartNumbers}
                                            </p>
                                        </div>

                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                                            <Boxes className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                PNs em RMs abertas
                                            </p>

                                            <p className="mt-2 text-3xl font-bold">
                                                {stats.partNumbersWithOpenRisks}
                                            </p>
                                        </div>

                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                                            <Activity className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                PNs críticos
                                            </p>

                                            <p className="mt-2 text-3xl font-bold">
                                                {stats.criticalPartNumbers}
                                            </p>
                                        </div>

                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                                            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                PNs com plano atrasado
                                            </p>

                                            <p className="mt-2 text-3xl font-bold">
                                                {stats.partNumbersWithOverdueActions}
                                            </p>
                                        </div>

                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                                            <CalendarClock className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Filter className="h-5 w-5" />
                                    Filtros
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="space-y-2">
                                        <Label>Buscar PN</Label>

                                        <Input
                                            placeholder="PN ou descrição..."
                                            value={filters.search}
                                            onChange={(e) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    search: e.target.value,
                                                }))
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
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
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    status: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos os status" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todos
                                                </SelectItem>

                                                <SelectItem value="RED">
                                                    Vermelho
                                                </SelectItem>

                                                <SelectItem value="YELLOW">
                                                    Amarelo
                                                </SelectItem>

                                                <SelectItem value="GREEN">
                                                    Verde
                                                </SelectItem>

                                                <SelectItem value="ORANGE">
                                                    Laranja
                                                </SelectItem>

                                                <SelectItem value="GREY">
                                                    Cinza
                                                </SelectItem>

                                                <SelectItem value="BLUE">
                                                    Azul
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Classe</Label>

                                        <Select
                                            value={filters.vehicleFamilyId}
                                            onValueChange={(value) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    vehicleFamilyId: value,
                                                    vehicleModelId: "all",
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas as classes" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todas
                                                </SelectItem>

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
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    vehicleModelId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos os modelos" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todos
                                                </SelectItem>

                                                {availableVehicleModels.map((model) => (
                                                    <SelectItem
                                                        key={model.id}
                                                        value={model.id}
                                                    >
                                                        {model.code}
                                                        {model.name ? ` — ${model.name}` : ""}
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
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    riskResponsibleId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todos
                                                </SelectItem>

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
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    pnResponsibleId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todos
                                                </SelectItem>

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
                                        <Label>RMs</Label>

                                        <Select
                                            value={filters.onlyOpenRisks}
                                            onValueChange={(value) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    onlyOpenRisks: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas as RMs" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="false">
                                                    Todas as RMs
                                                </SelectItem>

                                                <SelectItem value="true">
                                                    Somente RMs abertas
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Planos de ação</Label>

                                        <Select
                                            value={filters.hasOverdueActions}
                                            onValueChange={(value) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    hasOverdueActions: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos os planos" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="false">
                                                    Todos
                                                </SelectItem>

                                                <SelectItem value="true">
                                                    Com plano atrasado
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
                                        Limpar filtros
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PackageSearch className="h-5 w-5" />
                                    Lista de PNs
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr className="border-b">
                                                <th className="px-4 py-3 text-left font-medium">
                                                    PN
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Fornecedor
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Status
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Aplicações
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    RMs
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Responsável Risk
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Responsável PN
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Planos
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Última atualização
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td
                                                        colSpan={9}
                                                        className="px-4 py-10 text-center text-muted-foreground"
                                                    >
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Carregando PNs...
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : parts.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={9}
                                                        className="px-4 py-10 text-center text-muted-foreground"
                                                    >
                                                        Nenhum PN encontrado para os filtros aplicados.
                                                    </td>
                                                </tr>
                                            ) : (
                                                parts.map((part) => (
                                                    <tr
                                                        key={part.id}
                                                        className="border-b last:border-0 hover:bg-muted/40"
                                                    >
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="space-y-1">
                                                                <Button
                                                                    asChild
                                                                    variant="link"
                                                                    className="h-auto p-0 font-medium"
                                                                >
                                                                    <Link href={`/pns/${part.id}`}>
                                                                        {part.partNumber}
                                                                    </Link>
                                                                </Button>

                                                                <p className="max-w-[280px] text-xs text-muted-foreground">
                                                                    {part.description || "-"}
                                                                </p>

                                                                {part.commodities.length > 0 && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Commodity:{" "}
                                                                        {part.commodities.join(", ")}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3 align-top">
                                                            <SupplierList
                                                                suppliers={part.suppliers}
                                                            />
                                                        </td>

                                                        <td className="px-4 py-3 align-top">
                                                            <Badge variant="outline">
                                                                {getStatusLabel(
                                                                    part.consolidatedStatus
                                                                )}
                                                            </Badge>
                                                        </td>

                                                        <td className="px-4 py-3 align-top">
                                                            <VehicleApplicationList
                                                                applications={part.vehicleApplications}
                                                            />
                                                        </td>

                                                        <td className="px-4 py-3 align-top">
                                                            <div className="space-y-2">
                                                                <RiskEventList
                                                                    riskEvents={
                                                                        part.riskEvents
                                                                    }
                                                                />

                                                                <p className="text-xs text-muted-foreground">
                                                                    {part.usage.totalRms} RM(s) •{" "}
                                                                    {part.usage.openRms} aberta(s) •{" "}
                                                                    {part.usage.closedRms} fechada(s)
                                                                </p>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3 align-top">
                                                            <UserList
                                                                users={
                                                                    part.riskResponsibles
                                                                }
                                                            />
                                                        </td>

                                                        <td className="px-4 py-3 align-top">
                                                            <UserList
                                                                users={part.pnResponsibles}
                                                            />
                                                        </td>

                                                        <td className="px-4 py-3 align-top">
                                                            <div className="space-y-1">
                                                                <p className="font-medium">
                                                                    {part.actionPlans.total} plano(s)
                                                                </p>

                                                                <p className="text-xs text-muted-foreground">
                                                                    {part.actionPlans.open} aberto(s) •{" "}
                                                                    {part.actionPlans.completed} concluído(s)
                                                                </p>

                                                                {part.actionPlans.overdue > 0 && (
                                                                    <p className="text-xs font-medium">
                                                                        {part.actionPlans.overdue} atrasado(s)
                                                                    </p>
                                                                )}

                                                                {part.actionPlans.nextDueDate && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Próximo prazo:{" "}
                                                                        {formatDate(
                                                                            part.actionPlans.nextDueDate
                                                                        )}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3 align-top whitespace-nowrap">
                                                            {formatDateTime(part.updatedAt)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Página {pagination.page} de{" "}
                                        {pagination.totalPages || 1} —{" "}
                                        {pagination.total} PN(s) encontrado(s)
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