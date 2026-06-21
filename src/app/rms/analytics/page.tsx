"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

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
  ArrowLeft,
  BarChart3,
  Filter,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react"

import { toast } from "sonner"

import { RiskAnalytics } from "@/components/risk/RiskAnalytics"

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

export default function RiskAnalyticsPage() {
  const router = useRouter()

  const [filters, setFilters] =
    useState<Filters>(initialFilters)

  const [appliedFilters, setAppliedFilters] =
    useState<Filters>(initialFilters)

  const [suppliers, setSuppliers] =
    useState<SupplierOption[]>([])

  const [users, setUsers] =
    useState<UserOption[]>([])

  const [loadingOptions, setLoadingOptions] =
    useState(true)

  useEffect(() => {
    loadFilterOptions()
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
          suppliersData.error ||
            "Erro ao carregar fornecedores"
        )
      }

      if (!usersRes.ok) {
        throw new Error(
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
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar opções de filtro"
      )
    } finally {
      setLoadingOptions(false)
    }
  }

  function applyFilters() {
    setAppliedFilters(filters)
  }

  function resetFilters() {
    setFilters(initialFilters)
    setAppliedFilters(initialFilters)
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

          <div className="mx-auto w-full max-w-[1800px] space-y-4 p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />

                    <h1 className="text-xl font-semibold">
                      Análises de RMs
                    </h1>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Dashboard analítico do book de RMs.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/rms")}
              >
                Voltar para o book
              </Button>
            </div>

            <Card className="rounded-xl">
              <CardHeader className="px-4 pb-2 pt-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />

                    <CardTitle className="text-sm font-semibold">
                      Filtros da análise
                    </CardTitle>

                    {loadingOptions && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Loader2 className="ml-2 mr-1 h-3.5 w-3.5 animate-spin" />
                        carregando opções
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={applyFilters}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Aplicar
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={resetFilters}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Limpar
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-4 pb-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                  <div className="space-y-1.5 xl:col-span-3">
                    <Label className="text-xs">
                      Busca geral
                    </Label>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

                      <Input
                        className="h-9 pl-8 text-sm"
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

                  <div className="space-y-1.5 xl:col-span-2">
                    <Label className="text-xs">
                      Status
                    </Label>

                    <Select
                      value={filters.workflowStatus}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          workflowStatus: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 w-full text-sm">
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

                  <div className="space-y-1.5 xl:col-span-2">
                    <Label className="text-xs">
                      Farol
                    </Label>

                    <Select
                      value={filters.riskLevel}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          riskLevel: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 w-full text-sm">
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

                  <div className="space-y-1.5 xl:col-span-2">
                    <Label className="text-xs">
                      Fornecedor
                    </Label>

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
                      <SelectTrigger className="h-9 w-full text-sm">
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

                  <div className="space-y-1.5 xl:col-span-2">
                    <Label className="text-xs">
                      Responsável
                    </Label>

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
                      <SelectTrigger className="h-9 w-full text-sm">
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

                  <div className="space-y-1.5 xl:col-span-3">
                    <Label className="text-xs">
                      Motivo
                    </Label>

                    <Select
                      value={filters.openingReason}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          openingReason: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 w-full text-sm">
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
                </div>
              </CardContent>
            </Card>

            <RiskAnalytics filters={appliedFilters} />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}