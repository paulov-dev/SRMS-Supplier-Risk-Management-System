import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { SrmsRiskChart } from "@/components/dashboard/srms-risk-chart"
import { SrmsRiskDistributionChart } from "@/components/dashboard/srms-risk-distribution-chart"

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
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  Package,
  ShieldAlert,
  TrendingUp,
} from "lucide-react"

type RiskLevel = "RED" | "YELLOW" | "GREEN"

const kpis = [
  {
    title: "RMs abertas",
    value: "42",
    description: "Casos ativos em acompanhamento",
    icon: AlertTriangle,
    trend: "+6 nesta semana",
  },
  {
    title: "RMs críticas",
    value: "8",
    description: "Fornecedores com risco RED",
    icon: ShieldAlert,
    trend: "Prioridade alta",
  },
  {
    title: "PNs em risco",
    value: "126",
    description: "PNs RED ou YELLOW",
    icon: Package,
    trend: "34 críticos",
  },
  {
    title: "Fornecedores monitorados",
    value: "31",
    description: "Base ativa do SRMS",
    icon: Building2,
    trend: "12 commodities",
  },
]

const weeklyRisk = [
  {
    week: "CW18",
    red: 4,
    yellow: 18,
    green: 20,
  },
  {
    week: "CW19",
    red: 5,
    yellow: 20,
    green: 18,
  },
  {
    week: "CW20",
    red: 7,
    yellow: 22,
    green: 16,
  },
  {
    week: "CW21",
    red: 8,
    yellow: 21,
    green: 13,
  },
  {
    week: "CW22",
    red: 8,
    yellow: 19,
    green: 15,
  },
]

const riskDistribution = [
  {
    label: "RED",
    value: 8,
    description: "Risco crítico",
    className:
      "border-red-500/30 bg-red-500/10 text-red-500",
  },
  {
    label: "YELLOW",
    value: 19,
    description: "Atenção",
    className:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-500",
  },
  {
    label: "GREEN",
    value: 15,
    description: "Controlado",
    className:
      "border-green-500/30 bg-green-500/10 text-green-500",
  },
]

const priorityRisks = [
  {
    code: "RM012",
    supplier: "Continental / Aumovio",
    commodity: "Ele/Qui",
    level: "RED" as RiskLevel,
    criticalParts: 6,
    owner: "Paulo Victor",
    lastUpdate: "Hoje",
    reason: "Fonte não nomeada e pendências técnicas",
  },
  {
    code: "RM241",
    supplier: "Evamo",
    commodity: "MET",
    level: "RED" as RiskLevel,
    criticalParts: 4,
    owner: "Cinthia de Moura",
    lastUpdate: "Ontem",
    reason: "Cronograma não atende desenvolvimento",
  },
  {
    code: "RM003",
    supplier: "Arconic",
    commodity: "Ele/Qui",
    level: "YELLOW" as RiskLevel,
    criticalParts: 2,
    owner: "Compras",
    lastUpdate: "2 dias",
    reason: "Risco de produção em acompanhamento",
  },
  {
    code: "RM086",
    supplier: "Kroschu",
    commodity: "Ele/Qui",
    level: "GREEN" as RiskLevel,
    criticalParts: 0,
    owner: "Readiness",
    lastUpdate: "3 dias",
    reason: "PNs controlados",
  },
]

function getRiskBadge(level: RiskLevel) {
  if (level === "RED") {
    return (
      <Badge className="border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/10">
        RED
      </Badge>
    )
  }

  if (level === "YELLOW") {
    return (
      <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/10">
        YELLOW
      </Badge>
    )
  }

  return (
    <Badge className="border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500/10">
      GREEN
    </Badge>
  )
}

function StackedRiskBar({
  red,
  yellow,
  green,
}: {
  red: number
  yellow: number
  green: number
}) {
  const total = red + yellow + green || 1

  const redWidth = (red / total) * 100
  const yellowWidth = (yellow / total) * 100
  const greenWidth = (green / total) * 100

  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="bg-red-500"
        style={{
          width: `${redWidth}%`,
        }}
      />
      <div
        className="bg-yellow-500"
        style={{
          width: `${yellowWidth}%`,
        }}
      />
      <div
        className="bg-green-500"
        style={{
          width: `${greenWidth}%`,
        }}
      />
    </div>
  )
}

export default function Page() {
  return (
    <ProtectedRoute>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight">
                        Dashboard SRMS
                      </h1>

                      <p className="text-sm text-muted-foreground">
                        Visão executiva dos riscos de fornecedores,
                        RMs e part numbers em acompanhamento.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        CW22
                      </Badge>

                      <Badge variant="outline">
                        Atualizado hoje
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {kpis.map((item) => {
                    const Icon = item.icon

                    return (
                      <Card key={item.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {item.title}
                          </CardTitle>

                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>

                        <CardContent>
                          <div className="text-2xl font-bold">
                            {item.value}
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.description}
                          </p>

                          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            {item.trend}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <div className="grid items-stretch gap-4 md:grid-cols-2">
                  <SrmsRiskChart />

                  <SrmsRiskDistributionChart />
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle>
                          RMs prioritárias
                        </CardTitle>

                        <CardDescription>
                          Casos que exigem acompanhamento na semana.
                        </CardDescription>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                      >
                        Ver todas as RMs
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr className="border-b">
                            <th className="px-4 py-3 text-left">
                              RM
                            </th>
                            <th className="px-4 py-3 text-left">
                              Fornecedor
                            </th>
                            <th className="px-4 py-3 text-left">
                              Commodity
                            </th>
                            <th className="px-4 py-3 text-left">
                              Farol
                            </th>
                            <th className="px-4 py-3 text-left">
                              PNs críticos
                            </th>
                            <th className="px-4 py-3 text-left">
                              Responsável
                            </th>
                            <th className="px-4 py-3 text-left">
                              Atualização
                            </th>
                            <th className="px-4 py-3 text-left">
                              Motivo
                            </th>
                            <th className="px-4 py-3 text-right">
                              Ação
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {priorityRisks.map((risk) => (
                            <tr
                              key={risk.code}
                              className="border-b last:border-0"
                            >
                              <td className="px-4 py-3 font-medium">
                                {risk.code}
                              </td>

                              <td className="px-4 py-3">
                                {risk.supplier}
                              </td>

                              <td className="px-4 py-3">
                                {risk.commodity}
                              </td>

                              <td className="px-4 py-3">
                                {getRiskBadge(risk.level)}
                              </td>

                              <td className="px-4 py-3">
                                {risk.criticalParts}
                              </td>

                              <td className="px-4 py-3">
                                {risk.owner}
                              </td>

                              <td className="px-4 py-3">
                                {risk.lastUpdate}
                              </td>

                              <td className="px-4 py-3 text-muted-foreground">
                                {risk.reason}
                              </td>

                              <td className="px-4 py-3 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                >
                                  Ver RM
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}