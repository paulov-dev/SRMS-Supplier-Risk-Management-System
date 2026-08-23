"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
    ArrowLeft,
    BarChart3,
    CalendarClock,
    CheckCircle2,
    CircleAlert,
    Clock3,
    History,
    ListChecks,
    Loader2,
    Pencil,
    Plus,
    Save,
    ShieldAlert,
    Trash2,
    Truck,
    UserRound,
} from "lucide-react"

import { toast } from "sonner"

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

type VehicleApplication = {
    id: string
    partNumberId?: string
    vehicleModelId?: string
    validFrom: string | null
    validTo: string | null
    isActive: boolean
    notes: string | null
    vehicleModel: {
        id: string
        familyId?: string
        code: string
        name: string | null
        description?: string | null
        isActive?: boolean
        family: {
            id: string
            name: string
            description?: string | null
            isActive?: boolean
        }
    }
}

type UserSummary = {
    id: string
    name: string
    email: string
    photoUrl?: string | null
}

type SupplierSummary = {
    id: string
    name: string
    supplierCodeSap: string | null
    status: string
    country: {
        id: string
        name: string
        isoCode: string
    }
}

type ActionPlanSummary = {
    id: string
    title: string
    description: string | null
    requiredAction: string | null
    responsibleArea: string | null
    dueDate: string | null
    priority: string
    status: string
    assignedTo: UserSummary | null
    updatedAt: string
    isOverdue: boolean
    isDueSoon: boolean
}

type LogisticsRequestSummary = {
    id: string
    code: string
    type: string
    status: string
    priority: string
    requestedAt: string
    acceptedAt: string | null
    reviewedAt: string | null
    requestNotes: string | null
    responseNotes: string | null
    rejectionReason: string | null
    requestedQuantity: number | null
    calculatedQuantity: number | null
    requestedBy: UserSummary
    assignedTo: UserSummary | null
    reviewedBy: UserSummary | null
}

type RiskPartAssessmentSummary = {
    hasDemand: boolean | null
    sourceNamed: boolean | null
    actionPlanReceived: boolean | null
    scheduleMeetsDevelopment: boolean | null
    technicalCommercialOk: boolean | null
    productionRiskMitigated: boolean | null
    vdaApproved: boolean | null
    modificationImplemented: boolean | null
}

type RiskContext = {
    id: string
    status:
    | "RED"
    | "YELLOW"
    | "GREEN"
    | "ORANGE"
    | "GREY"
    | "BLUE"
    logisticsStatus:
    | "NOT_REQUESTED"
    | "REQUESTED"
    | "IN_LOGISTICS"
    | "APPROVED"
    | "REJECTED"
    assignedTo: UserSummary | null
    assessment: RiskPartAssessmentSummary | null
    createdAt: string
    updatedAt: string
    riskEvent: {
        id: string
        code: string
        title: string | null
        description: string | null
        workflowStatus: "OPEN" | "CLOSED" | "CANCELED"
        riskLevel: string
        commodity: string | null
        functionalGroup: string | null
        createdAt: string
        assignedTo: UserSummary | null
        supplier: SupplierSummary
    }
    actionPlans: ActionPlanSummary[]
    logisticsRequests: LogisticsRequestSummary[]
}

type PartHistory = {
    id: string
    changeType: string
    oldStatus: string | null
    newStatus: string | null
    oldLogisticsStatus: string | null
    newLogisticsStatus: string | null
    reason: string
    changedAt: string
    changedBy: UserSummary
    riskEvent: {
        id: string
        code: string
        title: string | null
    }
}

type PartNumberDetail = {
    id: string
    partNumber: string
    description: string | null
    vehicleProgram: string | null
    createdAt: string
    vehicleApplications: VehicleApplication[]
    analysis: {
        scope: "OPEN_RMS" | "HISTORICAL_RMS" | "NO_RMS"
        consolidatedStatus:
        | "RED"
        | "YELLOW"
        | "GREEN"
        | "ORANGE"
        | "GREY"
        | "BLUE"
        | null
        consolidatedLogisticsStatus:
        | "NOT_REQUESTED"
        | "REQUESTED"
        | "IN_LOGISTICS"
        | "APPROVED"
        | "REJECTED"
        | null
        operationalStatus:
        | "IMMEDIATE_ACTION"
        | "ATTENTION"
        | "WAITING_LOGISTICS"
        | "REGISTRATION_ADJUSTMENT"
        | "MONITORING"
        | "COMPLETED"
        operationalReasons: string[]
        nextDueDate: string | null
        metrics: {
            totalRms: number
            openRms: number
            closedRms: number
            canceledRms: number
            totalSuppliers: number
            totalActionPlans: number
            openActionPlans: number
            overdueActionPlans: number
            dueSoonActionPlans: number
            completedActionPlans: number
            historicalActionPlans: number
            activeApplications: number
            inactiveApplications: number
        }
        statusDistribution: {
            red: number
            yellow: number
            green: number
            orange: number
            grey: number
            blue: number
        }
        logisticsDistribution: {
            notRequested: number
            requested: number
            inLogistics: number
            approved: number
            rejected: number
        }
        suppliers: SupplierSummary[]
        riskResponsibles: UserSummary[]
        pnResponsibles: UserSummary[]
    }
    riskContexts: RiskContext[]
    history: PartHistory[]
}

type ApplicationForm = {
    id: string | null
    vehicleFamilyId: string
    vehicleModelId: string
    validFrom: string
    validTo: string
    notes: string
    isActive: boolean
}

const emptyApplicationForm: ApplicationForm = {
    id: null,
    vehicleFamilyId: "none",
    vehicleModelId: "none",
    validFrom: "",
    validTo: "",
    notes: "",
    isActive: true,
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

    if (Number.isNaN(date.getTime())) return "-"

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date)
}

