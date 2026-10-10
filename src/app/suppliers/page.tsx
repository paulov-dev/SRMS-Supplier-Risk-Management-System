"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import Link from "next/link"

import {
  Building2,
  ShieldAlert,
  ClipboardList,
  FileWarning,
  RefreshCw,
  Plus,
  Loader2,
  SlidersHorizontal,
} from "lucide-react"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  SuppliersTable,
  scoreTones,
} from "@/components/suppliers/suppliers-table"

import {
  bandLabels,
  coverageLabels,
  statusLabels,
  defaultPortfolioFilters,
  filterSuppliers,
  portfolioStats,
  type PortfolioSupplier,
  type PortfolioFilters,
} from "@/lib/supplier-portfolio"

function Metric({
  title,
  value,
  detail,
  icon,
  tone,
  onClick,
}: {
  title: string
  value: string | number
  detail: string
  icon: ReactNode
  tone: string
  onClick?: () => void
}) {
  const content = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">
          {title}
        </p>

        <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
          {value}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {detail}
        </p>
      </div>

      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}
      >
        {icon}
      </div>
    </div>
  )

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            aria-label={`Filtrar: ${title}`}
            className="block w-full rounded-lg text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {content}
          </button>
        ) : (
          content
        )}
      </CardContent>
    </Card>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className="w-full"
          aria-label={label}
        >
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          {options.map(([key, text]) => (
            <SelectItem key={key} value={key}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SuppliersPortfolio() {
  const { user } = useAuth()

  const [data, setData] =
    useState<PortfolioSupplier[] | null>(null)

  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [updatedAt, setUpdatedAt] =
    useState<string | null>(null)

  const [filters, setFilters] =
    useState<PortfolioFilters>({
      ...defaultPortfolioFilters,
    })

  const [page, setPage] = useState(1)

  const controllerRef =
    useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    controllerRef.current?.abort()

    const controller = new AbortController()
    controllerRef.current = controller

    setBusy(true)
    setError(null)

    try {
      const response = await fetch("/api/suppliers", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      })

      const body = await response.json().catch(() => null)

      if (controller.signal.aborted) return

      if (!response.ok) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          setData(null)
        }

        throw new Error(
          body?.error ||
            "Não foi possível consultar a carteira."
        )
      }

      if (
        !Array.isArray(body) ||
        body.some(
          item =>
            !item ||
            typeof item.id !== "string" ||
            typeof item.name !== "string"
        )
      ) {
        throw new Error(
          "A API retornou uma lista de fornecedores inválida."
        )
      }

      if (controller.signal.aborted) return

      setData(body)
      setUpdatedAt(new Date().toISOString())
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Falha ao carregar fornecedores."
        )
      }
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false)
      }
    }
  }, [])

  useEffect(() => {
    void load()
    return () => controllerRef.current?.abort()
  }, [load])

  const stats = useMemo(
    () => portfolioStats(data ?? []),
    [data]
  )

  const visible = useMemo(
    () => filterSuppliers(data ?? [], filters),
    [data, filters]
  )

  const countries = useMemo<[string, string][]>(() => {
    const values = new Map<string, string>()

    for (const supplier of data ?? []) {
      values.set(
        supplier.country?.id || "UNKNOWN",
        supplier.country?.name || "País não informado"
      )
    }

    return [...values.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], "pt-BR")
    )
  }, [data])

  function change(
    patch: Partial<PortfolioFilters>,
    reset = false
  ) {
    setFilters(previous => ({
      ...(reset ? defaultPortfolioFilters : previous),
      ...patch,
    }))

    setPage(1)
  }

  const riskBars = {
    CRITICAL: "bg-red-500",
    HIGH: "bg-orange-500",
    ATTENTION: "bg-yellow-500",
    LOW: "bg-green-500",
  }

  const coverageHints = {
    COMPLETE: "Todas as RMs abertas possuem score",
    PARTIAL: "Parte das RMs abertas está sem pontuação",
    UNAVAILABLE: "Nenhuma RM aberta possui score calculável",
    NO_OPEN_RISKS: "Fornecedor sem RMs abertas nesta consulta",
    UNKNOWN: "Resumo do score não disponível",
  }

  const activeFilterCount = [
    filters.search.trim() !== "",
    filters.risk !== "ALL",
    filters.coverage !== "ALL",
    filters.status !== "ALL",
    filters.country !== "ALL",
  ].filter(Boolean).length

  return (
    <main className="min-w-0 space-y-5 p-4 md:p-6">
      <Card className="overflow-hidden border-none bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-3 border-white/15 bg-white/10 text-white hover:bg-white/10">
                Visão operacional
              </Badge>

              <h1 className="text-3xl font-bold tracking-tight">
                Análise de fornecedores
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Priorize os fornecedores que exigem ação,
                acompanhe a distribuição do risco e identifique
                as RMs que determinam cada score.
              </p>

              {updatedAt && (
                <p className="mt-3 text-xs text-slate-300">
                  Última consulta:{" "}
                  {new Date(updatedAt).toLocaleString(
                    "pt-BR",
                    { timeZone: "America/Sao_Paulo" }
                  )}{" "}
                  (Brasília).
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <ShieldAlert className="h-4 w-4" />

                {data === null
                  ? "Aguardando consulta"
                  : `${stats.priority} fornecedor(es) com risco alto ou crítico`}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void load()}
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}

                  Atualizar análise
                </Button>

                {user?.permissions.includes(
                  "SUPPLIER_CREATE"
                ) && (
                  <Button
                    variant="outline"
                    className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    asChild
                  >
                    <Link href="/suppliers/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Novo fornecedor
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}

          {data !== null &&
            " Os dados exibidos são da última consulta bem-sucedida."}

          <Button
            className="ml-3"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void load()}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {data === null && busy && (
        <Card>
          <CardContent className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span role="status">Carregando carteira...</span>
          </CardContent>
        </Card>
      )}

      {data !== null && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              title="Fornecedores monitorados"
              value={stats.total}
              detail="Base completa · clique para limpar os filtros"
              icon={<Building2 className="h-5 w-5" />}
              tone="bg-muted text-muted-foreground"
              onClick={() => change({}, true)}
            />

            <Metric
              title="Risco alto ou crítico"
              value={stats.priority}
              detail={`${stats.bands.CRITICAL} críticos · ${stats.bands.HIGH} altos`}
              icon={<ShieldAlert className="h-5 w-5" />}
              tone="bg-red-50 text-red-600 dark:bg-red-950/40"
              onClick={() =>
                change({ risk: "PRIORITY" }, true)
              }
            />

            <Metric
              title="RMs abertas"
              value={`${stats.unknownOpen ? "≥ " : ""}${stats.openRisks}`}
              detail={
                stats.unknownOpen
                  ? `${stats.unknownOpen} fornecedor(es) sem contagem disponível`
                  : "Soma das RMs abertas de toda a carteira"
              }
              icon={<ClipboardList className="h-5 w-5" />}
              tone="bg-blue-50 text-blue-600 dark:bg-blue-950/40"
            />

            <Metric
              title="Revisar cobertura"
              value={stats.review}
              detail="Resultados parciais ou sem score disponível"
              icon={<FileWarning className="h-5 w-5" />}
              tone="bg-orange-50 text-orange-600 dark:bg-orange-950/40"
              onClick={() =>
                change({ coverage: "REVIEW" }, true)
              }
            />
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-7">
              <CardHeader>
                <CardTitle>Distribuição do portfólio</CardTitle>

                <CardDescription>
                  Risco operacional da carteira completa.
                  Clique em uma categoria para filtrar.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div
                  className="flex h-3 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  {(
                    Object.keys(bandLabels) as (
                      keyof typeof bandLabels
                    )[]
                  ).map(
                    band =>
                      stats.bands[band] > 0 && (
                        <div
                          key={band}
                          className={riskBars[band]}
                          style={{
                            width: `${
                              stats.scored
                                ? (stats.bands[band] /
                                    stats.scored) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      )
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    Object.keys(bandLabels) as (
                      keyof typeof bandLabels
                    )[]
                  ).map(band => (
                    <button
                      key={band}
                      type="button"
                      onClick={() =>
                        change({ risk: band }, true)
                      }
                      className="flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${riskBars[band]}`}
                        />

                        <span className="text-sm">
                          {bandLabels[band]}
                        </span>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold tabular-nums">
                          {stats.bands[band]}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {stats.scored
                            ? Math.round(
                                (stats.bands[band] /
                                  stats.scored) *
                                  100
                              )
                            : 0}
                          %
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Distribuição entre {stats.scored} fornecedor(es)
                  com score, incluindo resultados parciais.
                  Sem score não significa baixo risco.
                </p>
              </CardContent>
            </Card>

            <Card className="xl:col-span-5">
              <CardHeader>
                <CardTitle>Cobertura dos dados</CardTitle>

                <CardDescription>
                  Identifique lacunas antes de interpretar a pontuação.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {(
                  Object.keys(coverageLabels) as (
                    keyof typeof coverageLabels
                  )[]
                ).map(coverage => (
                  <button
                    key={coverage}
                    type="button"
                    onClick={() => change({ coverage }, true)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          coverage === "COMPLETE"
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                            : coverage === "NO_OPEN_RISKS"
                              ? "bg-muted text-muted-foreground"
                              : "bg-orange-50 text-orange-600 dark:bg-orange-950/40"
                        }`}
                      >
                        <FileWarning className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-sm font-medium">
                          {coverageLabels[coverage]}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {coverageHints[coverage]}
                        </p>
                      </div>
                    </div>

                    <span className="font-semibold tabular-nums">
                      {stats.coverage[coverage]}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5" />
                    Filtros da análise
                  </CardTitle>

                  <CardDescription className="mt-1">
                    Refine a tabela por fornecedor, risco,
                    cobertura e situação cadastral.
                  </CardDescription>
                </div>

                <Badge variant="outline">
                  {activeFilterCount} filtro(s) ativo(s)
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                <div className="space-y-2 xl:col-span-2">
                  <label
                    htmlFor="supplier-search"
                    className="text-sm font-medium"
                  >
                    Buscar fornecedor
                  </label>

                  <Input
                    id="supplier-search"
                    placeholder="Nome ou código SAP..."
                    value={filters.search}
                    onChange={event =>
                      change({ search: event.target.value })
                    }
                  />
                </div>

                <FilterSelect
                  label="Risco operacional"
                  value={filters.risk}
                  onChange={value =>
                    change({
                      risk: value as PortfolioFilters["risk"],
                    })
                  }
                  options={[
                    ["ALL", "Todos os riscos"],
                    ["PRIORITY", "Alto ou crítico"],
                    ...Object.entries(bandLabels),
                  ]}
                />

                <FilterSelect
                  label="Cobertura"
                  value={filters.coverage}
                  onChange={value =>
                    change({
                      coverage:
                        value as PortfolioFilters["coverage"],
                    })
                  }
                  options={[
                    ["ALL", "Todas as coberturas"],
                    ["REVIEW", "Revisar cobertura"],
                    ...Object.entries(coverageLabels),
                  ]}
                />

                <FilterSelect
                  label="Status cadastral"
                  value={filters.status}
                  onChange={value => change({ status: value })}
                  options={[
                    ["ALL", "Todos os status"],
                    ...Object.entries(statusLabels),
                  ]}
                />

                <FilterSelect
                  label="País"
                  value={filters.country}
                  onChange={value => change({ country: value })}
                  options={[
                    ["ALL", "Todos os países"],
                    ...countries,
                  ]}
                />

                <FilterSelect
                  label="Ordenação"
                  value={filters.sort}
                  onChange={value =>
                    change({
                      sort: value as PortfolioFilters["sort"],
                    })
                  }
                  options={[
                    ["SCORE", "Maior score"],
                    ["OPEN", "Mais RMs abertas"],
                    ["NAME", "Nome A–Z"],
                  ]}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => change({}, true)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Limpar filtros
                </Button>

                <p className="text-xs text-muted-foreground">
                  Filtros aplicados automaticamente à tabela.
                  Os indicadores acima representam a carteira completa.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Fila priorizada de fornecedores
                  </CardTitle>

                  <CardDescription className="mt-1">
                    Consulte a cobertura e acesse a RM que
                    determina o score.
                  </CardDescription>
                </div>

                <Badge variant="secondary">
                  {visible.length} resultado(s)
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm font-semibold">
                  Faixas do Risk Score
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  O score considera as RMs abertas. Status cadastral
                  e cobertura são informações independentes.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={scoreTones.LOW}
                  >
                    Baixo · 0–29
                  </Badge>

                  <Badge
                    variant="outline"
                    className={scoreTones.ATTENTION}
                  >
                    Atenção · 30–59
                  </Badge>

                  <Badge
                    variant="outline"
                    className={scoreTones.HIGH}
                  >
                    Alto · 60–79
                  </Badge>

                  <Badge
                    variant="outline"
                    className={scoreTones.CRITICAL}
                  >
                    Crítico · 80–100
                  </Badge>
                </div>
              </div>

              <SuppliersTable
                data={visible}
                page={page}
                onPageChange={setPage}
                canViewRisks={
                  user?.permissions.includes("RISK_VIEW") ?? false
                }
              />
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}

export default function SuppliersPage() {
  const { user } = useAuth()

  return (
    <ProtectedRoute permission="SUPPLIER_VIEW">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />
          <SuppliersPortfolio key={user?.id} />
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}