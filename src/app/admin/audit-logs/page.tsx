"use client"

import { useEffect, useState } from "react"

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Eye,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { toast } from "sonner"

type AuditUser = {
  id: string
  name: string
  email: string
}

type AuditLog = {
  id: string
  entityType: string
  entityId: string
  action: string
  oldValue: unknown
  newValue: unknown
  ipAddress: string | null
  createdAt: string
  user: AuditUser
}

type FiltersResponse = {
  users: AuditUser[]
  actions: string[]
  entityTypes: string[]
}

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type FilterState = {
  userId: string
  action: string
  entityType: string
  entityId: string
  dateFrom: string
  dateTo: string
}

const initialFilters: FilterState = {
  userId: "all",
  action: "all",
  entityType: "all",
  entityId: "",
  dateFrom: "",
  dateTo: "",
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [users, setUsers] = useState<AuditUser[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [entityTypes, setEntityTypes] = useState<string[]>([])

  const [filters, setFilters] =
    useState<FilterState>(initialFilters)

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    })

  const [loading, setLoading] = useState(true)
  const [loadingFilters, setLoadingFilters] =
    useState(true)

  const [selectedLog, setSelectedLog] =
    useState<AuditLog | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    await Promise.all([
      loadFilters(),
      loadLogs(1, initialFilters),
    ])
  }

  async function loadFilters() {
    try {
      setLoadingFilters(true)

      const res = await fetch("/api/audit-logs/filters", {
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error || "Erro ao carregar filtros"
        )
      }

      const response = data as FiltersResponse

      setUsers(response.users)
      setActions(response.actions)
      setEntityTypes(response.entityTypes)
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar filtros"
      )
    } finally {
      setLoadingFilters(false)
    }
  }

  function buildSearchParams(
    page: number,
    currentFilters: FilterState
  ) {
    const params = new URLSearchParams()

    params.set("page", String(page))
    params.set("pageSize", String(pagination.pageSize))

    if (currentFilters.userId !== "all") {
      params.set("userId", currentFilters.userId)
    }

    if (currentFilters.action !== "all") {
      params.set("action", currentFilters.action)
    }

    if (currentFilters.entityType !== "all") {
      params.set("entityType", currentFilters.entityType)
    }

    if (currentFilters.entityId.trim()) {
      params.set(
        "entityId",
        currentFilters.entityId.trim()
      )
    }

    if (currentFilters.dateFrom) {
      params.set("dateFrom", currentFilters.dateFrom)
    }

    if (currentFilters.dateTo) {
      params.set("dateTo", currentFilters.dateTo)
    }

    return params
  }

  async function loadLogs(
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
        `/api/audit-logs?${params.toString()}`,
        {
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error || "Erro ao carregar audit logs"
        )
      }

      setLogs(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar audit logs"
      )
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    loadLogs(1, filters)
  }

  function resetFilters() {
    setFilters(initialFilters)
    loadLogs(1, initialFilters)
  }

  function goToPage(page: number) {
    if (page < 1 || page > pagination.totalPages) {
      return
    }

    loadLogs(page, filters)
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  }

  function formatJson(value: unknown) {
    if (!value) {
      return "Sem dados"
    }

    return JSON.stringify(value, null, 2)
  }

  function getActionBadge(action: string) {
    switch (action) {
      case "CREATE":
        return (
          <Badge variant="default">
            CREATE
          </Badge>
        )

      case "UPDATE":
        return (
          <Badge variant="outline">
            UPDATE
          </Badge>
        )

      case "DELETE":
        return (
          <Badge variant="destructive">
            DELETE
          </Badge>
        )   

      case "STATUS_CHANGE":
        return (
          <Badge className="bg-yellow-500 text-black">
            STATUS_CHANGE
          </Badge>
        )

      case "ROLE_ASSIGN":
      case "PERMISSION_ASSIGN":
        return (
          <Badge className="bg-purple-600">
            {action}
          </Badge>
        )

      default:
        return (
          <Badge variant="outline">
            {action}
          </Badge>
        )
    }
  }

  const createCount = logs.filter(
    (log) => log.action === "CREATE"
  ).length

  const updateCount = logs.filter(
    (log) => log.action === "UPDATE"
  ).length

  const deleteCount = logs.filter(
    (log) => log.action === "DELETE"
  ).length

  return (
    <ProtectedRoute permission="AUDIT_LOG_VIEW">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">
                  Audit Logs
                </h1>

                <p className="text-sm text-muted-foreground">
                  Visualize alterações realizadas no sistema com filtros por usuário,
                  ação, entidade e período.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => loadLogs(pagination.page, filters)}
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

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total filtrado
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {pagination.total}
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
                        Creates na página
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {createCount}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Updates na página
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {updateCount}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <Filter className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Deletes na página
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {deleteCount}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
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
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Usuário</Label>

                    <Select
                      value={filters.userId}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          userId: value,
                        }))
                      }
                      disabled={loadingFilters}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os usuários" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">
                          Todos os usuários
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

                  <div className="space-y-2">
                    <Label>Ação</Label>

                    <Select
                      value={filters.action}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          action: value,
                        }))
                      }
                      disabled={loadingFilters}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as ações" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">
                          Todas as ações
                        </SelectItem>

                        {actions.map((action) => (
                          <SelectItem
                            key={action}
                            value={action}
                          >
                            {action}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Entidade</Label>

                    <Select
                      value={filters.entityType}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          entityType: value,
                        }))
                      }
                      disabled={loadingFilters}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as entidades" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">
                          Todas as entidades
                        </SelectItem>

                        {entityTypes.map((entityType) => (
                          <SelectItem
                            key={entityType}
                            value={entityType}
                          >
                            {entityType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>ID da entidade</Label>

                    <Input
                      placeholder="Buscar por entityId..."
                      value={filters.entityId}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          entityId: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data inicial</Label>

                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data final</Label>

                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value,
                        }))
                      }
                    />
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
                    Aplicar Filtros
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetFilters}
                    disabled={loading}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Registros de Auditoria
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left font-medium">
                          Data/Hora
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Usuário
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Ação
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Entidade
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Entity ID
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          IP
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          Detalhes
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-muted-foreground"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Carregando logs...
                            </div>
                          </td>
                        </tr>
                      ) : logs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-muted-foreground"
                          >
                            Nenhum log encontrado para os filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr
                            key={log.id}
                            className="border-b last:border-0 hover:bg-muted/40"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatDate(log.createdAt)}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                  <UserRound className="h-4 w-4 text-muted-foreground" />
                                </div>

                                <div>
                                  <p className="font-medium">
                                    {log.user?.name || "Usuário desconhecido"}
                                  </p>

                                  <p className="text-xs text-muted-foreground">
                                    {log.user?.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {getActionBadge(log.action)}
                            </td>

                            <td className="px-4 py-3">
                              <Badge variant="outline">
                                {log.entityType}
                              </Badge>
                            </td>

                            <td className="px-4 py-3">
                              <span className="font-mono text-xs">
                                {log.entityId}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {log.ipAddress || "-"}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver
                              </Button>
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
                    {pagination.total} registros encontrados
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

          <Dialog
            open={!!selectedLog}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedLog(null)
              }
            }}
          >
            <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Detalhes do Audit Log
                </DialogTitle>

                <DialogDescription>
                  Visualize os dados anteriores e novos registrados nesta ação.
                </DialogDescription>
              </DialogHeader>

              {selectedLog && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Usuário
                        </p>

                        <p className="font-medium">
                          {selectedLog.user.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {selectedLog.user.email}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Data/Hora
                        </p>

                        <p className="font-medium">
                          {formatDate(selectedLog.createdAt)}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          IP: {selectedLog.ipAddress || "-"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Ação
                      </p>

                      {getActionBadge(selectedLog.action)}
                    </div>

                    <div>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Entidade
                      </p>

                      <Badge variant="outline">
                        {selectedLog.entityType}
                      </Badge>
                    </div>

                    <div>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Entity ID
                      </p>

                      <p className="font-mono text-xs break-all">
                        {selectedLog.entityId}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <p className="font-medium">
                        Valor anterior
                      </p>

                      <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted p-4 text-xs">
                        {formatJson(selectedLog.oldValue)}
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <p className="font-medium">
                        Novo valor
                      </p>

                      <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted p-4 text-xs">
                        {formatJson(selectedLog.newValue)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}