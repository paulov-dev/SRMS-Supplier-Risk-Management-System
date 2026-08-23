"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { SiteHeader } from "@/components/dashboard/site-header"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

type LogisticsRequestStatus =
    | "PENDING"
    | "IN_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "CANCELED"

type LogisticsRequestType =
    | "BOOK_INCLUSION"
    | "BUFFER_CALCULATION"

type LogisticsPriority =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL"

type LogisticsTab =
    | "pending"
    | "in_review"
    | "mine"
    | "responded"
    | "all"

type LogisticsRequest = {
    id: string
    code: string

    type: LogisticsRequestType
    status: LogisticsRequestStatus
    priority: LogisticsPriority

    requestedAt: string
    acceptedAt: string | null
    reviewedAt: string | null
    canceledAt: string | null

    pendingDays: number

    requestNotes: string | null
    responseNotes: string | null
    rejectionReason: string | null

    requestedQuantity: number | null
    calculatedQuantity: number | null

    coverageStartDate: string | null
    coverageEndDate: string | null

    cutoffDate: string | null
    cutoffReference: string | null

    oldPartNumber: string | null
    newPartNumber: string | null
    replacementReason: string | null

    riskEvent: {
        id: string
        code: string
        title: string | null
        riskLevel: string
        workflowStatus: string
        supplier: {
            id: string
            name: string
            supplierCodeSap: string | null
        }
    }

    riskEventPart: {
        id: string
        status: string
        logisticsStatus: string
        partNumber: {
            id: string
            partNumber: string
            description: string | null
            vehicleProgram: string | null
        }
    }

    requestedBy: {
        id: string
        name: string
        email: string
    } | null

    assignedTo: {
        id: string
        name: string
        email: string
    } | null

    reviewedBy: {
        id: string
        name: string
        email: string
    } | null
}

type LogisticsResponse = {
    data: LogisticsRequest[]
    stats: {
        total: number
        pending: number
        inReview: number
        approved: number
        rejected: number
        canceled: number
    }
    pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
}

type ActionMode = "APPROVE" | "REJECT"

type CurrentUser = {
    id: string
    name: string
    email: string
    permissions?: string[]
    roles?: {
        id?: string
        name: string
    }[]
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
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{
                backgroundColor,
                color,
                borderColor: borderColor || backgroundColor,
            }}
        >
            {children}
        </span>
    )
}

