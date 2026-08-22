"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

import { useAuth } from "@/contexts/AuthContext"
import { BarChart3 } from "lucide-react"

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
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Eye,
  Filter,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react"

import { toast } from "sonner"

type RiskLevel = "GREEN" | "YELLOW" | "RED" | "BLUE" | "PURPLE" | "ORANGE" | "GRAY"

type RiskWorkflowStatus =
  | "OPEN"
  | "CLOSED"
  | "CANCELED"

type RiskItem = {
  id: string
  code: string
  title: string
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
  workflowStatus: "all",
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
        whiteSpace: "nowrap",
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
          Green
        </Pill>
      )

    case "YELLOW":
      return (
        <Pill backgroundColor="#eab308" color="#000000">
          Yellow
        </Pill>
      )

    case "RED":
      return (
        <Pill backgroundColor="#dc2626">
          Red
        </Pill>
      )
    case "BLUE":
      return (
        <Pill backgroundColor="#3b82f6">
          Blue
        </Pill>
      )

    default:
      return (
        <Pill backgroundColor="#525252">
          {level}
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
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

      const [suppliersRes, usersRes] =
        await Promise.all([
          fetch("/api/suppliers", {
            credentials: "include",
          }),
          fetch("/api/users/options", {
            credentials: "include",
          }),
        ])

      const suppliersData = await suppliersRes.json()
      const usersData = await usersRes.json()

      if (!suppliersRes.ok) {
        throw new Error(
          suppliersData.details ||
          suppliersData.error ||
          "Erro ao carregar fornecedores"
        )
      }

      if (!usersRes.ok) {
        throw new Error(
          usersData.details ||
          usersData.error ||
          "Erro ao carregar responsáveis"
        )
      }

      const supplierList = Array.isArray(suppliersData)
        ? suppliersData
        : suppliersData.data || []

      const userList = Array.isArray(usersData)
        ? usersData
        : usersData.data || []

      setSuppliers(supplierList)
      setUsers(userList)
    } catch (error) {
      console.error("ERRO AO CARREGAR OPÇÕES DE FILTRO:", error)

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

      const params = buildSearchParams(
        page,
        currentFilters
      )

      const res = await fetch(
        `/api/risk?${params.toString()}`,
        {
          credentials: "include",
        }
      )

      const data = await res.json()

      console.log("STATUS API LISTA RMS:", res.status)
      console.log("RESPOSTA API LISTA RMS:", data)

      if (!res.ok) {
        alert(JSON.stringify(data, null, 2))

        throw new Error(
          data.details ||
          data.error ||
          "Erro ao carregar RMs"
        )
      }

      setRisks(data.data || [])
      setStats(
        data.stats || {
          total: 0,
          open: 0,
          closed: 0,
          red: 0,
          yellow: 0,
          green: 0,
        }
      )

      setPagination(
        data.pagination || {
          page,
          pageSize: Number(currentFilters.pageSize),
          total: 0,
          totalPages: 1,
        }
      )
    } catch (error) {
      console.error("ERRO AO CARREGAR LISTA DE RMS:", error)

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

  function resetFilters() {
    setFilters(initialFilters)
    loadRisks(1, initialFilters)
  }

  function goToPage(page: number) {
    if (page < 1 || page > pagination.totalPages) {
      return
    }

    loadRisks(page, filters)
  }

  function handleSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      applyFilters()
    }
  }

  return (
    <ProtectedRoute permission="RISK_VIEW">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">
                  RMs
                </h1>

                <p className="text-sm text-muted-foreground">
                  Book principal de RMs abertas, fechadas e em acompanhamento.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
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
                    type="button"
                    onClick={() =>
                      router.push("/rms/create")
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova RM
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/rms/analytics")}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Análises
                </Button>
              </div>
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
                        {stats.total}
                      </p>
                    </div>

                    <ShieldAlert className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Abertas
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {stats.open}
                      </p>
                    </div>

                    <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Críticas
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {stats.red}
                      </p>
                    </div>

                    <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Fechadas
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {stats.closed}
                      </p>
                    </div>

                    <ShieldAlert className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />

                    <CardTitle>
                      Filtros
                    </CardTitle>
                  </div>

                  {loadingOptions && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando opções...
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2 xl:col-span-2 p-2">
                    <Label>Busca geral</Label>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                      <Input
                        className="h-10 pl-9"
                        placeholder="Código, título, fornecedor ou SAP..."
                        value={filters.search}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            search: e.target.value,
                          }))
                        }
                        onKeyDown={handleSearchKeyDown}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 p-2">
                    <Label>Status</Label>

                    <Select
                      value={filters.workflowStatus}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          workflowStatus: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">
                          Todos
                        </SelectItem>

                        <SelectItem value="OPEN">
                          Aberta
                        </SelectItem>

                        <SelectItem value="CLOSED">
                          Fechada
                        </SelectItem>

                        <SelectItem value="CANCELED">
                          Cancelada
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 p-2">
                    <Label>Farol</Label>

                    <Select
                      value={filters.riskLevel}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          riskLevel: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">
                          Todos
                        </SelectItem>

                        <SelectItem value="RED">
                          Red
                        </SelectItem>

                        <SelectItem value="YELLOW">
                          Yellow
                        </SelectItem>

                        <SelectItem value="GREEN">
                          Green
                        </SelectItem>

                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 p-2">
                    <Label>Fornecedor</Label>

                    <Select
                      value={filters.supplierId}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          supplierId: value,
                        }))
                      }
                      disabled={loadingOptions}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">
                          Todos
                        </SelectItem>

                        {suppliers.map((supplier) => (
                          <SelectItem
                            key={supplier.id}
                            value={supplier.id}
                          >
                            {supplier.name}
                            {supplier.supplierCodeSap
                              ? ` — ${supplier.supplierCodeSap}`
                              : ""}
                            {supplier.country?.isoCode
                              ? ` (${supplier.country.isoCode})`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 p-2">
                    <Label>Responsável</Label>

                    <Select
                      value={filters.assignedToId}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          assignedToId: value,
                        }))
                      }
                      disabled={loadingOptions}
                    >
                      <SelectTrigger className="h-10 w-full">
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
                            {user.name} — {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 xl:col-span-2 p-2">
                    <Label>Motivo de abertura</Label>

                    <Select
                      value={filters.openingReason}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          openingReason: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">
                          Todos
                        </SelectItem>

                        {openingReasonOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 p-2">
                    <Label>Registros por página</Label>

                    <Select
                      value={filters.pageSize}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          pageSize: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="20" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="10">
                          10
                        </SelectItem>

                        <SelectItem value="20">
                          20
                        </SelectItem>

                        <SelectItem value="50">
                          50
                        </SelectItem>

                        <SelectItem value="100">
                          100
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-4 border-t pt-5 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-muted-foreground">
                    A ordenação está em ordem crescente pelo número da RM.
                  </p>

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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Lista de RMs
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left">
                          Código
                        </th>

                        <th className="px-4 py-3 text-left">
                          Fornecedor
                        </th>

                        <th className="px-4 py-3 text-left">
                          Motivo
                        </th>

                        <th className="px-4 py-3 text-left">
                          Responsável
                        </th>

                        <th className="px-4 py-3 text-left">
                          Status
                        </th>

                        <th className="px-4 py-3 text-left">
                          Farol
                        </th>

                        <th className="px-4 py-3 text-left">
                          Semana/Ano
                        </th>

                        <th className="px-4 py-3 text-left">
                          Criada em
                        </th>

                        <th className="px-4 py-3 text-left">
                          PNs
                        </th>

                        <th className="px-4 py-3 text-right">
                          Ações
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-4 py-10 text-center text-muted-foreground"
                          >
                            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                            Carregando RMs...
                          </td>
                        </tr>
                      ) : risks.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-4 py-10 text-center text-muted-foreground"
                          >
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
                              {risk.code}
                            </td>

                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">
                                  {risk.supplier.name}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {risk.supplier.supplierCodeSap ||
                                    "-"}{" "}
                                  •{" "}
                                  {
                                    risk.supplier.country
                                      .isoCode
                                  }
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <span className="line-clamp-2">
                                {openingReasonLabels[
                                  risk.openingReason
                                ] || risk.openingReason}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {risk.assignedTo?.name || "-"}
                            </td>

                            <td className="px-4 py-3">
                              {getWorkflowStatusPill(
                                risk.workflowStatus
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {getRiskLevelPill(
                                risk.riskLevel
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {risk.createdWeek}/
                              {risk.createdYear}
                            </td>

                            <td className="px-4 py-3">
                              {formatDate(risk.createdAt)}
                            </td>

                            <td className="px-4 py-3">
                              {risk.counts.parts}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/rms/${risk.id}`
                                  )
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
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}