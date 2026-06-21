"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

import { SuppliersTable } from "@/components/suppliers/suppliers-table"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
  Activity,
  Ban,
  Factory,
  Globe2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"

type SupplierStatus =
  | "ACTIVE"
  | "UNDER_MONITORING"
  | "AT_RISK"
  | "BLOCKED"
  | "INACTIVE"

type Country = {
  id: string
  name: string
}

type Supplier = {
  id: string
  name: string
  supplierCodeSap?: string
  status: SupplierStatus
  riskScore?: number | null
  country: {
    id: string
    name: string
  }
}

export default function SuppliersPage() {
  const router = useRouter()

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([])

  const [countries, setCountries] =
    useState<Country[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPageData()
  }, [])

  async function loadPageData() {
    try {
      setLoading(true)
      setError(null)

      const [suppliersRes, countriesRes] =
        await Promise.all([
          fetch("/api/suppliers", {
            credentials: "include",
          }),
          fetch("/api/countries", {
            credentials: "include",
          }),
        ])

      if (!suppliersRes.ok) {
        throw new Error("Failed to load suppliers")
      }

      if (!countriesRes.ok) {
        throw new Error("Failed to load countries")
      }

      const suppliersData = await suppliersRes.json()
      const countriesData = await countriesRes.json()

      const formattedSuppliers = suppliersData.map(
        (supplier: Supplier) => ({
          ...supplier,
          supplierCodeSap:
            supplier.supplierCodeSap ?? undefined,

          country: supplier.country ?? {
            id: "",
            name: "Não informado",
          },
        })
      )

      setSuppliers(formattedSuppliers)
      setCountries(countriesData)
    } catch (error) {
      console.error(error)

      setError(
        "Não foi possível carregar os fornecedores."
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadSuppliers() {
  try {
    setRefreshing(true)
    setError(null)

    const res = await fetch("/api/suppliers", {
      credentials: "include",
    })

    if (!res.ok) {
      throw new Error("Failed to load suppliers")
    }

    const data = await res.json()

    const formattedSuppliers = data.map(
      (supplier: Supplier) => ({
        ...supplier,
        supplierCodeSap:
          supplier.supplierCodeSap ?? undefined,

        country: supplier.country ?? {
          id: "",
          name: "Não informado",
        },
      })
    )

    setSuppliers(formattedSuppliers)
  } catch (error) {
    console.error(error)

    setError(
      "Não foi possível atualizar os fornecedores."
    )
  } finally {
    setRefreshing(false)
  }
}

  const stats = useMemo(() => {
    const total = suppliers.length

    const active = suppliers.filter(
      (supplier) => supplier.status === "ACTIVE"
    ).length

    const monitoring = suppliers.filter(
      (supplier) =>
        supplier.status === "UNDER_MONITORING"
    ).length

    const atRisk = suppliers.filter(
      (supplier) => supplier.status === "AT_RISK"
    ).length

    const blocked = suppliers.filter(
      (supplier) => supplier.status === "BLOCKED"
    ).length

    const inactive = suppliers.filter(
      (supplier) => supplier.status === "INACTIVE"
    ).length

    const suppliersWithScore =
      suppliers.filter(
        (supplier) =>
          typeof supplier.riskScore === "number"
      )

    const averageRiskScore =
      suppliersWithScore.length > 0
        ? Math.round(
          suppliersWithScore.reduce(
            (acc, supplier) =>
              acc + (supplier.riskScore || 0),
            0
          ) / suppliersWithScore.length
        )
        : null

    return {
      total,
      active,
      monitoring,
      atRisk,
      blocked,
      inactive,
      averageRiskScore,
    }
  }, [suppliers])

  return (
    <ProtectedRoute permission="SUPPLIER_VIEW">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="p-6 space-y-6">
            <Card className="overflow-hidden border-none bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
              <CardContent className="p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">


                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">
                        Suppliers Control Center
                      </h1>

                      <p className="mt-2 max-w-2xl text-sm text-slate-300">
                        Gerencie fornecedores, monitore status,
                        acompanhe risco e mantenha uma visão
                        centralizada da base de suprimentos.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="secondary"
                      onClick={loadSuppliers}
                      disabled={refreshing}
                    >
                      {refreshing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Atualizar
                    </Button>

                    <Button
                      onClick={() =>
                        router.push("/suppliers/create")
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Fornecedor
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total
                      </p>

                      <p className="mt-1 text-3xl font-bold">
                        {stats.total}
                      </p>
                    </div>

                    <div className="rounded-xl bg-muted p-3">
                      <Factory className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Fornecedores cadastrados
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Ativos
                      </p>

                      <p className="mt-1 text-3xl font-bold text-green-600">
                        {stats.active}
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-100 p-3">
                      <Activity className="h-6 w-6 text-green-700" />
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Fornecedores em operação
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Monitoramento
                      </p>

                      <p className="mt-1 text-3xl font-bold text-yellow-600">
                        {stats.monitoring}
                      </p>
                    </div>

                    <div className="rounded-xl bg-yellow-100 p-3">
                      <Globe2 className="h-6 w-6 text-yellow-700" />
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Fornecedores sob atenção
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Em Risco
                      </p>

                      <p className="mt-1 text-3xl font-bold text-red-600">
                        {stats.atRisk + stats.blocked}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-100 p-3">
                      <ShieldAlert className="h-6 w-6 text-red-700" />
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    At risk ou bloqueados
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground padding">
                        Risk Score Médio
                      </p>

                      <p className="mt-1 text-3xl font-bold">
                        {stats.averageRiskScore ?? "-"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-muted p-3">
                      <Ban className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Média da base atual
                  </p>
                </CardContent>
              </Card>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>
                    Lista de Fornecedores
                  </CardTitle>

                  <p className="text-sm text-muted-foreground">
                    Consulte, filtre e acompanhe os fornecedores
                    cadastrados no sistema.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {stats.active} ativos
                  </Badge>

                  <Badge variant="outline">
                    {stats.monitoring} em monitoramento
                  </Badge>

                  <Badge variant="outline">
                    {stats.inactive} inativos
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {loading ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Carregando fornecedores...
                    </div>
                  </div>
                ) : (
                  <SuppliersTable
                    data={suppliers}
                    countries={countries}
                    onReload={loadSuppliers}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}