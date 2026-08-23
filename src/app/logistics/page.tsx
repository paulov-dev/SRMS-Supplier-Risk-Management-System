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

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [typeFilter, setTypeFilter] = useState("all")
    const [onlyPending, setOnlyPending] = useState(true)
    const [onlyMine, setOnlyMine] = useState(false)

    const [selectedRequest, setSelectedRequest] =
        useState<LogisticsRequest | null>(null)

    const [actionMode, setActionMode] =
        useState<ActionMode | null>(null)

    const [responseNotes, setResponseNotes] = useState("")
    const [rejectionReason, setRejectionReason] = useState("")
    const [calculatedQuantity, setCalculatedQuantity] = useState("")
    const [cutoffDate, setCutoffDate] = useState("")
    const [cutoffReference, setCutoffReference] = useState("")

    async function loadRequests(page = pagination.page) {
        try {
            setLoading(true)

            const params = new URLSearchParams()

            params.set("page", String(page))
            params.set("pageSize", String(pagination.pageSize))

            if (search.trim()) {
                params.set("search", search.trim())
            }

            if (statusFilter !== "all") {
                params.set("status", statusFilter)
            }

            if (typeFilter !== "all") {
                params.set("type", typeFilter)
            }

            if (onlyPending) {
                params.set("onlyPending", "true")
            }

            if (onlyMine) {
                params.set("onlyMine", "true")
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

            setRequests(data.data || [])
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
        loadRequests(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function resetActionForm() {
        setResponseNotes("")
        setRejectionReason("")
        setCalculatedQuantity("")
        setCutoffDate("")
        setCutoffReference("")
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
        setStatusFilter("all")
        setTypeFilter("all")
        setOnlyPending(true)
        setOnlyMine(false)

        setTimeout(() => {
            loadRequests(1)
        }, 0)
    }

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
                                Analise, assuma e responda as
                                solicitações logísticas abertas pelo time
                                de Risk.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Filtros</CardTitle>
                                <CardDescription>
                                    Filtre por RM, PN, fornecedor, status
                                    ou tipo de solicitação.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                                        <Label>Status</Label>
                                        <Select
                                            value={statusFilter}
                                            onValueChange={
                                                setStatusFilter
                                            }
                                            disabled={onlyPending}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todos
                                                </SelectItem>
                                                <SelectItem value="PENDING">
                                                    Pendente
                                                </SelectItem>
                                                <SelectItem value="IN_REVIEW">
                                                    Em análise
                                                </SelectItem>
                                                <SelectItem value="APPROVED">
                                                    Aprovada
                                                </SelectItem>
                                                <SelectItem value="REJECTED">
                                                    Recusada
                                                </SelectItem>
                                                <SelectItem value="CANCELED">
                                                    Cancelada
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                        <Label>Atalhos</Label>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant={
                                                    onlyPending
                                                        ? "default"
                                                        : "outline"
                                                }
                                                onClick={() =>
                                                    setOnlyPending(
                                                        (prev) =>
                                                            !prev
                                                    )
                                                }
                                            >
                                                Pendentes
                                            </Button>

                                            <Button
                                                type="button"
                                                variant={
                                                    onlyMine
                                                        ? "default"
                                                        : "outline"
                                                }
                                                onClick={() =>
                                                    setOnlyMine(
                                                        (prev) =>
                                                            !prev
                                                    )
                                                }
                                            >
                                                Minhas
                                            </Button>
                                        </div>
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
                                    Solicitações logísticas
                                </CardTitle>
                                <CardDescription>
                                    Pendências enviadas pelo time de
                                    Risk para análise da Logística.
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
                                        <table className="w-full min-w-[1100px] text-sm">
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
                                                                    {request.status ===
                                                                        "PENDING" && (
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            disabled={
                                                                                saving
                                                                            }
                                                                            onClick={() =>
                                                                                handleAccept(
                                                                                    request
                                                                                )
                                                                            }
                                                                        >
                                                                            Assumir
                                                                        </Button>
                                                                    )}

                                                                    {(request.status ===
                                                                        "PENDING" ||
                                                                        request.status ===
                                                                            "IN_REVIEW") && (
                                                                        <>
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                disabled={
                                                                                    saving
                                                                                }
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
                                                                                disabled={
                                                                                    saving
                                                                                }
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
        </ProtectedRoute>
    )
}