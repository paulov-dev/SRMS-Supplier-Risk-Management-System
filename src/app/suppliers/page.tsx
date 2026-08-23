"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { SuppliersTable } from "@/components/suppliers/suppliers-table"

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

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    AlertTriangle,
    CircleHelp,
    Clock3,
    ContactRound,
    Factory,
    Gauge,
    Loader2,
    Plus,
    RefreshCw,
} from "lucide-react"

type SupplierStatus =
    | "ACTIVE"
    | "UNDER_MONITORING"
    | "AT_RISK"
    | "BLOCKED"
    | "INACTIVE"

type PortfolioFilter =
    | "all"
    | "attention"
    | SupplierStatus

type Country = {
    id: string
    name: string
    isoCode?: string
}

type SupplierContact = {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    position?: string | null
    createdAt?: string
}

type Supplier = {
    id: string
    name: string
    supplierCodeSap?: string
    status: SupplierStatus
    address?: string | null
    riskScore?: number | null
    lastRiskCalculation?: string | null
    createdAt?: string
    country: {
        id: string
        name: string
        isoCode?: string
    }
    contacts: SupplierContact[]
}

const STATUS_PRIORITY: Record<SupplierStatus, number> = {
    BLOCKED: 0,
    AT_RISK: 1,
    UNDER_MONITORING: 2,
    INACTIVE: 3,
    ACTIVE: 4,
}

const ATTENTION_STATUSES: SupplierStatus[] = [
    "UNDER_MONITORING",
    "AT_RISK",
    "BLOCKED",
]

function isRiskCalculationStale(value?: string | null) {
    if (!value) return false

    const calculationDate = new Date(value)

    if (Number.isNaN(calculationDate.getTime())) {
        return false
    }

    const now = new Date()
    const differenceInMilliseconds =
        now.getTime() - calculationDate.getTime()

    const differenceInDays =
        differenceInMilliseconds / (1000 * 60 * 60 * 24)

    return differenceInDays > 30
}

function MetricCard({
    title,
    value,
    description,
    icon,
    attention = false,
}: {
    title: string
    value: string | number
    description: string
    icon: React.ReactNode
    attention?: boolean
}) {
    return (
        <Card
            className={
                attention
                    ? "border-orange-200 dark:border-orange-900"
                    : undefined
            }
        >
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {title}
                        </p>

                        <p className="mt-2 text-3xl font-semibold tracking-tight">
                            {value}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                            {description}
                        </p>
                    </div>

                    <div
                        className={
                            attention
                                ? "rounded-lg bg-orange-50 p-2.5 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                                : "rounded-lg bg-muted p-2.5 text-muted-foreground"
                        }
                    >
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function StatusLegendItem({
    label,
    value,
    dotClassName,
}: {
    label: string
    value: number
    dotClassName: string
}) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <span
                className={`h-2.5 w-2.5 rounded-full ${dotClassName}`}
            />

            <span className="text-muted-foreground">
                {label}
            </span>

            <span className="ml-auto font-medium tabular-nums">
                {value}
            </span>
        </div>
    )
}

