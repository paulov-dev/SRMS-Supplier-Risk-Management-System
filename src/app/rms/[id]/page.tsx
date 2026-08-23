"use client"

import { Fragment, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"

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
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Loader2,
    Package,
    Truck,
    UserRound,
    Plus,
    Save,
    Search,
    Pencil,
    Trash2,
} from "lucide-react"

import { toast } from "sonner"

type ActionPlanItem = RiskDetail["actionPlans"][number]

type ActionPlanForm = {
    description: string
    dueDate: string
    assignedToId: string
    riskEventPartId: string
}

type RiskLevel =
    | "RED"
    | "YELLOW"
    | "GREEN"
    | "GREY"
    | "ORANGE"
    | "BLUE"

type UserOption = {
    id: string
    name: string
    email: string
}

type PartNumberSuggestion = {
    id: string
    partNumber: string
    description: string | null
    vehicleProgram: string | null
}

type PartNumberVehicleApplicationOption = {
    id: string
    validFrom: string | null
    validTo: string | null
    isActive: boolean
    notes: string | null
    vehicleModel: {
        id: string
        code: string
        name: string | null
        description: string | null
        family: {
            id: string
            name: string
        }
    }
}

type AddPartForm = {
    partNumber: string
    partNumberId: string | null
    description: string
}

type HistoryTypeFilter =
    | "ALL"
    | "RM_STATUS"
    | "PN_HISTORY"
    | "STATUS_CHANGE"
    | "RESPONSIBLE_CHANGE"
    | "DATA_CHANGE"
    | "LOGISTICS_CHANGE"
    | "ACTION_PLAN_HISTORY"
    | "ACTION_PLAN_CREATE"
    | "ACTION_PLAN_UPDATE"
    | "ACTION_PLAN_COMPLETE"
    | "ACTION_PLAN_REOPEN"
    | "ACTION_PLAN_DELETE"
    | "NOTE"

type PartRiskStatus =
    | "RED"
    | "YELLOW"
    | "GREEN"
    | "ORANGE"
    | "GREY"
    | "BLUE"

type RiskPartAssessment = {
    id: string

    isPartCanceled: boolean | null
    hasDemand: boolean | null
    sourceNamed: boolean | null

    actionPlanReceived: boolean | null
    scheduleMeetsDevelopment: boolean | null
    technicalCommercialOk: boolean | null
    productionRiskMitigated: boolean | null
    eopManagementOk: boolean | null

    deviationPfpFinished: boolean | null
    vdaApproved: boolean | null
    modificationImplemented: boolean | null

    createdAt: string
    updatedAt: string
}

type AssessmentSelectValue = "true" | "false" | "null"

type EditPartAssessmentForm = {
    isPartCanceled: AssessmentSelectValue
    hasDemand: AssessmentSelectValue
    sourceNamed: AssessmentSelectValue

    actionPlanReceived: AssessmentSelectValue
    scheduleMeetsDevelopment: AssessmentSelectValue
    technicalCommercialOk: AssessmentSelectValue
    productionRiskMitigated: AssessmentSelectValue
    eopManagementOk: AssessmentSelectValue

    deviationPfpFinished: AssessmentSelectValue
    vdaApproved: AssessmentSelectValue
    modificationImplemented: AssessmentSelectValue
}

type EditRiskForm = {
    title: string
    description: string
    openingReason: string
    commodity: string
    assignedToId: string
}

const commodityOptions = [
    "ELE/QUI",
    "MET",
    "PWT",
    "CAB",
    "CHA",
    "MOT",
    "OUTROS",
]

type LogisticsStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED"

type RiskWorkflowStatus =
    | "OPEN"
    | "CLOSED"
    | "CANCELED"

type RiskDetail = {
    id: string
    code: string
    title: string
    description: string | null
    openingReason: string
    commodity: string | null
    workflowStatus: RiskWorkflowStatus
    riskLevel: RiskLevel
    createdWeek: number
    createdYear: number
    createdAt: string
    updatedAt: string
    closedAt: string | null

    supplier: {
        id: string
        name: string
        supplierCodeSap: string | null
        country: {
            id: string
            name: string
            isoCode: string
        }
    }

    createdBy: {
        id: string
        name: string
        email: string
    }

    assignedTo: {
        id: string
        name: string
        email: string
    } | null

    closedBy: {
        id: string
        name: string
        email: string
    } | null

    parts: {
        id: string
        status: PartRiskStatus
        logisticsStatus: string
        createdAt: string
        partNumber: {
            id: string
            partNumber: string
            description: string | null
            vehicleProgram: string | null
        }
        assignedTo: {
            id: string
            name: string
            email: string
        } | null
        assessment: RiskPartAssessment | null
        vehicleApplications?: {
            id: string
            partNumberVehicleApplicationId: string
            validFrom: string | null
            validTo: string | null
            isActive: boolean
            notes: string | null
            vehicleModel: {
                id: string
                code: string
                name: string | null
                description: string | null
                family: {
                    id: string
                    name: string
                }
            }
        }[]
    }[]

    actionPlans: {
        id: string
        description: string
        dueDate: string
        isCompleted: boolean
        completedAt: string | null
        isOverdue: boolean
        assignedTo: {
            id: string
            name: string
            email: string
        }
        riskEventPart?: {
            id: string
            status: PartRiskStatus
            partNumber: {
                id: string
                partNumber: string
                description: string | null
                vehicleProgram: string | null
            }
        } | null
    }[]

    logistics: {
        id: string
        status: LogisticsStatus
        requestedAt: string
        reviewedAt: string | null
        notes: string | null
        rejectionReason: string | null
        requester: {
            id: string
            name: string
            email: string
        }
        reviewer: {
            id: string
            name: string
            email: string
        } | null
    }[]

    comments: {
        id: string
        message: string
        createdAt: string
        user: {
            id: string
            name: string
            email: string
        }
    }[]

    statusHistory: {
        id: string
        oldStatus: string
        newStatus: string
        reason: string | null
        changedAt: string
        user: {
            id: string
            name: string
            email: string
        }
    }[]

    partHistory?: {
        id: string
        changeType:
        | "STATUS_CHANGE"
        | "RESPONSIBLE_CHANGE"
        | "DATA_CHANGE"
        | "LOGISTICS_CHANGE"
        | "MULTIPLE_CHANGE"
        | "NOTE"

        oldStatus: PartRiskStatus | null
        newStatus: PartRiskStatus | null

        oldLogisticsStatus: string | null
        newLogisticsStatus: string | null

        oldAssignedToId: string | null
        newAssignedToId: string | null

        oldDescription: string | null
        newDescription: string | null

        oldVehicleProgram: string | null
        newVehicleProgram: string | null

        reason: string
        changedAt: string

        partNumber: {
            id: string
            partNumber: string
            description: string | null
        }

        changedBy: {
            id: string
            name: string
            email: string
        }
    }[]

    actionPlanHistory?: {
        id: string
        changeType:
        | "ACTION_PLAN_CREATE"
        | "ACTION_PLAN_UPDATE"
        | "ACTION_PLAN_COMPLETE"
        | "ACTION_PLAN_REOPEN"
        | "ACTION_PLAN_DELETE"
        | "NOTE"

        oldDescription: string | null
        newDescription: string | null

        oldDueDate: string | null
        newDueDate: string | null

        oldAssignedToId: string | null
        newAssignedToId: string | null

        oldCompleted: boolean | null
        newCompleted: boolean | null

        reason: string | null
        changedAt: string

        actionPlan: {
            id: string
            description: string
        } | null

        riskEventPart: {
            id: string
            partNumber: {
                id: string
                partNumber: string
                description: string | null
                vehicleProgram: string | null
            }
        } | null

        partNumber: {
            id: string
            partNumber: string
            description: string | null
            vehicleProgram: string | null
        } | null

        changedBy: {
            id: string
            name: string
            email: string
        }
    }[]
}

type EditPartForm = {
    status: PartRiskStatus
    assignedToId: string
    description: string
    vehicleProgram: string
    reason: string
    assessment: EditPartAssessmentForm
}

type RiskPartItem = RiskDetail["parts"][number]

const openingReasonLabels: Record<string, string> = {
    TIER_2_CHANGE: "Troca ou Adição de Tier 2",
    PLANT_CHANGE: "Alteração de Planta",
    SUPPLIER_TRANSFER_PHASE_OUT:
        "Transferência de Fornecedor (Phase Out)",
    MANUFACTURING_PROCESS_CHANGE:
        "Mudança no Processo de Fabricação",
}

const partStatusOptions: {
    value: PartRiskStatus
    label: string
    description: string
}[] = [
        {
            value: "RED",
            label: "Vermelho",
            description: "Crítico",
        },
        {
            value: "YELLOW",
            label: "Amarelo",
            description: "Atenção",
        },
        {
            value: "GREEN",
            label: "Verde",
            description: "Controlado",
        },
        {
            value: "ORANGE",
            label: "Laranja",
            description: "Sem demanda",
        },
        {
            value: "GREY",
            label: "Cinza",
            description: "Cancelado",
        },
        {
            value: "BLUE",
            label: "Azul",
            description: "Concluído",
        },
    ]

const emptyAssessmentForm: EditPartAssessmentForm = {
    isPartCanceled: "null",
    hasDemand: "null",
    sourceNamed: "null",

    actionPlanReceived: "null",
    scheduleMeetsDevelopment: "null",
    technicalCommercialOk: "null",
    productionRiskMitigated: "null",
    eopManagementOk: "null",

    deviationPfpFinished: "null",
    vdaApproved: "null",
    modificationImplemented: "null",
}

function toDateInputValue(value: string | null) {
    if (!value) return ""

    return new Date(value).toISOString().slice(0, 10)
}