function getStatusPill(status: LogisticsRequestStatus) {
    switch (status) {
        case "PENDING":
            return (
                <Pill backgroundColor="#eab308" color="#000000">
                    Pendente
                </Pill>
            )

        case "IN_REVIEW":
            return (
                <Pill backgroundColor="#2563eb">
                    Em análise
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

function getTypeLabel(type: LogisticsRequestType) {
    if (type === "BUFFER_CALCULATION") {
        return "Cálculo de buffer"
    }

    return "Inclusão no book da logística"
}

function getPriorityLabel(priority: LogisticsPriority) {
    switch (priority) {
        case "LOW":
            return "Baixa"
        case "MEDIUM":
            return "Média"
        case "HIGH":
            return "Alta"
        case "CRITICAL":
            return "Crítica"
        default:
            return priority
    }
}

function getTabLabel(tab: LogisticsTab) {
    switch (tab) {
        case "pending":
            return "Pendentes"
        case "in_review":
            return "Em análise"
        case "mine":
            return "Minhas"
        case "responded":
            return "Respondidas"
        case "all":
            return "Todas"
        default:
            return tab
    }
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

async function readJsonResponse(res: Response) {
    const text = await res.text()

    if (!text) {
        return null
    }

    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

export default function LogisticsPage() {
    const [requests, setRequests] = useState<LogisticsRequest[]>([])
    const [user, setUser] = useState<CurrentUser | null>(null)
    const [stats, setStats] =
        useState<LogisticsResponse["stats"]>({
            total: 0,
            pending: 0,
            inReview: 0,
            approved: 0,
            rejected: 0,
            canceled: 0,
        })

    const [pagination, setPagination] =
        useState<LogisticsResponse["pagination"]>({
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 1,
        })

    const [activeTab, setActiveTab] =
        useState<LogisticsTab>("pending")

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [priorityFilter, setPriorityFilter] = useState("all")

    const [selectedRequest, setSelectedRequest] =
        useState<LogisticsRequest | null>(null)

    const [detailRequest, setDetailRequest] =
        useState<LogisticsRequest | null>(null)

    const [actionMode, setActionMode] =
        useState<ActionMode | null>(null)

    const [responseNotes, setResponseNotes] = useState("")
    const [rejectionReason, setRejectionReason] = useState("")
    const [calculatedQuantity, setCalculatedQuantity] = useState("")
    const [cutoffDate, setCutoffDate] = useState("")
    const [cutoffReference, setCutoffReference] = useState("")


    async function loadCurrentUser() {
        try {
            const res = await fetch("/api/auth/me", {
                credentials: "include",
            })

            const data = await readJsonResponse(res)

            if (!res.ok) {
                setUser(null)
                return
            }

            setUser(data.user || data)
        } catch (error) {
            console.error(error)
            setUser(null)
        }
    }

    function userHasPermission(permission: string) {
        if (!user) return false

        const hasDirectPermission =
            user.permissions?.includes(permission)

        const hasRolePermission =
            user.roles?.some((role: any) => {
                if (typeof role === "string") {
                    return role === permission
                }

                return role.name === permission
            })

        return Boolean(hasDirectPermission || hasRolePermission)
    }

    function canRespondLogisticsRequests() {
        return userHasPermission("LOGISTICS_ANALYST")
    }

    async function loadRequests(
        page = pagination.page,
        tab = activeTab
    ) {
        try {
            setLoading(true)

            const params = new URLSearchParams()

            params.set("page", String(page))
            params.set("pageSize", String(pagination.pageSize))

            if (search.trim()) {
                params.set("search", search.trim())
            }

            if (typeFilter !== "all") {
                params.set("type", typeFilter)
            }

            if (tab === "pending") {
                params.set("status", "PENDING")
            }

            if (tab === "in_review") {
                params.set("status", "IN_REVIEW")
            }

            if (tab === "mine") {
                params.set("onlyMine", "true")
            }

            if (tab === "responded") {
                params.set("onlyPending", "false")
            }

            const res = await fetch(
                `/api/logistics/requests?${params.toString()}`,
                {
                    credentials: "include",
                }
            )

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "Erro ao carregar solicitações logísticas"
                )
            }

            let nextRequests: LogisticsRequest[] = data.data || []

            if (tab === "responded") {
                nextRequests = nextRequests.filter((request) =>
                    [
                        "APPROVED",
                        "REJECTED",
                        "CANCELED",
                    ].includes(request.status)
                )
            }

            if (priorityFilter !== "all") {
                nextRequests = nextRequests.filter(
                    (request) =>
                        request.priority === priorityFilter
                )
            }

            setRequests(nextRequests)
            setStats(data.stats)
            setPagination(data.pagination)
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar solicitações logísticas"
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadRequests(1, "pending")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function resetActionForm() {
        setResponseNotes("")
        setRejectionReason("")
        setCalculatedQuantity("")
        setCutoffDate("")
        setCutoffReference("")
    }

    function handleTabChange(tab: LogisticsTab) {
        setActiveTab(tab)
        loadRequests(1, tab)
    }

    async function handleAccept(request: LogisticsRequest) {
        try {
            setSaving(true)

            const res = await fetch(
                `/api/logistics/requests/${request.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        action: "ACCEPT",
                    }),
                }
            )

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "Erro ao assumir solicitação logística"
                )
            }

            toast.success("Solicitação assumida com sucesso")
            await loadRequests()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao assumir solicitação logística"
            )
        } finally {
            setSaving(false)
        }
    }

    function openActionDialog(
        request: LogisticsRequest,
        mode: ActionMode
    ) {
        setSelectedRequest(request)
        setActionMode(mode)
        resetActionForm()

        setCutoffReference(request.cutoffReference || "")
        setCutoffDate(
            request.cutoffDate
                ? request.cutoffDate.slice(0, 10)
                : ""
        )
    }

    async function handleSubmitAction() {
        if (!selectedRequest || !actionMode) return

        if (
            actionMode === "APPROVE" &&
            selectedRequest.type === "BOOK_INCLUSION" &&
            !responseNotes.trim()
        ) {
            toast.error(
                "Informe a resposta da logística para aprovar a solicitação"
            )
            return
        }

        if (
            actionMode === "APPROVE" &&
            selectedRequest.type === "BUFFER_CALCULATION" &&
            !calculatedQuantity
        ) {
            toast.error(
                "Informe a quantidade calculada para concluir o cálculo de buffer"
            )
            return
        }

        if (
            actionMode === "REJECT" &&
            !rejectionReason.trim()
        ) {
            toast.error("Informe o motivo da recusa")
            return
        }

        try {
            setSaving(true)

            const payload =
                actionMode === "APPROVE"
                    ? {
                        action: "APPROVE",
                        responseNotes:
                            responseNotes.trim() || null,
                        calculatedQuantity:
                            calculatedQuantity !== ""
                                ? Number(calculatedQuantity)
                                : null,
                        cutoffDate: cutoffDate || null,
                        cutoffReference:
                            cutoffReference.trim() || null,
                    }
                    : {
                        action: "REJECT",
                        rejectionReason:
                            rejectionReason.trim(),
                        responseNotes:
                            responseNotes.trim() || null,
                    }

            const res = await fetch(
                `/api/logistics/requests/${selectedRequest.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify(payload),
                }
            )

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                    "Erro ao atualizar solicitação logística"
                )
            }

            toast.success(
                actionMode === "APPROVE"
                    ? "Solicitação aprovada/respondida com sucesso"
                    : "Solicitação recusada com sucesso"
            )

            setSelectedRequest(null)
            setActionMode(null)
            resetActionForm()
            await loadRequests()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao atualizar solicitação logística"
            )
        } finally {
            setSaving(false)
        }
    }

    function clearFilters() {
        setSearch("")
        setTypeFilter("all")
        setPriorityFilter("all")
        setActiveTab("pending")

        setTimeout(() => {
            loadRequests(1, "pending")
        }, 0)
    }

    const tabs: {
        value: LogisticsTab
        label: string
        count?: number
    }[] = [
            {
                value: "pending",
                label: "Pendentes",
                count: stats.pending,
            },
            {
                value: "in_review",
                label: "Em análise",
                count: stats.inReview,
            },
            {
                value: "mine",
                label: "Minhas",
            },
            {
                value: "responded",
                label: "Respondidas",
                count:
                    stats.approved +
                    stats.rejected +
                    stats.canceled,
            },
            {
                value: "all",
                label: "Todas",
                count: stats.total,
            },
        ]

    return (
        <ProtectedRoute permission="LOGISTICS_REQUEST_REVIEW">
            <SidebarProvider
                style={
                    {
                        "--sidebar-width": "calc(var(--spacing) * 72)",
                        "--header-height":
                            "calc(var(--spacing) * 12)",
                    } as React.CSSProperties
                }
            >
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                Logística
                            </h1>

                            <p className="text-sm text-muted-foreground">
                                Painel para assumir, responder e
                                acompanhar solicitações logísticas do
                                time de Risk.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>
                                        Pendentes
                                    </CardDescription>
                                    <CardTitle>
                                        {stats.pending}
                                    </CardTitle>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>
                                        Em análise
                                    </CardDescription>
                                    <CardTitle>
                                        {stats.inReview}
                                    </CardTitle>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>
                                        Aprovadas
                                    </CardDescription>
                                    <CardTitle>
                                        {stats.approved}
                                    </CardTitle>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>
                                        Recusadas
                                    </CardDescription>
                                    <CardTitle>
                                        {stats.rejected}
                                    </CardTitle>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>
                                        Total
                                    </CardDescription>
                                    <CardTitle>
                                        {stats.total}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Filtros e visualização
                                </CardTitle>
                                <CardDescription>
                                    Use as abas para alternar entre
                                    pendências, histórico e solicitações
                                    atribuídas a você.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-5">
                                <div className="flex flex-wrap gap-2">
                                    {tabs.map((tab) => (
                                        <Button
                                            key={tab.value}
                                            type="button"
                                            variant={
                                                activeTab === tab.value
                                                    ? "default"
                                                    : "outline"
                                            }
                                            onClick={() =>
                                                handleTabChange(
                                                    tab.value
                                                )
                                            }
                                        >
                                            {tab.label}
                                            {tab.count !== undefined
                                                ? ` (${tab.count})`
                                                : ""}
                                        </Button>
                                    ))}
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>Busca</Label>
                                        <Input
                                            value={search}
                                            onChange={(e) =>
                                                setSearch(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="RM, PN, fornecedor..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <Select
                                            value={typeFilter}
                                            onValueChange={
                                                setTypeFilter
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todos
                                                </SelectItem>
                                                <SelectItem value="BOOK_INCLUSION">
                                                    Inclusão no book
                                                </SelectItem>
                                                <SelectItem value="BUFFER_CALCULATION">
                                                    Cálculo de buffer
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Prioridade</Label>
                                        <Select
                                            value={priorityFilter}
                                            onValueChange={
                                                setPriorityFilter
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todas
                                                </SelectItem>
                                                <SelectItem value="LOW">
                                                    Baixa
                                                </SelectItem>
                                                <SelectItem value="MEDIUM">
                                                    Média
                                                </SelectItem>
                                                <SelectItem value="HIGH">
                                                    Alta
                                                </SelectItem>
                                                <SelectItem value="CRITICAL">
                                                    Crítica
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            loadRequests(1)
                                        }
                                        disabled={loading}
                                    >
                                        Aplicar filtros
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={clearFilters}
                                        disabled={loading}
                                    >
                                        Limpar filtros
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {getTabLabel(activeTab)}
                                </CardTitle>
                                <CardDescription>
                                    Solicitações logísticas filtradas
                                    conforme a aba selecionada.
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                {loading ? (
                                    <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                                        Carregando solicitações...
                                    </div>
                                ) : requests.length === 0 ? (
                                    <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                                        Nenhuma solicitação encontrada.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[1150px] text-sm">
                                            <thead>
                                                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                                                    <th className="px-3 py-3">
                                                        Solicitação
                                                    </th>
                                                    <th className="px-3 py-3">
                                                        RM / PN
                                                    </th>
                                                    <th className="px-3 py-3">
                                                        Tipo
                                                    </th>
                                                    <th className="px-3 py-3">
                                                        Status
                                                    </th>
                                                    <th className="px-3 py-3">
                                                        Solicitante
                                                    </th>
                                                    <th className="px-3 py-3">
                                                        Responsável
                                                    </th>
                                                    <th className="px-3 py-3">
                                                        Pendente
                                                    </th>
                                                    <th className="px-3 py-3 text-right">
                                                        Ações
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {requests.map(
                                                    (request) => (
                                                        <tr
                                                            key={
                                                                request.id
                                                            }
                                                            className="border-b align-top last:border-0"
                                                        >
                                                            <td className="px-3 py-4">
                                                                <div className="space-y-1">
                                                                    <p className="font-medium">
                                                                        {
                                                                            request.code
                                                                        }
                                                                    </p>

                                                                    <p className="text-xs text-muted-foreground">
                                                                        Prioridade:{" "}
                                                                        {getPriorityLabel(
                                                                            request.priority
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </td>

                                                            <td className="px-3 py-4">
                                                                <div className="space-y-1">
                                                                    <Button
                                                                        asChild
                                                                        variant="link"
                                                                        className="h-auto p-0 font-medium"
                                                                    >
                                                                        <Link
                                                                            href={`/rms/${request.riskEvent.id}`}
                                                                        >
                                                                            {
                                                                                request
                                                                                    .riskEvent
                                                                                    .code
                                                                            }
                                                                        </Link>
                                                                    </Button>

                                                                    <p>
                                                                        {
                                                                            request
                                                                                .riskEventPart
                                                                                .partNumber
                                                                                .partNumber
                                                                        }
                                                                    </p>

                                                                    <p className="max-w-[260px] text-xs text-muted-foreground">
                                                                        {request
                                                                            .riskEventPart
                                                                            .partNumber
                                                                            .description ||
                                                                            "Sem descrição"}
                                                                    </p>

                                                                    <p className="text-xs text-muted-foreground">
                                                                        {
                                                                            request
                                                                                .riskEvent
                                                                                .supplier
                                                                                .name
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </td>

                                                            <td className="px-3 py-4">
                                                                {getTypeLabel(
                                                                    request.type
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-4">
                                                                {getStatusPill(
                                                                    request.status
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-4">
                                                                <div>
                                                                    <p>
                                                                        {request
                                                                            .requestedBy
                                                                            ?.name ||
                                                                            "-"}
                                                                    </p>

                                                                    <p className="text-xs text-muted-foreground">
                                                                        {formatDate(
                                                                            request.requestedAt
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </td>

                                                            <td className="px-3 py-4">
                                                                {request
                                                                    .assignedTo
                                                                    ?.name ||
                                                                    "-"}
                                                            </td>

                                                            <td className="px-3 py-4">
                                                                {request.status ===
                                                                    "PENDING" ||
                                                                    request.status ===
                                                                    "IN_REVIEW"
                                                                    ? `${request.pendingDays} dia(s)`
                                                                    : "-"}
                                                            </td>

                                                            <td className="px-3 py-4">
                                                                <div className="flex flex-wrap justify-end gap-2">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            setDetailRequest(
                                                                                request
                                                                            )
                                                                        }
                                                                    >
                                                                        Detalhes
                                                                    </Button>

                                                                    {canRespondLogisticsRequests() &&
                                                                        request.status === "PENDING" && (
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant="outline"
                                                                                disabled={saving}
                                                                                onClick={() => handleAccept(request)}
                                                                            >
                                                                                Assumir
                                                                            </Button>
                                                                        )}

                                                                    {canRespondLogisticsRequests() &&
                                                                        (request.status === "PENDING" ||
                                                                            request.status === "IN_REVIEW") && (
                                                                            <>
                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    disabled={saving}
                                                                                    onClick={() =>
                                                                                        openActionDialog(
                                                                                            request,
                                                                                            "APPROVE"
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    Aprovar
                                                                                </Button>

                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    variant="destructive"
                                                                                    disabled={saving}
                                                                                    onClick={() =>
                                                                                        openActionDialog(
                                                                                            request,
                                                                                            "REJECT"
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    Recusar
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                                    <p>
                                        Página {pagination.page} de{" "}
                                        {pagination.totalPages} —{" "}
                                        {pagination.total} solicitação(ões)
                                    </p>

                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                                loading ||
                                                pagination.page <= 1
                                            }
                                            onClick={() =>
                                                loadRequests(
                                                    pagination.page - 1
                                                )
                                            }
                                        >
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
                                                loadRequests(
                                                    pagination.page + 1
                                                )
                                            }
                                        >
                                            Próxima
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </main>
                </SidebarInset>
            </SidebarProvider>

            <Dialog
                open={Boolean(selectedRequest && actionMode)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedRequest(null)
                        setActionMode(null)
                        resetActionForm()
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {actionMode === "APPROVE"
                                ? "Aprovar solicitação logística"
                                : "Recusar solicitação logística"}
                        </DialogTitle>

                        <DialogDescription>
                            {selectedRequest
                                ? `${selectedRequest.code} — ${selectedRequest.riskEventPart.partNumber.partNumber}`
                                : "Informe os dados da análise logística."}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="rounded-lg border p-3 text-sm">
                                <p>
                                    <span className="text-muted-foreground">
                                        RM:
                                    </span>{" "}
                                    {selectedRequest.riskEvent.code}
                                </p>

                                <p>
                                    <span className="text-muted-foreground">
                                        Tipo:
                                    </span>{" "}
                                    {getTypeLabel(selectedRequest.type)}
                                </p>

                                <p>
                                    <span className="text-muted-foreground">
                                        Orientação do Risk:
                                    </span>{" "}
                                    {selectedRequest.requestNotes || "-"}
                                </p>

                                {selectedRequest.coverageStartDate ||
                                    selectedRequest.coverageEndDate ? (
                                    <p>
                                        <span className="text-muted-foreground">
                                            Cobertura:
                                        </span>{" "}
                                        {formatDate(
                                            selectedRequest.coverageStartDate
                                        )}{" "}
                                        até{" "}
                                        {formatDate(
                                            selectedRequest.coverageEndDate
                                        )}
                                    </p>
                                ) : null}
                            </div>

                            {actionMode === "APPROVE" &&
                                selectedRequest.type ===
                                "BUFFER_CALCULATION" && (
                                    <div className="space-y-2">
                                        <Label>
                                            Quantidade calculada
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={
                                                calculatedQuantity
                                            }
                                            onChange={(e) =>
                                                setCalculatedQuantity(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Ex.: 320"
                                        />
                                    </div>
                                )}

                            {actionMode === "APPROVE" && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>
                                            Data ponto de corte
                                        </Label>
                                        <Input
                                            type="date"
                                            value={cutoffDate}
                                            onChange={(e) =>
                                                setCutoffDate(
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>
                                            Ponto de corte /
                                            rastreabilidade
                                        </Label>
                                        <Input
                                            value={cutoffReference}
                                            onChange={(e) =>
                                                setCutoffReference(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="NF, data, lote, saldo SAP..."
                                        />
                                    </div>
                                </div>
                            )}

                            {actionMode === "REJECT" && (
                                <div className="space-y-2">
                                    <Label>Motivo da recusa</Label>
                                    <Textarea
                                        value={rejectionReason}
                                        onChange={(e) =>
                                            setRejectionReason(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Explique o motivo da recusa..."
                                        rows={3}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>
                                    {actionMode === "APPROVE"
                                        ? "Resposta da Logística"
                                        : "Observação adicional"}
                                </Label>
                                <Textarea
                                    value={responseNotes}
                                    onChange={(e) =>
                                        setResponseNotes(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Informe a resposta para o solicitante..."
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setSelectedRequest(null)
                                setActionMode(null)
                                resetActionForm()
                            }}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="button"
                            variant={
                                actionMode === "REJECT"
                                    ? "destructive"
                                    : "default"
                            }
                            onClick={handleSubmitAction}
                            disabled={saving}
                        >
                            {saving
                                ? "Salvando..."
                                : actionMode === "APPROVE"
                                    ? "Aprovar"
                                    : "Recusar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(detailRequest)}
                onOpenChange={(open) => {
                    if (!open) {
                        setDetailRequest(null)
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            Detalhes da solicitação
                        </DialogTitle>

                        <DialogDescription>
                            {detailRequest
                                ? `${detailRequest.code} — ${getTypeLabel(detailRequest.type)}`
                                : "Visualize os dados completos da solicitação logística."}
                        </DialogDescription>
                    </DialogHeader>

                    {detailRequest && (
                        <div className="space-y-4 text-sm">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-lg border p-3">
                                    <p className="mb-2 font-medium">
                                        Dados principais
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Código:
                                        </span>{" "}
                                        {detailRequest.code}
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Status:
                                        </span>{" "}
                                        {detailRequest.status}
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Prioridade:
                                        </span>{" "}
                                        {getPriorityLabel(
                                            detailRequest.priority
                                        )}
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Solicitado em:
                                        </span>{" "}
                                        {formatDate(
                                            detailRequest.requestedAt
                                        )}
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Pendente há:
                                        </span>{" "}
                                        {detailRequest.status ===
                                            "PENDING" ||
                                            detailRequest.status ===
                                            "IN_REVIEW"
                                            ? `${detailRequest.pendingDays} dia(s)`
                                            : "-"}
                                    </p>
                                </div>

                                <div className="rounded-lg border p-3">
                                    <p className="mb-2 font-medium">
                                        RM e PN
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            RM:
                                        </span>{" "}
                                        {detailRequest.riskEvent.code}
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Fornecedor:
                                        </span>{" "}
                                        {
                                            detailRequest.riskEvent
                                                .supplier.name
                                        }
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            PN:
                                        </span>{" "}
                                        {
                                            detailRequest.riskEventPart
                                                .partNumber.partNumber
                                        }
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Descrição:
                                        </span>{" "}
                                        {detailRequest.riskEventPart
                                            .partNumber.description ||
                                            "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-lg border p-3">
                                    <p className="mb-2 font-medium">
                                        Solicitante
                                    </p>
                                    <p>
                                        {detailRequest.requestedBy
                                            ?.name || "-"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {detailRequest.requestedBy
                                            ?.email || "-"}
                                    </p>
                                </div>

                                <div className="rounded-lg border p-3">
                                    <p className="mb-2 font-medium">
                                        Responsável logística
                                    </p>
                                    <p>
                                        {detailRequest.assignedTo
                                            ?.name || "-"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {detailRequest.assignedTo
                                            ?.email || "-"}
                                    </p>
                                </div>

                                <div className="rounded-lg border p-3">
                                    <p className="mb-2 font-medium">
                                        Revisor
                                    </p>
                                    <p>
                                        {detailRequest.reviewedBy
                                            ?.name || "-"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {detailRequest.reviewedBy
                                            ?.email || "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border p-3">
                                <p className="mb-2 font-medium">
                                    Orientação do Risk
                                </p>
                                <p className="whitespace-pre-wrap">
                                    {detailRequest.requestNotes || "-"}
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-lg border p-3">
                                    <p className="mb-2 font-medium">
                                        Buffer / cobertura
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Quantidade solicitada:
                                        </span>{" "}
                                        {detailRequest.requestedQuantity ??
                                            "-"}
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Quantidade calculada:
                                        </span>{" "}
                                        {detailRequest.calculatedQuantity ??
                                            "-"}
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Cobertura:
                                        </span>{" "}
                                        {formatDate(
                                            detailRequest.coverageStartDate
                                        )}{" "}
                                        até{" "}
                                        {formatDate(
                                            detailRequest.coverageEndDate
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-lg border p-3">
                                    <p className="mb-2 font-medium">
                                        Ponto de corte
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Referência:
                                        </span>{" "}
                                        {detailRequest.cutoffReference ||
                                            "-"}
                                    </p>

                                    <p>
                                        <span className="text-muted-foreground">
                                            Data:
                                        </span>{" "}
                                        {formatDate(
                                            detailRequest.cutoffDate
                                        )}
                                    </p>
                                </div>
                            </div>

                            {(detailRequest.oldPartNumber ||
                                detailRequest.newPartNumber ||
                                detailRequest.replacementReason) && (
                                    <div className="rounded-lg border p-3">
                                        <p className="mb-2 font-medium">
                                            Troca de PN
                                        </p>

                                        <p>
                                            <span className="text-muted-foreground">
                                                PN antigo:
                                            </span>{" "}
                                            {detailRequest.oldPartNumber ||
                                                "-"}
                                        </p>

                                        <p>
                                            <span className="text-muted-foreground">
                                                PN novo:
                                            </span>{" "}
                                            {detailRequest.newPartNumber ||
                                                "-"}
                                        </p>

                                        <p>
                                            <span className="text-muted-foreground">
                                                Motivo:
                                            </span>{" "}
                                            {detailRequest.replacementReason ||
                                                "-"}
                                        </p>
                                    </div>
                                )}

                            {detailRequest.responseNotes && (
                                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                                    <p className="mb-2 font-medium text-green-700">
                                        Resposta da Logística
                                    </p>
                                    <p className="whitespace-pre-wrap text-green-800">
                                        {detailRequest.responseNotes}
                                    </p>
                                </div>
                            )}

                            {detailRequest.rejectionReason && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                    <p className="mb-2 font-medium text-red-700">
                                        Motivo da recusa
                                    </p>
                                    <p className="whitespace-pre-wrap text-red-800">
                                        {detailRequest.rejectionReason}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDetailRequest(null)}
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ProtectedRoute>
    )
}