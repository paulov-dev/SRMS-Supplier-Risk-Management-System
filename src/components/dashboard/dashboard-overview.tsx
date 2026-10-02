"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  RotateCcw,
  LayoutDashboard,
  ClipboardList,
  Package,
  ListChecks,
  CalendarDays,
  ClipboardCheck,
  Truck,
  Inbox,
  SearchCheck,
  Building2,
  History,
  Compass,
  BarChart3,
  CircleAlert,
  Loader2,
  type LucideIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ChartContainer } from "@/components/ui/chart"
import { colors, levels } from "@/lib/dashboard-data"

import {
  homeLists,
  PAGE_SIZE,
  type HomeData,
  type HomeItem,
  type HomeList,
  type HomePage,
} from "@/lib/home-data"

const labels = {
  RED: "Vermelho",
  ORANGE: "Laranja",
  YELLOW: "Amarelo",
  GREEN: "Verde",
  BLUE: "Azul",
  GREY: "Cinza",
}

const descriptions: Record<HomeList, string> = {
  risks: "RMs abertas sob sua responsabilidade",
  parts: "PNs únicos atribuídos a você em RMs abertas",
  plans: "Seus planos em RMs abertas, incluindo validação",
  overdue: "Execução pendente com prazo vencido",
  upcoming: "Hoje e próximos sete dias",
  waiting: "Seus planos enviados para validação",
  logisticsPending: "Solicitações pendentes atribuídas a você",
  logisticsReview: "Solicitações em análise atribuídas a você",
  logisticsQueue:
    "Pendentes disponíveis para atendimento pela equipe",
}

const tones = {
  blue: {
    icon:
      "bg-blue-500/10 text-blue-700 ring-blue-500/15 dark:bg-blue-400/10 dark:text-blue-300",
    line: "bg-blue-500",
    wash: "from-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
  },
  violet: {
    icon:
      "bg-violet-500/10 text-violet-700 ring-violet-500/15 dark:bg-violet-400/10 dark:text-violet-300",
    line: "bg-violet-500",
    wash: "from-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
  },
  teal: {
    icon:
      "bg-teal-500/10 text-teal-700 ring-teal-500/15 dark:bg-teal-400/10 dark:text-teal-300",
    line: "bg-teal-500",
    wash: "from-teal-500/10",
    text: "text-teal-700 dark:text-teal-300",
  },
  amber: {
    icon:
      "bg-amber-500/10 text-amber-800 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300",
    line: "bg-amber-500",
    wash: "from-amber-500/10",
    text: "text-amber-800 dark:text-amber-300",
  },
  orange: {
    icon:
      "bg-orange-500/10 text-orange-700 ring-orange-500/15 dark:bg-orange-400/10 dark:text-orange-300",
    line: "bg-orange-500",
    wash: "from-orange-500/10",
    text: "text-orange-700 dark:text-orange-300",
  },
  cyan: {
    icon:
      "bg-cyan-500/10 text-cyan-800 ring-cyan-500/15 dark:bg-cyan-400/10 dark:text-cyan-300",
    line: "bg-cyan-500",
    wash: "from-cyan-500/10",
    text: "text-cyan-800 dark:text-cyan-300",
  },
} as const

type Tone = keyof typeof tones

const visuals: Record<
  HomeList,
  { icon: LucideIcon; tone: Tone }
> = {
  risks: { icon: ClipboardList, tone: "blue" },
  parts: { icon: Package, tone: "violet" },
  plans: { icon: ListChecks, tone: "teal" },
  overdue: { icon: Clock3, tone: "amber" },
  upcoming: { icon: CalendarDays, tone: "blue" },
  waiting: { icon: ClipboardCheck, tone: "violet" },
  logisticsPending: { icon: Truck, tone: "orange" },
  logisticsReview: { icon: SearchCheck, tone: "cyan" },
  logisticsQueue: { icon: Inbox, tone: "violet" },
}