function QualityItem({
    icon,
    value,
    description,
}: {
    icon: React.ReactNode
    value: number
    description: string
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="rounded-md bg-muted p-2 text-muted-foreground">
                {icon}
            </div>

            <div>
                <p className="font-medium tabular-nums">
                    {value}
                </p>

                <p className="text-xs text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    )
}

export default function SuppliersPage() {
    const router = useRouter()

    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [countries, setCountries] = useState<Country[]>([])

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [portfolioFilter, setPortfolioFilter] =
        useState<PortfolioFilter>("all")

    const formatSuppliers = useCallback(
        (data: Supplier[]): Supplier[] => {
            return data.map((supplier) => ({
                ...supplier,
                supplierCodeSap:
                    supplier.supplierCodeSap ?? undefined,
                lastRiskCalculation:
                    supplier.lastRiskCalculation ?? null,
                riskScore: supplier.riskScore ?? null,
                contacts: supplier.contacts ?? [],
                country: supplier.country ?? {
                    id: "",
                    name: "Não informado",
                },
            }))
        },
        []
    )

    const loadPageData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const [suppliersResponse, countriesResponse] =
                await Promise.all([
                    fetch("/api/suppliers", {
                        credentials: "include",
                        cache: "no-store",
                    }),
                    fetch("/api/countries", {
                        credentials: "include",
                        cache: "no-store",
                    }),
                ])

            const suppliersData =
                await suppliersResponse.json()

            const countriesData =
                await countriesResponse.json()

            if (!suppliersResponse.ok) {
                throw new Error(
                    suppliersData.details ||
                        suppliersData.error ||
                        "Erro ao buscar fornecedores"
                )
            }

            if (!countriesResponse.ok) {
                throw new Error(
                    countriesData.details ||
                        countriesData.error ||
                        "Erro ao buscar países"
                )
            }

            setSuppliers(formatSuppliers(suppliersData))
            setCountries(countriesData)
        } catch (loadError) {
            console.error(loadError)

            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "Não foi possível carregar os fornecedores."
            )
        } finally {
            setLoading(false)
        }
    }, [formatSuppliers])

    const loadSuppliers = useCallback(async () => {
        try {
            setRefreshing(true)
            setError(null)

            const response = await fetch("/api/suppliers", {
                credentials: "include",
                cache: "no-store",
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.details ||
                        data.error ||
                        "Erro ao atualizar fornecedores"
                )
            }

            setSuppliers(formatSuppliers(data))
        } catch (refreshError) {
            console.error(refreshError)

            setError(
                refreshError instanceof Error
                    ? refreshError.message
                    : "Não foi possível atualizar os fornecedores."
            )
        } finally {
            setRefreshing(false)
        }
    }, [formatSuppliers])

    useEffect(() => {
        void loadPageData()
    }, [loadPageData])

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

        const attention = monitoring + atRisk + blocked

        const suppliersWithScore = suppliers.filter(
            (supplier) =>
                typeof supplier.riskScore === "number"
        )

        const scoreCoverage =
            total > 0
                ? Math.round(
                      (suppliersWithScore.length / total) * 100
                  )
                : 0

        const averageRiskScore =
            suppliersWithScore.length > 0
                ? Math.round(
                      suppliersWithScore.reduce(
                          (totalScore, supplier) =>
                              totalScore +
                              (supplier.riskScore ?? 0),
                          0
                      ) / suppliersWithScore.length
                  )
                : null

        const withoutScore =
            total - suppliersWithScore.length

        const staleRiskCalculations = suppliers.filter(
            (supplier) =>
                isRiskCalculationStale(
                    supplier.lastRiskCalculation
                )
        ).length

        const withoutContacts = suppliers.filter(
            (supplier) => supplier.contacts.length === 0
        ).length

        return {
            total,
            active,
            monitoring,
            atRisk,
            blocked,
            inactive,
            attention,
            scoreCoverage,
            averageRiskScore,
            withoutScore,
            staleRiskCalculations,
            withoutContacts,
        }
    }, [suppliers])

    const visibleSuppliers = useMemo(() => {
        const filtered = suppliers.filter((supplier) => {
            if (portfolioFilter === "all") {
                return true
            }

            if (portfolioFilter === "attention") {
                return ATTENTION_STATUSES.includes(
                    supplier.status
                )
            }

            return supplier.status === portfolioFilter
        })

        return [...filtered].sort((supplierA, supplierB) => {
            const statusDifference =
                STATUS_PRIORITY[supplierA.status] -
                STATUS_PRIORITY[supplierB.status]

            if (statusDifference !== 0) {
                return statusDifference
            }

            return supplierA.name.localeCompare(
                supplierB.name,
                "pt-BR"
            )
        })
    }, [suppliers, portfolioFilter])

    function getPercentage(value: number) {
        if (stats.total === 0) return 0

        return (value / stats.total) * 100
    }

    return (
        <ProtectedRoute permission="SUPPLIER_VIEW">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-6 p-4 md:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight">
                                    Carteira de fornecedores
                                </h1>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Priorize exceções, qualidade cadastral e fornecedores que exigem decisão.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void loadSuppliers()}
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
                                    type="button"
                                    onClick={() =>
                                        router.push("/suppliers/create")
                                    }
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Novo fornecedor
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <MetricCard
                                title="Base total"
                                value={stats.total}
                                description="Fornecedores cadastrados"
                                icon={<Factory className="h-5 w-5" />}
                            />

                            <MetricCard
                                title="Exigem atenção"
                                value={stats.attention}
                                description="Monitoramento, risco ou bloqueio"
                                attention={stats.attention > 0}
                                icon={
                                    <AlertTriangle className="h-5 w-5" />
                                }
                            />

                            <MetricCard
                                title="Cobertura do score"
                                value={`${stats.scoreCoverage}%`}
                                description="Fornecedores com avaliação calculada"
                                icon={<Gauge className="h-5 w-5" />}
                            />
                        </div>

                        {error && (
                            <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
                                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        {error}
                                    </p>

                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            void loadPageData()
                                        }
                                    >
                                        Tentar novamente
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid items-start gap-6 xl:grid-cols-12">
                            <Card className="min-w-0 xl:col-span-9">
                                <CardHeader className="gap-4 border-b md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <CardTitle>
                                            Fila de decisão
                                        </CardTitle>

                                        <CardDescription className="mt-1">
                                            Status críticos aparecem primeiro; o score permanece como apoio à análise.
                                        </CardDescription>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary">
                                            {visibleSuppliers.length}{" "}
                                            resultado(s)
                                        </Badge>

                                        <Select
                                            value={portfolioFilter}
                                            onValueChange={(value) =>
                                                setPortfolioFilter(
                                                    value as PortfolioFilter
                                                )
                                            }
                                        >
                                            <SelectTrigger className="w-[210px]">
                                                <SelectValue placeholder="Visão da carteira" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todos os fornecedores
                                                </SelectItem>
                                                <SelectItem value="attention">
                                                    Exigem atenção
                                                </SelectItem>
                                                <SelectItem value="ACTIVE">
                                                    Ativos
                                                </SelectItem>
                                                <SelectItem value="UNDER_MONITORING">
                                                    Em monitoramento
                                                </SelectItem>
                                                <SelectItem value="AT_RISK">
                                                    Em risco
                                                </SelectItem>
                                                <SelectItem value="BLOCKED">
                                                    Bloqueados
                                                </SelectItem>
                                                <SelectItem value="INACTIVE">
                                                    Inativos
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-6">
                                    {loading ? (
                                        <div className="flex h-72 items-center justify-center">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Carregando fornecedores...
                                            </div>
                                        </div>
                                    ) : (
                                        <SuppliersTable
                                            data={visibleSuppliers}
                                            countries={countries}
                                            onReload={loadSuppliers}
                                        />
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="xl:col-span-3">
                                <CardHeader>
                                    <CardTitle>
                                        Saúde da carteira
                                    </CardTitle>

                                    <CardDescription>
                                        Distribuição de status e qualidade dos dados.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    <div>
                                        <div
                                            className="flex h-2 overflow-hidden rounded-full bg-muted"
                                            role="img"
                                            aria-label="Distribuição dos fornecedores por status"
                                        >
                                            <span
                                                className="bg-green-600"
                                                style={{
                                                    width: `${getPercentage(
                                                        stats.active
                                                    )}%`,
                                                }}
                                            />

                                            <span
                                                className="bg-yellow-500"
                                                style={{
                                                    width: `${getPercentage(
                                                        stats.monitoring
                                                    )}%`,
                                                }}
                                            />

                                            <span
                                                className="bg-red-600"
                                                style={{
                                                    width: `${getPercentage(
                                                        stats.atRisk +
                                                            stats.blocked
                                                    )}%`,
                                                }}
                                            />

                                            <span
                                                className="bg-slate-400"
                                                style={{
                                                    width: `${getPercentage(
                                                        stats.inactive
                                                    )}%`,
                                                }}
                                            />
                                        </div>

                                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                            <StatusLegendItem
                                                label="Ativos"
                                                value={stats.active}
                                                dotClassName="bg-green-600"
                                            />

                                            <StatusLegendItem
                                                label="Monitoramento"
                                                value={stats.monitoring}
                                                dotClassName="bg-yellow-500"
                                            />

                                            <StatusLegendItem
                                                label="Risco/bloqueio"
                                                value={
                                                    stats.atRisk +
                                                    stats.blocked
                                                }
                                                dotClassName="bg-red-600"
                                            />

                                            <StatusLegendItem
                                                label="Inativos"
                                                value={stats.inactive}
                                                dotClassName="bg-slate-400"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-3">
                                        <QualityItem
                                            icon={
                                                <CircleHelp className="h-4 w-4" />
                                            }
                                            value={stats.withoutScore}
                                            description="Sem risk score"
                                        />

                                        <QualityItem
                                            icon={
                                                <Clock3 className="h-4 w-4" />
                                            }
                                            value={
                                                stats.staleRiskCalculations
                                            }
                                            description="Avaliações com mais de 30 dias"
                                        />

                                        <QualityItem
                                            icon={
                                                <ContactRound className="h-4 w-4" />
                                            }
                                            value={stats.withoutContacts}
                                            description="Sem contato cadastrado"
                                        />
                                    </div>

                                    <div className="rounded-lg bg-muted/50 p-4">
                                        <p className="text-sm text-muted-foreground">
                                            Risk score médio
                                        </p>

                                        <p className="mt-1 text-2xl font-semibold tabular-nums">
                                            {stats.averageRiskScore ?? "-"}
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Calculado apenas sobre fornecedores avaliados.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}
