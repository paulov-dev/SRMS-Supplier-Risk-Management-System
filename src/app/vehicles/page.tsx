"use client"

import { type ReactNode, useEffect, useState } from "react"
import Link from "next/link"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    Car,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    CircleAlert,
    Layers3,
    Loader2,
    RotateCcw,
    Save,
    Search,
    SlidersHorizontal,
    Wrench,
} from "lucide-react"
import { toast } from "sonner"

type ApplicationMetrics = {
    totalApplications: number
    currentApplications: number
    inactiveApplications: number
    expiredActiveApplications: number
    expiringApplications: number
    uniquePartNumbers: number
    currentPartNumbers: number
    partNumbersWithOpenRisks: number
    criticalPartNumbers: number
    relatedRiskEvents: number
    openRiskEvents: number
    criticalRiskEvents: number
}

type ModelRiskEvent = {
    id: string
    code: string
    title: string | null
    workflowStatus: string
    riskLevel: string
    supplier: {
        id: string
        name: string
    }
    assignedTo: {
        id: string
        name: string
    } | null
    logisticsAnalysts: Array<{
        id: string
        name: string
    }>
    parts: Array<{
        riskEventPartId: string
        partNumberId: string
        partNumber: string
        description: string | null
        status: string
        relationSource: "EXPLICIT" | "PART_NUMBER"
    }>
}

type ApplicationAlert = {
    applicationId: string
    partNumberId: string
    partNumber: string
    description: string | null
    validTo: string
    status: "EXPIRED" | "EXPIRING"
}

type VehicleModel = {
    id: string
    familyId: string
    code: string
    name: string | null
    description: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
    metrics: ApplicationMetrics
    riskEvents: ModelRiskEvent[]
    applicationAlerts: ApplicationAlert[]
}

type VehicleFamily = {
    id: string
    name: string
    description: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
    metrics: ApplicationMetrics & {
        totalModels: number
        activeModels: number
        inactiveModels: number
        modelsWithoutCurrentApplications: number
    }
    models: VehicleModel[]
}

type FamilyForm = {
    id: string | null
    name: string
    description: string
    isActive: boolean
}

type ModelForm = {
    id: string | null
    familyId: string
    code: string
    name: string
    description: string
    isActive: boolean
}

const initialFamilyForm: FamilyForm = {
    id: null,
    name: "",
    description: "",
    isActive: true,
}

const initialModelForm: ModelForm = {
    id: null,
    familyId: "",
    code: "",
    name: "",
    description: "",
    isActive: true,
}

function formatDate(value: string | null | undefined) {
    if (!value) return "-"

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return "-"

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date)
}

function StatusBadge({
    isActive,
    activeLabel,
    inactiveLabel,
}: {
    isActive: boolean
    activeLabel: string
    inactiveLabel: string
}) {
    return (
        <Badge
            variant="outline"
            className={
                isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }
        >
            {isActive ? activeLabel : inactiveLabel}
        </Badge>
    )
}

