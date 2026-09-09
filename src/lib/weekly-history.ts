import type { WeeklySnapshot } from "@prisma/client";

export type HistorySnapshot = Omit<
  WeeklySnapshot,
  | "summary"
  | "weekStartDate"
  | "weekEndDate"
  | "snapshotDate"
  | "createdAt"
  | "updatedAt"
> &
  Record<
    | "weekStartDate"
    | "weekEndDate"
    | "snapshotDate"
    | "createdAt"
    | "updatedAt",
    string
  >;

export const historyMetrics = [
  ["totalRisks", "Total de RMs"],
  ["openRisks", "RMs abertas"],
  ["closedRisks", "RMs fechadas"],
  ["redRisks", "RMs vermelhas"],
  ["yellowRisks", "RMs amarelas"],
  ["greenRisks", "RMs verdes"],
  ["orangeRisks", "RMs laranja"],
  ["greyRisks", "RMs cinza"],
  ["blueRisks", "RMs azuis"],
  ["totalParts", "Total de PNs"],
  ["redParts", "PNs vermelhos"],
  ["totalActionPlans", "Total de planos de ação"],
  ["openActionPlans", "Planos abertos"],
  ["completedActionPlans", "Planos concluídos"],
  ["overdueActionPlans", "Planos atrasados"],
  ["totalLogisticsRequests", "Solicitações de logística"],
  ["pendingLogisticsRequests", "Logística pendente"],
  ["risksCreatedThisWeek", "RMs criadas na semana"],
  ["risksClosedThisWeek", "RMs fechadas na semana"],
  ["risksImprovedThisWeek", "RMs que melhoraram na semana"],
  ["risksWorsenedThisWeek", "RMs que pioraram na semana"],
] as const satisfies ReadonlyArray<readonly [keyof HistorySnapshot, string]>;

export function compareValues(base: number, target: number) {
  const difference = target - base;
  return {
    difference,
    percent: base === 0 ? (target === 0 ? 0 : null) : (difference / base) * 100,
  };
}

export function orderSnapshots<T extends { year: number; week: number }>(
  snapshots: T[],
): T[] {
  return [...snapshots].sort((a, b) => b.year - a.year || b.week - a.week);
}

export function weekLabel(snapshot: { week: number; year: number }) {
  return `CW${String(snapshot.week).padStart(2, "0")} / ${snapshot.year}`;
}
