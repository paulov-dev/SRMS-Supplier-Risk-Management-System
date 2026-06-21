"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
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

const chartConfig = {
  red: {
    label: "RED",
    color: "#ef4444",
  },
  yellow: {
    label: "YELLOW",
    color: "#eab308",
  },
  green: {
    label: "GREEN",
    color: "#22c55e",
  },
} satisfies ChartConfig

export function SrmsRiskChart() {
  return (
    <Card
      style={{
        height: 400,
        maxHeight: 400,
        overflow: "hidden",
      }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Evolução de risco
        </CardTitle>

        <CardDescription>
          RMs por farol nas últimas semanas.
        </CardDescription>
      </CardHeader>

      <CardContent
        className="pt-0"
        style={{
          height: 385,
          maxHeight: 385,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 280,
            maxHeight: 280,
            width: "100%",
          }}
        >
          <ChartContainer
            config={chartConfig}
            className="h-full w-full"
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 4,
                right: 4,
                left: 4,
                bottom: 0,
              }}
            >
              <CartesianGrid vertical={false} />

              <XAxis
                dataKey="week"
                tickLine={false}
                tickMargin={6}
                axisLine={false}
              />

              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent indicator="dot" />
                }
              />

              <Bar
                dataKey="red"
                stackId="risk"
                fill="var(--color-red)"
              />

              <Bar
                dataKey="yellow"
                stackId="risk"
                fill="var(--color-yellow)"
              />

              <Bar
                dataKey="green"
                stackId="risk"
                fill="var(--color-green)"
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}