function Pill({
    children,
    backgroundColor,
    color = "#ffffff",
    borderColor,
}: {
    children: React.ReactNode
    backgroundColor: string
    color?: string
    borderColor?: string
}) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "6px",
                border: `1px solid ${borderColor || backgroundColor}`,
                backgroundColor,
                color,
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: "16px",
            }}
        >
            {children}
        </span>
    )
}

function getRiskLevelPill(level: RiskLevel) {
    switch (level) {
        case "GREEN":
            return (
                <Pill backgroundColor="#16a34a">
                    Verde
                </Pill>
            )

        case "YELLOW":
            return (
                <Pill backgroundColor="#eab308" color="#000000">
                    Amarelo
                </Pill>
            )

        case "RED":
            return (
                <Pill backgroundColor="#dc2626">
                    Vermelho
                </Pill>
            )

        case "ORANGE":
            return (
                <Pill backgroundColor="#f97316">
                    Sem demanda
                </Pill>
            )

        case "GREY":
            return (
                <Pill backgroundColor="#6b7280">
                    Cancelado
                </Pill>
            )

        case "BLUE":
            return (
                <Pill backgroundColor="#2563eb">
                    Concluído
                </Pill>
            )

        default:
            return (
                <Pill
                    backgroundColor="#525252"
                    borderColor="#525252"
                >
                    {level}
                </Pill>
            )
    }
}

function getPartStatusPill(status: PartRiskStatus) {
    switch (status) {
        case "GREEN":
            return (
                <Pill backgroundColor="#16a34a">
                    Verde
                </Pill>
            )

        case "YELLOW":
            return (
                <Pill backgroundColor="#eab308" color="#000000">
                    Amarelo
                </Pill>
            )

        case "RED":
            return (
                <Pill backgroundColor="#dc2626">
                    Vermelho
                </Pill>
            )

        case "ORANGE":
            return (
                <Pill backgroundColor="#f97316">
                    Sem demanda
                </Pill>
            )

        case "GREY":
            return (
                <Pill backgroundColor="#6b7280">
                    Cancelado
                </Pill>
            )

        case "BLUE":
            return (
                <Pill backgroundColor="#2563eb">
                    Concluído
                </Pill>
            )

        default:
            return (
                <Pill backgroundColor="#525252">
                    {status}
                </Pill>
            )
    }
}

function getWorkflowStatusPill(status: RiskWorkflowStatus) {
    switch (status) {
        case "OPEN":
            return (
                <Pill backgroundColor="#2563eb">
                    Aberta
                </Pill>
            )

        case "CLOSED":
            return (
                <Pill backgroundColor="#16a34a">
                    Fechada
                </Pill>
            )

        case "CANCELED":
            return (
                <Pill backgroundColor="#6b7280">
                    Cancelada
                </Pill>
            )

        default:
            return (
                <Pill backgroundColor="#525252">
                    {status}
                </Pill>
            )
    }
}

function getLogisticsStatusPill(status: LogisticsStatus) {
    switch (status) {
        case "PENDING":
            return (
                <Pill backgroundColor="#eab308" color="#000000">
                    Pendente
                </Pill>
            )

        case "APPROVED":
            return (
                <Pill backgroundColor="#16a34a">
                    Aprovada
                </Pill>
            )

        case "REJECTED":
            return (
                <Pill backgroundColor="#dc2626">
                    Recusada
                </Pill>
            )

        default:
            return (
                <Pill backgroundColor="#525252">
                    {status}
                </Pill>
            )
    }
}

function getPartClasses(part: RiskPartItem) {
    const classes = part.vehicleApplications
        ?.map((application) => application.vehicleModel.family.name)
        .filter(Boolean) || []

    return Array.from(new Set(classes))
}

function getPartModels(part: RiskPartItem) {
    const models = part.vehicleApplications
        ?.map((application) => {
            const code = application.vehicleModel.code
            const name = application.vehicleModel.name

            return name ? `${code} - ${name}` : code
        })
        .filter(Boolean) || []

    return Array.from(new Set(models))
}

function normalizePartNumber(value: string | null | undefined) {
    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
}

function formatDate(value: string | null) {
    if (!value) return "-"

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value))
}

function formatDateOnly(value: string | null) {
    if (!value) return "-"

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value))
}

function getAssessmentPill(value: boolean | null | undefined) {
    if (value === true) {
        return (
            <Pill backgroundColor="#16a34a">
                Sim
            </Pill>
        )
    }

    if (value === false) {
        return (
            <Pill backgroundColor="#dc2626">
                Não
            </Pill>
        )
    }

    return (
        <Pill
            backgroundColor="#e5e7eb"
            color="#374151"
            borderColor="#d1d5db"
        >
            N/A
        </Pill>
    )
}

function hasAssessmentData(
    assessment: RiskPartAssessment | null
) {
    if (!assessment) return false

    return [
        assessment.isPartCanceled,
        assessment.hasDemand,
        assessment.sourceNamed,
        assessment.actionPlanReceived,
        assessment.scheduleMeetsDevelopment,
        assessment.technicalCommercialOk,
        assessment.productionRiskMitigated,
        assessment.eopManagementOk,
        assessment.deviationPfpFinished,
        assessment.vdaApproved,
        assessment.modificationImplemented,
    ].some((value) => value !== null)
}

function getAssessmentItems(
    assessment: RiskPartAssessment
) {
    return [
        {
            label: "PN cancelado?",
            value: assessment.isPartCanceled,
        },
        {
            label: "PN com demanda?",
            value: assessment.hasDemand,
        },
        {
            label: "Fonte nomeada?",
            value: assessment.sourceNamed,
        },
        {
            label: "Plano recebido?",
            value: assessment.actionPlanReceived,
        },
        {
            label: "Cronograma atende?",
            value: assessment.scheduleMeetsDevelopment,
        },
        {
            label: "Técnico/comercial OK?",
            value: assessment.technicalCommercialOk,
        },
        {
            label: "Risco mitigado?",
            value: assessment.productionRiskMitigated,
        },
        {
            label: "EOP OK?",
            value: assessment.eopManagementOk,
        },
        {
            label: "Desvio/PFP finalizado?",
            value: assessment.deviationPfpFinished,
        },
        {
            label: "VDA aprovado?",
            value: assessment.vdaApproved,
        },
        {
            label: "Modificação implementada?",
            value: assessment.modificationImplemented,
        },
    ]
}

function boolToAssessmentValue(
    value: boolean | null | undefined
): AssessmentSelectValue {
    if (value === true) return "true"
    if (value === false) return "false"

    return "null"
}

function assessmentValueToBool(
    value: AssessmentSelectValue
) {
    if (value === "true") return true
    if (value === "false") return false

    return null
}

function buildAssessmentForm(
    assessment: RiskPartAssessment | null | undefined
): EditPartAssessmentForm {
    return {
        isPartCanceled: boolToAssessmentValue(
            assessment?.isPartCanceled
        ),
        hasDemand: boolToAssessmentValue(
            assessment?.hasDemand
        ),
        sourceNamed: boolToAssessmentValue(
            assessment?.sourceNamed
        ),

        actionPlanReceived: boolToAssessmentValue(
            assessment?.actionPlanReceived
        ),
        scheduleMeetsDevelopment: boolToAssessmentValue(
            assessment?.scheduleMeetsDevelopment
        ),
        technicalCommercialOk: boolToAssessmentValue(
            assessment?.technicalCommercialOk
        ),
        productionRiskMitigated: boolToAssessmentValue(
            assessment?.productionRiskMitigated
        ),
        eopManagementOk: boolToAssessmentValue(
            assessment?.eopManagementOk
        ),

        deviationPfpFinished: boolToAssessmentValue(
            assessment?.deviationPfpFinished
        ),
        vdaApproved: boolToAssessmentValue(
            assessment?.vdaApproved
        ),
        modificationImplemented: boolToAssessmentValue(
            assessment?.modificationImplemented
        ),
    }
}

function buildAssessmentPayload(
    assessment: EditPartAssessmentForm
) {
    return {
        isPartCanceled: assessmentValueToBool(
            assessment.isPartCanceled
        ),
        hasDemand: assessmentValueToBool(
            assessment.hasDemand
        ),
        sourceNamed: assessmentValueToBool(
            assessment.sourceNamed
        ),

        actionPlanReceived: assessmentValueToBool(
            assessment.actionPlanReceived
        ),
        scheduleMeetsDevelopment: assessmentValueToBool(
            assessment.scheduleMeetsDevelopment
        ),
        technicalCommercialOk: assessmentValueToBool(
            assessment.technicalCommercialOk
        ),
        productionRiskMitigated: assessmentValueToBool(
            assessment.productionRiskMitigated
        ),
        eopManagementOk: assessmentValueToBool(
            assessment.eopManagementOk
        ),

        deviationPfpFinished: assessmentValueToBool(
            assessment.deviationPfpFinished
        ),
        vdaApproved: assessmentValueToBool(
            assessment.vdaApproved
        ),
        modificationImplemented: assessmentValueToBool(
            assessment.modificationImplemented
        ),
    }
}

