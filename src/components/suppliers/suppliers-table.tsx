"use client"

import Link from "next/link"

import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  bandLabels,
  bandOf,
  coverageLabels,
  coverageOf,
  openCount,
  scoreOf,
  statusLabels,
  supplierPage,
  type PortfolioSupplier,
} from "@/lib/supplier-portfolio"

export const scoreTones = {
  CRITICAL:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  HIGH:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
  ATTENTION:
    "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300",
  LOW:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
}

export function SuppliersTable({
  data,
  page,
  onPageChange,
  canViewRisks,
}: {
  data: PortfolioSupplier[]
  page: number
  onPageChange: (page: number) => void
  canViewRisks: boolean
}) {
  const current = supplierPage(data, page)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border">
        <Table className="min-w-[1100px] [&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-4 [&_td]:align-top">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Status cadastral</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>RMs abertas</TableHead>
              <TableHead>
                RM que determina o score
              </TableHead>
              <TableHead className="text-right">
                Detalhes
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {current.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-36 text-center text-muted-foreground"
                >
                  Nenhum fornecedor encontrado para estes filtros.
                </TableCell>
              </TableRow>
            )}

            {current.items.map(supplier => {
              const summary = supplier.riskScoreSummary
              const band = bandOf(supplier)
              const coverage = coverageOf(supplier)

              const driver =
                scoreOf(supplier) !== null
                  ? summary?.driver
                  : null

              return (
                <TableRow
                  key={supplier.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <TableCell>
                    <Link
                      href={`/suppliers/${supplier.id}`}
                      prefetch={false}
                      className="text-base font-semibold text-primary hover:underline"
                    >
                      {supplier.name}
                    </Link>

                    <p className="mt-1 text-xs text-muted-foreground">
                      SAP {supplier.supplierCodeSap || "não informado"}
                      {" · "}
                      {supplier.country?.name || "País não informado"}
                    </p>


                  </TableCell>

                  <TableCell>
                    <Badge variant="outline">
                      {statusLabels[supplier.status] ??
                        supplier.status}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold tabular-nums">
                        {scoreOf(supplier) ?? "—"}
                      </span>

                      {band && (
                        <span
                          className={`rounded-md border px-2 py-1 text-xs ${scoreTones[band]}`}
                        >
                          {bandLabels[band]}
                        </span>
                      )}
                    </div>

                    <p
                      className={`mt-1 text-xs ${
                        ["PARTIAL", "UNAVAILABLE", "UNKNOWN"].includes(
                          coverage
                        )
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {coverageLabels[coverage]}
                    </p>
                  </TableCell>

                  <TableCell>
                    <p className="font-semibold tabular-nums">
                      {openCount(supplier) ?? "—"}
                    </p>

                    {summary && summary.bands.CRITICAL > 0 && (
                      <p className="text-xs text-red-700 dark:text-red-400">
                        {summary.bands.CRITICAL} com score ≥ 80
                      </p>
                    )}
                  </TableCell>

                  <TableCell>
                    {driver ? (
                      canViewRisks ? (
                        <Link
                          href={`/rms/${driver.id}`}
                          prefetch={false}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {driver.code}
                        </Link>
                      ) : (
                        <span>{driver.code}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link
                        prefetch={false}
                        href={`/suppliers/${supplier.id}`}
                        aria-label={`Abrir Supplier 360 de ${supplier.name}`}
                      >
                        360
                        <ArrowUpRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {data.length === 0
            ? "0 fornecedores"
            : `${(current.page - 1) * 10 + 1}–${Math.min(
                current.page * 10,
                data.length
              )} de ${data.length} fornecedores`}
        </p>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={current.page === 1}
            onClick={() => onPageChange(current.page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          <span aria-live="polite">
            Página {current.page} de {current.totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={current.page === current.totalPages}
            onClick={() => onPageChange(current.page + 1)}
            aria-label="Próxima página"
          >
            Próxima
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}