function RiskStatusBadge({ status }: { status: string }) {
    const config: Record<
        string,
        { label: string; className: string }
    > = {
        RED: {
            label: "Vermelho",
            className:
                "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
        },
        ORANGE: {
            label: "Laranja",
            className:
                "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
        },
        YELLOW: {
            label: "Amarelo",
            className:
                "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
        },
        GREEN: {
            label: "Verde",
            className:
                "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
        },
        BLUE: {
            label: "Azul",
            className:
                "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
        },
        GREY: {
            label: "Cinza",
            className:
                "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        },
    }

    const selected = config[status] || {
        label: status,
        className: "",
    }

    return (
        <Badge
            variant="outline"
            className={selected.className}
        >
            {selected.label}
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
    value: string | number
    description: string
    icon: ReactNode
    tone?: "default" | "danger" | "warning" | "success"
}) {
    const iconClassName =
        tone === "danger"
            ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
            : tone === "warning"
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
                : tone === "success"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"

    return (
        <Card>
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

                    <div className={"rounded-xl p-2.5 " + iconClassName}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function getFamilyCoverage(family: VehicleFamily) {
    const activeModels = family.models.filter(
        (model) => model.isActive
    )

    if (activeModels.length === 0) return 0

    const coveredModels = activeModels.filter(
        (model) => model.metrics.currentApplications > 0
    ).length

    return Math.round(
        (coveredModels / activeModels.length) * 100
    )
}

async function readJsonResponse(res: Response) {
    const text = await res.text()

    if (!text) {
        return { data: null, rawText: "" }
    }

    try {
        return {
            data: JSON.parse(text),
            rawText: text,
        }
    } catch {
        return {
            data: null,
            rawText: text,
        }
    }
}

export default function VehiclesPage() {
    const [families, setFamilies] = useState<VehicleFamily[]>([])
    const [loading, setLoading] = useState(true)
    const [savingFamily, setSavingFamily] = useState(false)
    const [savingModel, setSavingModel] = useState(false)
    const [familyForm, setFamilyForm] =
        useState<FamilyForm>(initialFamilyForm)
    const [modelForm, setModelForm] =
        useState<ModelForm>(initialModelForm)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [coverageFilter, setCoverageFilter] = useState("all")
    const [managementTab, setManagementTab] = useState("family")
    const [selectedModelId, setSelectedModelId] = useState("")
    const [riskEventFilter, setRiskEventFilter] =
        useState("open")
    const [riskAnalystFilter, setRiskAnalystFilter] =
        useState("all")
    const [logisticsAnalystFilter, setLogisticsAnalystFilter] =
        useState("all")
    const [expandedFamilyIds, setExpandedFamilyIds] =
        useState<Set<string>>(new Set())

    useEffect(() => {
        loadFamilies()
    }, [])

    async function loadFamilies() {
        try {
            setLoading(true)

            const res = await fetch("/api/vehicle-families", {
                credentials: "include",
            })
            const response = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    response.data?.error ||
                    response.rawText ||
                    "Erro ao carregar classes e modelos"
                )
            }

            const nextFamilies = Array.isArray(response.data)
                ? response.data
                : []

            setFamilies(nextFamilies)
            setSelectedModelId((currentId) => {
                const availableModels = nextFamilies.flatMap(
                    (family: VehicleFamily) => family.models
                )

                if (
                    currentId &&
                    availableModels.some(
                        (model: VehicleModel) =>
                            model.id === currentId
                    )
                ) {
                    return currentId
                }

                return availableModels[0]?.id || ""
            })
        } catch (error) {
            console.error(error)
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar classes e modelos"
            )
        } finally {
            setLoading(false)
        }
    }

    async function handleSaveFamily() {
        const name = familyForm.name.trim()

        if (!name) {
            toast.error("Informe o nome da classe")
            return
        }

        try {
            setSavingFamily(true)
            const isEditing = !!familyForm.id
            const res = await fetch(
                isEditing
                    ? `/api/vehicle-families/${familyForm.id}`
                    : "/api/vehicle-families",
                {
                    method: isEditing ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        name,
                        description:
                            familyForm.description.trim() || null,
                        isActive: familyForm.isActive,
                    }),
                }
            )
            const response = await readJsonResponse(res)

            if (!res.ok) {
                const message =
                    response.data?.error ||
                    response.rawText ||
                    "Erro ao salvar classe"
                const details = response.data?.details

                throw new Error(
                    details && details !== message
                        ? message + ": " + details
                        : message
                )
            }

            toast.success(
                isEditing
                    ? "Classe atualizada com sucesso"
                    : "Classe cadastrada com sucesso"
            )
            setFamilyForm(initialFamilyForm)
            await loadFamilies()
        } catch (error) {
            console.error(error)
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao salvar classe"
            )
        } finally {
            setSavingFamily(false)
        }
    }

    async function handleSaveModel() {
        const familyId = modelForm.familyId
        const code = modelForm.code.trim()

        if (!familyId) {
            toast.error("Selecione a classe do modelo")
            return
        }

        if (!code) {
            toast.error("Informe o código do modelo")
            return
        }

        try {
            setSavingModel(true)
            const isEditing = !!modelForm.id
            const res = await fetch(
                isEditing
                    ? `/api/vehicle-models/${modelForm.id}`
                    : "/api/vehicle-models",
                {
                    method: isEditing ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        familyId,
                        code,
                        name: modelForm.name.trim() || null,
                        description:
                            modelForm.description.trim() || null,
                        isActive: modelForm.isActive,
                    }),
                }
            )
            const response = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    response.data?.error ||
                    response.rawText ||
                    "Erro ao salvar modelo"
                )
            }

            toast.success(
                isEditing
                    ? "Modelo atualizado com sucesso"
                    : "Modelo cadastrado com sucesso"
            )
            setModelForm(initialModelForm)
            await loadFamilies()
        } catch (error) {
            console.error(error)
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao salvar modelo"
            )
        } finally {
            setSavingModel(false)
        }
    }

    function openManagementArea(tab: "family" | "model") {
        setManagementTab(tab)

        window.setTimeout(() => {
            document
                .getElementById("gestao-catalogo")
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                })
        }, 0)
    }

    function editFamily(family: VehicleFamily) {
        setFamilyForm({
            id: family.id,
            name: family.name,
            description: family.description || "",
            isActive: family.isActive,
        })
        openManagementArea("family")
    }

    function editModel(
        family: VehicleFamily,
        model: VehicleModel
    ) {
        setModelForm({
            id: model.id,
            familyId: family.id,
            code: model.code,
            name: model.name || "",
            description: model.description || "",
            isActive: model.isActive,
        })
        openManagementArea("model")
    }

    function analyzeModel(modelId: string) {
        setSelectedModelId(modelId)
        setRiskAnalystFilter("all")
        setLogisticsAnalystFilter("all")

        window.setTimeout(() => {
            document
                .getElementById("analise-modelo")
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                })
        }, 0)
    }

    function toggleFamily(familyId: string) {
        setExpandedFamilyIds((previous) => {
            const next = new Set(previous)

            if (next.has(familyId)) {
                next.delete(familyId)
            } else {
                next.add(familyId)
            }

            return next
        })
    }

    function clearFilters() {
        setSearch("")
        setStatusFilter("all")
        setCoverageFilter("all")
    }

    const allModelContexts = families.flatMap((family) =>
        family.models.map((model) => ({ family, model }))
    )
    const allModels = allModelContexts.map(
        ({ model }) => model
    )
    const selectedModelContext = allModelContexts.find(
        ({ model }) => model.id === selectedModelId
    )
    const selectedModelRiskEvents =
        selectedModelContext?.model.riskEvents || []
    const riskAnalystMap = new Map<
        string,
        { id: string; name: string }
    >()
    const logisticsAnalystMap = new Map<
        string,
        { id: string; name: string }
    >()

    for (const riskEvent of selectedModelRiskEvents) {
        if (riskEvent.assignedTo) {
            riskAnalystMap.set(
                riskEvent.assignedTo.id,
                riskEvent.assignedTo
            )
        }

        for (const analyst of riskEvent.logisticsAnalysts) {
            logisticsAnalystMap.set(analyst.id, analyst)
        }
    }

    const riskAnalystOptions = Array.from(
        riskAnalystMap.values()
    ).sort((left, right) =>
        left.name.localeCompare(right.name)
    )
    const logisticsAnalystOptions = Array.from(
        logisticsAnalystMap.values()
    ).sort((left, right) =>
        left.name.localeCompare(right.name)
    )
    const selectedRiskEvents = selectedModelRiskEvents.filter(
        (riskEvent) => {
            const statusMatches =
                riskEventFilter === "all" ||
                (riskEventFilter === "open" &&
                    riskEvent.workflowStatus === "OPEN") ||
                (riskEventFilter === "critical" &&
                    riskEvent.workflowStatus === "OPEN" &&
                    riskEvent.parts.some(
                        (part) => part.status === "RED"
                    ))
            const riskAnalystMatches =
                riskAnalystFilter === "all" ||
                (riskAnalystFilter === "unassigned" &&
                    !riskEvent.assignedTo) ||
                riskEvent.assignedTo?.id === riskAnalystFilter
            const logisticsAnalystMatches =
                logisticsAnalystFilter === "all" ||
                (logisticsAnalystFilter === "unassigned" &&
                    riskEvent.logisticsAnalysts.length === 0) ||
                riskEvent.logisticsAnalysts.some(
                    (analyst) =>
                        analyst.id === logisticsAnalystFilter
                )

            return (
                statusMatches &&
                riskAnalystMatches &&
                logisticsAnalystMatches
            )
        }
    )

    const filteredFamilies = families
        .map((family) => {
            const term = search.trim().toLowerCase()
            const familyMatches =
                !term ||
                family.name.toLowerCase().includes(term) ||
                family.description?.toLowerCase().includes(term)

            const models = family.models.filter((model) => {
                const searchMatches =
                    familyMatches ||
                    model.code.toLowerCase().includes(term) ||
                    model.name?.toLowerCase().includes(term) ||
                    model.description?.toLowerCase().includes(term)
                const statusMatches =
                    statusFilter === "all" ||
                    (statusFilter === "active" && model.isActive) ||
                    (statusFilter === "inactive" && !model.isActive)
                const coverageMatches =
                    coverageFilter === "all" ||
                    (coverageFilter === "covered" &&
                        model.metrics.currentApplications > 0) ||
                    (coverageFilter === "uncovered" &&
                        model.metrics.currentApplications === 0) ||
                    (coverageFilter === "risk" &&
                        model.metrics.partNumbersWithOpenRisks > 0) ||
                    (coverageFilter === "critical" &&
                        model.metrics.criticalPartNumbers > 0) ||
                    (coverageFilter === "expired" &&
                        model.metrics.expiredActiveApplications > 0) ||
                    (coverageFilter === "expiring" &&
                        model.metrics.expiringApplications > 0)

                return (
                    searchMatches &&
                    statusMatches &&
                    coverageMatches
                )
            })

            const filtersAreClear =
                !term &&
                statusFilter === "all" &&
                coverageFilter === "all"

            if (filtersAreClear) return family

            if (
                familyMatches &&
                family.models.length === 0 &&
                statusFilter === "all" &&
                coverageFilter === "all"
            ) {
                return family
            }

            if (models.length === 0) return null

            return { ...family, models }
        })
        .filter(
            (family): family is VehicleFamily => family !== null
        )

    const activeFamilies = families.filter(
        (family) => family.isActive
    ).length
    const activeModels = allModels.filter(
        (model) => model.isActive
    )
    const activeModelsWithoutCoverage = activeModels.filter(
        (model) => model.metrics.currentApplications === 0
    ).length
    const coveredActiveModels =
        activeModels.length - activeModelsWithoutCoverage
    const portfolioCoverage = activeModels.length
        ? Math.round(
            (coveredActiveModels / activeModels.length) * 100
        )
        : 0
    const currentApplications = allModels.reduce(
        (total, model) =>
            total + model.metrics.currentApplications,
        0
    )
    const expiredActiveApplications = allModels.reduce(
        (total, model) =>
            total + model.metrics.expiredActiveApplications,
        0
    )
    const expiringApplications = allModels.reduce(
        (total, model) =>
            total + model.metrics.expiringApplications,
        0
    )
    const criticalPartNumbers = allModels.reduce(
        (total, model) =>
            total + model.metrics.criticalPartNumbers,
        0
    )
    const activeFilterCount =
        Number(statusFilter !== "all") +
        Number(coverageFilter !== "all")
    const lowestCoverageFamilies = [...families]
        .filter(
            (family) =>
                family.isActive &&
                family.metrics.activeModels > 0
        )
        .sort(
            (left, right) =>
                getFamilyCoverage(left) -
                getFamilyCoverage(right)
        )
        .slice(0, 6)

    return (
        <ProtectedRoute permission="RISK_VIEW">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <div className="space-y-5 p-4 md:p-6">
                        <Card className="overflow-hidden border-none bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white shadow-lg">
                            <CardContent className="p-6 md:p-7">
                                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="space-y-3">
                                        <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                                            Portfólio veicular
                                        </Badge>
                                        <div>
                                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                                Classes e Modelos
                                            </h1>
                                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                                                Veja cobertura de PNs, validade das aplicações e exposição a riscos por modelo.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                            <p className="text-xs text-slate-400">
                                                Cobertura dos modelos ativos
                                            </p>
                                            <div className="mt-1 flex items-end gap-2">
                                                <span className="text-2xl font-bold">
                                                    {portfolioCoverage}%
                                                </span>
                                                <span className="pb-1 text-xs text-slate-400">
                                                    {coveredActiveModels}/{activeModels.length}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            variant="secondary"
                                            onClick={loadFamilies}
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

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <SummaryCard
                                title="Classes ativas"
                                value={activeFamilies}
                                description={families.length + " classe(s) no catálogo"}
                                icon={<Layers3 className="h-5 w-5" />}
                            />
                            <SummaryCard
                                title="Modelos ativos"
                                value={activeModels.length}
                                description={allModels.length + " modelo(s) cadastrados"}
                                icon={<Car className="h-5 w-5" />}
                            />
                            <SummaryCard
                                title="Cobertura atual"
                                value={portfolioCoverage + "%"}
                                description={currentApplications + " aplicações vigentes"}
                                icon={<CheckCircle2 className="h-5 w-5" />}
                                tone={portfolioCoverage >= 90 ? "success" : "warning"}
                            />
                            <SummaryCard
                                title="Pendências cadastrais"
                                value={activeModelsWithoutCoverage + expiredActiveApplications}
                                description={
                                    activeModelsWithoutCoverage +
                                    " sem aplicação e " +
                                    expiredActiveApplications +
                                    " vencida(s)"
                                }
                                icon={<AlertTriangle className="h-5 w-5" />}
                                tone={
                                    activeModelsWithoutCoverage +
                                    expiredActiveApplications > 0
                                        ? "danger"
                                        : "success"
                                }
                            />
                        </div>

                        <div className="grid gap-4 xl:grid-cols-12">
                            <Card className="xl:col-span-7">
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <BarChart3 className="h-5 w-5" />
                                                Cobertura por classe
                                            </CardTitle>
                                            <CardDescription className="mt-1">
                                                Classes com menor cobertura aparecem primeiro.
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline">
                                            modelos ativos
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    {loading ? (
                                        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Calculando cobertura...
                                        </div>
                                    ) : lowestCoverageFamilies.length === 0 ? (
                                        <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
                                            Nenhuma classe ativa com modelos.
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {lowestCoverageFamilies.map((family) => {
                                                const coverage = getFamilyCoverage(family)

                                                return (
                                                    <div key={family.id} className="space-y-2">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium">
                                                                    {family.name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {family.metrics.currentPartNumbers} PN(s) vigente(s) · {family.metrics.activeModels} modelo(s) ativo(s)
                                                                </p>
                                                            </div>
                                                            <span className="text-sm font-semibold">
                                                                {coverage}%
                                                            </span>
                                                        </div>
                                                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className={
                                                                    "h-full rounded-full transition-all " +
                                                                    (coverage >= 90
                                                                        ? "bg-emerald-500"
                                                                        : coverage >= 60
                                                                            ? "bg-amber-500"
                                                                            : "bg-red-500")
                                                                }
                                                                style={{ width: coverage + "%" }}
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="xl:col-span-5">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5" />
                                        Pontos para decisão
                                    </CardTitle>
                                    <CardDescription>
                                        Onde vale concentrar a revisão do catálogo.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                                                <CircleAlert className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Modelos sem aplicação vigente
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Modelos ativos sem cobertura de PN
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xl font-bold">
                                            {activeModelsWithoutCoverage}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                                                <AlertTriangle className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Aplicações ativas vencidas
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Vínculos ativos com validade encerrada
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xl font-bold">
                                            {expiredActiveApplications}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                                                <Activity className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Vencem nos próximos 30 dias
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Aplicações que pedem revisão preventiva
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xl font-bold">
                                            {expiringApplications}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                                                <Wrench className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Vínculos com PN crítico
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    PNs vigentes com RM aberta em vermelho
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xl font-bold">
                                            {criticalPartNumbers}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card id="analise-modelo" className="scroll-mt-20">
                            <CardHeader>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Car className="h-5 w-5" />
                                            Análise de modelo
                                        </CardTitle>
                                        <CardDescription className="mt-1 max-w-2xl">
                                            Consulte em quais RMs o modelo está aplicado. A análise usa o vínculo explícito e também reconhece RMs pelo PN quando o vínculo intermediário ainda não existe.
                                        </CardDescription>
                                    </div>

                                    <div className="w-full lg:w-80">
                                        <Label className="sr-only">
                                            Selecione o modelo
                                        </Label>
                                        <Select
                                            value={selectedModelId}
                                            onValueChange={(value) => {
                                                setSelectedModelId(value)
                                                setRiskEventFilter("open")
                                                setRiskAnalystFilter("all")
                                                setLogisticsAnalystFilter("all")
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um modelo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[...allModelContexts]
                                                    .sort((left, right) =>
                                                        (left.family.name + left.model.code).localeCompare(
                                                            right.family.name + right.model.code
                                                        )
                                                    )
                                                    .map(({ family, model }) => (
                                                        <SelectItem key={model.id} value={model.id}>
                                                            {model.code} · {family.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-5">
                                {!selectedModelContext ? (
                                    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed text-center">
                                        <Car className="mb-3 h-8 w-8 text-muted-foreground" />
                                        <p className="font-medium">
                                            Nenhum modelo disponível
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Cadastre um modelo para iniciar a análise.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-lg font-semibold">
                                                        {selectedModelContext.model.code}
                                                    </p>
                                                    <StatusBadge
                                                        isActive={selectedModelContext.model.isActive}
                                                        activeLabel="Ativo"
                                                        inactiveLabel="Inativo"
                                                    />
                                                </div>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {selectedModelContext.family.name}
                                                    {selectedModelContext.model.name
                                                        ? " · " + selectedModelContext.model.name
                                                        : ""}
                                                </p>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    editModel(
                                                        selectedModelContext.family,
                                                        selectedModelContext.model
                                                    )
                                                }
                                            >
                                                Editar modelo
                                            </Button>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                            <div className="rounded-xl border p-4">
                                                <p className="text-xs text-muted-foreground">
                                                    PNs vigentes
                                                </p>
                                                <p className="mt-1 text-2xl font-bold">
                                                    {selectedModelContext.model.metrics.currentPartNumbers}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border p-4">
                                                <p className="text-xs text-muted-foreground">
                                                    RMs relacionadas
                                                </p>
                                                <p className="mt-1 text-2xl font-bold">
                                                    {selectedModelContext.model.metrics.relatedRiskEvents}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border p-4">
                                                <p className="text-xs text-muted-foreground">
                                                    RMs abertas
                                                </p>
                                                <p className="mt-1 text-2xl font-bold">
                                                    {selectedModelContext.model.metrics.openRiskEvents}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
                                                <p className="text-xs text-red-700 dark:text-red-300">
                                                    RMs abertas com PN vermelho
                                                </p>
                                                <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">
                                                    {selectedModelContext.model.metrics.criticalRiskEvents}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid gap-4 lg:grid-cols-2">
                                            <div className="rounded-xl border p-4">
                                                <div className="mb-3">
                                                    <p className="font-medium">
                                                        Distribuição por analista de Risk
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Quantidade de RMs abertas do modelo.
                                                    </p>
                                                </div>

                                                <div className="space-y-1">
                                                    {riskAnalystOptions.length === 0 ? (
                                                        <p className="py-3 text-sm text-muted-foreground">
                                                            Nenhum analista de Risk atribuído.
                                                        </p>
                                                    ) : (
                                                        riskAnalystOptions.map((analyst) => {
                                                            const count = selectedModelRiskEvents.filter(
                                                                (riskEvent) =>
                                                                    riskEvent.workflowStatus === "OPEN" &&
                                                                    riskEvent.assignedTo?.id === analyst.id
                                                            ).length

                                                            return (
                                                                <Button
                                                                    key={analyst.id}
                                                                    type="button"
                                                                    variant="ghost"
                                                                    className="h-auto w-full justify-between px-2 py-2"
                                                                    onClick={() => setRiskAnalystFilter(analyst.id)}
                                                                >
                                                                    <span className="truncate">{analyst.name}</span>
                                                                    <Badge variant="secondary">{count}</Badge>
                                                                </Button>
                                                            )
                                                        })
                                                    )}

                                                    {selectedModelRiskEvents.some(
                                                        (riskEvent) =>
                                                            riskEvent.workflowStatus === "OPEN" &&
                                                            !riskEvent.assignedTo
                                                    ) && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            className="h-auto w-full justify-between px-2 py-2 text-amber-700 dark:text-amber-300"
                                                            onClick={() => setRiskAnalystFilter("unassigned")}
                                                        >
                                                            <span>Sem responsável</span>
                                                            <Badge variant="secondary">
                                                                {selectedModelRiskEvents.filter(
                                                                    (riskEvent) =>
                                                                        riskEvent.workflowStatus === "OPEN" &&
                                                                        !riskEvent.assignedTo
                                                                ).length}
                                                            </Badge>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border p-4">
                                                <div className="mb-3">
                                                    <p className="font-medium">
                                                        Distribuição por analista de Logística
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        RMs abertas com solicitação logística atribuída.
                                                    </p>
                                                </div>

                                                <div className="space-y-1">
                                                    {logisticsAnalystOptions.length === 0 ? (
                                                        <p className="py-3 text-sm text-muted-foreground">
                                                            Nenhum analista logístico atribuído.
                                                        </p>
                                                    ) : (
                                                        logisticsAnalystOptions.map((analyst) => {
                                                            const count = selectedModelRiskEvents.filter(
                                                                (riskEvent) =>
                                                                    riskEvent.workflowStatus === "OPEN" &&
                                                                    riskEvent.logisticsAnalysts.some(
                                                                        (item) => item.id === analyst.id
                                                                    )
                                                            ).length

                                                            return (
                                                                <Button
                                                                    key={analyst.id}
                                                                    type="button"
                                                                    variant="ghost"
                                                                    className="h-auto w-full justify-between px-2 py-2"
                                                                    onClick={() => setLogisticsAnalystFilter(analyst.id)}
                                                                >
                                                                    <span className="truncate">{analyst.name}</span>
                                                                    <Badge variant="secondary">{count}</Badge>
                                                                </Button>
                                                            )
                                                        })
                                                    )}

                                                    {selectedModelRiskEvents.some(
                                                        (riskEvent) =>
                                                            riskEvent.workflowStatus === "OPEN" &&
                                                            riskEvent.logisticsAnalysts.length === 0
                                                    ) && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            className="h-auto w-full justify-between px-2 py-2 text-amber-700 dark:text-amber-300"
                                                            onClick={() => setLogisticsAnalystFilter("unassigned")}
                                                        >
                                                            <span>Sem analista logístico</span>
                                                            <Badge variant="secondary">
                                                                {selectedModelRiskEvents.filter(
                                                                    (riskEvent) =>
                                                                        riskEvent.workflowStatus === "OPEN" &&
                                                                        riskEvent.logisticsAnalysts.length === 0
                                                                ).length}
                                                            </Badge>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_210px_240px_240px] lg:items-end">
                                            <div>
                                                <p className="font-medium">
                                                    RMs em que o modelo está aplicado
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Apenas aplicações de modelo atualmente vigentes.
                                                </p>
                                            </div>
                                            <Select
                                                value={riskEventFilter}
                                                onValueChange={setRiskEventFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="open">
                                                        RMs abertas
                                                    </SelectItem>
                                                    <SelectItem value="critical">
                                                        Abertas com PN vermelho
                                                    </SelectItem>
                                                    <SelectItem value="all">
                                                        Todas as RMs
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={riskAnalystFilter}
                                                onValueChange={setRiskAnalystFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Analista de Risk" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        Todos de Risk
                                                    </SelectItem>
                                                    <SelectItem value="unassigned">
                                                        Sem responsável de Risk
                                                    </SelectItem>
                                                    {riskAnalystOptions.map((analyst) => (
                                                        <SelectItem key={analyst.id} value={analyst.id}>
                                                            {analyst.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={logisticsAnalystFilter}
                                                onValueChange={setLogisticsAnalystFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Analista de Logística" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        Todos de Logística
                                                    </SelectItem>
                                                    <SelectItem value="unassigned">
                                                        Sem analista logístico
                                                    </SelectItem>
                                                    {logisticsAnalystOptions.map((analyst) => (
                                                        <SelectItem key={analyst.id} value={analyst.id}>
                                                            {analyst.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="overflow-x-auto rounded-xl border">
                                            <table className="w-full min-w-[1200px] text-sm">
                                                <thead className="border-b bg-muted/40">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-medium">RM</th>
                                                        <th className="px-4 py-3 text-left font-medium">Fornecedor</th>
                                                        <th className="px-4 py-3 text-left font-medium">PNs aplicados</th>
                                                        <th className="px-4 py-3 text-left font-medium">Situação</th>
                                                        <th className="px-4 py-3 text-left font-medium">Analista de Risk</th>
                                                        <th className="px-4 py-3 text-left font-medium">Analista de Logística</th>
                                                        <th className="px-4 py-3 text-right font-medium">Ação</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedRiskEvents.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                                                                Nenhuma RM encontrada para o filtro selecionado.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        selectedRiskEvents.map((riskEvent) => (
                                                            <tr key={riskEvent.id} className="border-b last:border-0 hover:bg-muted/20">
                                                                <td className="px-4 py-3">
                                                                    <p className="font-semibold">{riskEvent.code}</p>
                                                                    <p className="max-w-72 truncate text-xs text-muted-foreground">
                                                                        {riskEvent.title || "Sem título"}
                                                                    </p>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <Link
                                                                        href={`/suppliers/${riskEvent.supplier.id}`}
                                                                        className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                                                                    >
                                                                        {riskEvent.supplier.name}
                                                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                                                    </Link>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="space-y-2">
                                                                        {riskEvent.parts.map((part) => (
                                                                            <div key={part.riskEventPartId} className="flex items-center gap-2">
                                                                                <Link
                                                                                    href={`/pns/${part.partNumberId}`}
                                                                                    className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                                                                                >
                                                                                    {part.partNumber}
                                                                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                                                                </Link>
                                                                                <RiskStatusBadge status={part.status} />
                                                                                <Badge variant="secondary" className="text-[10px]">
                                                                                    {part.relationSource === "EXPLICIT"
                                                                                        ? "Vínculo confirmado"
                                                                                        : "Relacionado pelo PN"}
                                                                                </Badge>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <Badge variant="outline">
                                                                            {riskEvent.workflowStatus === "OPEN" ? "Aberta" : "Fechada"}
                                                                        </Badge>
                                                                        <RiskStatusBadge status={riskEvent.riskLevel} />
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-muted-foreground">
                                                                    {riskEvent.assignedTo?.name || "Não atribuído"}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {riskEvent.logisticsAnalysts.length === 0 ? (
                                                                        <span className="text-muted-foreground">
                                                                            Não atribuído
                                                                        </span>
                                                                    ) : (
                                                                        <div className="flex max-w-56 flex-wrap gap-1.5">
                                                                            {riskEvent.logisticsAnalysts.map((analyst) => (
                                                                                <Badge key={analyst.id} variant="secondary">
                                                                                    {analyst.name}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <Button asChild variant="outline" size="sm">
                                                                        <Link href={`/rms/${riskEvent.id}`}>
                                                                            Abrir RM
                                                                            <ArrowUpRight className="ml-2 h-4 w-4" />
                                                                        </Link>
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card id="gestao-catalogo" className="scroll-mt-20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wrench className="h-5 w-5" />
                                    Gestão do catálogo
                                </CardTitle>
                                <CardDescription>
                                    Cadastre ou edite uma classe e seus modelos no mesmo painel.
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <Tabs
                                    value={managementTab}
                                    onValueChange={setManagementTab}
                                >
                                    <TabsList className="grid w-full max-w-md grid-cols-2">
                                        <TabsTrigger value="family">
                                            Classe
                                        </TabsTrigger>
                                        <TabsTrigger value="model">
                                            Modelo
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="family" className="mt-5">
                                        <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr_180px_auto] lg:items-end">
                                            <div className="space-y-2">
                                                <Label htmlFor="family-name">
                                                    Nome da classe
                                                </Label>
                                                <Input
                                                    id="family-name"
                                                    placeholder="Ex.: Delivery"
                                                    value={familyForm.name}
                                                    onChange={(event) =>
                                                        setFamilyForm((previous) => ({
                                                            ...previous,
                                                            name: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="family-description">
                                                    Descrição
                                                </Label>
                                                <Input
                                                    id="family-description"
                                                    placeholder="Descrição opcional"
                                                    value={familyForm.description}
                                                    onChange={(event) =>
                                                        setFamilyForm((previous) => ({
                                                            ...previous,
                                                            description: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Status</Label>
                                                <Select
                                                    value={familyForm.isActive ? "active" : "inactive"}
                                                    onValueChange={(value) =>
                                                        setFamilyForm((previous) => ({
                                                            ...previous,
                                                            isActive: value === "active",
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Ativa</SelectItem>
                                                        <SelectItem value="inactive">Inativa</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    onClick={handleSaveFamily}
                                                    disabled={savingFamily}
                                                >
                                                    {savingFamily ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Save className="mr-2 h-4 w-4" />
                                                    )}
                                                    Salvar
                                                </Button>
                                                {familyForm.id && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setFamilyForm(initialFamilyForm)}
                                                        disabled={savingFamily}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="model" className="mt-5">
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                            <div className="space-y-2">
                                                <Label>Classe</Label>
                                                <Select
                                                    value={modelForm.familyId}
                                                    onValueChange={(value) =>
                                                        setModelForm((previous) => ({
                                                            ...previous,
                                                            familyId: value,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {families
                                                            .filter((family) => family.isActive)
                                                            .map((family) => (
                                                                <SelectItem key={family.id} value={family.id}>
                                                                    {family.name}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="model-code">Código</Label>
                                                <Input
                                                    id="model-code"
                                                    placeholder="Ex.: 11.180"
                                                    value={modelForm.code}
                                                    onChange={(event) =>
                                                        setModelForm((previous) => ({
                                                            ...previous,
                                                            code: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="model-name">Nome complementar</Label>
                                                <Input
                                                    id="model-name"
                                                    placeholder="Opcional"
                                                    value={modelForm.name}
                                                    onChange={(event) =>
                                                        setModelForm((previous) => ({
                                                            ...previous,
                                                            name: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="model-description">Descrição</Label>
                                                <Input
                                                    id="model-description"
                                                    placeholder="Descrição opcional"
                                                    value={modelForm.description}
                                                    onChange={(event) =>
                                                        setModelForm((previous) => ({
                                                            ...previous,
                                                            description: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Status</Label>
                                                <Select
                                                    value={modelForm.isActive ? "active" : "inactive"}
                                                    onValueChange={(value) =>
                                                        setModelForm((previous) => ({
                                                            ...previous,
                                                            isActive: value === "active",
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Ativo</SelectItem>
                                                        <SelectItem value="inactive">Inativo</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                onClick={handleSaveModel}
                                                disabled={savingModel}
                                            >
                                                {savingModel ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                Salvar modelo
                                            </Button>
                                            {modelForm.id && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setModelForm(initialModelForm)}
                                                    disabled={savingModel}
                                                >
                                                    Cancelar edição
                                                </Button>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <CardTitle>Portfólio por classe</CardTitle>
                                        <CardDescription className="mt-1">
                                            Expanda uma classe para analisar cobertura, riscos e PNs com aplicações vencidas ou próximas do vencimento.
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline">
                                        {filteredFamilies.length} de {families.length} classe(s)
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_260px_auto]">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            className="pl-9"
                                            placeholder="Buscar classe, código ou modelo..."
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                        />
                                    </div>

                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Status do modelo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os status</SelectItem>
                                            <SelectItem value="active">Modelos ativos</SelectItem>
                                            <SelectItem value="inactive">Modelos inativos</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={coverageFilter} onValueChange={setCoverageFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Situação" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas as situações</SelectItem>
                                            <SelectItem value="covered">Com aplicação vigente</SelectItem>
                                            <SelectItem value="uncovered">Sem aplicação vigente</SelectItem>
                                            <SelectItem value="risk">Com PN em RM aberta</SelectItem>
                                            <SelectItem value="critical">Com PN vermelho</SelectItem>
                                            <SelectItem value="expired">Com aplicação ativa vencida</SelectItem>
                                            <SelectItem value="expiring">Com aplicação vencendo em 30 dias</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={clearFilters}
                                        disabled={!search && activeFilterCount === 0}
                                    >
                                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                                        Limpar
                                        {activeFilterCount > 0 && (
                                            <Badge variant="secondary" className="ml-2">
                                                {activeFilterCount}
                                            </Badge>
                                        )}
                                    </Button>
                                </div>

                                {loading ? (
                                    <div className="flex min-h-52 items-center justify-center gap-2 rounded-xl border text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Carregando portfólio...
                                    </div>
                                ) : filteredFamilies.length === 0 ? (
                                    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed text-center">
                                        <Search className="mb-3 h-8 w-8 text-muted-foreground" />
                                        <p className="font-medium">Nenhum resultado encontrado</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Altere os filtros ou limpe a pesquisa.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredFamilies.map((family) => {
                                            const isExpanded = expandedFamilyIds.has(family.id)
                                            const coverage = getFamilyCoverage(family)

                                            return (
                                                <div key={family.id} className="overflow-hidden rounded-xl border">
                                                    <div className="flex flex-col gap-4 bg-muted/20 p-4 xl:flex-row xl:items-center">
                                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="mt-0.5 shrink-0"
                                                                onClick={() => toggleFamily(family.id)}
                                                                aria-label={isExpanded ? "Recolher classe" : "Expandir classe"}
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronUp className="h-4 w-4" />
                                                                ) : (
                                                                    <ChevronDown className="h-4 w-4" />
                                                                )}
                                                            </Button>

                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <p className="font-semibold">{family.name}</p>
                                                                    <StatusBadge
                                                                        isActive={family.isActive}
                                                                        activeLabel="Ativa"
                                                                        inactiveLabel="Inativa"
                                                                    />
                                                                </div>
                                                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                                                    {family.description || "Sem descrição cadastrada"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 xl:min-w-[520px]">
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Modelos</p>
                                                                <p className="font-semibold">
                                                                    {family.metrics.activeModels}/{family.metrics.totalModels}
                                                                    <span className="ml-1 text-xs font-normal text-muted-foreground">ativos</span>
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">PNs vigentes</p>
                                                                <p className="font-semibold">{family.metrics.currentPartNumbers}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Aplicações</p>
                                                                <p className="font-semibold">{family.metrics.currentApplications}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Cobertura</p>
                                                                <p className={"font-semibold " + (coverage < 60 ? "text-red-600" : coverage < 90 ? "text-amber-600" : "text-emerald-600")}>
                                                                    {coverage}%
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2 xl:justify-end">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => editFamily(family)}
                                                            >
                                                                Editar classe
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleFamily(family.id)}
                                                            >
                                                                {isExpanded ? "Recolher" : "Detalhar"}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full min-w-[1120px] text-sm">
                                                                <thead className="border-y bg-muted/40">
                                                                    <tr>
                                                                        <th className="px-4 py-3 text-left font-medium">Modelo</th>
                                                                        <th className="px-4 py-3 text-left font-medium">Status</th>
                                                                        <th className="px-4 py-3 text-center font-medium">PNs vigentes</th>
                                                                        <th className="px-4 py-3 text-center font-medium">Aplicações vigentes</th>
                                                                        <th className="px-4 py-3 text-center font-medium">PNs com RM aberta</th>
                                                                        <th className="px-4 py-3 text-center font-medium">PNs vermelhos</th>
                                                                        <th className="px-4 py-3 text-left font-medium">PNs vencidos / a vencer</th>
                                                                        <th className="px-4 py-3 text-left font-medium">Atualizado</th>
                                                                        <th className="px-4 py-3 text-right font-medium">Ação</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {family.models.length === 0 ? (
                                                                        <tr>
                                                                            <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                                                                                Nenhum modelo encontrado nesta classe.
                                                                            </td>
                                                                        </tr>
                                                                    ) : (
                                                                        family.models.map((model) => (
                                                                            <tr key={model.id} className="border-b last:border-0 hover:bg-muted/20">
                                                                                <td className="px-4 py-3">
                                                                                    <p className="font-medium">{model.code}</p>
                                                                                    <p className="max-w-64 truncate text-xs text-muted-foreground">
                                                                                        {model.name || model.description || "Sem complemento"}
                                                                                    </p>
                                                                                </td>
                                                                                <td className="px-4 py-3">
                                                                                    <StatusBadge
                                                                                        isActive={model.isActive}
                                                                                        activeLabel="Ativo"
                                                                                        inactiveLabel="Inativo"
                                                                                    />
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center font-medium">
                                                                                    {model.metrics.currentPartNumbers}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    {model.metrics.currentApplications > 0 ? (
                                                                                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                                                            {model.metrics.currentApplications}
                                                                                        </Badge>
                                                                                    ) : (
                                                                                        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                                                                                            Sem aplicação
                                                                                        </Badge>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    {model.metrics.partNumbersWithOpenRisks}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <span className={model.metrics.criticalPartNumbers > 0 ? "font-semibold text-red-600" : "text-muted-foreground"}>
                                                                                        {model.metrics.criticalPartNumbers}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-3">
                                                                                    {!model.applicationAlerts?.length ? (
                                                                                        <span className="text-xs text-muted-foreground">
                                                                                            Nenhum PN com vencimento próximo
                                                                                        </span>
                                                                                    ) : (
                                                                                        <div className="max-h-36 min-w-64 space-y-2 overflow-y-auto pr-1">
                                                                                            {model.applicationAlerts.map((alert) => (
                                                                                                <div
                                                                                                    key={alert.applicationId}
                                                                                                    className="flex items-center justify-between gap-3 rounded-md border bg-background px-2.5 py-2"
                                                                                                >
                                                                                                    <div className="min-w-0">
                                                                                                        <Link
                                                                                                            href={`/pns/${alert.partNumberId}`}
                                                                                                            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                                                                                                        >
                                                                                                            {alert.partNumber}
                                                                                                            <ArrowUpRight className="h-3.5 w-3.5" />
                                                                                                        </Link>
                                                                                                        <p className="text-[11px] text-muted-foreground">
                                                                                                            Validade: {formatDate(alert.validTo)}
                                                                                                        </p>
                                                                                                    </div>

                                                                                                    <Badge
                                                                                                        variant="outline"
                                                                                                        className={
                                                                                                            alert.status === "EXPIRED"
                                                                                                                ? "shrink-0 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                                                                                                                : "shrink-0 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                                                                                                        }
                                                                                                    >
                                                                                                        {alert.status === "EXPIRED"
                                                                                                            ? "Vencida"
                                                                                                            : "A vencer"}
                                                                                                    </Badge>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-muted-foreground">
                                                                                    {formatDate(model.updatedAt)}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-right">
                                                                                    <div className="flex justify-end gap-2">
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            onClick={() => analyzeModel(model.id)}
                                                                                        >
                                                                                            Analisar
                                                                                        </Button>
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={() => editModel(family, model)}
                                                                                        >
                                                                                            Editar
                                                                                        </Button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}
