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

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function getFieldsObject(value: unknown) {
  if (!isRecord(value)) return null

  if (
    isRecord(value.fields)
  ) {
    return value.fields
  }

  return value
}

function getValueFromAuditObject(
  value: unknown,
  keys: string[]
) {
  const object = getFieldsObject(value)

  if (!object) return null

  for (const key of keys) {
    const item = object[key]

    if (
      item !== null &&
      item !== undefined &&
      item !== ""
    ) {
      return item
    }
  }

  return null
}

function getAuditActionLabel(action: string) {
  switch (action) {
    case "CREATE":
      return "Criado"

    case "UPDATE":
      return "Atualizado"

    case "DELETE":
      return "Excluído"

    case "STATUS_CHANGE":
      return "Status alterado"

    case "ROLE_ASSIGN":
      return "Cargo atribuído"

    case "PERMISSION_ASSIGN":
      return "Permissão atribuída"

    case "USER_UPDATE":
      return "Usuário atualizado"

    case "PASSWORD_CHANGE":
      return "Senha alterada"

    case "USER_STATUS_CHANGE":
      return "Status do usuário alterado"

    case "USER_BLOCK":
      return "Usuário bloqueado"

    case "USER_UNBLOCK":
      return "Usuário desbloqueado"

    case "USER_ROLE_ADD":
      return "Cargo adicionado"

    case "USER_ROLE_REMOVE":
      return "Cargo removido"

    case "RISK_EVENT_CREATE":
      return "RM criada"

    case "RISK_EVENT_UPDATE":
      return "RM atualizada"

    case "RISK_EVENT_RESPONSIBLE_UPDATE":
      return "Responsável da RM alterado"

    case "RISK_EVENT_WORKFLOW_UPDATE":
      return "Status da RM alterado"

    case "RISK_ACTION_PLAN_CREATE":
      return "Plano de ação criado"

    case "RISK_ACTION_PLAN_UPDATE":
      return "Plano de ação atualizado"

    case "RISK_ACTION_PLAN_COMPLETE":
      return "Plano de ação concluído"

    case "RISK_ACTION_PLAN_REOPEN":
      return "Plano de ação reaberto"

    case "RISK_ACTION_PLAN_DELETE":
      return "Plano de ação excluído"

    case "RISK_PART_CREATE":
      return "PN adicionado"

    case "RISK_PART_UPDATE":
      return "PN atualizado"

    case "RISK_PART_DELETE":
      return "PN removido"

    case "LOGISTICS_REQUEST_CREATE":
      return "Solicitação logística criada"

    case "LOGISTICS_REQUEST_APPROVE":
      return "Solicitação logística aprovada"

    case "LOGISTICS_REQUEST_REJECT":
      return "Solicitação logística recusada"

    default:
      return action
  }
}

function getEntityTypeLabel(entityType: string) {
  switch (entityType) {
    case "RiskEvent":
      return "RM"

    case "RiskEventPart":
      return "PN"

    case "RiskActionPlan":
      return "Plano de ação"

    case "LogisticsRequest":
      return "Logística"

    case "Supplier":
      return "Fornecedor"

    case "User":
      return "Usuário"

    case "Role":
      return "Cargo"

    case "Permission":
      return "Permissão"

    case "Notification":
      return "Notificação"

    default:
      return entityType
  }
}

function getFieldLabel(field: string) {
  switch (field) {
    case "id":
      return "ID"

    case "name":
      return "Nome"

    case "email":
      return "E-mail"

    case "photoUrl":
      return "Foto"

    case "isActive":
      return "Usuário ativo"

    case "password":
      return "Senha"

    case "roleIds":
      return "IDs dos cargos"

    case "roleNames":
      return "Cargos"

    case "addedRoleIds":
      return "IDs dos cargos adicionados"

    case "addedRoleNames":
      return "Cargos adicionados"

    case "removedRoleIds":
      return "IDs dos cargos removidos"

    case "removedRoleNames":
      return "Cargos removidos"

    case "title":
      return "Título"

    case "description":
      return "Descrição"

    case "riskCode":
      return "RM"

    case "code":
      return "Código"

    case "riskLevel":
      return "Farol"

    case "workflowStatus":
      return "Status da RM"

    case "assignedToId":
      return "ID do responsável"

    case "assignedToName":
      return "Responsável"

    case "assignedToEmail":
      return "E-mail do responsável"

    case "commodity":
      return "Commodity"

    case "openingReason":
      return "Motivo de abertura"

    case "partNumber":
      return "PN"

    case "partNumberId":
      return "ID do PN"

    case "riskEventId":
      return "ID da RM"

    case "actionPlanId":
      return "ID do plano de ação"

    case "riskEventPartId":
      return "ID do PN na RM"

    case "dueDate":
      return "Prazo"

    case "isCompleted":
      return "Concluído"

    case "completedAt":
      return "Data de conclusão"

    case "closedAt":
      return "Data de fechamento"

    case "closedById":
      return "Fechado por"

    case "reason":
      return "Motivo"

    case "changedFields":
      return "Campos alterados"

    case "changedByUser":
      return "Alterado por"

    case "deletedByUser":
      return "Excluído por"

    case "targetUser":
      return "Usuário alterado"

    case "userAgent":
      return "Navegador"

    default:
      return field
  }
}

