"use client"

import { useEffect, useMemo, useState } from "react"

import {
  AlertTriangle,
  BarChart3,
  Loader2,
  Package,
  ShieldAlert,
  Truck,
  UserRound,
} from "lucide-react"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"

import { toast } from "sonner"

type AnalyticsFilters = {
  search: string
  workflowStatus: string
  riskLevel: string
  supplierId: string
  assignedToId: string
  openingReason: string
  pageSize?: string
}

type AnalyticsResponse = {
  summary: {
    total: number
    open: number
    closed: number
    canceled: number

    red: number
    yellow: number
    green: number

    national: number
    international: number

    withoutResponsible: number
    withoutParts: number
    withParts: number

    withLogistics: number
    withoutLogistics: number
    pendingLogistics: number

    totalParts: number

    totalActionPlans: number
    completedActionPlans: number
    pendingActionPlans: number
    overdueActionPlans: number

    openRedRisks: number
    openWithoutParts: number
    openWithoutResponsible: number
  }

  alerts: {
    openRedRisks: number
    openWithoutParts: number
    openWithoutResponsible: number
    overdueActionPlans: number
    pendingLogistics: number
  }

  charts: {
    byResponsible: {
      responsible: string
      total: number
      open: number
      closed: number
      canceled: number
      red: number
      yellow: number
      green: number
    }[]

    statusByResponsible: {
      responsible: string
      total: number
      open: number
      closed: number
      canceled: number
      red: number
      yellow: number
      green: number
    }[]

    riskLevelByResponsible: {
      responsible: string
      total: number
      open: number
      closed: number
      canceled: number
      red: number
      yellow: number
      green: number
    }[]

    topSuppliers: {
      supplier: string
      total: number
      open: number
      closed: number
      canceled: number
      red: number
      yellow: number
      green: number
    }[]

    topCriticalSuppliers: {
      supplier: string
      total: number
      open: number
      closed: number
      canceled: number
      red: number
      yellow: number
      green: number
    }[]

    byRiskLevel: {
      level: string
      total: number
    }[]

    byWorkflowStatus: {
      status: string
      total: number
    }[]

    byOpeningReason: {
      reason: string
      total: number
      red: number
      yellow: number
      green: number
    }[]

    byCountry: {
      country: string
      total: number
    }[]

    nationalVsInternational: {
      prefix: string
      total: number
    }[]

    byWeek: {
      week: string
      year: number
      weekNumber: number
      total: number
      open: number
      closed: number
      canceled: number
      red: number
      yellow: number
      green: number
    }[]

    byCreatedBy: {
      user: string
      total: number
    }[]

    openAgeBuckets: {
      bucket: string
      total: number
    }[]

    partStatusDistribution: {
      status: string
      total: number
    }[]

    partLogisticsStatusDistribution: {
      status: string
      total: number
    }[]

    logisticsStatusDistribution: {
      status: string
      total: number
    }[]

    overdueActionPlansByResponsible: {
      responsible: string
      total: number
    }[]

    actionPlansByResponsible: {
      responsible: string
      total: number
      completed: number
      pending: number
      overdue: number
    }[]
  }
}

const COLORS = {
  blue: "#2563eb",
  blueLight: "#60a5fa",
  red: "#dc2626",
  yellow: "#f59e0b",
  green: "#16a34a",
  emerald: "#10b981",
  orange: "#f97316",
  purple: "#7c3aed",
  pink: "#ec4899",
  cyan: "#06b6d4",
  slate: "#64748b",
  gray: "#94a3b8",
}

const chartConfig = {
  total: {
    label: "Total",
    color: COLORS.blue,
  },
  open: {
    label: "Abertas",
    color: COLORS.blue,
  },
  closed: {
    label: "Fechadas",
    color: COLORS.green,
  },
  canceled: {
    label: "Canceladas",
    color: COLORS.slate,
  },
  red: {
    label: "Red",
    color: COLORS.red,
  },
  yellow: {
    label: "Yellow",
    color: COLORS.yellow,
  },
  green: {
    label: "Green",
    color: COLORS.green,
  },
  completed: {
    label: "Concluídos",
    color: COLORS.green,
  },
  pending: {
    label: "Pendentes",
    color: COLORS.orange,
  },
  overdue: {
    label: "Atrasados",
    color: COLORS.red,
  },
} satisfies ChartConfig

