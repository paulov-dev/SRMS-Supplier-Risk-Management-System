"use client"

import {
  Pie,
  PieChart,
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
    level: "RED",
    amount: 8,
    fill: "var(--color-red)",
  },
  {
    level: "YELLOW",
    amount: 19,
    fill: "var(--color-yellow)",
  },
  {
    level: "GREEN",
    amount: 15,
    fill: "var(--color-green)",
  },
]

const chartConfig = {
  amount: {
    label: "RMs",
  },
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

export function SrmsRiskDistributionChart() {
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
          Distribuição atual
        </CardTitle>

        <CardDescription>
          RMs abertas por farol.
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
            height: 265,
            maxHeight: 265,
            width: "100%",
          }}
        >
          <ChartContainer
            config={chartConfig}
            className="h-full w-full"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="level"
                  />
                }
              />

              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="level"
                innerRadius={58}
                outerRadius={95}
                strokeWidth={3}
              />
            </PieChart>
          </ChartContainer>
        </div>


      </CardContent>
    </Card>
  )
}