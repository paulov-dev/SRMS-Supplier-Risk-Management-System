"use client"

import { Gauge } from "lucide-react"

import type { RiskScore } from "@/lib/risk-score"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const labels = {
  LOW: "Baixo",
  ATTENTION: "Atenção",
  HIGH: "Alto",
  CRITICAL: "Crítico",
  UNAVAILABLE: "Não calculado",
}

const tones = {
  LOW:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  ATTENTION:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  HIGH:
    "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  CRITICAL:
    "bg-red-500/10 text-red-700 dark:text-red-400",
  UNAVAILABLE:
    "bg-muted text-muted-foreground",
}

export function RiskScoreCard({
  value,
}: {
  value?: RiskScore
}) {
  if (!value) return null

  return (
    <Card className="overflow-hidden border-violet-500/20">
      <CardHeader className="bg-violet-500/5">
        <CardTitle className="flex items-center gap-3">
          <span className="rounded-xl bg-violet-500/10 p-2 text-violet-600 dark:text-violet-400">
            <Gauge
              className="size-5"
              aria-hidden="true"
            />
          </span>

          Risk Score

          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {value.version}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-4xl font-semibold tabular-nums">
            {value.score ?? "—"}
          </span>

          {value.score !== null && (
            <span className="text-muted-foreground">
              / 100
            </span>
          )}

          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${tones[value.band]}`}
          >
            {labels[value.band]}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          {value.message}
        </p>

        {value.factors.length > 0 && (
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Como esta pontuação foi calculada
            </summary>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {value.factors.map(factor => (
                <div
                  key={factor.label}
                  className="rounded-lg bg-muted/40 p-3"
                >
                  <div className="flex justify-between gap-3 text-sm font-medium">
                    <span>{factor.label}</span>

                    <span>
                      {factor.points} / {factor.max}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {factor.detail}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}

        <p className="text-xs text-muted-foreground">
          Faixas: 0–29 baixo · 30–59 atenção ·
          60–79 alto · 80–100 crítico.
          {" "}
          Calculado em{" "}
          {new Date(value.calculatedAt).toLocaleString(
            "pt-BR",
            {
              timeZone: "America/Sao_Paulo",
            }
          )}{" "}
          (Brasília).
        </p>
      </CardContent>
    </Card>
  )
}