function formatAuditValue(value: unknown): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-"
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não"
  }

  if (typeof value === "number") {
    return String(value)
  }

  if (typeof value === "string") {
    switch (value) {
      case "true":
        return "Sim"

      case "false":
        return "Não"

      case "OPEN":
        return "Aberta"

      case "CLOSED":
        return "Fechada"

      case "CANCELED":
        return "Cancelada"

      case "RED":
        return "Vermelho"

      case "YELLOW":
        return "Amarelo"

      case "GREEN":
        return "Verde"

      case "GREY":
        return "Cinza"

      case "ORANGE":
        return "Laranja"

      case "BLUE":
        return "Azul"

      case "TIER_2_CHANGE":
        return "Alteração Tier 2"

      case "PLANT_CHANGE":
        return "Alteração de planta"

      case "SUPPLIER_TRANSFER_PHASE_OUT":
        return "Transferência / Phase out de fornecedor"

      case "MANUFACTURING_PROCESS_CHANGE":
        return "Alteração de processo produtivo"

      case "UPDATED":
        return "Atualizada"

      case "********":
        return "Oculto"

      default:
        return value
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-"
    }

    return value
      .map((item) => formatAuditValue(item))
      .join(", ")
  }

  if (isRecord(value)) {
    const name = value.name
    const email = value.email

    if (
      typeof name === "string" &&
      typeof email === "string"
    ) {
      return `${name} — ${email}`
    }

    if (typeof name === "string") {
      return name
    }

    if (typeof email === "string") {
      return email
    }

    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function getFriendlyEntityLabel(log: AuditLog) {
  if (log.entityType === "RiskEvent") {
    const riskCode =
      getValueFromAuditObject(log.newValue, [
        "riskCode",
        "code",
      ]) ||
      getValueFromAuditObject(log.oldValue, [
        "riskCode",
        "code",
      ])

    if (riskCode) {
      return String(riskCode)
    }

    return "RM"
  }

  if (log.entityType === "RiskEventPart") {
    const partNumber =
      getValueFromAuditObject(log.newValue, [
        "partNumber",
      ]) ||
      getValueFromAuditObject(log.oldValue, [
        "partNumber",
      ])

    if (partNumber) {
      return `PN ${String(partNumber)}`
    }

    return "PN"
  }

  if (log.entityType === "RiskActionPlan") {
    const description =
      getValueFromAuditObject(log.newValue, [
        "description",
      ]) ||
      getValueFromAuditObject(log.oldValue, [
        "description",
      ])

    if (description) {
      return `Plano: ${String(description)}`
    }

    return "Plano de ação"
  }

  if (log.entityType === "User") {
    const userName =
      getValueFromAuditObject(log.newValue, [
        "name",
      ]) ||
      getValueFromAuditObject(log.oldValue, [
        "name",
      ])

    const userEmail =
      getValueFromAuditObject(log.newValue, [
        "email",
      ]) ||
      getValueFromAuditObject(log.oldValue, [
        "email",
      ])

    if (userName && userEmail) {
      return `${String(userName)} — ${String(userEmail)}`
    }

    if (userName) {
      return String(userName)
    }

    if (userEmail) {
      return String(userEmail)
    }

    return "Usuário"
  }

  if (log.entityType === "Supplier") {
    const supplierName =
      getValueFromAuditObject(log.newValue, [
        "name",
        "supplierName",
      ]) ||
      getValueFromAuditObject(log.oldValue, [
        "name",
        "supplierName",
      ])

    if (supplierName) {
      return String(supplierName)
    }

    return "Fornecedor"
  }

  return getEntityTypeLabel(log.entityType)
}

function getVisibleAuditObject(value: unknown) {
  const object = getFieldsObject(value)

  if (!object) return null

  const entries = Object.entries(object).filter(([key]) => {
    if (key === "id") return false
    if (key === "changedByUser") return false
    if (key === "deletedByUser") return false
    if (key === "targetUser") return false
    if (key === "userAgent") return false

    if (key === "roleIds" && object.roleNames) return false
    if (
      key === "addedRoleIds" &&
      object.addedRoleNames
    ) {
      return false
    }
    if (
      key === "removedRoleIds" &&
      object.removedRoleNames
    ) {
      return false
    }

    return true
  })

  return Object.fromEntries(entries)
}

function getComparableAuditObject(value: unknown) {
  const object = getFieldsObject(value)

  if (!object) return {}

  const entries = Object.entries(object).filter(([key]) => {
    if (key === "id") return false
    if (key === "changedByUser") return false
    if (key === "deletedByUser") return false
    if (key === "targetUser") return false
    if (key === "userAgent") return false

    if (key === "roleIds" && object.roleNames) return false
    if (key === "addedRoleIds" && object.addedRoleNames) return false
    if (key === "removedRoleIds" && object.removedRoleNames) return false

    return true
  })

  return Object.fromEntries(entries)
}

function AuditChangeList({
  oldValue,
  newValue,
}: {
  oldValue: unknown
  newValue: unknown
}) {
  const oldObject = getComparableAuditObject(oldValue)
  const newObject = getComparableAuditObject(newValue)

  const keys = Array.from(
    new Set([
      ...Object.keys(oldObject),
      ...Object.keys(newObject),
    ])
  )

  if (keys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum dado registrado.
      </p>
    )
  }

  return (
    <div className="max-h-[60vh] space-y-3 overflow-auto rounded-lg border bg-muted/30 p-2 sm:p-3">
      {keys.map((key) => {
        const previousValue = oldObject[key]
        const nextValue = newObject[key]

        return (
          <div
            key={key}
            className="rounded-md border bg-background p-3 sm:p-4"
          >
            <p className="mb-3 text-sm font-medium">
              {getFieldLabel(key)}
            </p>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="min-w-0 rounded-md border bg-muted/40 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Antes
                </p>

                <p className="whitespace-pre-wrap break-words text-sm">
                  {formatAuditValue(previousValue)}
                </p>
              </div>

              <div className="min-w-0 rounded-md border bg-muted/40 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Depois
                </p>

                <p className="whitespace-pre-wrap break-words text-sm">
                  {formatAuditValue(nextValue)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getActionBadge(action: string) {
  const label = getAuditActionLabel(action)

  return (
    <Badge variant="outline">
      {label}
    </Badge>
  )
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

  const createCount = logs.filter((log) =>
    log.action.includes("CREATE")
  ).length

  const updateCount = logs.filter(
    (log) =>
      log.action.includes("UPDATE") ||
      log.action.includes("CHANGE") ||
      log.action.includes("REOPEN") ||
      log.action.includes("COMPLETE")
  ).length

  const deleteCount = logs.filter(
    (log) =>
      log.action.includes("DELETE") ||
      log.action.includes("REMOVE") ||
      log.action.includes("BLOCK")
  ).length

  return (
    <ProtectedRoute permission="AUDIT_LOG_VIEW">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">
                  Audit Logs
                </h1>

                <p className="text-sm text-muted-foreground">
                  Visualize alterações realizadas no sistema
                  com filtros por usuário, ação, entidade e
                  período.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() =>
                  loadLogs(pagination.page, filters)
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
                        Criações na página
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
                        Alterações na página
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
                        Remoções/Bloqueios na página
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
                            {getAuditActionLabel(action)}
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
                            {getEntityTypeLabel(entityType)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>ID ou registro</Label>

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
                          Registro
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
                            <td className="whitespace-nowrap px-4 py-3">
                              {formatDate(log.createdAt)}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                  <UserRound className="h-4 w-4 text-muted-foreground" />
                                </div>

                                <div>
                                  <p className="font-medium">
                                    {log.user?.name ||
                                      "Usuário desconhecido"}
                                  </p>

                                  <p className="text-xs text-muted-foreground">
                                    {log.user?.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                {getActionBadge(log.action)}

                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <Badge variant="outline">
                                {getEntityTypeLabel(
                                  log.entityType
                                )}
                              </Badge>
                            </td>

                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {getFriendlyEntityLabel(
                                    log
                                  )}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {log.entityId}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {log.ipAddress || "-"}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setSelectedLog(log)
                                }
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
            <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-[95vw] lg:max-w-5xl xl:max-w-6xl">
              <DialogHeader>
                <DialogTitle>
                  Detalhes do Audit Log
                </DialogTitle>

                <DialogDescription>
                  Visualize os dados anteriores e novos
                  registrados nesta ação.
                </DialogDescription>
              </DialogHeader>

              {selectedLog && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardContent className="space-y-2 p-4">
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
                      <CardContent className="space-y-2 p-4">
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

                      <div className="space-y-1">
                        {getActionBadge(selectedLog.action)}

                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Entidade
                      </p>

                      <Badge variant="outline">
                        {getEntityTypeLabel(
                          selectedLog.entityType
                        )}
                      </Badge>

                    </div>

                    <div>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Registro
                      </p>

                      <p className="font-medium">
                        {getFriendlyEntityLabel(selectedLog)}
                      </p>

                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium">
                      Alterações registradas
                    </p>

                    <AuditChangeList
                      oldValue={selectedLog.oldValue}
                      newValue={selectedLog.newValue}
                    />
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