function IconTile({
  icon: Icon,
  tone,
  small = false,
}: {
  icon: LucideIcon
  tone: Tone
  small?: boolean
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${
        tones[tone].icon
      } ${small ? "size-9" : "size-11"}`}
    >
      <Icon
        aria-hidden="true"
        className={small ? "size-4" : "size-5"}
        strokeWidth={1.8}
      />
    </span>
  )
}

function SectionHeading({
  icon,
  tone,
  title,
  description,
}: {
  icon: LucideIcon
  tone: Tone
  title: string
  description?: string
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <IconTile icon={icon} tone={tone} />

      <div className="min-w-0 pt-0.5">
        <CardTitle className="font-semibold tracking-tight">
          {title}
        </CardTitle>

        {description && (
          <CardDescription className="mt-1 text-xs leading-relaxed">
            {description}
          </CardDescription>
        )}
      </div>
    </div>
  )
}

function Metric({
  name,
  value,
  onClick,
}: {
  name: HomeList
  value: number
  onClick: () => void
}) {
  const visual = visuals[name]

  return (
    <Card className="relative gap-0 overflow-hidden rounded-2xl py-0 shadow-sm transition-shadow hover:shadow-md">
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 ${
          tones[visual.tone].line
        }`}
      />

      <button
        onClick={onClick}
        className={`group relative w-full bg-gradient-to-br ${
          tones[visual.tone].wash
        } to-transparent p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`}
      >
        <div className="flex items-center justify-between">
          <IconTile
            icon={visual.icon}
            tone={visual.tone}
          />

          <ArrowUpRight
            aria-hidden="true"
            className="size-4 text-muted-foreground/60 transition-colors group-hover:text-foreground"
          />
        </div>

        <p className="mt-4 text-sm font-medium text-muted-foreground">
          {homeLists[name]}
        </p>

        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
          {value.toLocaleString("pt-BR")}
        </p>

        <p className="mt-3 min-h-8 text-xs leading-relaxed text-muted-foreground">
          {descriptions[name]}
        </p>
      </button>
    </Card>
  )
}

function CountButton({
  name,
  value,
  onClick,
}: {
  name: HomeList
  value: number
  onClick: () => void
}) {
  const { icon: Icon, tone } = visuals[name]

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-auto min-h-10 max-w-full justify-start gap-2 whitespace-normal rounded-xl bg-background/70 px-3 py-2 text-left shadow-none"
    >
      <Icon
        aria-hidden="true"
        className={`size-4 shrink-0 ${tones[tone].text}`}
      />

      <span>{homeLists[name]}</span>

      <Badge
        variant="secondary"
        className={`ml-auto shrink-0 border-0 ${tones[tone].icon}`}
      >
        {value}
      </Badge>
    </Button>
  )
}

function routeVisual(
  href: string
): { icon: LucideIcon; tone: Tone } {
  if (href.startsWith("/pns")) {
    return visuals.parts
  }

  if (href.startsWith("/suppliers")) {
    return { icon: Building2, tone: "cyan" }
  }

  if (href.startsWith("/logistics")) {
    return visuals.logisticsPending
  }

  return visuals.risks
}

async function read<T>(
  url: string,
  signal: AbortSignal
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal,
  })

  const body = await response.json()

  if (!response.ok) {
    throw new Error(
      body.error || "Não foi possível carregar os dados."
    )
  }

  return body as T
}

function Items({
  items,
  empty,
  kind,
}: {
  items: HomeItem[]
  empty: string
  kind?: HomeList
}) {
  if (!items.length) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/15 p-4">
        <Inbox
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        />

        <p className="text-xs leading-relaxed text-muted-foreground">
          {empty}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {items.map(item => {
        const visual = kind
          ? visuals[kind]
          : routeVisual(item.href)

        return (
          <Link
            key={item.href + item.id}
            href={item.href}
            className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-ring"
          >
            <IconTile
              icon={visual.icon}
              tone={visual.tone}
              small
            />

            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-medium">
                {item.label}
              </p>

              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                {item.detail}
              </p>

              {item.actionLabel && (
                <p
                  className={`mt-2 text-xs font-medium ${
                    tones[visual.tone].text
                  }`}
                >
                  {item.actionLabel}
                </p>
              )}
            </div>

            <ArrowUpRight
              aria-hidden="true"
              className="mt-2 size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground"
            />
          </Link>
        )
      })}
    </div>
  )
}

