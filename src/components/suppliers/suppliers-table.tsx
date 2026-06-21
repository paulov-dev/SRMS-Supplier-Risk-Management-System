"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type Supplier = {
  id: string
  name: string
  supplierCodeSap?: string
  status:
    | "ACTIVE"
    | "UNDER_MONITORING"
    | "AT_RISK"
    | "BLOCKED"
    | "INACTIVE"
  riskScore?: number | null
  country: {
    id: string
    name: string
  }
}

type Country = {
  id: string
  name: string
}

interface Props {
  data: Supplier[]
  countries: Country[]
  onReload: () => void
}

const PAGE_SIZE = 10

export function SuppliersTable({
  data,
  countries,
}: Props) {
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [country, setCountry] = useState("all")

  const [page, setPage] = useState(1)

  const filteredData = useMemo(() => {
    return data.filter((supplier) => {
      const matchesName =
        supplier.name
          .toLowerCase()
          .includes(search.toLowerCase())

      const matchesStatus =
        status === "all"
          ? true
          : supplier.status === status

      const matchesCountry =
        country === "all"
          ? true
          : supplier.country.id === country

      return (
        matchesName &&
        matchesStatus &&
        matchesCountry
      )
    })
  }, [data, search, status, country])

  const totalPages = Math.ceil(
    filteredData.length / PAGE_SIZE
  )

  const paginatedData = filteredData.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  function getStatusBadge(status: string) {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="default">
            Ativo
          </Badge>
        )

      case "UNDER_MONITORING":
        return (
          <Badge variant="secondary">
            Em Monitoramento
          </Badge>
        )

      case "AT_RISK":
        return (
          <Badge variant="destructive">
            RISK
          </Badge>
        )

      case "BLOCKED":
        return (
          <Badge variant="destructive">
            Bloqueado
          </Badge>
        )

      case "INACTIVE":
        return (
          <Badge variant="outline">
            Inativo
          </Badge>
        )

      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* FILTERS */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              placeholder="Search supplier..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            <Select
              value={status}
              onValueChange={setStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              
              <SelectContent>
                <SelectItem value="all">
                  Todos
                </SelectItem>

                <SelectItem value="ACTIVE">
                  Ativo
                </SelectItem>

                <SelectItem value="UNDER_MONITORING">
                  Em monitoramento
                </SelectItem>

                <SelectItem value="AT_RISK">
                  Risk
                </SelectItem>

                <SelectItem value="BLOCKED">
                  Bloqueado
                </SelectItem>

                <SelectItem value="INACTIVE">
                  Inativo
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={country}
              onValueChange={setCountry}
            >
              <SelectTrigger>
                <SelectValue placeholder="Country" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  Todos os Países
                </SelectItem>

                {countries.map((country) => (
                  <SelectItem
                    key={country.id}
                    value={country.id}
                  >
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center"
                >
                  No suppliers found
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">
                    {supplier.name}
                  </TableCell>

                  <TableCell>
                    {getStatusBadge(
                      supplier.status
                    )}
                  </TableCell>

                  <TableCell>
                    {supplier.country.name}
                  </TableCell>

                  <TableCell>
                    {supplier.riskScore ?? "-"}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/suppliers/${supplier.id}`
                        )
                      }
                    >
                      Visualizar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() =>
                page > 1 &&
                setPage(page - 1)
              }
            />
          </PaginationItem>

          <PaginationItem>
            <span className="text-sm px-4">
              Page {page} of {totalPages || 1}
            </span>
          </PaginationItem>

          <PaginationItem>
            <PaginationNext
              onClick={() =>
                page < totalPages &&
                setPage(page + 1)
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}