function buildAnalyticsParams(filters: AnalyticsFilters) {
  const params = new URLSearchParams()

  if (filters.search.trim()) {
    params.set("search", filters.search.trim())
  }

  if (filters.workflowStatus !== "all") {
    params.set(
      "workflowStatus",
      filters.workflowStatus
    )
  }

  if (filters.riskLevel !== "all") {
    params.set("riskLevel", filters.riskLevel)
  }

  if (filters.supplierId !== "all") {
    params.set("supplierId", filters.supplierId)
  }

  if (filters.assignedToId !== "all") {
    params.set("assignedToId", filters.assignedToId)
  }

  if (filters.openingReason !== "all") {
    params.set(
      "openingReason",
      filters.openingReason
    )
  }

  return params
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    OPEN: "Aberta",
    CLOSED: "Fechada",
    CANCELED: "Cancelada",
    PENDING: "Pendente",
    APPROVED: "Aprovada",
    REJECTED: "Recusada",
    NOT_REQUESTED: "Não solicitado",
    IN_LOGISTICS: "Em logística",
  }

  return labels[status] || status
}

function riskLevelLabel(level: string) {
  const labels: Record<string, string> = {
    RED: "Red",
    YELLOW: "Yellow",
    GREEN: "Green",
  }

  return labels[level] || level
}

function partStatusLabel(status: string) {
  const labels: Record<string, string> = {
    RED: "Red",
    YELLOW: "Yellow",
    GREEN: "Green",
    ORANGE: "Sem demanda",
    GREY: "Cancelado",
    BLUE: "Concluído",
  }

  return labels[status] || status
}

function EmptyChart() {
  return (
    <div className="flex h-[170px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      Sem dados para exibir
    </div>
  )
}

