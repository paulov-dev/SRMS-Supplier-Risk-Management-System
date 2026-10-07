"use client"

import Link from "next/link"
import { Gauge } from "lucide-react"

import {
  supplierScoreLabels,
  type SupplierScore,
} from "@/lib/supplier-risk-score"

export function SupplierScoreDetail({
  value,
}: {
  value?: SupplierScore
}) {
  if (!value) return null

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2 font-medium">
        <Gauge
          className="size-5 text-violet-600 dark:text-violet-400"
          aria-hidden="true"
        />

        Composição do Risk Score

        <span className="ml-auto rounded-full bg-background px-3 py-1 text-xs">
          {supplierScoreLabels[value.status]}
        </span>
      </div>

      <p className="mt-3 text-muted-foreground">
        Maior pontuação entre as RMs abertas.{" "}
        {value.scoredRisks} de {value.openRisks} RMs
        com score calculado.
        {value.unscoredRisks > 0 &&
          ` ${value.unscoredRisks} RM(s) sem pontuação aplicável ou com dados insuficientes. O resultado pode não representar toda a exposição.`}
      </p>

      {value.driver && (
        <>
          <p className="mt-3">
            RM que determina o score:{" "}
            <Link
              className="font-medium text-violet-700 underline dark:text-violet-400"
              href={`/rms/${value.driver.id}`}
            >
              {value.driver.code}
            </Link>{" "}
            — {value.driver.score}/100.
          </p>

          <p className="mt-2 text-muted-foreground">
            {value.bands.CRITICAL} crítica(s) ·{" "}
            {value.bands.HIGH} alta(s) ·{" "}
            {value.bands.ATTENTION} em atenção ·{" "}
            {value.bands.LOW} baixa(s)
          </p>
        </>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Calculado em{" "}
        {new Date(value.calculatedAt).toLocaleString(
          "pt-BR",
          {
            timeZone: "America/Sao_Paulo",
          }
        )}{" "}
        (Brasília). Não representa probabilidade de
        falha. Regra: {value.version}.
      </p>
    </div>
  )
}