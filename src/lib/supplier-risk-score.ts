import {
  calculateRiskScore,
  RISK_SCORE_VERSION,
} from "./risk-score.ts"

import type {
  RiskScore,
  RiskScoreInput,
} from "./risk-score.ts"

import type { Prisma } from "@prisma/client"

export type SupplierScore = {
  version: string
  calculatedAt: string
  score: number | null
  band: RiskScore["band"]
  status:
    | "COMPLETE"
    | "PARTIAL"
    | "NO_OPEN_RISKS"
    | "UNAVAILABLE"
  openRisks: number
  scoredRisks: number
  unscoredRisks: number
  bands: {
    LOW: number
    ATTENTION: number
    HIGH: number
    CRITICAL: number
  }
  driver: {
    id: string
    code: string
    score: number
  } | null
}

export const supplierScoreLabels = {
  COMPLETE: "Cobertura completa",
  PARTIAL: "Resultado parcial",
  NO_OPEN_RISKS: "Sem RMs abertas",
  UNAVAILABLE: "Sem score calculável",
}

// Sem limitar a quantidade de RMs ou PNs.
export const supplierScoreRiskSelect = {
  id: true,
  code: true,
  workflowStatus: true,
  riskLevel: true,
  assignedToId: true,
  parts: {
    select: {
      status: true,
    },
  },
  actionPlans: {
    select: {
      status: true,
      dueDate: true,
      assignedToId: true,
    },
  },
  logistics: {
    select: {
      status: true,
      priority: true,
      cutoffDate: true,
    },
  },
} satisfies Prisma.RiskEventSelect

export function calculateSupplierScore(
  risks: (
    RiskScoreInput & {
      id: string
      code: string
    }
  )[],
  now = new Date()
): SupplierScore {
  const open = risks.filter(
    risk => risk.workflowStatus === "OPEN"
  )

  const bands: SupplierScore["bands"] = {
    LOW: 0,
    ATTENTION: 0,
    HIGH: 0,
    CRITICAL: 0,
  }

  let driver: SupplierScore["driver"] = null
  let band: RiskScore["band"] = "UNAVAILABLE"
  let scoredRisks = 0

  for (const risk of open) {
    const result = calculateRiskScore(risk, now)

    if (
      result.score === null ||
      result.band === "UNAVAILABLE"
    ) {
      continue
    }

    scoredRisks++
    bands[result.band]++

    if (
      !driver ||
      result.score > driver.score ||
      (
        result.score === driver.score &&
        risk.id < driver.id
      )
    ) {
      driver = {
        id: risk.id,
        code: risk.code,
        score: result.score,
      }

      band = result.band
    }
  }

  return {
    version: `supplier-max-v1/${RISK_SCORE_VERSION}`,
    calculatedAt: now.toISOString(),
    score: driver?.score ?? null,
    band,
    status:
      open.length === 0
        ? "NO_OPEN_RISKS"
        : scoredRisks === 0
          ? "UNAVAILABLE"
          : scoredRisks < open.length
            ? "PARTIAL"
            : "COMPLETE",
    openRisks: open.length,
    scoredRisks,
    unscoredRisks: open.length - scoredRisks,
    bands,
    driver,
  }
}

// O horário da consulta não entra na evidência usada pelo cache da IA.
export function supplierScoreEvidence(
  summary: SupplierScore | undefined,
  fallbackScore: number | null
) {
  return summary
    ? {
        method:
          "Maior score válido entre as RMs abertas; não é probabilidade de falha.",
        version: summary.version,
        score: summary.score,
        band: summary.band,
        coverage: summary.status,
        openRisks: summary.openRisks,
        scoredRisks: summary.scoredRisks,
        unscoredRisks: summary.unscoredRisks,
        bands: summary.bands,
      }
    : {
        score: fallbackScore,
        coverage: "LEGACY_UNKNOWN",
      }
}