function Evolution({
  data,
  scope,
  onScope,
}: {
  data: HomeData
  scope: string
  onScope: (value: string) => void
}) {
  const missing = data.weeks
    .filter(week => !week.available)
    .map(week => week.label)

  return (
    <Card className="min-w-0 rounded-2xl shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeading
          icon={BarChart3}
          tone="teal"
          title="Evolução da carteira"
          description="RMs abertas por farol nas últimas oito semanas."
        />

        <div className="flex flex-wrap items-center gap-2">
          {data.access.risk && (
            <Select
              value={scope}
              onValueChange={onScope}
            >
              <SelectTrigger
                className="w-44"
                aria-label="Escopo do gráfico"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  Toda a carteira
                </SelectItem>
                <SelectItem value="mine">
                  Minhas RMs
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button asChild variant="ghost" size="sm">
            <Link href="/analytics/weekly">
              Análise completa
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <ChartContainer
          className="h-[230px] w-full aspect-auto"
          config={Object.fromEntries(
            levels.map(level => [
              level,
              {
                label: labels[level],
                color: colors[level],
              },
            ])
          )}
        >
          <BarChart
            accessibilityLayer
            data={data.weeks}
            margin={{
              top: 8,
              left: 0,
              right: 8,
              bottom: 8,
            }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              strokeOpacity={0.4}
            />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickFormatter={value =>
                String(value).split("/")[1]
              }
            />

            <YAxis
              allowDecimals={false}
              width={38}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              content={({ active, label }) => {
                const week = data.weeks.find(
                  item => item.label === label
                )

                if (!active || !week) return null

                return (
                  <div className="rounded-lg border bg-background p-3 text-xs shadow-md">
                    <p className="mb-2 font-semibold">
                      {week.label} ·{" "}
                      {week.total ?? "Sem dados"}
                      {week.available ? " abertas" : ""}
                    </p>

                    {week.available &&
                      levels.map(level => (
                        <p key={level}>
                          {labels[level]}: {week[level]}
                        </p>
                      ))}
                  </div>
                )
              }}
            />

            {levels.map(level => (
              <Bar
                key={level}
                dataKey={level}
                stackId="open"
                fill={colors[level]}
                maxBarSize={38}
              />
            ))}
          </BarChart>
        </ChartContainer>

        <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          {levels.map(level => (
            <span
              key={level}
              className="flex items-center gap-1.5"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: colors[level],
                }}
              />
              {labels[level]}
            </span>
          ))}
        </div>

        {missing.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Sem snapshot completo: {missing.join(", ")}.
            Ausência de dados não significa zero.
          </p>
        )}

        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            Valores e critérios
          </summary>

          <p className="mt-3">
            O filtro altera apenas o gráfico. O responsável
            histórico é o registrado em cada snapshot.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="p-2">Semana</th>
                  <th className="p-2">Total</th>
                  {levels.map(level => (
                    <th key={level} className="p-2">
                      {labels[level]}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {data.weeks.map(week => (
                  <tr
                    key={week.label}
                    className="border-t"
                  >
                    <td className="p-2">{week.label}</td>
                    <td className="p-2">
                      {week.total ?? "Sem dados"}
                    </td>

                    {levels.map(level => (
                      <td key={level} className="p-2">
                        {week[level] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}

export function DashboardOverview() {
  const [scope, setScope] = useState("all")
  const [refresh, setRefresh] = useState(0)

  const [data, setData] = useState<HomeData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const [list, setList] = useState<HomeList | null>(null)
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<HomePage | null>(null)
  const [detailError, setDetailError] = useState("")
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError("")
    setData(null)

    read<HomeData>(
      `/api/dashboard?scope=${scope}`,
      controller.signal
    )
      .then(value => {
        if (!controller.signal.aborted) setData(value)
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setError(error.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [scope, refresh])

  useEffect(() => {
    if (!list) return

    const controller = new AbortController()

    setDetail(null)
    setDetailError("")
    setDetailLoading(true)

    read<HomePage>(
      `/api/dashboard?list=${list}&page=${page}`,
      controller.signal
    )
      .then(value => {
        if (!controller.signal.aborted) {
          setDetail(value)
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setDetailError(error.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDetailLoading(false)
        }
      })

    return () => controller.abort()
  }, [list, page])

  const open = (key: HomeList) => {
    setDetail(null)
    setDetailError("")
    setPage(1)
    setList(key)
  }

  const count = (key: HomeList) =>
    data?.lists[key]?.total ?? 0

  const groups: {
    title: string
    keys: HomeList[]
  }[] = []

  if (
    data?.access.risk &&
    count("risks") + count("parts") + count("plans") > 0
  ) {
    groups.push({
      title: "Minha carteira",
      keys: ["risks", "parts", "plans"],
    })
  } else if (count("plans") > 0) {
    groups.push({
      title: "Meus planos de ação",
      keys: ["plans", "overdue", "upcoming"],
    })
  }

  if (
    data?.access.logistics &&
    count("logisticsPending") +
      count("logisticsReview") +
      count("logisticsQueue") > 0
  ) {
    groups.push({
      title: "Atendimento logístico",
      keys: [
        "logisticsPending",
        "logisticsReview",
        "logisticsQueue",
      ],
    })
  }

  const personalTotal =
    count("risks") +
    count("parts") +
    count("plans") +
    count("logisticsPending") +
    count("logisticsReview")

  const hasLogisticsWork = Boolean(
    data?.access.logistics &&
    count("logisticsPending") +
      count("logisticsReview") +
      count("logisticsQueue") > 0
  )

  const hasAttention =
    count("plans") > 0 || hasLogisticsWork

  const shortcuts = data
    ? [
        ...(data.access.chart
          ? [{ label: "Consultar RMs", href: "/rms" }]
          : []),

        ...(data.access.parts
          ? [{ label: "Consultar PNs", href: "/pns" }]
          : []),

        ...(data.access.suppliers
          ? [{ label: "Fornecedores", href: "/suppliers" }]
          : []),

        ...(data.access.logisticsPage
          ? [{ label: "Logística", href: "/logistics" }]
          : []),
      ]
    : []

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="relative isolate overflow-hidden rounded-2xl border bg-card p-5 shadow-sm md:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-blue-500/10 via-violet-500/5 to-transparent"
        />

        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <IconTile
              icon={LayoutDashboard}
              tone="blue"
            />

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
                SRMS · Seu espaço de trabalho
              </p>

              <h1 className="text-2xl font-semibold tracking-tight">
                {data
                  ? `Olá, ${data.name.trim().split(/\s+/)[0]}`
                  : "Início"}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                O que precisa da sua atenção e onde continuar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {data && (
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <Clock3
                  aria-hidden="true"
                  className="size-3.5"
                />

                {new Date(data.updatedAt).toLocaleTimeString(
                  "pt-BR",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setRefresh(value => value + 1)}
              className="rounded-xl bg-background/80"
            >
              <RotateCcw
                aria-hidden="true"
                className={`mr-2 size-3.5 ${
                  loading ? "motion-safe:animate-spin" : ""
                }`}
              />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          {error}
        </div>
      )}

      {loading && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border bg-card p-8 text-sm text-muted-foreground"
        >
          <Loader2
            aria-hidden="true"
            className="size-5 text-blue-500 motion-safe:animate-spin"
          />
          Carregando seu espaço de trabalho…
        </div>
      )}

      {data && (
        <>
          {personalTotal === 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-5">
              <IconTile
                icon={CheckCircle2}
                tone="teal"
              />

              <div>
                <p className="text-sm font-medium">
                  Nenhuma atividade atribuída a você no momento.
                </p>

                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Continue pelos acessos recentes ou consulte os
                  módulos disponíveis.
                  {count("logisticsQueue") > 0
                    ? " Há solicitações disponíveis na fila da equipe."
                    : ""}
                </p>
              </div>
            </div>
          )}

          {groups.map(group => (
            <section
              key={group.title}
              aria-label={group.title}
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${
                    group.keys[0].startsWith("logistics")
                      ? "bg-orange-500"
                      : "bg-blue-500"
                  }`}
                />

                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {group.keys.map(key => (
                  <Metric
                    key={key}
                    name={key}
                    value={count(key)}
                    onClick={() => open(key)}
                  />
                ))}
              </div>
            </section>
          ))}

          <div
            className={`grid items-start gap-5 ${
              hasAttention
                ? "lg:grid-cols-3"
                : "lg:grid-cols-2"
            }`}
          >
            {hasAttention && (
              <Card className="rounded-2xl shadow-sm lg:col-span-2">
                <CardHeader>
                  <SectionHeading
                    icon={CircleAlert}
                    tone="amber"
                    title="Minha atenção hoje"
                    description="Prazos pessoais e atendimentos disponíveis."
                  />
                </CardHeader>

                <CardContent className="space-y-5">
                  {count("plans") > 0 && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {(
                          ["overdue", "upcoming", "waiting"] as const
                        ).map(key => (
                          <CountButton
                            key={key}
                            name={key}
                            value={count(key)}
                            onClick={() => open(key)}
                          />
                        ))}
                      </div>

                      {count("overdue") > 0 && (
                        <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                          <div className="mb-1 flex items-center justify-between gap-2 px-2">
                            <h3 className="flex items-center gap-2 text-sm font-medium">
                              <Clock3
                                aria-hidden="true"
                                className="size-4 text-amber-700 dark:text-amber-300"
                              />
                              Prazos vencidos
                            </h3>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => open("overdue")}
                            >
                              Ver todos
                              <ArrowUpRight
                                aria-hidden="true"
                                className="ml-1 size-3.5"
                              />
                            </Button>
                          </div>

                          <Items
                            items={data.lists.overdue!.items.slice(0, 3)}
                            kind="overdue"
                            empty="Nenhum plano atrasado."
                          />
                        </section>
                      )}

                      <section className="rounded-xl border border-border/70 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2 px-2">
                          <h3 className="flex items-center gap-2 text-sm font-medium">
                            <CalendarDays
                              aria-hidden="true"
                              className="size-4 text-blue-700 dark:text-blue-300"
                            />
                            Próximos vencimentos
                          </h3>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => open("upcoming")}
                          >
                            Ver todos
                            <ArrowUpRight
                              aria-hidden="true"
                              className="ml-1 size-3.5"
                            />
                          </Button>
                        </div>

                        <Items
                          items={data.lists.upcoming!.items.slice(0, 3)}
                          kind="upcoming"
                          empty="Nenhum plano vence hoje ou nos próximos sete dias."
                        />
                      </section>
                    </>
                  )}

                  {hasLogisticsWork && (
                    <section className="rounded-xl border border-orange-500/15 bg-orange-500/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-sm font-medium">
                          <Truck
                            aria-hidden="true"
                            className="size-4 text-orange-700 dark:text-orange-300"
                          />
                          Atendimento logístico
                        </h3>

                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                        >
                          <Link href="/logistics">
                            Abrir módulo
                            <ArrowUpRight
                              aria-hidden="true"
                              className="ml-1 size-4"
                            />
                          </Link>
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(
                          [
                            "logisticsPending",
                            "logisticsReview",
                            "logisticsQueue",
                          ] as const
                        ).map(key => (
                          <CountButton
                            key={key}
                            name={key}
                            value={count(key)}
                            onClick={() => open(key)}
                          />
                        ))}
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        A fila da equipe inclui apenas solicitações
                        pendentes sem responsável. Os atendimentos
                        pessoais são filtrados pelo seu usuário.
                      </p>
                    </section>
                  )}

                  {count("plans") > 0 && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">
                        Como os prazos são considerados
                      </summary>

                      <p className="mt-2 leading-relaxed">
                        Somente seus planos em RMs abertas. Planos
                        em validação ficam separados dos atrasados
                        e próximos vencimentos. Datas seguem o
                        calendário de São Paulo.
                      </p>
                    </details>
                  )}
                </CardContent>
              </Card>
            )}

            <div
              className={
                hasAttention ? "space-y-5" : "contents"
              }
            >
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <SectionHeading
                    icon={History}
                    tone="violet"
                    title="Continue de onde parou"
                    description="Seus últimos acessos."
                  />
                </CardHeader>

                <CardContent>
                  <Items
                    items={data.recent}
                    empty="Seus acessos a RMs, PNs e fornecedores aparecerão aqui."
                  />
                </CardContent>
              </Card>

              {shortcuts.length > 0 && (
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <SectionHeading
                      icon={Compass}
                      tone="cyan"
                      title="Acessos rápidos"
                    />
                  </CardHeader>

                  <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {shortcuts.map(link => {
                      const visual = routeVisual(link.href)

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-ring"
                        >
                          <IconTile
                            icon={visual.icon}
                            tone={visual.tone}
                            small
                          />

                          <span className="min-w-0 flex-1 text-xs font-medium">
                            {link.label}
                          </span>

                          <ArrowUpRight
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-muted-foreground/60"
                          />
                        </Link>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {data.access.chart && (
            <Evolution
              data={data}
              scope={scope}
              onScope={setScope}
            />
          )}
        </>
      )}

      <Dialog
        open={list !== null}
        onOpenChange={value => {
          if (!value) setList(null)
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-start gap-3">
              {list && (
                <IconTile
                  icon={visuals[list].icon}
                  tone={visuals[list].tone}
                />
              )}

              <div className="min-w-0 pr-5">
                <DialogTitle>
                  {list ? homeLists[list] : "Registros"}
                </DialogTitle>

                <DialogDescription className="mt-1.5">
                  {list ? descriptions[list] : ""}.{" "}
                  {detail
                    ? `${detail.total} registros encontrados.`
                    : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {detailError ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {detailError}
            </p>
          ) : detailLoading || !detail ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2
                aria-hidden="true"
                className="size-4 motion-safe:animate-spin"
              />
              Carregando…
            </p>
          ) : (
            <Items
              items={detail.items}
              kind={list ?? undefined}
              empty="Nenhum registro encontrado."
            />
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={detailLoading || page === 1}
              onClick={() => setPage(value => value - 1)}
            >
              Anterior
            </Button>

            <span className="text-xs text-muted-foreground">
              Página {page}
              {detail
                ? ` de ${Math.max(
                    1,
                    Math.ceil(detail.total / PAGE_SIZE)
                  )}`
                : ""}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={
                detailLoading ||
                !detail ||
                page * PAGE_SIZE >= detail.total
              }
              onClick={() => setPage(value => value + 1)}
            >
              Próxima
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}