function getPartStatusLabel(status: string | null) {
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

function getPartStatusClassName(status: string | null) {
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

function PartStatusBadge({ status }: { status: string | null }) {
    return (
        <Badge
            variant="outline"
            className={getPartStatusClassName(status)}
        >
            {getPartStatusLabel(status)}
        </Badge>
    )
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
        case "REQUESTED":
            return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
        case "IN_LOGISTICS":
            return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
        case "APPROVED":
            return "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
        case "REJECTED":
            return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        default:
            return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
    }
}

function LogisticsStatusBadge({ status }: { status: string | null }) {
    return (
        <Badge
            variant="outline"
            className={getLogisticsStatusClassName(status)}
        >
            {getLogisticsStatusLabel(status)}
        </Badge>
    )
}

function getOperationalStatusLabel(status: string) {
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

function getOperationalStatusClassName(status: string) {
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

function getWorkflowLabel(status: string) {
    if (status === "OPEN") return "Aberta"
    if (status === "CLOSED") return "Fechada"
    return "Cancelada"
}

function getActionPlanStatusLabel(status: string) {
    switch (status) {
        case "OPEN":
            return "Aberto"
        case "IN_PROGRESS":
            return "Em andamento"
        case "WAITING_VALIDATION":
            return "Aguardando validação"
        case "COMPLETED":
            return "Concluído"
        default:
            return "Cancelado"
    }
}

function getLogisticsRequestStatusLabel(status: string) {
    switch (status) {
        case "PENDING":
            return "Pendente"
        case "IN_REVIEW":
            return "Em análise"
        case "APPROVED":
            return "Aprovada"
        case "REJECTED":
            return "Rejeitada"
        default:
            return "Cancelada"
    }
}

function MetricCard({
    label,
    value,
    description,
    icon,
    tone = "default",
}: {
    label: string
    value: number
    description: string
    icon: React.ReactNode
    tone?: "default" | "danger" | "warning" | "success"
}) {
    const iconClassName =
        tone === "danger"
            ? "bg-red-50 text-red-600 dark:bg-red-950/40"
            : tone === "warning"
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40"
                : tone === "success"
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                    : "bg-muted text-muted-foreground"

    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {label}
                        </p>

                        <p className="mt-1 text-3xl font-bold">
                            {value}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                            {description}
                        </p>
                    </div>

                    <div className={`rounded-xl p-2.5 ${iconClassName}`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function AssessmentIndicator({
    label,
    value,
}: {
    label: string
    value: boolean | null | undefined
}) {
    const labelValue =
        value === true
            ? "Sim"
            : value === false
                ? "Não"
                : "Pendente"

    const className =
        value === true
            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
            : value === false
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-border bg-muted text-muted-foreground"

    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="text-xs text-muted-foreground">
                {label}
            </span>

            <Badge variant="outline" className={className}>
                {labelValue}
            </Badge>
        </div>
    )
}

function toDateInputValue(value: string | null) {
    if (!value) return ""

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return ""
    }

    return date.toISOString().slice(0, 10)
}

async function readJsonResponse(res: Response) {
    const text = await res.text()

    if (!text) {
        return null
    }

    try {
        return JSON.parse(text)
    } catch {
        throw new Error(
            "A API não retornou JSON. Verifique se o endpoint existe e se está compilando corretamente."
        )
    }
}

function ApplicationStatusBadge({
    isActive,
}: {
    isActive: boolean
}) {
    return (
        <Badge
            variant="outline"
            className={
                isActive
                    ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
                    : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }
        >
            {isActive ? "Ativa" : "Inativa"}
        </Badge>
    )
}

export default function PartNumberDetailPage() {
    const router = useRouter()

    const params = useParams<{
        id: string
    }>()

    const [part, setPart] =
        useState<PartNumberDetail | null>(null)

    const [vehicleFamilies, setVehicleFamilies] =
        useState<VehicleFamilyOption[]>([])

    const [loading, setLoading] = useState(true)

    const [editPartOpen, setEditPartOpen] = useState(false)
    const [savingPart, setSavingPart] = useState(false)
    const [partDescription, setPartDescription] = useState("")

    const [applicationDialogOpen, setApplicationDialogOpen] =
        useState(false)
    const [savingApplication, setSavingApplication] =
        useState(false)
    const [applicationForm, setApplicationForm] =
        useState<ApplicationForm>(emptyApplicationForm)

    const selectedVehicleFamily =
        applicationForm.vehicleFamilyId === "none"
            ? null
            : vehicleFamilies.find(
                  (family) =>
                      family.id === applicationForm.vehicleFamilyId
              ) || null

    const availableVehicleModels = selectedVehicleFamily
        ? selectedVehicleFamily.models
        : vehicleFamilies.flatMap((family) => family.models)

    const partStatusDistribution = part
        ? [
              {
                  status: "RED",
                  value: part.analysis.statusDistribution.red,
              },
              {
                  status: "YELLOW",
                  value: part.analysis.statusDistribution.yellow,
              },
              {
                  status: "GREEN",
                  value: part.analysis.statusDistribution.green,
              },
              {
                  status: "ORANGE",
                  value: part.analysis.statusDistribution.orange,
              },
              {
                  status: "GREY",
                  value: part.analysis.statusDistribution.grey,
              },
              {
                  status: "BLUE",
                  value: part.analysis.statusDistribution.blue,
              },
          ]
        : []

    const logisticsDistribution = part
        ? [
              {
                  status: "NOT_REQUESTED",
                  value:
                      part.analysis.logisticsDistribution
                          .notRequested,
              },
              {
                  status: "REQUESTED",
                  value:
                      part.analysis.logisticsDistribution.requested,
              },
              {
                  status: "IN_LOGISTICS",
                  value:
                      part.analysis.logisticsDistribution.inLogistics,
              },
              {
                  status: "APPROVED",
                  value:
                      part.analysis.logisticsDistribution.approved,
              },
              {
                  status: "REJECTED",
                  value:
                      part.analysis.logisticsDistribution.rejected,
              },
          ]
        : []

    useEffect(() => {
        loadPageData()
    }, [])

    async function loadPageData() {
        await Promise.all([
            loadPart(),
            loadVehicleFamilies(),
        ])
    }

    async function loadPart() {
        try {
            setLoading(true)

            const res = await fetch(
                `/api/part-numbers/${params.id}`,
                {
                    credentials: "include",
                }
            )

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error || "Erro ao carregar PN"
                )
            }

            setPart(data)
            setPartDescription(data.description || "")
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar PN"
            )
        } finally {
            setLoading(false)
        }
    }

    async function loadVehicleFamilies() {
        try {
            const res = await fetch("/api/vehicle-families", {
                credentials: "include",
            })

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
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

    async function handleUpdatePartDescription() {
        if (!part) return

        try {
            setSavingPart(true)

            const res = await fetch(
                `/api/part-numbers/${part.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        description:
                            partDescription.trim() || null,
                    }),
                }
            )

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                        "Erro ao atualizar nome da peça"
                )
            }

            toast.success(
                "Nome da peça atualizado com sucesso"
            )

            setPart(data)
            setPartDescription(data.description || "")
            setEditPartOpen(false)
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao atualizar nome da peça"
            )
        } finally {
            setSavingPart(false)
        }
    }

    function openCreateApplicationDialog() {
        setApplicationForm(emptyApplicationForm)
        setApplicationDialogOpen(true)
    }

    function openEditApplicationDialog(
        application: VehicleApplication
    ) {
        setApplicationForm({
            id: application.id,
            vehicleFamilyId:
                application.vehicleModel.family.id || "none",
            vehicleModelId: application.vehicleModel.id || "none",
            validFrom: toDateInputValue(application.validFrom),
            validTo: toDateInputValue(application.validTo),
            notes: application.notes || "",
            isActive: application.isActive,
        })

        setApplicationDialogOpen(true)
    }

    async function handleSaveApplication() {
        if (!part) return

        if (applicationForm.vehicleModelId === "none") {
            toast.error("Selecione o modelo veicular")
            return
        }

        try {
            setSavingApplication(true)

            const isEditing = Boolean(applicationForm.id)

            const url = isEditing
                ? `/api/part-numbers/${part.id}/vehicle-applications/${applicationForm.id}`
                : `/api/part-numbers/${part.id}/vehicle-applications`

            const res = await fetch(url, {
                method: isEditing ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    vehicleModelId: applicationForm.vehicleModelId,
                    validFrom: applicationForm.validFrom || null,
                    validTo: applicationForm.validTo || null,
                    notes: applicationForm.notes.trim() || null,
                    isActive: applicationForm.isActive,
                }),
            })

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                        "Erro ao salvar aplicação veicular"
                )
            }

            toast.success(
                isEditing
                    ? "Aplicação veicular atualizada com sucesso"
                    : "Aplicação veicular cadastrada com sucesso"
            )

            setApplicationDialogOpen(false)
            setApplicationForm(emptyApplicationForm)
            await loadPart()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao salvar aplicação veicular"
            )
        } finally {
            setSavingApplication(false)
        }
    }

    async function handleToggleApplication(
        application: VehicleApplication
    ) {
        if (!part) return

        try {
            const res = await fetch(
                `/api/part-numbers/${part.id}/vehicle-applications/${application.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        vehicleModelId: application.vehicleModel.id,
                        validFrom: application.validFrom,
                        validTo: application.validTo,
                        notes: application.notes,
                        isActive: !application.isActive,
                    }),
                }
            )

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                        "Erro ao atualizar aplicação"
                )
            }

            toast.success(
                application.isActive
                    ? "Aplicação inativada"
                    : "Aplicação ativada"
            )

            await loadPart()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao atualizar aplicação"
            )
        }
    }

    async function handleDeleteApplication(
        application: VehicleApplication
    ) {
        if (!part) return

        const confirmDelete = window.confirm(
            "Deseja remover esta aplicação veicular do PN? Caso ela já esteja vinculada a uma RM, o sistema pode impedir a exclusão."
        )

        if (!confirmDelete) return

        try {
            const res = await fetch(
                `/api/part-numbers/${part.id}/vehicle-applications/${application.id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            )

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                        "Erro ao remover aplicação veicular"
                )
            }

            toast.success(
                "Aplicação veicular removida com sucesso"
            )

            await loadPart()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao remover aplicação veicular"
            )
        }
    }

    return (
        <ProtectedRoute permission="RISK_VIEW">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <div className="space-y-6 p-6">
                        {loading ? (
                            <Card>
                                <CardContent className="flex items-center justify-center p-10 text-muted-foreground">
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Carregando PN...
                                </CardContent>
                            </Card>
                        ) : !part ? (
                            <Card>
                                <CardContent className="p-10 text-center text-muted-foreground">
                                    PN não encontrado.
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <Card className="overflow-hidden border-none bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white shadow-lg">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="flex gap-4">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    onClick={() =>
                                                        router.push("/pns")
                                                    }
                                                >
                                                    <ArrowLeft className="h-4 w-4" />
                                                </Button>

                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                                                            PN
                                                        </Badge>

                                                        <Badge
                                                            className={getOperationalStatusClassName(
                                                                part.analysis.operationalStatus
                                                            )}
                                                        >
                                                            {getOperationalStatusLabel(
                                                                part.analysis.operationalStatus
                                                            )}
                                                        </Badge>

                                                        <PartStatusBadge
                                                            status={
                                                                part.analysis
                                                                    .consolidatedStatus
                                                            }
                                                        />

                                                        <LogisticsStatusBadge
                                                            status={
                                                                part.analysis
                                                                    .consolidatedLogisticsStatus
                                                            }
                                                        />
                                                    </div>

                                                    <h1 className="mt-3 text-3xl font-bold tracking-tight">
                                                        {part.partNumber}
                                                    </h1>

                                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                                                        {part.description ||
                                                            "Sem nome ou descrição cadastrada"}
                                                    </p>

                                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                                                        <span>
                                                            Criado em {formatDate(part.createdAt)}
                                                        </span>

                                                        <span>
                                                            {part.analysis.scope === "OPEN_RMS"
                                                                ? "Análise baseada nas RMs abertas"
                                                                : part.analysis.scope ===
                                                                    "HISTORICAL_RMS"
                                                                    ? "Análise baseada no histórico"
                                                                    : "PN sem RMs relacionadas"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setPartDescription(
                                                            part.description || ""
                                                        )
                                                        setEditPartOpen(true)
                                                    }}
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Editar descrição
                                                </Button>

                                                <Button
                                                    type="button"
                                                    onClick={
                                                        openCreateApplicationDialog
                                                    }
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Nova aplicação
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <MetricCard
                                        label="RMs abertas"
                                        value={part.analysis.metrics.openRms}
                                        description={
                                            String(part.analysis.metrics.totalRms) +
                                            " RM(s) no histórico"
                                        }
                                        icon={<BarChart3 className="h-5 w-5" />}
                                    />

                                    <MetricCard
                                        label="Planos abertos"
                                        value={
                                            part.analysis.metrics.openActionPlans
                                        }
                                        description={
                                            String(
                                                part.analysis.metrics
                                                    .completedActionPlans
                                            ) + " concluído(s)"
                                        }
                                        icon={<ListChecks className="h-5 w-5" />}
                                    />

                                    <MetricCard
                                        label="Planos atrasados"
                                        value={
                                            part.analysis.metrics
                                                .overdueActionPlans
                                        }
                                        description={
                                            String(
                                                part.analysis.metrics
                                                    .dueSoonActionPlans
                                            ) + " vence(m) em até 7 dias"
                                        }
                                        icon={
                                            <CalendarClock className="h-5 w-5" />
                                        }
                                        tone={
                                            part.analysis.metrics
                                                .overdueActionPlans > 0
                                                ? "danger"
                                                : "default"
                                        }
                                    />

                                    <MetricCard
                                        label="Aplicações ativas"
                                        value={
                                            part.analysis.metrics
                                                .activeApplications
                                        }
                                        description={
                                            String(
                                                part.analysis.metrics
                                                    .inactiveApplications
                                            ) + " inativa(s)"
                                        }
                                        icon={<Truck className="h-5 w-5" />}
                                        tone={
                                            part.analysis.metrics
                                                .activeApplications > 0
                                                ? "success"
                                                : "warning"
                                        }
                                    />
                                </div>

                                <div className="grid items-start gap-4 xl:grid-cols-12">
                                    <Card className="xl:col-span-7">
                                        <CardHeader>
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <CardTitle>
                                                        Leitura executiva
                                                    </CardTitle>

                                                    <CardDescription className="mt-1">
                                                        Motivos que determinam a situação atual e a próxima atuação esperada.
                                                    </CardDescription>
                                                </div>

                                                <Badge
                                                    className={getOperationalStatusClassName(
                                                        part.analysis
                                                            .operationalStatus
                                                    )}
                                                >
                                                    {getOperationalStatusLabel(
                                                        part.analysis
                                                            .operationalStatus
                                                    )}
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            {part.analysis.operationalReasons.length ===
                                            0 ? (
                                                <div className="flex items-center gap-2 rounded-lg border bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300">
                                                    <CheckCircle2 className="h-5 w-5" />
                                                    Nenhuma pendência operacional relevante.
                                                </div>
                                            ) : (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {part.analysis.operationalReasons.map(
                                                        (reason) => (
                                                            <div
                                                                key={reason}
                                                                className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                                                            >
                                                                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                                                                {reason}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            )}

                                            <div className="grid gap-3 lg:grid-cols-2">
                                                <div className="rounded-lg border p-3">
                                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Vínculos nas RMs por status
                                                    </p>

                                                    <div className="flex flex-wrap gap-2">
                                                        {partStatusDistribution.map(
                                                            (item) => (
                                                                <div
                                                                    key={
                                                                        item.status
                                                                    }
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <PartStatusBadge
                                                                        status={
                                                                            item.status
                                                                        }
                                                                    />

                                                                    <span className="text-sm font-semibold">
                                                                        {
                                                                            item.value
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="rounded-lg border p-3">
                                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Vínculos nas RMs por Logística
                                                    </p>

                                                    <div className="flex flex-wrap gap-2">
                                                        {logisticsDistribution.map(
                                                            (item) => (
                                                                <div
                                                                    key={
                                                                        item.status
                                                                    }
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <LogisticsStatusBadge
                                                                        status={
                                                                            item.status
                                                                        }
                                                                    />

                                                                    <span className="text-sm font-semibold">
                                                                        {
                                                                            item.value
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <div className="rounded-lg border bg-muted/20 p-3">
                                                    <p className="text-xs text-muted-foreground">
                                                        Próximo prazo
                                                    </p>

                                                    <p className="mt-1 font-medium">
                                                        {formatDate(
                                                            part.analysis
                                                                .nextDueDate
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-lg border bg-muted/20 p-3">
                                                    <p className="text-xs text-muted-foreground">
                                                        Fornecedores
                                                    </p>

                                                    <p className="mt-1 font-medium">
                                                        {
                                                            part.analysis.metrics
                                                                .totalSuppliers
                                                        }
                                                    </p>
                                                </div>

                                                <div className="rounded-lg border bg-muted/20 p-3">
                                                    <p className="text-xs text-muted-foreground">
                                                        Situação logística
                                                    </p>

                                                    <div className="mt-1">
                                                        <LogisticsStatusBadge
                                                            status={
                                                                part.analysis
                                                                    .consolidatedLogisticsStatus
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="xl:col-span-5">
                                        <CardHeader>
                                            <CardTitle>
                                                Contexto e ownership
                                            </CardTitle>

                                            <CardDescription>
                                                Fornecedores e responsáveis no escopo analisado.
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            <div>
                                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Fornecedores
                                                </p>

                                                {part.analysis.suppliers.length ===
                                                0 ? (
                                                    <p className="text-sm text-muted-foreground">
                                                        Nenhum fornecedor relacionado.
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {part.analysis.suppliers.map(
                                                            (supplier) => (
                                                                <Button
                                                                    key={supplier.id}
                                                                    asChild
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    <Link
                                                                        href={
                                                                            "/suppliers/" +
                                                                            supplier.id
                                                                        }
                                                                    >
                                                                        {
                                                                            supplier.name
                                                                        }
                                                                    </Link>
                                                                </Button>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Responsável Risk
                                                    </p>

                                                    {part.analysis
                                                        .riskResponsibles.length ===
                                                    0 ? (
                                                        <Badge variant="destructive">
                                                            Não definido
                                                        </Badge>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {part.analysis.riskResponsibles.map(
                                                                (user) => (
                                                                    <Button
                                                                        key={user.id}
                                                                        asChild
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="w-full justify-start"
                                                                    >
                                                                        <Link
                                                                            href={
                                                                                "/users/" +
                                                                                user.id
                                                                            }
                                                                        >
                                                                            <UserRound className="mr-2 h-4 w-4" />
                                                                            {
                                                                                user.name
                                                                            }
                                                                        </Link>
                                                                    </Button>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Responsável PN
                                                    </p>

                                                    {part.analysis
                                                        .pnResponsibles.length ===
                                                    0 ? (
                                                        <Badge variant="destructive">
                                                            Não definido
                                                        </Badge>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {part.analysis.pnResponsibles.map(
                                                                (user) => (
                                                                    <Button
                                                                        key={user.id}
                                                                        asChild
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="w-full justify-start"
                                                                    >
                                                                        <Link
                                                                            href={
                                                                                "/users/" +
                                                                                user.id
                                                                            }
                                                                        >
                                                                            <UserRound className="mr-2 h-4 w-4" />
                                                                            {
                                                                                user.name
                                                                            }
                                                                        </Link>
                                                                    </Button>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Tabs
                                    defaultValue="risks"
                                    className="w-full"
                                >
                                    <div className="overflow-x-auto overflow-y-hidden">
                                        <TabsList className="h-12 w-max min-w-full justify-start gap-1">
                                            <TabsTrigger value="risks">
                                                RMs e planos
                                                <Badge
                                                    variant="secondary"
                                                    className="ml-2"
                                                >
                                                    {
                                                        part.riskContexts
                                                            .length
                                                    }
                                                </Badge>
                                            </TabsTrigger>

                                            <TabsTrigger value="applications">
                                                Aplicações
                                                <Badge
                                                    variant="secondary"
                                                    className="ml-2"
                                                >
                                                    {
                                                        part
                                                            .vehicleApplications
                                                            .length
                                                    }
                                                </Badge>
                                            </TabsTrigger>

                                            <TabsTrigger value="history">
                                                Histórico
                                                <Badge
                                                    variant="secondary"
                                                    className="ml-2"
                                                >
                                                    {part.history.length}
                                                </Badge>
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <TabsContent
                                        value="risks"
                                        className="mt-4 space-y-4"
                                    >
                                        {part.riskContexts.length === 0 ? (
                                            <Card>
                                                <CardContent className="p-10 text-center">
                                                    <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />

                                                    <p className="mt-3 font-medium">
                                                        Nenhuma RM relacionada
                                                    </p>

                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Este PN ainda não possui contexto de risco cadastrado.
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            part.riskContexts.map(
                                                (context) => {
                                                    const latestLogisticsRequest =
                                                        context
                                                            .logisticsRequests[0]

                                                    return (
                                                        <Card
                                                            key={context.id}
                                                            className={
                                                                context
                                                                    .riskEvent
                                                                    .workflowStatus ===
                                                                "OPEN"
                                                                    ? "border-l-4 border-l-blue-500"
                                                                    : ""
                                                            }
                                                        >
                                                            <CardHeader>
                                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                                    <div>
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <Button
                                                                                asChild
                                                                                variant="link"
                                                                                className="h-auto p-0 text-lg font-semibold"
                                                                            >
                                                                                <Link
                                                                                    href={
                                                                                        "/rms/" +
                                                                                        context
                                                                                            .riskEvent
                                                                                            .id
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        context
                                                                                            .riskEvent
                                                                                            .code
                                                                                    }
                                                                                </Link>
                                                                            </Button>

                                                                            <Badge variant="outline">
                                                                                {getWorkflowLabel(
                                                                                    context
                                                                                        .riskEvent
                                                                                        .workflowStatus
                                                                                )}
                                                                            </Badge>

                                                                            <PartStatusBadge
                                                                                status={
                                                                                    context.status
                                                                                }
                                                                            />

                                                                            <LogisticsStatusBadge
                                                                                status={
                                                                                    context.logisticsStatus
                                                                                }
                                                                            />
                                                                        </div>

                                                                        <CardTitle className="mt-2 text-base">
                                                                            {context
                                                                                .riskEvent
                                                                                .title ||
                                                                                "RM sem título"}
                                                                        </CardTitle>

                                                                        <CardDescription className="mt-1">
                                                                            Atualizado em{" "}
                                                                            {formatDateTime(
                                                                                context.updatedAt
                                                                            )}
                                                                        </CardDescription>
                                                                    </div>

                                                                    <div className="flex flex-wrap gap-2">
                                                                        <Badge variant="secondary">
                                                                            {
                                                                                context
                                                                                    .actionPlans
                                                                                    .length
                                                                            }{" "}
                                                                            plano(s)
                                                                        </Badge>

                                                                        {context.actionPlans.some(
                                                                            (
                                                                                plan
                                                                            ) =>
                                                                                plan.isOverdue
                                                                        ) && (
                                                                            <Badge variant="destructive">
                                                                                Plano atrasado
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </CardHeader>

                                                            <CardContent className="space-y-5">
                                                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                                                    <div className="rounded-lg border bg-muted/20 p-3">
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Fornecedor
                                                                        </p>

                                                                        <p className="mt-1 font-medium">
                                                                            {
                                                                                context
                                                                                    .riskEvent
                                                                                    .supplier
                                                                                    .name
                                                                            }
                                                                        </p>

                                                                        <p className="text-xs text-muted-foreground">
                                                                            {
                                                                                context
                                                                                    .riskEvent
                                                                                    .supplier
                                                                                    .country
                                                                                    .name
                                                                            }
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-lg border bg-muted/20 p-3">
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Responsável Risk
                                                                        </p>

                                                                        <p className="mt-1 font-medium">
                                                                            {context
                                                                                .riskEvent
                                                                                .assignedTo
                                                                                ?.name ||
                                                                                "Não definido"}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-lg border bg-muted/20 p-3">
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Responsável PN
                                                                        </p>

                                                                        <p className="mt-1 font-medium">
                                                                            {context
                                                                                .assignedTo
                                                                                ?.name ||
                                                                                "Não definido"}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-lg border bg-muted/20 p-3">
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Commodity
                                                                        </p>

                                                                        <p className="mt-1 font-medium">
                                                                            {context
                                                                                .riskEvent
                                                                                .commodity ||
                                                                                "-"}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {context.assessment && (
                                                                    <div>
                                                                        <p className="mb-3 text-sm font-semibold">
                                                                            Checklist de avaliação do PN
                                                                        </p>

                                                                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                                                            <AssessmentIndicator
                                                                                label="Possui demanda"
                                                                                value={
                                                                                    context
                                                                                        .assessment
                                                                                        .hasDemand
                                                                                }
                                                                            />

                                                                            <AssessmentIndicator
                                                                                label="Fonte nomeada"
                                                                                value={
                                                                                    context
                                                                                        .assessment
                                                                                        .sourceNamed
                                                                                }
                                                                            />

                                                                            <AssessmentIndicator
                                                                                label="Plano recebido"
                                                                                value={
                                                                                    context
                                                                                        .assessment
                                                                                        .actionPlanReceived
                                                                                }
                                                                            />

                                                                            <AssessmentIndicator
                                                                                label="Cronograma atende"
                                                                                value={
                                                                                    context
                                                                                        .assessment
                                                                                        .scheduleMeetsDevelopment
                                                                                }
                                                                            />

                                                                            <AssessmentIndicator
                                                                                label="Técnico/comercial OK"
                                                                                value={
                                                                                    context
                                                                                        .assessment
                                                                                        .technicalCommercialOk
                                                                                }
                                                                            />

                                                                            <AssessmentIndicator
                                                                                label="Risco mitigado"
                                                                                value={
                                                                                    context
                                                                                        .assessment
                                                                                        .productionRiskMitigated
                                                                                }
                                                                            />

                                                                            <AssessmentIndicator
                                                                                label="VDA aprovado"
                                                                                value={
                                                                                    context
                                                                                        .assessment
                                                                                        .vdaApproved
                                                                                }
                                                                            />

                                                                            <AssessmentIndicator
                                                                                label="Modificação implementada"
                                                                                value={
                                                                                    context
                                                                                        .assessment
                                                                                        .modificationImplemented
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <div className="mb-3 flex items-center justify-between gap-3">
                                                                        <p className="text-sm font-semibold">
                                                                            Planos de ação
                                                                        </p>

                                                                        <span className="text-xs text-muted-foreground">
                                                                            {
                                                                                context
                                                                                    .actionPlans
                                                                                    .filter(
                                                                                        (
                                                                                            plan
                                                                                        ) =>
                                                                                            plan.isOverdue
                                                                                    )
                                                                                    .length
                                                                            }{" "}
                                                                            atrasado(s)
                                                                        </span>
                                                                    </div>

                                                                    {context.actionPlans.length ===
                                                                    0 ? (
                                                                        <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                                                                            Nenhum plano relacionado a este PN nesta RM.
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {context.actionPlans.map(
                                                                                (
                                                                                    plan
                                                                                ) => (
                                                                                    <div
                                                                                        key={
                                                                                            plan.id
                                                                                        }
                                                                                        className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto]"
                                                                                    >
                                                                                        <div>
                                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                                <p className="font-medium">
                                                                                                    {
                                                                                                        plan.title
                                                                                                    }
                                                                                                </p>

                                                                                                <Badge
                                                                                                    variant={
                                                                                                        plan.isOverdue
                                                                                                            ? "destructive"
                                                                                                            : "outline"
                                                                                                    }
                                                                                                >
                                                                                                    {getActionPlanStatusLabel(
                                                                                                        plan.status
                                                                                                    )}
                                                                                                </Badge>

                                                                                                {plan.isDueSoon &&
                                                                                                    !plan.isOverdue && (
                                                                                                        <Badge className="bg-amber-500 text-black">
                                                                                                            Vence em breve
                                                                                                        </Badge>
                                                                                                    )}
                                                                                            </div>

                                                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                                                {plan.requiredAction ||
                                                                                                    plan.description ||
                                                                                                    "Sem detalhamento"}
                                                                                            </p>
                                                                                        </div>

                                                                                        <div className="text-left text-xs text-muted-foreground md:text-right">
                                                                                            <p>
                                                                                                Prazo:{" "}
                                                                                                <span className="font-medium text-foreground">
                                                                                                    {formatDate(
                                                                                                        plan.dueDate
                                                                                                    )}
                                                                                                </span>
                                                                                            </p>

                                                                                            <p className="mt-1">
                                                                                                Responsável:{" "}
                                                                                                {plan
                                                                                                    .assignedTo
                                                                                                    ?.name ||
                                                                                                    "Não definido"}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="rounded-lg border bg-muted/20 p-4">
                                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                        <div>
                                                                            <p className="text-sm font-semibold">
                                                                                Logística
                                                                            </p>

                                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                                {latestLogisticsRequest
                                                                                    ? "Última solicitação: " +
                                                                                        latestLogisticsRequest.code
                                                                                    : "Nenhuma solicitação logística registrada"}
                                                                            </p>
                                                                        </div>

                                                                        {latestLogisticsRequest && (
                                                                            <div className="text-xs text-muted-foreground sm:text-right">
                                                                                <p>
                                                                                    Status:{" "}
                                                                                    <span className="font-medium text-foreground">
                                                                                        {
                                                                                            getLogisticsRequestStatusLabel(
                                                                                                latestLogisticsRequest.status
                                                                                            )
                                                                                        }
                                                                                    </span>
                                                                                </p>

                                                                                <p className="mt-1">
                                                                                    Solicitado em{" "}
                                                                                    {formatDate(
                                                                                        latestLogisticsRequest.requestedAt
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {latestLogisticsRequest
                                                                        ?.rejectionReason && (
                                                                        <p className="mt-3 rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                                                                            Motivo da rejeição:{" "}
                                                                            {
                                                                                latestLogisticsRequest.rejectionReason
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )
                                                }
                                            )
                                        )}
                                    </TabsContent>

                                    <TabsContent
                                        value="applications"
                                        className="mt-4"
                                    >
                                        <Card>
                                            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                <div>
                                                    <CardTitle>
                                                        Aplicações veiculares
                                                    </CardTitle>

                                                    <CardDescription className="mt-1">
                                                        Classes, modelos, vigência e qualidade cadastral do PN.
                                                    </CardDescription>
                                                </div>

                                                <Button
                                                    type="button"
                                                    onClick={
                                                        openCreateApplicationDialog
                                                    }
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Adicionar aplicação
                                                </Button>
                                            </CardHeader>

                                            <CardContent>
                                                {part.vehicleApplications.length ===
                                                0 ? (
                                                    <div className="rounded-lg border border-dashed p-10 text-center">
                                                        <Truck className="mx-auto h-8 w-8 text-muted-foreground" />

                                                        <p className="mt-3 font-medium">
                                                            Nenhuma aplicação cadastrada
                                                        </p>

                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            Cadastre a classe e o modelo veicular associado ao PN.
                                                        </p>

                                                        <Button
                                                            type="button"
                                                            className="mt-4"
                                                            onClick={
                                                                openCreateApplicationDialog
                                                            }
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Nova aplicação
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                        {part.vehicleApplications.map(
                                                            (
                                                                application
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        application.id
                                                                    }
                                                                    className="rounded-xl border p-4"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div>
                                                                            <p className="font-semibold">
                                                                                {
                                                                                    application
                                                                                        .vehicleModel
                                                                                        .family
                                                                                        .name
                                                                                }
                                                                            </p>

                                                                            <p className="mt-1 text-sm text-muted-foreground">
                                                                                {
                                                                                    application
                                                                                        .vehicleModel
                                                                                        .code
                                                                                }
                                                                                {application
                                                                                    .vehicleModel
                                                                                    .name
                                                                                    ? " — " +
                                                                                        application
                                                                                            .vehicleModel
                                                                                            .name
                                                                                    : ""}
                                                                            </p>
                                                                        </div>

                                                                        <ApplicationStatusBadge
                                                                            isActive={
                                                                                application.isActive
                                                                            }
                                                                        />
                                                                    </div>

                                                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                                                        <div className="rounded-lg bg-muted/40 p-3">
                                                                            <p className="text-xs text-muted-foreground">
                                                                                Válido de
                                                                            </p>

                                                                            <p className="mt-1 font-medium">
                                                                                {formatDate(
                                                                                    application.validFrom
                                                                                )}
                                                                            </p>
                                                                        </div>

                                                                        <div className="rounded-lg bg-muted/40 p-3">
                                                                            <p className="text-xs text-muted-foreground">
                                                                                Válido até
                                                                            </p>

                                                                            <p className="mt-1 font-medium">
                                                                                {formatDate(
                                                                                    application.validTo
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {application.notes && (
                                                                        <p className="mt-3 text-sm text-muted-foreground">
                                                                            {
                                                                                application.notes
                                                                            }
                                                                        </p>
                                                                    )}

                                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                openEditApplicationDialog(
                                                                                    application
                                                                                )
                                                                            }
                                                                        >
                                                                            <Pencil className="mr-2 h-4 w-4" />
                                                                            Editar
                                                                        </Button>

                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                handleToggleApplication(
                                                                                    application
                                                                                )
                                                                            }
                                                                        >
                                                                            {application.isActive
                                                                                ? "Inativar"
                                                                                : "Ativar"}
                                                                        </Button>

                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                handleDeleteApplication(
                                                                                    application
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Remover
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent
                                        value="history"
                                        className="mt-4"
                                    >
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <History className="h-5 w-5" />
                                                    Histórico do PN nas RMs
                                                </CardTitle>

                                                <CardDescription>
                                                    Últimas 50 alterações registradas para status, Logística, responsáveis e dados do PN.
                                                </CardDescription>
                                            </CardHeader>

                                            <CardContent>
                                                {part.history.length === 0 ? (
                                                    <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                                                        Nenhuma alteração registrada.
                                                    </div>
                                                ) : (
                                                    <div className="relative space-y-0">
                                                        {part.history.map(
                                                            (
                                                                history,
                                                                index
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        history.id
                                                                    }
                                                                    className="relative flex gap-4 pb-6 last:pb-0"
                                                                >
                                                                    {index <
                                                                        part
                                                                            .history
                                                                            .length -
                                                                            1 && (
                                                                        <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
                                                                    )}

                                                                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                                                                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                                                                    </div>

                                                                    <div className="min-w-0 flex-1 rounded-lg border p-4">
                                                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                                            <div>
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <Badge variant="outline">
                                                                                        {history.changeType.replaceAll(
                                                                                            "_",
                                                                                            " "
                                                                                        )}
                                                                                    </Badge>

                                                                                    <Button
                                                                                        asChild
                                                                                        variant="link"
                                                                                        className="h-auto p-0 text-sm"
                                                                                    >
                                                                                        <Link
                                                                                            href={
                                                                                                "/rms/" +
                                                                                                history
                                                                                                    .riskEvent
                                                                                                    .id
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                history
                                                                                                    .riskEvent
                                                                                                    .code
                                                                                            }
                                                                                        </Link>
                                                                                    </Button>
                                                                                </div>

                                                                                <p className="mt-2 text-sm">
                                                                                    {history.reason ||
                                                                                        "Alteração registrada sem observação."}
                                                                                </p>

                                                                                {(history.oldStatus ||
                                                                                    history.newStatus) && (
                                                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                                        <PartStatusBadge
                                                                                            status={
                                                                                                history.oldStatus
                                                                                            }
                                                                                        />
                                                                                        <span>
                                                                                            →
                                                                                        </span>
                                                                                        <PartStatusBadge
                                                                                            status={
                                                                                                history.newStatus
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                )}

                                                                                {(history.oldLogisticsStatus ||
                                                                                    history.newLogisticsStatus) && (
                                                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                                        <LogisticsStatusBadge
                                                                                            status={
                                                                                                history.oldLogisticsStatus
                                                                                            }
                                                                                        />
                                                                                        <span>
                                                                                            →
                                                                                        </span>
                                                                                        <LogisticsStatusBadge
                                                                                            status={
                                                                                                history.newLogisticsStatus
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="text-xs text-muted-foreground sm:text-right">
                                                                                <p>
                                                                                    {formatDateTime(
                                                                                        history.changedAt
                                                                                    )}
                                                                                </p>

                                                                                <p className="mt-1">
                                                                                    {
                                                                                        history
                                                                                            .changedBy
                                                                                            .name
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                                <Dialog
                                    open={editPartOpen}
                                    onOpenChange={(open) => {
                                        setEditPartOpen(open)

                                        if (!open) {
                                            setPartDescription(
                                                part.description || ""
                                            )
                                        }
                                    }}
                                >
                                    <DialogContent className="sm:max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>
                                                Editar nome da peça
                                            </DialogTitle>

                                            <DialogDescription>
                                                Atualize a descrição principal vinculada ao PN.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>PN</Label>

                                                <Input
                                                    value={part.partNumber}
                                                    disabled
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>
                                                    Nome da peça
                                                </Label>

                                                <Input
                                                    value={
                                                        partDescription
                                                    }
                                                    onChange={(e) =>
                                                        setPartDescription(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Ex.: Suporte, chicote, conector..."
                                                />

                                                <p className="text-xs text-muted-foreground">
                                                    Esse campo altera a descrição principal do PN.
                                                </p>
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setEditPartOpen(false)
                                                }
                                                disabled={savingPart}
                                            >
                                                Cancelar
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={
                                                    handleUpdatePartDescription
                                                }
                                                disabled={savingPart}
                                            >
                                                {savingPart ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                Salvar alteração
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog
                                    open={applicationDialogOpen}
                                    onOpenChange={(open) => {
                                        setApplicationDialogOpen(open)

                                        if (!open) {
                                            setApplicationForm(
                                                emptyApplicationForm
                                            )
                                        }
                                    }}
                                >
                                    <DialogContent className="sm:max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {applicationForm.id
                                                    ? "Editar aplicação veicular"
                                                    : "Nova aplicação veicular"}
                                            </DialogTitle>

                                            <DialogDescription>
                                                Vincule este PN a uma classe e modelo veicular.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Classe</Label>

                                                <Select
                                                    value={
                                                        applicationForm.vehicleFamilyId
                                                    }
                                                    onValueChange={(
                                                        value
                                                    ) =>
                                                        setApplicationForm(
                                                            (prev) => ({
                                                                ...prev,
                                                                vehicleFamilyId:
                                                                    value,
                                                                vehicleModelId:
                                                                    "none",
                                                            })
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione a classe" />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            Selecione
                                                        </SelectItem>

                                                        {vehicleFamilies.map(
                                                            (family) => (
                                                                <SelectItem
                                                                    key={
                                                                        family.id
                                                                    }
                                                                    value={
                                                                        family.id
                                                                    }
                                                                >
                                                                    {
                                                                        family.name
                                                                    }
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Modelo</Label>

                                                <Select
                                                    value={
                                                        applicationForm.vehicleModelId
                                                    }
                                                    onValueChange={(
                                                        value
                                                    ) =>
                                                        setApplicationForm(
                                                            (prev) => ({
                                                                ...prev,
                                                                vehicleModelId:
                                                                    value,
                                                            })
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o modelo" />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            Selecione
                                                        </SelectItem>

                                                        {availableVehicleModels.map(
                                                            (model) => (
                                                                <SelectItem
                                                                    key={
                                                                        model.id
                                                                    }
                                                                    value={
                                                                        model.id
                                                                    }
                                                                >
                                                                    {
                                                                        model.code
                                                                    }
                                                                    {model.name
                                                                        ? ` — ${model.name}`
                                                                        : ""}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>
                                                    Válido de
                                                </Label>

                                                <Input
                                                    type="date"
                                                    value={
                                                        applicationForm.validFrom
                                                    }
                                                    onChange={(e) =>
                                                        setApplicationForm(
                                                            (prev) => ({
                                                                ...prev,
                                                                validFrom:
                                                                    e
                                                                        .target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>
                                                    Válido até
                                                </Label>

                                                <Input
                                                    type="date"
                                                    value={
                                                        applicationForm.validTo
                                                    }
                                                    onChange={(e) =>
                                                        setApplicationForm(
                                                            (prev) => ({
                                                                ...prev,
                                                                validTo:
                                                                    e
                                                                        .target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                />
                                            </div>

                                            {applicationForm.id && (
                                                <div className="space-y-2">
                                                    <Label>Status</Label>

                                                    <Select
                                                        value={
                                                            applicationForm.isActive
                                                                ? "true"
                                                                : "false"
                                                        }
                                                        onValueChange={(
                                                            value
                                                        ) =>
                                                            setApplicationForm(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    isActive:
                                                                        value ===
                                                                        "true",
                                                                })
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>

                                                        <SelectContent>
                                                            <SelectItem value="true">
                                                                Ativa
                                                            </SelectItem>

                                                            <SelectItem value="false">
                                                                Inativa
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Observação</Label>

                                                <textarea
                                                    value={
                                                        applicationForm.notes
                                                    }
                                                    onChange={(e) =>
                                                        setApplicationForm(
                                                            (prev) => ({
                                                                ...prev,
                                                                notes:
                                                                    e
                                                                        .target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                    placeholder="Observações sobre a aplicação deste PN..."
                                                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                />
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setApplicationDialogOpen(
                                                        false
                                                    )
                                                }
                                                disabled={
                                                    savingApplication
                                                }
                                            >
                                                Cancelar
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={
                                                    handleSaveApplication
                                                }
                                                disabled={
                                                    savingApplication
                                                }
                                            >
                                                {savingApplication ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                Salvar
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </>
                        )}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}
