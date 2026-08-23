"use client"

import { type ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
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
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Filter,
  Gauge,
  Layers3,
  Loader2,
  PackageSearch,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Truck,
  UserRoundX,
} from "lucide-react"
import { toast } from "sonner"

type RiskLevel =
  | "GREEN"
  | "YELLOW"
  | "RED"
  | "BLUE"
  | "ORANGE"
  | "GREY"

type RiskWorkflowStatus =
  | "OPEN"
  | "CLOSED"
  | "CANCELED"

type RiskItem = {
  id: string
  code: string
  title: string | null
  openingReason: string
  workflowStatus: RiskWorkflowStatus
  riskLevel: RiskLevel
  createdWeek: number
  createdYear: number
  createdAt: string
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
  assignedTo: {
    id: string
    name: string
    email: string
  } | null
  counts: {
    parts: number
    actionPlans: number
    logistics: number
  }
}

type SupplierOption = {
  id: string
  name: string
  supplierCodeSap: string | null
  country?: {
    id?: string
    name?: string
    isoCode?: string
  }
}

type UserOption = {
  id: string
  name: string
  email: string
}

type Stats = {
  total: number
  open: number
  closed: number
  red: number
  yellow: number
  green: number
}

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type Filters = {
  search: string
  workflowStatus: string
  riskLevel: string
  supplierId: string
  assignedToId: string
  openingReason: string
  pageSize: string
}

const initialFilters: Filters = {
  search: "",
  workflowStatus: "OPEN",
  riskLevel: "all",
  supplierId: "all",
  assignedToId: "all",
  openingReason: "all",
  pageSize: "20",
}

const openingReasonLabels: Record<string, string> = {
  TIER_2_CHANGE: "Troca ou Adição de Tier 2",
  PLANT_CHANGE: "Alteração de Planta",
  SUPPLIER_TRANSFER_PHASE_OUT:
    "Transferência de Fornecedor (Phase Out)",
  MANUFACTURING_PROCESS_CHANGE:
    "Mudança no Processo de Fabricação",
}

const openingReasonOptions = [
  {
    value: "TIER_2_CHANGE",
    label: "Troca ou Adição de Tier 2",
  },
  {
    value: "PLANT_CHANGE",
    label: "Alteração de Planta",
  },
  {
    value: "SUPPLIER_TRANSFER_PHASE_OUT",
    label: "Transferência de Fornecedor (Phase Out)",
  },
  {
    value: "MANUFACTURING_PROCESS_CHANGE",
    label: "Mudança no Processo de Fabricação",
  },
]

const riskLevelConfig: Record<
  RiskLevel,
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

function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const config = riskLevelConfig[level]

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

function WorkflowBadge({
  status,
}: {
  status: RiskWorkflowStatus
}) {
  const config =
    status === "OPEN"
      ? {
          label: "Aberta",
          className:
            "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
        }
      : status === "CLOSED"
        ? {
            label: "Fechada",
            className:
              "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
          }
        : {
            label: "Cancelada",
            className:
              "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
          }

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  tone = "default",
  onClick,
}: {
  title: string
  value: number
  description: string
  icon: ReactNode
  tone?: "default" | "danger" | "warning" | "success"
  onClick?: () => void
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
    <Card
      className={
        onClick
          ? "h-full cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/20"
          : "h-full"
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (
          onClick &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault()
          onClick()
        }
      }}
    >
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

function formatDate(value: string) {
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

  if (!text) return { data: null, rawText: "" }

  try {
    return { data: JSON.parse(text), rawText: text }
  } catch {
    return { data: null, rawText: text }
  }
}