function AssessmentSelectField({
    label,
    value,
    onChange,
}: {
    label: string
    value: AssessmentSelectValue
    onChange: (value: AssessmentSelectValue) => void
}) {
    return (
        <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
                {label}
            </Label>

            <Select
                value={value}
                onValueChange={(newValue) =>
                    onChange(newValue as AssessmentSelectValue)
                }
            >
                <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem value="null">
                        N/A
                    </SelectItem>

                    <SelectItem value="true">
                        Sim
                    </SelectItem>

                    <SelectItem value="false">
                        Não
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}

export default function RiskDetailPage() {
    const router = useRouter()
    const params = useParams<{
        id: string
    }>()
    const { user } = useAuth()

    const [actionPlanOpen, setActionPlanOpen] =
        useState(false)

    const [savingActionPlan, setSavingActionPlan] =
        useState(false)

    const [selectedActionPlan, setSelectedActionPlan] =
        useState<ActionPlanItem | null>(null)

    const [
        updatingActionPlanId,
        setUpdatingActionPlanId,
    ] = useState<string | null>(null)

    const [
        deletingActionPlanId,
        setDeletingActionPlanId,
    ] = useState<string | null>(null)

    const [actionPlanForm, setActionPlanForm] =
        useState<ActionPlanForm>({
            description: "",
            dueDate: "",
            assignedToId: "none",
            riskEventPartId: "none",
        })

    const [users, setUsers] = useState<UserOption[]>([])

    const [addPartOpen, setAddPartOpen] = useState(false)
    const [savingPart, setSavingPart] = useState(false)
    const [addPartError, setAddPartError] = useState("")

    const [historyTypeFilter, setHistoryTypeFilter] =
        useState<HistoryTypeFilter>("ALL")

    const [historyPartFilter, setHistoryPartFilter] =
        useState("ALL")

    const [historySearch, setHistorySearch] =
        useState("")

    const [editPartOpen, setEditPartOpen] = useState(false)
    const [savingEditPart, setSavingEditPart] = useState(false)

    const [selectedPart, setSelectedPart] =
        useState<RiskPartItem | null>(null)

    const [removingPartId, setRemovingPartId] =
        useState<string | null>(null)

    const [editPartForm, setEditPartForm] =
        useState<EditPartForm>({
            status: "YELLOW",
            assignedToId: "none",
            description: "",
            vehicleProgram: "",
            reason: "",
            assessment: emptyAssessmentForm,
        })

    const [partSuggestions, setPartSuggestions] = useState<
        PartNumberSuggestion[]
    >([])

    const [
        loadingPartSuggestions,
        setLoadingPartSuggestions,
    ] = useState(false)

    const [addPartForm, setAddPartForm] =
        useState<AddPartForm>({
            partNumber: "",
            partNumberId: null,
            description: "",
        })

    const [risk, setRisk] =
        useState<RiskDetail | null>(null)

    const [loading, setLoading] = useState(true)

    const [editRiskOpen, setEditRiskOpen] =
        useState(false)

    const [savingRisk, setSavingRisk] =
        useState(false)

    const [editRiskForm, setEditRiskForm] =
        useState<EditRiskForm>({
            title: "",
            description: "",
            openingReason: "",
            commodity: "",
            assignedToId: "none",
        })

    const [workflowAction, setWorkflowAction] =
        useState<"close" | "reopen" | null>(null)

    const [workflowReason, setWorkflowReason] =
        useState("")

    const [savingWorkflow, setSavingWorkflow] =
        useState(false)

    useEffect(() => {
        loadRisk()
        loadUsers()
    }, [])

    useEffect(() => {
        if (!addPartOpen) return

        const search = addPartForm.partNumber.trim()

        if (search.length < 2) {
            setPartSuggestions([])
            return
        }

        const timeout = setTimeout(() => {
            loadPartSuggestions(search)
        }, 350)

        return () => clearTimeout(timeout)
    }, [addPartForm.partNumber, addPartOpen])

    async function loadRisk() {
        try {
            setLoading(true)

            const res = await fetch(`/api/risk/${params.id}`, {
                credentials: "include",
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error || "Erro ao carregar RM"
                )
            }

            setRisk(data)
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar RM"
            )
        } finally {
            setLoading(false)
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
                    data.error ||
                    "Erro ao carregar responsáveis"
                )
            }

            setUsers(Array.isArray(data) ? data : data.data || [])
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar responsáveis"
            )
        }
    }

    function canEditRisk() {
        if (!risk || !user) {
            return false
        }

        const isResponsible =
            risk.assignedTo?.id === user.id

        return isAdmin || isResponsible
    }

    function openEditRiskDialog() {
        if (!risk) return

        setEditRiskForm({
            title: risk.title || "",
            description: risk.description || "",
            openingReason: risk.openingReason || "",
            commodity: risk.commodity ? risk.commodity : "none",
            assignedToId: risk.assignedTo?.id || "none",
        })

        setEditRiskOpen(true)
    }

    async function handleUpdateRisk() {
        if (!risk) return

        try {
            setSavingRisk(true)

            const res = await fetch(`/api/risk/${risk.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    title: editRiskForm.title.trim() || null,
                    description:
                        editRiskForm.description.trim() || null,
                    openingReason: editRiskForm.openingReason,
                    commodity:
                        editRiskForm.commodity === "none"
                            ? null
                            : editRiskForm.commodity,
                    assignedToId:
                        editRiskForm.assignedToId === "none"
                            ? null
                            : editRiskForm.assignedToId,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error || "Erro ao atualizar RM"
                )
            }

            toast.success("RM atualizada com sucesso")

            setRisk(data)
            setEditRiskOpen(false)

            await loadRisk()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao atualizar RM"
            )
        } finally {
            setSavingRisk(false)
        }
    }

    async function handleWorkflowChange() {
        if (!risk || !workflowAction) return

        const reason = workflowReason.trim()

        if (!reason) {
            toast.error("Informe o motivo da alteração")
            return
        }

        const nextStatus =
            workflowAction === "close"
                ? "CLOSED"
                : "OPEN"

        try {
            setSavingWorkflow(true)

            const res = await fetch(`/api/risk/${risk.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    workflowStatus: nextStatus,
                    reason,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Erro ao alterar status da RM"
                )
            }

            toast.success(
                workflowAction === "close"
                    ? "RM fechada com sucesso"
                    : "RM reaberta com sucesso"
            )

            setRisk(data)
            setWorkflowAction(null)
            setWorkflowReason("")

            await loadRisk()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao alterar status da RM"
            )
        } finally {
            setSavingWorkflow(false)
        }
    }

    async function loadPartSuggestions(search: string) {
        try {
            setLoadingPartSuggestions(true)

            const params = new URLSearchParams()
            params.set("search", search)

            const res = await fetch(
                `/api/part-numbers?${params.toString()}`,
                {
                    credentials: "include",
                }
            )

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error || "Erro ao buscar PNs"
                )
            }

            setPartSuggestions(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error(error)
            setPartSuggestions([])
        } finally {
            setLoadingPartSuggestions(false)
        }
    }


    function resetAddPartForm() {
        setAddPartForm({
            partNumber: "",
            partNumberId: null,
            description: "",
        })

        setPartSuggestions([])
        setAddPartError("")
    }

    function findLinkedPart(
        partNumber: string,
        partNumberId?: string | null
    ) {
        if (!risk) return null

        const normalizedInput = normalizePartNumber(partNumber)

        return (
            risk.parts.find((part) => {
                const sameId =
                    Boolean(partNumberId) &&
                    part.partNumber.id === partNumberId

                const sameNumber =
                    normalizePartNumber(part.partNumber.partNumber) ===
                    normalizedInput

                return sameId || sameNumber
            }) || null
        )
    }

    function handleSelectPartSuggestion(
        part: PartNumberSuggestion
    ) {
        setAddPartError("")

        setAddPartForm((prev) => ({
            ...prev,
            partNumberId: part.id,
            partNumber: part.partNumber,
            description: part.description || "",
        }))

        setPartSuggestions([])
    }

    async function handleAddPart() {
        if (!risk) return

        setAddPartError("")

        const partNumber = addPartForm.partNumber.trim()

        if (!partNumber) {
            setAddPartError("Informe o número do PN")
            toast.error("Informe o número do PN")
            return
        }

        try {
            setSavingPart(true)

            const res = await fetch(
                `/api/risk/${risk.id}/parts`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        partNumber,
                        description:
                            addPartForm.description.trim() || null,
                        status: "YELLOW",
                        assignedToId: null,
                        vehicleProgram: null,
                    }),
                }
            )

            const data = await res.json()

            if (!res.ok) {
                if (res.status === 409) {
                    const message =
                        data.error ||
                        "Este PN já está vinculado a esta RM"

                    setAddPartError(message)
                    toast.error(message)
                    return
                }

                throw new Error(
                    data.error || "Erro ao adicionar PN"
                )
            }

            toast.success("PN adicionado à RM com sucesso")

            setAddPartOpen(false)
            resetAddPartForm()

            await loadRisk()
        } catch (error) {
            console.error(error)

            const message =
                error instanceof Error
                    ? error.message
                    : "Erro ao adicionar PN"

            setAddPartError(message)
            toast.error(message)
        } finally {
            setSavingPart(false)
        }
    }

    function openEditPartDialog(part: RiskPartItem) {
        setSelectedPart(part)

        setEditPartForm({
            status: part.status,
            assignedToId: part.assignedTo?.id || "none",
            description: part.partNumber.description || "",
            vehicleProgram:
                part.partNumber.vehicleProgram || "",
            reason: "",
            assessment: buildAssessmentForm(part.assessment),
        })

        setEditPartOpen(true)
    }

    function resetEditPartForm() {
        setSelectedPart(null)

        setEditPartForm({
            status: "YELLOW",
            assignedToId: "none",
            description: "",
            vehicleProgram: "",
            reason: "",
            assessment: emptyAssessmentForm,
        })
    }

    async function handleUpdatePart() {
        if (!risk || !selectedPart) return

        if (!editPartForm.reason.trim()) {
            toast.error("Informe o motivo da alteração")
            return
        }

        try {
            setSavingEditPart(true)

            const res = await fetch(
                `/api/risk/${risk.id}/parts/${selectedPart.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        status: editPartForm.status,
                        assignedToId:
                            editPartForm.assignedToId === "none"
                                ? null
                                : editPartForm.assignedToId,
                        description:
                            editPartForm.description.trim() || null,
                        vehicleProgram:
                            editPartForm.vehicleProgram.trim() || null,
                        assessment: buildAssessmentPayload(
                            editPartForm.assessment
                        ),
                        reason: editPartForm.reason.trim(),
                    }),
                }
            )

            const data = await res.json()


            if (!res.ok) {
                throw new Error(
                    data.error || "Erro ao atualizar PN"
                )
            }

            toast.success("PN atualizado com sucesso")

            setEditPartOpen(false)
            resetEditPartForm()

            await loadRisk()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao atualizar PN"
            )
        } finally {
            setSavingEditPart(false)
        }
    }

    async function handleRemovePart(part: RiskPartItem) {
        if (!risk) return

        const confirmed = window.confirm(
            `Deseja realmente remover o PN ${part.partNumber.partNumber} desta RM?`
        )

        if (!confirmed) return

        try {
            setRemovingPartId(part.id)

            const res = await fetch(
                `/api/risk/${risk.id}/parts/${part.id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            )

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error || "Erro ao remover PN"
                )
            }

            toast.success("PN removido da RM com sucesso")

            await loadRisk()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao remover PN"
            )
        } finally {
            setRemovingPartId(null)
        }
    }

    function resetActionPlanForm() {
        setSelectedActionPlan(null)

        setActionPlanForm({
            description: "",
            dueDate: "",
            assignedToId: "none",
            riskEventPartId: "none",
        })
    }

    function openCreateActionPlanDialog() {
        resetActionPlanForm()
        setActionPlanOpen(true)
    }

    function openEditActionPlanDialog(plan: ActionPlanItem) {
        setSelectedActionPlan(plan)

        setActionPlanForm({
            description: plan.description,
            dueDate: toDateInputValue(plan.dueDate),
            assignedToId: plan.assignedTo?.id || "none",
            riskEventPartId: plan.riskEventPart?.id || "none",
        })

        setActionPlanOpen(true)
    }

    async function handleSaveActionPlan() {
        if (!risk) return

        const description =
            actionPlanForm.description.trim()

        const dueDate = actionPlanForm.dueDate

        const assignedToId = actionPlanForm.assignedToId

        const riskEventPartId = actionPlanForm.riskEventPartId

        if (!description) {
            toast.error("Informe a descrição do plano de ação")
            return
        }

        if (!dueDate) {
            toast.error("Informe o prazo do plano de ação")
            return
        }

        if (!assignedToId || assignedToId === "none") {
            toast.error(
                "Informe o responsável pelo plano de ação"
            )
            return
        }

        if (!riskEventPartId || riskEventPartId === "none") {
            toast.error(
                "Informe o PN vinculado ao plano de ação"
            )
            return
        }

        try {
            setSavingActionPlan(true)

            const isEditing = Boolean(selectedActionPlan)

            const url = isEditing
                ? `/api/risk/${risk.id}/action-plans/${selectedActionPlan?.id}`
                : `/api/risk/${risk.id}/action-plans`

            const res = await fetch(url, {
                method: isEditing ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    description,
                    dueDate,
                    assignedToId,
                    riskEventPartId,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Erro ao salvar plano de ação"
                )
            }

            toast.success(
                isEditing
                    ? "Plano de ação atualizado com sucesso"
                    : "Plano de ação criado com sucesso"
            )

            setActionPlanOpen(false)
            resetActionPlanForm()

            await loadRisk()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao salvar plano de ação"
            )
        } finally {
            setSavingActionPlan(false)
        }
    }

    async function handleToggleActionPlanCompleted(
        plan: ActionPlanItem
    ) {
        if (!risk) return

        try {
            setUpdatingActionPlanId(plan.id)

            const res = await fetch(
                `/api/risk/${risk.id}/action-plans/${plan.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        isCompleted: !plan.isCompleted,
                    }),
                }
            )

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Erro ao atualizar plano de ação"
                )
            }

            toast.success(
                plan.isCompleted
                    ? "Plano de ação reaberto"
                    : "Plano de ação concluído"
            )

            await loadRisk()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao atualizar plano de ação"
            )
        } finally {
            setUpdatingActionPlanId(null)
        }
    }

    async function handleDeleteActionPlan(
        plan: ActionPlanItem
    ) {
        if (!risk) return

        const confirmed = window.confirm(
            "Deseja realmente excluir este plano de ação?"
        )

        if (!confirmed) return

        try {
            setDeletingActionPlanId(plan.id)

            const res = await fetch(
                `/api/risk/${risk.id}/action-plans/${plan.id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            )

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Erro ao excluir plano de ação"
                )
            }

            toast.success(
                "Plano de ação excluído com sucesso"
            )

            await loadRisk()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao excluir plano de ação"
            )
        } finally {
            setDeletingActionPlanId(null)
        }
    }

    const userRoles = user?.roles ?? []
    const userPermissions = user?.permissions ?? []

    const isAdmin =
        userRoles.includes("ADMIN") ||
        userRoles.includes("SUPER_ADMIN") ||
        userPermissions.includes("USER_MANAGE")

    const isRiskOwner =
        Boolean(user?.id) &&
        Boolean(
            risk?.assignedTo?.id === user?.id ||
            risk?.createdBy?.id === user?.id
        )

    function canManageActionPlan(plan: ActionPlanItem) {
        return Boolean(
            user?.id &&
            (isAdmin ||
                isRiskOwner ||
                plan.assignedTo?.id === user.id)
        )
    }

    const availableHistoryParts = risk
        ? Array.from(
            new Map(
                [
                    ...(risk.partHistory ?? []).map((item) => [
                        item.partNumber.id,
                        item.partNumber,
                    ] as const),
                    ...(risk.actionPlanHistory ?? [])
                        .map((item) =>
                            item.riskEventPart?.partNumber ||
                            item.partNumber ||
                            null
                        )
                        .filter((part) => Boolean(part))
                        .map((part) => [
                            part!.id,
                            part!,
                        ] as const),
                ]
            ).values()
        )
        : []

    const combinedHistory = risk
        ? [
            ...risk.statusHistory.map((item) => ({
                id: `rm-${item.id}`,
                type: "RM_STATUS" as const,
                changeType: "RM_STATUS" as const,
                date: item.changedAt,
                partNumberId: null,
                partNumber: null,
                searchText: [
                    "status da rm",
                    item.oldStatus,
                    item.newStatus,
                    item.reason || "",
                    item.user.name,
                    item.user.email,
                    item.changedAt,
                ]
                    .join(" ")
                    .toLowerCase(),
                data: item,
            })),
            ...(risk.partHistory ?? []).map((item) => ({
                id: `pn-${item.id}`,
                type: "PN_HISTORY" as const,
                changeType: item.changeType,
                date: item.changedAt,
                partNumberId: item.partNumber.id,
                partNumber: item.partNumber.partNumber,
                searchText: [
                    "pn",
                    item.changeType,
                    item.partNumber.partNumber,
                    item.partNumber.description || "",
                    item.oldStatus || "",
                    item.newStatus || "",
                    item.oldDescription || "",
                    item.newDescription || "",
                    item.oldVehicleProgram || "",
                    item.newVehicleProgram || "",
                    item.reason || "",
                    item.changedBy.name,
                    item.changedBy.email,
                    item.changedAt,
                ]
                    .join(" ")
                    .toLowerCase(),
                data: item,
            })),
            ...(risk.actionPlanHistory ?? []).map((item) => ({
                id: `ap-${item.id}`,
                type: "ACTION_PLAN_HISTORY" as const,
                changeType: item.changeType,
                date: item.changedAt,
                partNumberId:
                    item.riskEventPart?.partNumber.id ||
                    item.partNumber?.id ||
                    null,
                partNumber:
                    item.riskEventPart?.partNumber.partNumber ||
                    item.partNumber?.partNumber ||
                    null,
                searchText: [
                    "plano de ação",
                    item.changeType,
                    item.actionPlan?.description || "",
                    item.riskEventPart?.partNumber.partNumber || "",
                    item.riskEventPart?.partNumber.description || "",
                    item.partNumber?.partNumber || "",
                    item.partNumber?.description || "",
                    item.oldDescription || "",
                    item.newDescription || "",
                    item.oldDueDate || "",
                    item.newDueDate || "",
                    String(item.oldCompleted ?? ""),
                    String(item.newCompleted ?? ""),
                    item.reason || "",
                    item.changedBy.name,
                    item.changedBy.email,
                    item.changedAt,
                ]
                    .join(" ")
                    .toLowerCase(),
                data: item,
            })),
        ].sort(
            (a, b) =>
                new Date(b.date).getTime() -
                new Date(a.date).getTime()
        )
        : []

    const filteredHistory = combinedHistory.filter((item) => {
        if (historyTypeFilter !== "ALL") {
            if (
                historyTypeFilter === "RM_STATUS" &&
                item.type !== "RM_STATUS"
            ) {
                return false
            }

            if (
                historyTypeFilter === "PN_HISTORY" &&
                item.type !== "PN_HISTORY"
            ) {
                return false
            }

            if (
                historyTypeFilter === "ACTION_PLAN_HISTORY" &&
                item.type !== "ACTION_PLAN_HISTORY"
            ) {
                return false
            }

            if (
                ![
                    "RM_STATUS",
                    "PN_HISTORY",
                    "ACTION_PLAN_HISTORY",
                ].includes(historyTypeFilter) &&
                item.changeType !== historyTypeFilter
            ) {
                return false
            }
        }

        if (
            historyPartFilter !== "ALL" &&
            item.partNumberId !== historyPartFilter
        ) {
            return false
        }

        const search = historySearch.trim().toLowerCase()

        if (search && !item.searchText.includes(search)) {
            return false
        }

        return true
    })

    return (
        <ProtectedRoute permission="RISK_VIEW">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <div className="p-6 space-y-6">
                        {loading ? (
                            <Card>
                                <CardContent className="flex items-center justify-center p-10 text-muted-foreground">
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Carregando RM...
                                </CardContent>
                            </Card>
                        ) : !risk ? (
                            <Card>
                                <CardContent className="p-10 text-center text-muted-foreground">
                                    RM não encontrada.
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => router.push("/rms")}
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>

                                        <div>
                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                <h1 className="text-2xl font-semibold">
                                                    {risk.code}
                                                </h1>

                                                {getWorkflowStatusPill(
                                                    risk.workflowStatus
                                                )}

                                                {getRiskLevelPill(risk.riskLevel)}
                                            </div>

                                            <p className="text-sm text-muted-foreground">
                                                {risk.title}
                                            </p>
                                        </div>
                                    </div>

                                    {canEditRisk() && (
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={openEditRiskDialog}
                                            >
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Editar RM
                                            </Button>

                                            {risk.workflowStatus === "OPEN" && (
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    onClick={() =>
                                                        setWorkflowAction("close")
                                                    }
                                                >
                                                    Fechar RM
                                                </Button>
                                            )}

                                            {risk.workflowStatus === "CLOSED" && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setWorkflowAction("reopen")
                                                    }
                                                >
                                                    Reabrir RM
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Fornecedor
                                                    </p>

                                                    <p className="mt-2 font-medium">
                                                        {risk.supplier.name}
                                                    </p>
                                                </div>

                                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Responsável
                                                    </p>

                                                    <p className="mt-2 font-medium">
                                                        {risk.assignedTo?.name || "-"}
                                                    </p>
                                                </div>

                                                <UserRound className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Semana/Ano
                                                    </p>

                                                    <p className="mt-2 font-medium">
                                                        {risk.createdWeek}/
                                                        {risk.createdYear}
                                                    </p>
                                                </div>

                                                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        PNs vinculados
                                                    </p>

                                                    <p className="mt-2 font-medium">
                                                        {risk.parts.length}
                                                    </p>
                                                </div>

                                                <Package className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_400px]">
                                    <div className="min-w-0 space-y-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <AlertTriangle className="h-5 w-5" />
                                                    Dados Gerais
                                                </CardTitle>
                                            </CardHeader>

                                            <CardContent className="space-y-6">
                                                <div className="grid gap-6 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <p className="text-sm text-muted-foreground">
                                                            Motivo da abertura
                                                        </p>

                                                        <p className="font-medium">
                                                            {
                                                                openingReasonLabels[
                                                                risk.openingReason
                                                                ]
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <p className="text-sm text-muted-foreground">
                                                            País do fornecedor
                                                        </p>

                                                        <p className="font-medium">
                                                            {risk.supplier.country.name} (
                                                            {risk.supplier.country.isoCode})
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid gap-6 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <p className="text-sm text-muted-foreground">
                                                            Commodity
                                                        </p>

                                                        <p className="font-medium">
                                                            {risk.commodity || "-"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid gap-6 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <p className="text-sm text-muted-foreground">
                                                            Criada por
                                                        </p>

                                                        <p className="font-medium">
                                                            {risk.createdBy.name}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <p className="text-sm text-muted-foreground">
                                                            Criada em
                                                        </p>

                                                        <p className="font-medium">
                                                            {formatDate(risk.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="text-sm text-muted-foreground">
                                                        Descrição
                                                    </p>

                                                    <p className="text-sm leading-relaxed">
                                                        {risk.description ||
                                                            "Nenhuma descrição informada."}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Package className="h-5 w-5" />
                                                        Part Numbers
                                                    </CardTitle>

                                                    {risk.workflowStatus === "OPEN" && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => setAddPartOpen(true)}
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Adicionar PN
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardHeader>

                                            <CardContent>
                                                {risk.parts.length === 0 ? (
                                                    <div className="rounded-lg border border-dashed p-6 text-center">
                                                        <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                                                        <p className="font-medium">
                                                            Nenhum PN vinculado a esta RM
                                                        </p>

                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            Adicione um ou mais part numbers para acompanhar os riscos por item.
                                                        </p>

                                                        {risk.workflowStatus === "OPEN" && (
                                                            <Button
                                                                type="button"
                                                                className="mt-4"
                                                                onClick={() => setAddPartOpen(true)}
                                                            >
                                                                <Plus className="mr-2 h-4 w-4" />
                                                                Adicionar primeiro PN
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto rounded-lg border">
                                                        <table className="w-full min-w-[760px] text-sm">
                                                            <thead className="bg-muted/50">
                                                                <tr className="border-b">
                                                                    <th className="px-4 py-3 text-left">
                                                                        PN
                                                                    </th>

                                                                    <th className="px-4 py-3 text-left">
                                                                        Descrição
                                                                    </th>

                                                                    <th className="px-4 py-3 text-left">
                                                                        Status
                                                                    </th>

                                                                    <th className="px-4 py-3 text-left">
                                                                        Logística
                                                                    </th>

                                                                    <th className="px-4 py-3 text-left">
                                                                        Responsável
                                                                    </th>

                                                                    {risk.workflowStatus === "OPEN" && (
                                                                        <th className="px-4 py-3 text-right">
                                                                            Ações
                                                                        </th>
                                                                    )}
                                                                </tr>
                                                            </thead>

                                                            <tbody>
                                                                {risk.parts.map((part) => (
                                                                    <Fragment key={part.id}>
                                                                        <tr
                                                                            key={part.id}
                                                                            className="border-b last:border-0"
                                                                        >
                                                                            <td className="px-4 py-3 font-medium">
                                                                                {part.partNumber.partNumber}
                                                                            </td>

                                                                            <td className="px-4 py-3">
                                                                                {part.partNumber.description || "-"}
                                                                            </td>

                                                                            <td className="px-4 py-3">
                                                                                {getPartStatusPill(part.status)}
                                                                            </td>

                                                                            <td className="px-4 py-3">
                                                                                <Badge variant="outline">
                                                                                    {part.logisticsStatus}
                                                                                </Badge>
                                                                            </td>

                                                                            <td className="px-4 py-3">
                                                                                {part.assignedTo?.name || "-"}
                                                                            </td>

                                                                            {risk.workflowStatus === "OPEN" && (
                                                                                <td className="px-4 py-3 text-right">
                                                                                    <div className="flex flex-wrap justify-end gap-2">
                                                                                        <Button
                                                                                            className="w-full sm:w-auto"
                                                                                            type="button"
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            onClick={() =>
                                                                                                openEditPartDialog(part)
                                                                                            }
                                                                                        >
                                                                                            <Pencil className="mr-2 h-4 w-4" />
                                                                                            Editar
                                                                                        </Button>

                                                                                        <Button
                                                                                            className="w-full sm:w-auto"
                                                                                            type="button"
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            onClick={() =>
                                                                                                handleRemovePart(part)
                                                                                            }
                                                                                            disabled={removingPartId === part.id}
                                                                                        >
                                                                                            {removingPartId === part.id ? (
                                                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                                            ) : (
                                                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                                            )}
                                                                                            Remover
                                                                                        </Button>
                                                                                    </div>
                                                                                </td>
                                                                            )}
                                                                        </tr>


                                                                    </Fragment>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                    <CardTitle className="flex items-center gap-2">
                                                        <ClipboardList className="h-5 w-5" />
                                                        Planos de Ação
                                                    </CardTitle>

                                                    {risk.workflowStatus === "OPEN" &&
                                                        (isAdmin || isRiskOwner) && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={openCreateActionPlanDialog}
                                                            >
                                                                <Plus className="mr-2 h-4 w-4" />
                                                                Adicionar plano
                                                            </Button>
                                                        )}
                                                </div>
                                            </CardHeader>

                                            <CardContent>
                                                {risk.actionPlans.length === 0 ? (
                                                    <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                                                        Nenhum plano de ação cadastrado.

                                                        {risk.workflowStatus === "OPEN" &&
                                                            (isAdmin || isRiskOwner) && (
                                                                <div className="mt-4">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        onClick={openCreateActionPlanDialog}
                                                                    >
                                                                        <Plus className="mr-2 h-4 w-4" />
                                                                        Criar primeiro plano
                                                                    </Button>
                                                                </div>
                                                            )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {risk.actionPlans.map((plan) => (
                                                            <div
                                                                key={plan.id}
                                                                className="rounded-lg border p-4"
                                                            >
                                                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                                    <div className="space-y-1">
                                                                        <p className="font-medium">
                                                                            {plan.description}
                                                                        </p>

                                                                        <p className="text-sm text-muted-foreground">
                                                                            PN:{" "}
                                                                            {plan.riskEventPart?.partNumber.partNumber || "-"}
                                                                        </p>

                                                                        <p className="text-sm text-muted-foreground">
                                                                            Responsável:{" "}
                                                                            {plan.assignedTo?.name || "-"}
                                                                        </p>

                                                                        <p className="text-sm text-muted-foreground">
                                                                            Prazo:{" "}
                                                                            {formatDateOnly(plan.dueDate)}
                                                                        </p>
                                                                    </div>

                                                                    <div className="flex flex-col gap-2 md:items-end">
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {plan.isCompleted ? (
                                                                                <Pill backgroundColor="#16a34a">
                                                                                    Concluído
                                                                                </Pill>
                                                                            ) : plan.isOverdue ? (
                                                                                <Pill backgroundColor="#dc2626">
                                                                                    Atrasado
                                                                                </Pill>
                                                                            ) : (
                                                                                <Pill backgroundColor="#2563eb">
                                                                                    No prazo
                                                                                </Pill>
                                                                            )}
                                                                        </div>

                                                                        {risk.workflowStatus === "OPEN" &&
                                                                            canManageActionPlan(plan) && (
                                                                                <div className="flex flex-wrap justify-end gap-2">
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() =>
                                                                                            handleToggleActionPlanCompleted(
                                                                                                plan
                                                                                            )
                                                                                        }
                                                                                        disabled={
                                                                                            updatingActionPlanId === plan.id
                                                                                        }
                                                                                    >
                                                                                        {updatingActionPlanId ===
                                                                                            plan.id ? (
                                                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                                        ) : (
                                                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                                        )}

                                                                                        {plan.isCompleted
                                                                                            ? "Reabrir"
                                                                                            : "Concluir"}
                                                                                    </Button>

                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() =>
                                                                                            openEditActionPlanDialog(plan)
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
                                                                                            handleDeleteActionPlan(plan)
                                                                                        }
                                                                                        disabled={
                                                                                            deletingActionPlanId === plan.id
                                                                                        }
                                                                                    >
                                                                                        {deletingActionPlanId ===
                                                                                            plan.id ? (
                                                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                                        ) : (
                                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                                        )}

                                                                                        Excluir
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div className="min-w-0 space-y-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Truck className="h-5 w-5" />
                                                    Logística
                                                </CardTitle>
                                            </CardHeader>

                                            <CardContent>
                                                {risk.logistics.length === 0 ? (
                                                    <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                                                        Nenhuma solicitação logística.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {risk.logistics.map((request) => (
                                                            <div
                                                                key={request.id}
                                                                className="rounded-lg border p-4 space-y-3"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <p className="font-medium">
                                                                        Solicitação
                                                                    </p>

                                                                    {getLogisticsStatusPill(
                                                                        request.status
                                                                    )}
                                                                </div>

                                                                <div className="space-y-2 text-sm">
                                                                    <p>
                                                                        <span className="text-muted-foreground">
                                                                            Solicitado por:
                                                                        </span>{" "}
                                                                        {request.requester.name}
                                                                    </p>

                                                                    <p>
                                                                        <span className="text-muted-foreground">
                                                                            Solicitado em:
                                                                        </span>{" "}
                                                                        {formatDate(
                                                                            request.requestedAt
                                                                        )}
                                                                    </p>

                                                                    <p>
                                                                        <span className="text-muted-foreground">
                                                                            Revisado por:
                                                                        </span>{" "}
                                                                        {request.reviewer?.name ||
                                                                            "-"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <div className="flex flex-col gap-3">
                                                    <CardTitle className="flex items-center gap-2">
                                                        <CheckCircle2 className="h-5 w-5" />
                                                        Histórico da RM
                                                    </CardTitle>

                                                    <div className="grid min-w-0 gap-2 sm:grid-cols-2 2xl:grid-cols-1">
                                                        <Select
                                                            value={historyTypeFilter}
                                                            onValueChange={(value) =>
                                                                setHistoryTypeFilter(
                                                                    value as HistoryTypeFilter
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Tipo" />
                                                            </SelectTrigger>

                                                            <SelectContent>
                                                                <SelectItem value="ALL">
                                                                    Todos os tipos
                                                                </SelectItem>

                                                                <SelectItem value="RM_STATUS">
                                                                    Status da RM
                                                                </SelectItem>

                                                                <SelectItem value="PN_HISTORY">
                                                                    Todos os PNs
                                                                </SelectItem>

                                                                <SelectItem value="STATUS_CHANGE">
                                                                    Status do PN
                                                                </SelectItem>

                                                                <SelectItem value="RESPONSIBLE_CHANGE">
                                                                    Responsável do PN
                                                                </SelectItem>

                                                                <SelectItem value="DATA_CHANGE">
                                                                    Dados do PN
                                                                </SelectItem>

                                                                <SelectItem value="LOGISTICS_CHANGE">
                                                                    Logística
                                                                </SelectItem>

                                                                <SelectItem value="ACTION_PLAN_HISTORY">
                                                                    Planos de ação
                                                                </SelectItem>

                                                                <SelectItem value="ACTION_PLAN_CREATE">
                                                                    Plano criado
                                                                </SelectItem>

                                                                <SelectItem value="ACTION_PLAN_UPDATE">
                                                                    Plano atualizado
                                                                </SelectItem>

                                                                <SelectItem value="ACTION_PLAN_COMPLETE">
                                                                    Plano concluído
                                                                </SelectItem>

                                                                <SelectItem value="ACTION_PLAN_REOPEN">
                                                                    Plano reaberto
                                                                </SelectItem>

                                                                <SelectItem value="ACTION_PLAN_DELETE">
                                                                    Plano excluído
                                                                </SelectItem>

                                                                <SelectItem value="NOTE">
                                                                    Observação
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        <Select
                                                            value={historyPartFilter}
                                                            onValueChange={setHistoryPartFilter}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="PN" />
                                                            </SelectTrigger>

                                                            <SelectContent>
                                                                <SelectItem value="ALL">
                                                                    Todos os PNs
                                                                </SelectItem>

                                                                {availableHistoryParts.map((part) => (
                                                                    <SelectItem
                                                                        key={part.id}
                                                                        value={part.id}
                                                                    >
                                                                        {part.partNumber}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                                            <Input
                                                                className="pl-9"
                                                                placeholder="Buscar no histórico..."
                                                                value={historySearch}
                                                                onChange={(e) =>
                                                                    setHistorySearch(e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                    </div>

                                                    {(historyTypeFilter !== "ALL" ||
                                                        historyPartFilter !== "ALL" ||
                                                        historySearch.trim()) && (
                                                            <div className="flex w-full justify-start sm:justify-end">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="w-full sm:w-auto"
                                                                    onClick={() => {
                                                                        setHistoryTypeFilter("ALL")
                                                                        setHistoryPartFilter("ALL")
                                                                        setHistorySearch("")
                                                                    }}
                                                                >
                                                                    Limpar filtros
                                                                </Button>
                                                            </div>
                                                        )}
                                                </div>
                                            </CardHeader>

                                            <CardContent>
                                                {filteredHistory.length === 0 ? (
                                                    <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                                                        Nenhum histórico encontrado para os filtros selecionados.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {filteredHistory.map((item) => {
                                                            if (item.type === "RM_STATUS") {
                                                                const history = item.data

                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        className="min-w-0 rounded-lg border p-3 text-sm"
                                                                    >
                                                                        <div className="space-y-2">
                                                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                                <Badge variant="outline">
                                                                                    Status da RM
                                                                                </Badge>

                                                                                <p className="font-medium">
                                                                                    {history.oldStatus} →{" "}
                                                                                    {history.newStatus}
                                                                                </p>
                                                                            </div>

                                                                            {history.reason && (
                                                                                <div className="rounded-md bg-muted/50 p-3">
                                                                                    <p className="text-muted-foreground">
                                                                                        Motivo:
                                                                                    </p>

                                                                                    <p className="mt-1 font-medium">
                                                                                        {history.reason}
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            <p className="text-muted-foreground">
                                                                                {history.user.name} em{" "}
                                                                                {formatDate(history.changedAt)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            }



                                                            if (item.type === "ACTION_PLAN_HISTORY") {
                                                                const history = item.data

                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        className="min-w-0 rounded-lg border p-3 text-sm"
                                                                    >
                                                                        <div className="space-y-2">
                                                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                                <Badge variant="outline">
                                                                                    Plano de ação
                                                                                </Badge>

                                                                                {(history.riskEventPart?.partNumber.partNumber ||
                                                                                    history.partNumber?.partNumber) && (
                                                                                        <Badge variant="outline">
                                                                                            PN{" "}
                                                                                            {history.riskEventPart?.partNumber.partNumber ||
                                                                                                history.partNumber?.partNumber}
                                                                                        </Badge>
                                                                                    )}

                                                                                <p className="font-medium">
                                                                                    {history.actionPlan?.description || history.newDescription || history.oldDescription || "Plano removido"}
                                                                                </p>
                                                                            </div>

                                                                            {history.oldDescription !== history.newDescription &&
                                                                                history.newDescription && (
                                                                                    <p>
                                                                                        <span className="text-muted-foreground">
                                                                                            Descrição:
                                                                                        </span>{" "}
                                                                                        {history.oldDescription || "-"} →{" "}
                                                                                        {history.newDescription}
                                                                                    </p>
                                                                                )}

                                                                            {history.oldDueDate !== history.newDueDate &&
                                                                                history.newDueDate && (
                                                                                    <p>
                                                                                        <span className="text-muted-foreground">
                                                                                            Prazo:
                                                                                        </span>{" "}
                                                                                        {history.oldDueDate
                                                                                            ? formatDateOnly(history.oldDueDate)
                                                                                            : "-"}{" "}
                                                                                        → {formatDateOnly(history.newDueDate)}
                                                                                    </p>
                                                                                )}

                                                                            {history.oldCompleted !== history.newCompleted &&
                                                                                history.newCompleted !== null && (
                                                                                    <p>
                                                                                        <span className="text-muted-foreground">
                                                                                            Status:
                                                                                        </span>{" "}
                                                                                        {history.newCompleted
                                                                                            ? "Concluído"
                                                                                            : "Reaberto"}
                                                                                    </p>
                                                                                )}

                                                                            {history.reason && (
                                                                                <div className="rounded-md bg-muted/50 p-3">
                                                                                    <p className="text-muted-foreground">
                                                                                        Motivo:
                                                                                    </p>

                                                                                    <p className="mt-1 font-medium">
                                                                                        {history.reason}
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            <p className="text-muted-foreground">
                                                                                {history.changedBy.name} em{" "}
                                                                                {formatDate(history.changedAt)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            }
                                                            const history = item.data

                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    className="min-w-0 rounded-lg border p-3 text-sm"
                                                                >
                                                                    <div className="space-y-2">
                                                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                            <Badge variant="outline">
                                                                                PN
                                                                            </Badge>

                                                                            <p className="font-medium">
                                                                                {history.partNumber.partNumber}
                                                                            </p>

                                                                            {history.oldStatus &&
                                                                                history.newStatus && (
                                                                                    <div className="flex items-center gap-2">
                                                                                        {getPartStatusPill(
                                                                                            history.oldStatus
                                                                                        )}

                                                                                        <span className="text-muted-foreground">
                                                                                            →
                                                                                        </span>

                                                                                        {getPartStatusPill(
                                                                                            history.newStatus
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                        </div>

                                                                        {history.oldDescription !==
                                                                            history.newDescription &&
                                                                            history.newDescription && (
                                                                                <p>
                                                                                    <span className="text-muted-foreground">
                                                                                        Descrição:
                                                                                    </span>{" "}
                                                                                    {history.oldDescription || "-"} →{" "}
                                                                                    {history.newDescription}
                                                                                </p>
                                                                            )}

                                                                        {history.oldVehicleProgram !==
                                                                            history.newVehicleProgram &&
                                                                            history.newVehicleProgram && (
                                                                                <p>
                                                                                    <span className="text-muted-foreground">
                                                                                        Programa:
                                                                                    </span>{" "}
                                                                                    {history.oldVehicleProgram || "-"} →{" "}
                                                                                    {history.newVehicleProgram}
                                                                                </p>
                                                                            )}

                                                                        {history.oldAssignedToId !==
                                                                            history.newAssignedToId &&
                                                                            history.newAssignedToId && (
                                                                                <p>
                                                                                    <span className="text-muted-foreground">
                                                                                        Responsável alterado
                                                                                    </span>
                                                                                </p>
                                                                            )}

                                                                        <div className="rounded-md bg-muted/50 p-3">
                                                                            <p className="text-muted-foreground">
                                                                                Motivo:
                                                                            </p>

                                                                            <p className="mt-1 font-medium">
                                                                                {history.reason}
                                                                            </p>
                                                                        </div>

                                                                        <p className="text-muted-foreground">
                                                                            {history.changedBy.name} em{" "}
                                                                            {formatDate(history.changedAt)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                <Dialog
                                    open={editRiskOpen}
                                    onOpenChange={(open) => {
                                        setEditRiskOpen(open)
                                    }}
                                >
                                    <DialogContent className="sm:max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>
                                                Editar RM
                                            </DialogTitle>

                                            <DialogDescription>
                                                Atualize as informações básicas da RM.
                                                Alterações ficarão registradas no histórico e nos logs.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <Label>Título</Label>

                                                <Input
                                                    value={editRiskForm.title}
                                                    onChange={(e) =>
                                                        setEditRiskForm((prev) => ({
                                                            ...prev,
                                                            title: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="Título da RM"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Descrição</Label>

                                                <Textarea
                                                    className="min-h-[90px] resize-none"
                                                    value={editRiskForm.description}
                                                    onChange={(e) =>
                                                        setEditRiskForm((prev) => ({
                                                            ...prev,
                                                            description: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="Descrição da RM"
                                                />
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label>Motivo de abertura</Label>

                                                    <Select
                                                        value={editRiskForm.openingReason}
                                                        onValueChange={(value) =>
                                                            setEditRiskForm((prev) => ({
                                                                ...prev,
                                                                openingReason: value,
                                                            }))
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione o motivo" />
                                                        </SelectTrigger>

                                                        <SelectContent>
                                                            <SelectItem value="TIER_2_CHANGE">
                                                                Troca ou Adição de Tier 2
                                                            </SelectItem>

                                                            <SelectItem value="PLANT_CHANGE">
                                                                Alteração de Planta
                                                            </SelectItem>

                                                            <SelectItem value="SUPPLIER_TRANSFER_PHASE_OUT">
                                                                Transferência de Fornecedor (Phase Out)
                                                            </SelectItem>

                                                            <SelectItem value="MANUFACTURING_PROCESS_CHANGE">
                                                                Mudança no Processo de Fabricação
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Commodity</Label>

                                                    <Select
                                                        value={editRiskForm.commodity || "none"}
                                                        onValueChange={(value) =>
                                                            setEditRiskForm((prev) => ({
                                                                ...prev,
                                                                commodity: value,
                                                            }))
                                                        }
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Selecione a commodity" />
                                                        </SelectTrigger>

                                                        <SelectContent>
                                                            <SelectItem value="none">
                                                                Sem commodity
                                                            </SelectItem>

                                                            {commodityOptions.map((commodity) => (
                                                                <SelectItem
                                                                    key={commodity}
                                                                    value={commodity}
                                                                >
                                                                    {commodity}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Responsável pela RM</Label>

                                                <Select
                                                    value={editRiskForm.assignedToId}
                                                    onValueChange={(value) =>
                                                        setEditRiskForm((prev) => ({
                                                            ...prev,
                                                            assignedToId: value,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o responsável" />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            Sem responsável
                                                        </SelectItem>

                                                        {users.map((user) => (
                                                            <SelectItem
                                                                key={user.id}
                                                                value={user.id}
                                                            >
                                                                {user.name} — {user.email}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <p className="text-xs text-muted-foreground">
                                                    Se o responsável for alterado, o novo usuário deverá receber uma notificação.
                                                </p>
                                            </div>
                                        </div>

                                        {addPartError && (
                                            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                                {addPartError}
                                            </div>
                                        )}

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setEditRiskOpen(false)}
                                                disabled={savingRisk}
                                            >
                                                Cancelar
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={handleUpdateRisk}
                                                disabled={savingRisk}
                                            >
                                                {savingRisk ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                Salvar alterações
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog
                                    open={workflowAction !== null}
                                    onOpenChange={(open) => {
                                        if (!open) {
                                            setWorkflowAction(null)
                                            setWorkflowReason("")
                                        }
                                    }}
                                >
                                    <DialogContent className="sm:max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {workflowAction === "close"
                                                    ? "Fechar RM"
                                                    : "Reabrir RM"}
                                            </DialogTitle>

                                            <DialogDescription>
                                                {workflowAction === "close"
                                                    ? "Informe os detalhes do fechamento da RM."
                                                    : "Informe os detalhes da reabertura da RM."}
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-2">
                                            <Label>
                                                Motivo
                                                <span className="ml-1 text-red-500">*</span>
                                            </Label>

                                            <Textarea
                                                className="min-h-[110px] resize-none"
                                                value={workflowReason}
                                                onChange={(e) =>
                                                    setWorkflowReason(e.target.value)
                                                }
                                                placeholder={
                                                    workflowAction === "close"
                                                        ? "Ex.: RM fechada após mitigação do risco, aprovação do VDA e conclusão das ações necessárias."
                                                        : "Ex.: RM reaberta devido a nova pendência identificada após acompanhamento do fornecedor."
                                                }
                                            />

                                            <p className="text-xs text-muted-foreground">
                                                Esse motivo será registrado no histórico da RM e nos logs de auditoria.
                                            </p>
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setWorkflowAction(null)
                                                    setWorkflowReason("")
                                                }}
                                                disabled={savingWorkflow}
                                            >
                                                Cancelar
                                            </Button>

                                            <Button
                                                type="button"
                                                variant={
                                                    workflowAction === "close"
                                                        ? "destructive"
                                                        : "default"
                                                }
                                                onClick={handleWorkflowChange}
                                                disabled={savingWorkflow}
                                            >
                                                {savingWorkflow && (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                )}

                                                {workflowAction === "close"
                                                    ? "Confirmar fechamento"
                                                    : "Confirmar reabertura"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog
                                    open={addPartOpen}
                                    onOpenChange={(open) => {
                                        setAddPartOpen(open)

                                        if (!open) {
                                            resetAddPartForm()
                                        }
                                    }}
                                >
                                    <DialogContent className="sm:max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>
                                                Adicionar PN à RM
                                            </DialogTitle>

                                            <DialogDescription>
                                                Informe o número do PN. Se ele já existir, o sistema irá reutilizar o cadastro. Caso contrário, será criado automaticamente.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <Label>
                                                    Número do PN
                                                    <span className="ml-1 text-red-500">*</span>
                                                </Label>

                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                                    <Input
                                                        className="pl-9"
                                                        placeholder="Digite o PN..."
                                                        value={addPartForm.partNumber}
                                                        onChange={(e) => {
                                                            setAddPartError("")

                                                            setAddPartForm((prev) => ({
                                                                ...prev,
                                                                partNumber: e.target.value,
                                                                partNumberId: null,
                                                            }))
                                                        }}
                                                    />
                                                </div>

                                                {loadingPartSuggestions && (
                                                    <p className="flex items-center text-xs text-muted-foreground">
                                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                        Buscando PNs...
                                                    </p>
                                                )}

                                                {partSuggestions.length > 0 && (
                                                    <div className="max-h-44 overflow-y-auto rounded-md border bg-background">
                                                        {partSuggestions.map((part) => (
                                                            <button
                                                                key={part.id}
                                                                type="button"
                                                                className="flex w-full flex-col items-start gap-1 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                                                                onClick={() =>
                                                                    handleSelectPartSuggestion(part)
                                                                }
                                                            >
                                                                <span className="font-medium">
                                                                    {part.partNumber}
                                                                </span>

                                                                <span className="text-xs text-muted-foreground">
                                                                    {part.description || "Sem descrição"}
                                                                    {part.vehicleProgram
                                                                        ? ` • ${part.vehicleProgram}`
                                                                        : ""}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Descrição</Label>

                                                <Input
                                                    placeholder="Descrição do PN..."
                                                    value={addPartForm.description}
                                                    onChange={(e) =>
                                                        setAddPartForm((prev) => ({
                                                            ...prev,
                                                            description: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                        </div>

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setAddPartOpen(false)}
                                                disabled={savingPart}
                                            >
                                                Cancelar
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={handleAddPart}
                                                disabled={savingPart}
                                            >
                                                {savingPart ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                Adicionar PN
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                <Dialog
                                    open={editPartOpen}
                                    onOpenChange={(open) => {
                                        setEditPartOpen(open)

                                        if (!open) {
                                            resetEditPartForm()
                                        }
                                    }}
                                >
                                    <DialogContent className="sm:max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>
                                                Editar PN da RM
                                            </DialogTitle>

                                            <DialogDescription>
                                                Altere o status, responsável, descrição ou programa do PN dentro desta RM.
                                            </DialogDescription>
                                        </DialogHeader>

                                        {selectedPart && (
                                            <div className="space-y-5">
                                                <div className="space-y-2">
                                                    <Label>PN</Label>

                                                    <Input
                                                        value={selectedPart.partNumber.partNumber}
                                                        disabled
                                                    />
                                                </div>

                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Descrição</Label>

                                                        <Input
                                                            value={editPartForm.description}
                                                            disabled
                                                        />
                                                    </div>

                                                </div>

                                                <div className="rounded-lg border p-4 space-y-4">
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            Checklist de risco do PN
                                                        </p>

                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            As respostas abaixo podem recalcular automaticamente o status do PN.
                                                        </p>
                                                    </div>

                                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                        <AssessmentSelectField
                                                            label="PN cancelado?"
                                                            value={editPartForm.assessment.isPartCanceled}
                                                            onChange={(value) =>
                                                                setEditPartForm((prev) => ({
                                                                    ...prev,
                                                                    assessment: {
                                                                        ...prev.assessment,
                                                                        isPartCanceled: value,
                                                                    },
                                                                }))
                                                            }
                                                        />

                                                        <AssessmentSelectField
                                                            label="PN com demanda?"
                                                            value={editPartForm.assessment.hasDemand}
                                                            onChange={(value) =>
                                                                setEditPartForm((prev) => ({
                                                                    ...prev,
                                                                    assessment: {
                                                                        ...prev.assessment,
                                                                        hasDemand: value,
                                                                    },
                                                                }))
                                                            }
                                                        />

                                                        <AssessmentSelectField
                                                            label="Fonte nomeada?"
                                                            value={editPartForm.assessment.sourceNamed}
                                                            onChange={(value) =>
                                                                setEditPartForm((prev) => ({
                                                                    ...prev,
                                                                    assessment: {
                                                                        ...prev.assessment,
                                                                        sourceNamed: value,
                                                                    },
                                                                }))
                                                            }
                                                        />

                                                        <AssessmentSelectField
                                                            label="Plano recebido?"
                                                            value={editPartForm.assessment.actionPlanReceived}
                                                            onChange={(value) =>
                                                                setEditPartForm((prev) => ({
                                                                    ...prev,
                                                                    assessment: {
                                                                        ...prev.assessment,
                                                                        actionPlanReceived: value,
                                                                    },
                                                                }))
                                                            }
                                                        />

                                                        <AssessmentSelectField
                                                            label="Cronograma atende?"
                                                            value={
                                                                editPartForm.assessment
                                                                    .scheduleMeetsDevelopment
                                                            }
                                                            onChange={(value) =>
                                                                setEditPartForm((prev) => ({
                                                                    ...prev,
                                                                    assessment: {
                                                                        ...prev.assessment,
                                                                        scheduleMeetsDevelopment: value,
                                                                    },
                                                                }))
                                                            }
                                                        />

                                                        <AssessmentSelectField
                                                            label="Técnico/comercial OK?"
                                                            value={editPartForm.assessment.technicalCommercialOk}
                                                            onChange={(value) =>
                                                                setEditPartForm((prev) => ({
                                                                    ...prev,
                                                                    assessment: {
                                                                        ...prev.assessment,
                                                                        technicalCommercialOk: value,
                                                                    },
                                                                }))
                                                            }
                                                        />

                                                        <AssessmentSelectField
                                                            label="Risco produção mitigado?"
                                                            value={
                                                                editPartForm.assessment
                                                                    .productionRiskMitigated
                                                            }
                                                            onChange={(value) =>
                                                                setEditPartForm((prev) => ({
                                                                    ...prev,
                                                                    assessment: {
                                                                        ...prev.assessment,
                                                                        productionRiskMitigated: value,
                                                                    },
                                                                }))
                                                            }
                                                        />

                                                        <AssessmentSelectField
                                                            label="EOP OK?"
                                                            value={editPartForm.assessment.eopManagementOk}
                                                            onChange={(value) =>
                                                                setEditPartForm((prev) => ({
                                                                    ...prev,
                                                                    assessment: {
                                                                        ...prev.assessment,
                                                                        eopManagementOk: value,
                                                                    },
                                                                }))
                                                            }
                                                        />

                                                        <AssessmentSelectField
                                                            label="Desvio/PFP finalizado?"
                                                            value={
                                                                editPartForm.assessment
                                                                    .deviationPfpFinished
                                                            }
                                                            onChange={(value) =>
                                                                setEditPartForm((prev) => ({
                                                                    ...prev,
                                                                    assessment: {
                                                                        ...prev.assessment,
                                                                        deviationPfpFinished: value,
                                                                    },
                                                                }))
                                                            }
                                                        />

                                                        <AssessmentSelectField
                                                            label="VDA aprovado?"
                                                            value={editPartForm.assessment.vdaApproved}
                                                            onChange={(value) =>
                                                                setEditPartForm((prev) => ({
                                                                    ...prev,
                                                                    assessment: {
                                                                        ...prev.assessment,
                                                                        vdaApproved: value,
                                                                    },
                                                                }))
                                                            }
                                                        />

                                                        <AssessmentSelectField
                                                            label="Modificação implementada?"
                                                            value={
                                                                editPartForm.assessment
                                                                    .modificationImplemented
                                                            }
                                                            onChange={(value) =>
                                                                setEditPartForm((prev) => ({
                                                                    ...prev,
                                                                    assessment: {
                                                                        ...prev.assessment,
                                                                        modificationImplemented: value,
                                                                    },
                                                                }))
                                                            }
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>
                                                        Motivo da alteração
                                                        <span className="ml-1 text-red-500">*</span>
                                                    </Label>

                                                    <Textarea
                                                        className="min-h-[80px] resize-none"
                                                        placeholder="Explique o motivo da alteração do PN..."
                                                        value={editPartForm.reason}
                                                        onChange={(e) =>
                                                            setEditPartForm((prev) => ({
                                                                ...prev,
                                                                reason: e.target.value,
                                                            }))
                                                        }
                                                    />

                                                    <p className="text-xs text-muted-foreground">
                                                        Esse motivo será exibido no histórico da RM.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setEditPartOpen(false)}
                                                disabled={savingEditPart}
                                            >
                                                Cancelar
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={handleUpdatePart}
                                                disabled={savingEditPart}
                                            >
                                                {savingEditPart ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                Salvar alterações
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                <Dialog
                                    open={actionPlanOpen}
                                    onOpenChange={(open) => {
                                        setActionPlanOpen(open)

                                        if (!open) {
                                            resetActionPlanForm()
                                        }
                                    }}
                                >
                                    <DialogContent className="sm:max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {selectedActionPlan
                                                    ? "Editar plano de ação"
                                                    : "Adicionar plano de ação"}
                                            </DialogTitle>

                                            <DialogDescription>
                                                Cadastre uma ação, prazo e responsável para acompanhamento dentro da RM.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <Label>
                                                    Descrição da ação
                                                    <span className="ml-1 text-red-500">*</span>
                                                </Label>

                                                <Textarea
                                                    className="min-h-[90px] resize-none"
                                                    placeholder="Descreva a ação necessária..."
                                                    value={actionPlanForm.description}
                                                    onChange={(e) =>
                                                        setActionPlanForm((prev) => ({
                                                            ...prev,
                                                            description: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div className="space-y-2">
                                                    <Label>
                                                        PN da RM
                                                        <span className="ml-1 text-red-500">*</span>
                                                    </Label>

                                                    <Select
                                                        value={actionPlanForm.riskEventPartId}
                                                        onValueChange={(value) =>
                                                            setActionPlanForm((prev) => ({
                                                                ...prev,
                                                                riskEventPartId: value,
                                                            }))
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione o PN" />
                                                        </SelectTrigger>

                                                        <SelectContent>
                                                            <SelectItem value="none">
                                                                Selecione
                                                            </SelectItem>

                                                            {risk.parts.map((part) => (
                                                                <SelectItem
                                                                    key={part.id}
                                                                    value={part.id}
                                                                >
                                                                    {part.partNumber.partNumber}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>
                                                        Prazo
                                                        <span className="ml-1 text-red-500">*</span>
                                                    </Label>

                                                    <Input
                                                        type="date"
                                                        value={actionPlanForm.dueDate}
                                                        onChange={(e) =>
                                                            setActionPlanForm((prev) => ({
                                                                ...prev,
                                                                dueDate: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>
                                                        Responsável
                                                        <span className="ml-1 text-red-500">*</span>
                                                    </Label>

                                                    <Select
                                                        value={actionPlanForm.assignedToId}
                                                        onValueChange={(value) =>
                                                            setActionPlanForm((prev) => ({
                                                                ...prev,
                                                                assignedToId: value,
                                                            }))
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione o responsável" />
                                                        </SelectTrigger>

                                                        <SelectContent>
                                                            <SelectItem value="none">
                                                                Selecione
                                                            </SelectItem>

                                                            {users.map((user) => (
                                                                <SelectItem
                                                                    key={user.id}
                                                                    value={user.id}
                                                                >
                                                                    {user.name} — {user.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setActionPlanOpen(false)}
                                                disabled={savingActionPlan}
                                            >
                                                Cancelar
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={handleSaveActionPlan}
                                                disabled={savingActionPlan}
                                            >
                                                {savingActionPlan ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}

                                                {selectedActionPlan
                                                    ? "Salvar alterações"
                                                    : "Adicionar plano"}
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