function DashboardCard({
  title,
  description,
  children,
  badge,
}: {
  title: string
  description?: string
  children: React.ReactNode
  badge?: string
}) {
  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      <CardHeader className="space-y-1.5 px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">
            {title}
          </CardTitle>

          {badge && (
            <Badge variant="outline">
              {badge}
            </Badge>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {children}
      </CardContent>
    </Card>
  )
}

function CompactMetricCard({
  title,
  value,
  description,
  icon,
  color,
}: {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              {title}
            </p>

            <p className="mt-1 text-2xl font-bold leading-none">
              {value}
            </p>

            <p className="mt-1 truncate text-xs text-muted-foreground">
              {description}
            </p>
          </div>

          <div
            className="rounded-lg p-2 text-white"
            style={{
              backgroundColor: color,
            }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DonutChart({
  data,
  nameKey,
  dataKey,
  colors,
}: {
  data: Record<string, any>[]
  nameKey: string
  dataKey: string
  colors: string[]
}) {
  if (!data.length) {
    return <EmptyChart />
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto h-[165px] w-full"
    >
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent hideLabel />}
        />

        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          innerRadius={42}
          outerRadius={64}
          paddingAngle={3}
          strokeWidth={1}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
            />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

function VerticalBarChartCard({
  data,
  nameKey,
  dataKey,
  color,
  height = 180,
}: {
  data: Record<string, any>[]
  nameKey: string
  dataKey: string
  color: string
  height?: number
}) {
  if (!data.length) {
    return <EmptyChart />
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{
        height,
      }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        margin={{
          left: 0,
          right: 8,
          top: 8,
          bottom: 0,
        }}
      >
        <CartesianGrid vertical={false} />

        <XAxis
          dataKey={nameKey}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={11}
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          fontSize={11}
        />

        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent />}
        />

        <Bar
          dataKey={dataKey}
          radius={[6, 6, 0, 0]}
          fill={color}
        />
      </BarChart>
    </ChartContainer>
  )
}

function HorizontalBarChartCard({
  data,
  nameKey,
  dataKey,
  color,
  height = 200,
}: {
  data: Record<string, any>[]
  nameKey: string
  dataKey: string
  color: string
  height?: number
}) {
  if (!data.length) {
    return <EmptyChart />
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{
        height,
      }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{
          left: 4,
          right: 8,
          top: 4,
          bottom: 0,
        }}
      >
        <CartesianGrid horizontal={false} />

        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          fontSize={11}
        />

        <YAxis
          type="category"
          dataKey={nameKey}
          tickLine={false}
          axisLine={false}
          width={120}
          fontSize={11}
        />

        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent />}
        />

        <Bar
          dataKey={dataKey}
          radius={[0, 6, 6, 0]}
          fill={color}
        />
      </BarChart>
    </ChartContainer>
  )
}

function StackedHorizontalChart({
  data,
  nameKey,
  keys,
  height = 210,
}: {
  data: Record<string, any>[]
  nameKey: string
  keys: {
    key: string
    color: string
  }[]
  height?: number
}) {
  if (!data.length) {
    return <EmptyChart />
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{
        height,
      }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{
          left: 4,
          right: 8,
          top: 4,
          bottom: 0,
        }}
      >
        <CartesianGrid horizontal={false} />

        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          fontSize={11}
        />

        <YAxis
          type="category"
          dataKey={nameKey}
          tickLine={false}
          axisLine={false}
          width={120}
          fontSize={11}
        />

        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent />}
        />

        {keys.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            stackId="a"
            fill={item.color}
            radius={[0, 5, 5, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

function TrendAreaChart({
  data,
  height = 210,
}: {
  data: Record<string, any>[]
  height?: number
}) {
  if (!data.length) {
    return <EmptyChart />
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{
        height,
      }}
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{
          left: 0,
          right: 8,
          top: 8,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient
            id="analyticsArea"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="5%"
              stopColor={COLORS.blue}
              stopOpacity={0.35}
            />
            <stop
              offset="95%"
              stopColor={COLORS.blue}
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} />

        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={11}
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          fontSize={11}
        />

        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent />}
        />

        <Area
          type="monotone"
          dataKey="total"
          stroke={COLORS.blue}
          fill="url(#analyticsArea)"
          strokeWidth={2.5}
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function RiskAnalytics({
  filters,
}: {
  filters: AnalyticsFilters
}) {
  const [analytics, setAnalytics] =
    useState<AnalyticsResponse | null>(null)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.search,
    filters.workflowStatus,
    filters.riskLevel,
    filters.supplierId,
    filters.assignedToId,
    filters.openingReason,
  ])

  async function loadAnalytics() {
    try {
      setLoading(true)

      const params = buildAnalyticsParams(filters)

      const res = await fetch(
        `/api/risk/analytics?${params.toString()}`,
        {
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error || "Erro ao carregar análises"
        )
      }

      setAnalytics(data)
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar análises"
      )
    } finally {
      setLoading(false)
    }
  }

  const riskLevelData = useMemo(() => {
    const values = analytics?.charts.byRiskLevel || []

    return ["RED", "YELLOW", "GREEN"].map((level) => ({
      level: riskLevelLabel(level),
      total:
        values.find((item) => item.level === level)
          ?.total || 0,
    }))
  }, [analytics])

  const workflowStatusData = useMemo(() => {
    const values =
      analytics?.charts.byWorkflowStatus || []

    return ["OPEN", "CLOSED", "CANCELED"].map(
      (status) => ({
        status: statusLabel(status),
        total:
          values.find((item) => item.status === status)
            ?.total || 0,
      })
    )
  }, [analytics])

  const partStatusData = useMemo(() => {
    return (
      analytics?.charts.partStatusDistribution.map(
        (item) => ({
          status: partStatusLabel(item.status),
          total: item.total,
        })
      ) || []
    )
  }, [analytics])

  const logisticsStatusData = useMemo(() => {
    return (
      analytics?.charts.logisticsStatusDistribution.map(
        (item) => ({
          status: statusLabel(item.status),
          total: item.total,
        })
      ) || []
    )
  }, [analytics])

  const partLogisticsStatusData = useMemo(() => {
    return (
      analytics?.charts.partLogisticsStatusDistribution.map(
        (item) => ({
          status: statusLabel(item.status),
          total: item.total,
        })
      ) || []
    )
  }, [analytics])

  const nationalVsInternationalData = useMemo(() => {
    return (
      analytics?.charts.nationalVsInternational.map(
        (item) => ({
          prefix: item.prefix,
          total: item.total,
        })
      ) || []
    )
  }, [analytics])

  if (loading) {
    return (
      <Card className="rounded-xl">
        <CardContent className="flex items-center justify-center p-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando análises...
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />

            <h2 className="text-xl font-semibold">
              Dashboard de Análises
            </h2>
          </div>

          <p className="text-sm text-muted-foreground">
            Visão consolidada das RMs, responsáveis,
            fornecedores, PNs, logística e planos de ação.
          </p>
        </div>

        <Badge variant="outline">
          {analytics.summary.total} RMs filtradas
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CompactMetricCard
          title="Red abertas"
          value={analytics.alerts.openRedRisks}
          description="Críticas em aberto"
          icon={<ShieldAlert className="h-4 w-4" />}
          color={COLORS.red}
        />

        <CompactMetricCard
          title="Sem PN"
          value={analytics.alerts.openWithoutParts}
          description="Abertas sem PN"
          icon={<Package className="h-4 w-4" />}
          color={COLORS.orange}
        />

        <CompactMetricCard
          title="Sem responsável"
          value={analytics.alerts.openWithoutResponsible}
          description="Abertas sem owner"
          icon={<UserRound className="h-4 w-4" />}
          color={COLORS.purple}
        />

        <CompactMetricCard
          title="Ações atrasadas"
          value={analytics.alerts.overdueActionPlans}
          description="Planos vencidos"
          icon={<AlertTriangle className="h-4 w-4" />}
          color={COLORS.yellow}
        />

        <CompactMetricCard
          title="Logística pendente"
          value={analytics.alerts.pendingLogistics}
          description="Aguardando análise"
          icon={<Truck className="h-4 w-4" />}
          color={COLORS.cyan}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <DashboardCard
            title="Evolução semanal"
            description="Volume de RMs abertas por semana"
            badge="Tendência"
          >
            <TrendAreaChart
              data={analytics.charts.byWeek}
              height={210}
            />
          </DashboardCard>
        </div>

        <div className="xl:col-span-3">
          <DashboardCard
            title="Farol"
            description="Distribuição por criticidade"
          >
            <DonutChart
              data={riskLevelData}
              nameKey="level"
              dataKey="total"
              colors={[
                COLORS.red,
                COLORS.yellow,
                COLORS.green,
              ]}
            />

            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              {riskLevelData.map((item) => (
                <div
                  key={item.level}
                  className="rounded-md border p-1.5"
                >
                  <p className="font-medium">
                    {item.level}
                  </p>

                  <p className="text-muted-foreground">
                    {item.total}
                  </p>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>

        <div className="xl:col-span-3">
          <DashboardCard
            title="Status"
            description="Fluxo das RMs"
          >
            <DonutChart
              data={workflowStatusData}
              nameKey="status"
              dataKey="total"
              colors={[
                COLORS.blue,
                COLORS.green,
                COLORS.slate,
              ]}
            />

            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              {workflowStatusData.map((item) => (
                <div
                  key={item.status}
                  className="rounded-md border p-1.5"
                >
                  <p className="font-medium">
                    {item.status}
                  </p>

                  <p className="text-muted-foreground">
                    {item.total}
                  </p>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <DashboardCard
            title="RMs por responsável"
            description="Top responsáveis por volume"
          >
            <HorizontalBarChartCard
              data={analytics.charts.byResponsible.slice(
                0,
                6
              )}
              nameKey="responsible"
              dataKey="total"
              color={COLORS.blue}
              height={200}
            />
          </DashboardCard>
        </div>

        <div className="xl:col-span-4">
          <DashboardCard
            title="Top fornecedores"
            description="Fornecedores com mais RMs"
          >
            <HorizontalBarChartCard
              data={analytics.charts.topSuppliers.slice(
                0,
                6
              )}
              nameKey="supplier"
              dataKey="total"
              color={COLORS.pink}
              height={200}
            />
          </DashboardCard>
        </div>

        <div className="xl:col-span-4">
          <DashboardCard
            title="Fornecedores críticos"
            description="Maior volume de RMs Red"
          >
            <HorizontalBarChartCard
              data={analytics.charts.topCriticalSuppliers.slice(
                0,
                6
              )}
              nameKey="supplier"
              dataKey="red"
              color={COLORS.red}
              height={200}
            />
          </DashboardCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <DashboardCard
            title="Status por responsável"
            description="Abertas, fechadas e canceladas"
          >
            <StackedHorizontalChart
              data={analytics.charts.statusByResponsible.slice(
                0,
                6
              )}
              nameKey="responsible"
              height={210}
              keys={[
                {
                  key: "open",
                  color: COLORS.blue,
                },
                {
                  key: "closed",
                  color: COLORS.green,
                },
                {
                  key: "canceled",
                  color: COLORS.slate,
                },
              ]}
            />
          </DashboardCard>
        </div>

        <div className="xl:col-span-6">
          <DashboardCard
            title="Farol por responsável"
            description="Red, Yellow e Green por owner"
          >
            <StackedHorizontalChart
              data={analytics.charts.riskLevelByResponsible.slice(
                0,
                6
              )}
              nameKey="responsible"
              height={210}
              keys={[
                {
                  key: "red",
                  color: COLORS.red,
                },
                {
                  key: "yellow",
                  color: COLORS.yellow,
                },
                {
                  key: "green",
                  color: COLORS.green,
                },
              ]}
            />
          </DashboardCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <DashboardCard
            title="Motivos de abertura"
            description="Principais causas"
          >
            <HorizontalBarChartCard
              data={analytics.charts.byOpeningReason.slice(
                0,
                6
              )}
              nameKey="reason"
              dataKey="total"
              color={COLORS.purple}
              height={210}
            />
          </DashboardCard>
        </div>

        <div className="xl:col-span-4">
          <DashboardCard
            title="RMs por país"
            description="Distribuição geográfica"
          >
            <HorizontalBarChartCard
              data={analytics.charts.byCountry.slice(
                0,
                6
              )}
              nameKey="country"
              dataKey="total"
              color={COLORS.cyan}
              height={210}
            />
          </DashboardCard>
        </div>

        <div className="xl:col-span-4">
          <DashboardCard
            title="Criadas por usuário"
            description="Usuários que mais abriram RMs"
          >
            <HorizontalBarChartCard
              data={analytics.charts.byCreatedBy.slice(
                0,
                6
              )}
              nameKey="user"
              dataKey="total"
              color={COLORS.emerald}
              height={210}
            />
          </DashboardCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <DashboardCard
            title="Nacional x Internacional"
            description="Origem das RMs"
          >
            <VerticalBarChartCard
              data={nationalVsInternationalData}
              nameKey="prefix"
              dataKey="total"
              color={COLORS.purple}
              height={180}
            />
          </DashboardCard>
        </div>

        <div className="xl:col-span-3">
          <DashboardCard
            title="Idade das abertas"
            description="Tempo em aberto"
          >
            <VerticalBarChartCard
              data={analytics.charts.openAgeBuckets}
              nameKey="bucket"
              dataKey="total"
              color={COLORS.orange}
              height={180}
            />
          </DashboardCard>
        </div>

        <div className="xl:col-span-3">
          <DashboardCard
            title="Status dos PNs"
            description="Situação dos part numbers"
          >
            <VerticalBarChartCard
              data={partStatusData}
              nameKey="status"
              dataKey="total"
              color={COLORS.blue}
              height={180}
            />
          </DashboardCard>
        </div>

        <div className="xl:col-span-3">
          <DashboardCard
            title="Status logístico"
            description="PNs no fluxo logístico"
          >
            <VerticalBarChartCard
              data={partLogisticsStatusData}
              nameKey="status"
              dataKey="total"
              color={COLORS.cyan}
              height={180}
            />
          </DashboardCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <DashboardCard
            title="Solicitações logísticas"
            description="Status das solicitações"
          >
            <VerticalBarChartCard
              data={logisticsStatusData}
              nameKey="status"
              dataKey="total"
              color={COLORS.blueLight}
              height={180}
            />
          </DashboardCard>
        </div>

        <div className="xl:col-span-5">
          <DashboardCard
            title="Planos de ação por responsável"
            description="Concluídos, pendentes e atrasados"
          >
            <StackedHorizontalChart
              data={analytics.charts.actionPlansByResponsible.slice(
                0,
                6
              )}
              nameKey="responsible"
              height={200}
              keys={[
                {
                  key: "completed",
                  color: COLORS.green,
                },
                {
                  key: "pending",
                  color: COLORS.orange,
                },
                {
                  key: "overdue",
                  color: COLORS.red,
                },
              ]}
            />
          </DashboardCard>
        </div>

        <div className="xl:col-span-3">
          <DashboardCard
            title="Ações atrasadas"
            description="Atrasos por responsável"
          >
            <HorizontalBarChartCard
              data={analytics.charts.overdueActionPlansByResponsible.slice(
                0,
                6
              )}
              nameKey="responsible"
              dataKey="total"
              color={COLORS.red}
              height={200}
            />
          </DashboardCard>
        </div>
      </div>
    </div>
  )
}