export default function RisksPage() {
  const router = useRouter()
  const { user } = useAuth()

  const canCreateRisk =
    user?.permissions?.includes("RISK_CREATE") ||
    user?.permissions?.includes("USER_MANAGE")

  const [risks, setRisks] = useState<RiskItem[]>([])
  const [suppliers, setSuppliers] =
    useState<SupplierOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [filters, setFilters] =
    useState<Filters>(initialFilters)
  const [stats, setStats] = useState<Stats>({
    total: 0,
    open: 0,
    closed: 0,
    red: 0,
    yellow: 0,
    green: 0,
  })
  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    })
  const [loading, setLoading] = useState(true)
  const [loadingOptions, setLoadingOptions] =
    useState(true)

  useEffect(() => {
    loadFilterOptions()
    loadRisks(1, initialFilters)
  }, [])

  async function loadFilterOptions() {
    try {
      setLoadingOptions(true)

      const [suppliersRes, usersRes] = await Promise.all([
        fetch("/api/suppliers", {
          credentials: "include",
        }),
        fetch("/api/users/options", {
          credentials: "include",
        }),
      ])

      const suppliersResponse =
        await readJsonResponse(suppliersRes)
      const usersResponse = await readJsonResponse(usersRes)

      if (!suppliersRes.ok) {
        throw new Error(
          suppliersResponse.data?.details ||
            suppliersResponse.data?.error ||
            suppliersResponse.rawText ||
            "Erro ao carregar fornecedores"
        )
      }

      if (!usersRes.ok) {
        throw new Error(
          usersResponse.data?.details ||
            usersResponse.data?.error ||
            usersResponse.rawText ||
            "Erro ao carregar responsáveis"
        )
      }

      const suppliersData = suppliersResponse.data
      const usersData = usersResponse.data

      setSuppliers(
        Array.isArray(suppliersData)
          ? suppliersData
          : suppliersData?.data || []
      )
      setUsers(
        Array.isArray(usersData)
          ? usersData
          : usersData?.data || []
      )
    } catch (error) {
      console.error("ERRO AO CARREGAR OPÇÕES:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar opções de filtro"
      )
    } finally {
      setLoadingOptions(false)
    }
  }

  function buildSearchParams(
    page: number,
    currentFilters: Filters
  ) {
    const params = new URLSearchParams()

    params.set("page", String(page))
    params.set("pageSize", currentFilters.pageSize)

    if (currentFilters.search.trim()) {
      params.set("search", currentFilters.search.trim())
    }

    if (currentFilters.workflowStatus !== "all") {
      params.set(
        "workflowStatus",
        currentFilters.workflowStatus
      )
    }

    if (currentFilters.riskLevel !== "all") {
      params.set("riskLevel", currentFilters.riskLevel)
    }

    if (currentFilters.supplierId !== "all") {
      params.set("supplierId", currentFilters.supplierId)
    }

    if (currentFilters.assignedToId !== "all") {
      params.set(
        "assignedToId",
        currentFilters.assignedToId
      )
    }

    if (currentFilters.openingReason !== "all") {
      params.set(
        "openingReason",
        currentFilters.openingReason
      )
    }

    return params
  }

  async function loadRisks(
    page = pagination.page,
    currentFilters = filters
  ) {
    try {
      setLoading(true)
      const params = buildSearchParams(page, currentFilters)
      const res = await fetch(
        `/api/risk?${params.toString()}`,
        { credentials: "include" }
      )
      const response = await readJsonResponse(res)

      if (!res.ok) {
        throw new Error(
          response.data?.details ||
            response.data?.error ||
            response.rawText ||
            "Erro ao carregar RMs"
        )
      }

      setRisks(response.data?.data || [])
      setStats(
        response.data?.stats || {
          total: 0,
          open: 0,
          closed: 0,
          red: 0,
          yellow: 0,
          green: 0,
        }
      )
      setPagination(
        response.data?.pagination || {
          page,
          pageSize: Number(currentFilters.pageSize),
          total: 0,
          totalPages: 1,
        }
      )
    } catch (error) {
      console.error("ERRO AO CARREGAR RMS:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar RMs"
      )
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    loadRisks(1, filters)
  }

  function applyQuickFilter(values: Partial<Filters>) {
    const nextFilters = { ...filters, ...values }
    setFilters(nextFilters)
    loadRisks(1, nextFilters)
  }

  function resetFilters() {
    setFilters(initialFilters)
    loadRisks(1, initialFilters)
  }

  function goToPage(page: number) {
    if (page < 1 || page > pagination.totalPages) return
    loadRisks(page, filters)
  }

  function handleSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") applyFilters()
  }

  const activeFilterCount =
    Number(!!filters.search.trim()) +
    Number(filters.workflowStatus !== "all") +
    Number(filters.riskLevel !== "all") +
    Number(filters.supplierId !== "all") +
    Number(filters.assignedToId !== "all") +
    Number(filters.openingReason !== "all")
  const visibleParts = risks.reduce(
    (total, risk) => total + risk.counts.parts,
    0
  )
  const visibleActionPlans = risks.reduce(
    (total, risk) => total + risk.counts.actionPlans,
    0
  )
  const visibleLogistics = risks.reduce(
    (total, risk) => total + risk.counts.logistics,
    0
  )
  const visibleUnassigned = risks.filter(
    (risk) => !risk.assignedTo
  ).length
  const semaphoreTotal =
    stats.red + stats.yellow + stats.green
  const redPercentage = semaphoreTotal
    ? Math.round((stats.red / semaphoreTotal) * 100)
    : 0
  const yellowPercentage = semaphoreTotal
    ? Math.round((stats.yellow / semaphoreTotal) * 100)
    : 0
  const greenPercentage = semaphoreTotal
    ? Math.max(0, 100 - redPercentage - yellowPercentage)
    : 0

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
                      Fluxo principal
                    </Badge>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                        Gestão de RMs
                      </h1>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                        Acompanhe o portfólio, encontre rapidamente os casos prioritários e acesse o fluxo completo de cada RM.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
    

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          loadRisks(pagination.page, filters)
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

                      {canCreateRisk && (
                        <Button
                          onClick={() => router.push("/rms/create")}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Nova RM
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.push("/rms/analytics")}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Análises
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Total filtrado"
                value={stats.total}
                description={activeFilterCount + " filtro(s) aplicado(s)"}
                icon={<ShieldAlert className="h-5 w-5" />}
                onClick={() =>
                  applyQuickFilter({
                    workflowStatus: "all",
                    riskLevel: "all",
                  })
                }
              />
              <SummaryCard
                title="RMs abertas"
                value={stats.open}
                description="Clique para visualizar as abertas"
                icon={<AlertTriangle className="h-5 w-5" />}
                tone="warning"
                onClick={() =>
                  applyQuickFilter({ workflowStatus: "OPEN" })
                }
              />
              <SummaryCard
                title="Farol vermelho"
                value={stats.red}
                description="Clique para priorizar este recorte"
                icon={<Gauge className="h-5 w-5" />}
                tone="danger"
                onClick={() =>
                  applyQuickFilter({ riskLevel: "RED" })
                }
              />
              <SummaryCard
                title="RMs fechadas"
                value={stats.closed}
                description="Clique para consultar as concluídas"
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="success"
                onClick={() =>
                  applyQuickFilter({ workflowStatus: "CLOSED" })
                }
              />
            </div>

            <Card>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Visualização da fila
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Por padrão, a página exibe apenas RMs abertas.
                  </p>
                </div>

                <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
                  <Button
                    type="button"
                    variant={
                      filters.workflowStatus === "OPEN"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      applyQuickFilter({ workflowStatus: "OPEN" })
                    }
                    disabled={loading}
                  >
                    Abertas
                  </Button>
                  <Button
                    type="button"
                    variant={
                      filters.workflowStatus === "CLOSED"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      applyQuickFilter({ workflowStatus: "CLOSED" })
                    }
                    disabled={loading}
                  >
                    Fechadas
                  </Button>
                  <Button
                    type="button"
                    variant={
                      filters.workflowStatus === "all"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      applyQuickFilter({ workflowStatus: "all" })
                    }
                    disabled={loading}
                  >
                    Todas
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-12">
              <Card className="xl:col-span-7">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Distribuição por farol
                  </CardTitle>
                  <CardDescription>
                    Composição das RMs no recorte atual de status, fornecedor, responsável e motivo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: redPercentage + "%" }}
                    />
                    <div
                      className="bg-amber-400 transition-all"
                      style={{ width: yellowPercentage + "%" }}
                    />
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{ width: greenPercentage + "%" }}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/30"
                      onClick={() => applyQuickFilter({ riskLevel: "RED" })}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Vermelhas</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      </div>
                      <p className="mt-1 text-2xl font-bold">{stats.red}</p>
                      <p className="text-xs text-muted-foreground">{redPercentage}% do farol</p>
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/30"
                      onClick={() => applyQuickFilter({ riskLevel: "YELLOW" })}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Amarelas</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      </div>
                      <p className="mt-1 text-2xl font-bold">{stats.yellow}</p>
                      <p className="text-xs text-muted-foreground">{yellowPercentage}% do farol</p>
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/30"
                      onClick={() => applyQuickFilter({ riskLevel: "GREEN" })}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Verdes</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <p className="mt-1 text-2xl font-bold">{stats.green}</p>
                      <p className="text-xs text-muted-foreground">{greenPercentage}% do farol</p>
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="xl:col-span-5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers3 className="h-5 w-5" />
                    Carga da página atual
                  </CardTitle>
                  <CardDescription>
                    Leitura dos registros carregados nesta página, não do portfólio completo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                      <PackageSearch className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">PNs relacionados</p>
                      <p className="text-xl font-bold">{visibleParts}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Planos de ação</p>
                      <p className="text-xl font-bold">{visibleActionPlans}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Demandas logísticas</p>
                      <p className="text-xl font-bold">{visibleLogistics}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                      <UserRoundX className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sem responsável</p>
                      <p className="text-xl font-bold">{visibleUnassigned}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filtros
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary">{activeFilterCount}</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Refine a fila de trabalho por situação, fornecedor ou responsável.
                    </CardDescription>
                  </div>
                  {loadingOptions && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando opções...
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(280px,2fr)_repeat(3,minmax(170px,1fr))]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Código, título, fornecedor, SAP ou commodity..."
                      value={filters.search}
                      onChange={(event) =>
                        setFilters((previous) => ({
                          ...previous,
                          search: event.target.value,
                        }))
                      }
                      onKeyDown={handleSearchKeyDown}
                    />
                  </div>

                  <Select
                    value={filters.workflowStatus}
                    onValueChange={(value) =>
                      setFilters((previous) => ({
                        ...previous,
                        workflowStatus: value,
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="OPEN">Abertas</SelectItem>
                      <SelectItem value="CLOSED">Fechadas</SelectItem>
                      <SelectItem value="CANCELED">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.riskLevel}
                    onValueChange={(value) =>
                      setFilters((previous) => ({
                        ...previous,
                        riskLevel: value,
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Farol" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os faróis</SelectItem>
                      <SelectItem value="RED">Vermelho</SelectItem>
                      <SelectItem value="YELLOW">Amarelo</SelectItem>
                      <SelectItem value="GREEN">Verde</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.pageSize}
                    onValueChange={(value) =>
                      setFilters((previous) => ({
                        ...previous,
                        pageSize: value,
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="20 por página" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 por página</SelectItem>
                      <SelectItem value="20">20 por página</SelectItem>
                      <SelectItem value="50">50 por página</SelectItem>
                      <SelectItem value="100">100 por página</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Select
                      value={filters.supplierId}
                      onValueChange={(value) =>
                        setFilters((previous) => ({
                          ...previous,
                          supplierId: value,
                        }))
                      }
                      disabled={loadingOptions}
                    >
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os fornecedores</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                            {supplier.supplierCodeSap
                              ? " — " + supplier.supplierCodeSap
                              : ""}
                            {supplier.country?.isoCode
                              ? " (" + supplier.country.isoCode + ")"
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select
                      value={filters.assignedToId}
                      onValueChange={(value) =>
                        setFilters((previous) => ({
                          ...previous,
                          assignedToId: value,
                        }))
                      }
                      disabled={loadingOptions}
                    >
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os responsáveis</SelectItem>
                        {users.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} — {item.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Motivo de abertura</Label>
                    <Select
                      value={filters.openingReason}
                      onValueChange={(value) =>
                        setFilters((previous) => ({
                          ...previous,
                          openingReason: value,
                        }))
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os motivos</SelectItem>
                        {openingReasonOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Ordenação atual: número da RM em ordem crescente.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={applyFilters} disabled={loading}>
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Lista de RMs</CardTitle>
                    <CardDescription className="mt-1">
                      RMs encontradas de acordo com os filtros aplicados.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    Página {pagination.page} de {pagination.totalPages || 1}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[1180px] text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left">Código</th>
                        <th className="px-4 py-3 text-left">Fornecedor</th>
                        <th className="px-4 py-3 text-left">Motivo</th>
                        <th className="px-4 py-3 text-left">Responsável</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Farol</th>
                        <th className="px-4 py-3 text-left">PNs</th>
                        <th className="px-4 py-3 text-left">Criada em</th>
                        <th className="px-4 py-3 text-left">Acompanhamentos</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                            Carregando RMs...
                          </td>
                        </tr>
                      ) : risks.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                            Nenhuma RM encontrada.
                          </td>
                        </tr>
                      ) : (
                        risks.map((risk) => (
                            <tr
                              key={risk.id}
                              className="border-b last:border-0 hover:bg-muted/40"
                            >
                              <td className="px-4 py-3 font-medium">
                                <Link
                                  href={`/rms/${risk.id}`}
                                  className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                                >
                                  {risk.code}
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                              </td>

                              <td className="px-4 py-3">
                                <div>
                                  <Link
                                    href={`/suppliers/${risk.supplier.id}`}
                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                  >
                                    {risk.supplier.name}
                                  </Link>
                                  <p className="text-xs text-muted-foreground">
                                    {risk.supplier.supplierCodeSap || "-"}{" "}
                                    • {risk.supplier.country.isoCode}
                                  </p>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <span className="line-clamp-2">
                                  {openingReasonLabels[risk.openingReason] || risk.openingReason}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                {risk.assignedTo?.name || "-"}
                              </td>

                              <td className="px-4 py-3">
                                <WorkflowBadge status={risk.workflowStatus} />
                              </td>

                              <td className="px-4 py-3">
                                <RiskLevelBadge level={risk.riskLevel} />
                              </td>

                              <td className="px-4 py-3">
                                <Badge variant="outline">
                                  <PackageSearch className="mr-1 h-3.5 w-3.5" />
                                  {risk.counts.parts}
                                </Badge>
                              </td>

                              <td className="px-4 py-3">
                                <p>{formatDate(risk.createdAt)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Semana {risk.createdWeek}/{risk.createdYear}
                                </p>
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  <Badge variant="outline" title="Planos de ação">
                                    <ClipboardList className="mr-1 h-3.5 w-3.5" />
                                    {risk.counts.actionPlans} plano(s)
                                  </Badge>
                                  <Badge variant="outline" title="Demandas logísticas">
                                    <Truck className="mr-1 h-3.5 w-3.5" />
                                    {risk.counts.logistics} logística
                                  </Badge>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {pagination.page} de {pagination.totalPages || 1} — {pagination.total} registro(s)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading || pagination.page <= 1}
                      onClick={() => goToPage(pagination.page - 1)}
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
                        pagination.page >= pagination.totalPages
                      }
                      onClick={() => goToPage(pagination.page + 1)}
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
