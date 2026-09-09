"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  compareValues,
  historyMetrics,
  orderSnapshots,
  weekLabel,
  type HistorySnapshot,
} from "@/lib/weekly-history";

const selectClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";
const date = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
const timestamp = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const signed = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`;

function HistoryContent() {
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [year, setYear] = useState("all");
  const [baseId, setBaseId] = useState("");
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/weekly-snapshots?view=history", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "Não foi possível carregar o histórico.",
          );
        const ordered = orderSnapshots<HistorySnapshot>(data.snapshots);
        if (controller.signal.aborted) return;
        setSnapshots(ordered);
        setBaseId((id) =>
          ordered.some((item) => item.id === id) ? id : ordered[1]?.id || "",
        );
        setTargetId((id) =>
          ordered.some((item) => item.id === id) ? id : ordered[0]?.id || "",
        );
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Não foi possível carregar o histórico.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [reload]);

  const years = [...new Set(snapshots.map((snapshot) => snapshot.year))];
  const visible = snapshots.filter(
    (snapshot) => year === "all" || String(snapshot.year) === year,
  );
  const base = snapshots.find((snapshot) => snapshot.id === baseId);
  const target = snapshots.find((snapshot) => snapshot.id === targetId);
  const validPair = base && target && base.id !== target.id;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/analytics/weekly"
            className="text-sm underline underline-offset-4"
          >
            Voltar à visão semanal
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            Histórico de snapshots
          </h1>
          <p className="text-sm text-muted-foreground">
            Weekly Risk Intelligence · Consulte as CWs salvas e compare duas
            semanas.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => setReload((value) => value + 1)}
        >
          Atualizar histórico
        </Button>
      </div>

      {loading ? (
        <p role="status">Carregando snapshots…</p>
      ) : error ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p role="alert">{error}</p>
            <Button onClick={() => setReload((value) => value + 1)}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : snapshots.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p>Nenhum snapshot semanal foi gerado.</p>
            <Link className="underline" href="/settings/weekly-snapshot">
              Abrir configuração dos snapshots
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Semanas registradas</CardTitle>
              <CardDescription>
                {snapshots.length} snapshots disponíveis. O filtro abaixo afeta
                apenas a lista; as duas seleções são preservadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block max-w-xs space-y-1">
                <span className="text-sm font-medium">Ano do snapshot</span>
                <select
                  className={selectClass}
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                >
                  <option value="all">Todos os anos</option>
                  {years.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <div className="max-h-[460px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Semana</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Gerado em (Brasília)</TableHead>
                      <TableHead>RMs abertas</TableHead>
                      <TableHead>RMs vermelhas</TableHead>
                      <TableHead>Seleção</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((snapshot) => (
                      <TableRow key={snapshot.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {weekLabel(snapshot)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {date(snapshot.weekStartDate)} a{" "}
                          {date(snapshot.weekEndDate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {timestamp(snapshot.snapshotDate)}
                        </TableCell>
                        <TableCell>{snapshot.openRisks}</TableCell>
                        <TableCell>{snapshot.redRisks}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={
                                baseId === snapshot.id ? "default" : "outline"
                              }
                              aria-pressed={baseId === snapshot.id}
                              aria-label={`Usar ${weekLabel(snapshot)} como base`}
                              onClick={() => setBaseId(snapshot.id)}
                            >
                              Base
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                targetId === snapshot.id ? "default" : "outline"
                              }
                              aria-pressed={targetId === snapshot.id}
                              aria-label={`Usar ${weekLabel(snapshot)} como destino`}
                              onClick={() => setTargetId(snapshot.id)}
                            >
                              Destino
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {visible.length === 0 && <p>Nenhum snapshot neste ano.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Comparar semanas</CardTitle>
              <CardDescription>
                Diferença = destino − base. As seleções podem pertencer a anos
                diferentes. A variação numérica, isoladamente, não indica
                melhora ou piora.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
                <label className="space-y-1">
                  <span className="text-sm font-medium">Semana base</span>
                  <select
                    className={selectClass}
                    value={baseId}
                    onChange={(event) => setBaseId(event.target.value)}
                  >
                    <option value="">Selecione uma semana</option>
                    {snapshots.map((snapshot) => (
                      <option key={snapshot.id} value={snapshot.id}>
                        {weekLabel(snapshot)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">Semana de destino</span>
                  <select
                    className={selectClass}
                    value={targetId}
                    onChange={(event) => setTargetId(event.target.value)}
                  >
                    <option value="">Selecione uma semana</option>
                    {snapshots.map((snapshot) => (
                      <option key={snapshot.id} value={snapshot.id}>
                        {weekLabel(snapshot)}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="outline"
                  disabled={!validPair}
                  onClick={() => {
                    setBaseId(targetId);
                    setTargetId(baseId);
                  }}
                >
                  Inverter semanas
                </Button>
              </div>
              {!validPair ? (
                <p role="status">
                  {snapshots.length < 2
                    ? "São necessários pelo menos dois snapshots para comparar semanas."
                    : "Selecione duas semanas diferentes para comparar."}
                </p>
              ) : (
                <>
                  <p className="text-sm" role="status">
                    {weekLabel(base)} → {weekLabel(target)}.{" "}
                    {base.year > target.year ||
                    (base.year === target.year && base.week > target.week)
                      ? "O destino é anterior à base."
                      : "Comparação na ordem cronológica."}{" "}
                    Semanas ausentes não são estimadas.
                  </p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Indicador</TableHead>
                          <TableHead>Base: {weekLabel(base)}</TableHead>
                          <TableHead>Destino: {weekLabel(target)}</TableHead>
                          <TableHead>Diferença</TableHead>
                          <TableHead>Variação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyMetrics.map(([key, label]) => {
                          const { difference, percent } = compareValues(
                            base[key],
                            target[key],
                          );
                          return (
                            <TableRow key={key}>
                              <TableCell className="font-medium">
                                {label}
                              </TableCell>
                              <TableCell>{base[key]}</TableCell>
                              <TableCell>{target[key]}</TableCell>
                              <TableCell>{signed(difference)}</TableCell>
                              <TableCell>
                                {percent === null
                                  ? "Sem base percentual"
                                  : `${signed(percent)}%`}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quando a base é zero e o destino é diferente de zero, a
                    variação percentual não é calculável. Os indicadores “na
                    semana” correspondem a cada CW, não ao intervalo entre as
                    seleções.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

export default function WeeklyHistoryPage() {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <HistoryContent />
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
