"use client"

import * as React from "react"

import { useRouter } from "next/navigation"

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"

import {
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useAuth } from "@/contexts/AuthContext"

export function SuppliersTable({
  data,
  onReload,
}: {
  data: any[]
  onReload: () => void
}) {
  const router = useRouter()

  const { hasPermission } = useAuth()

  const [countries, setCountries] =
    React.useState<any[]>([])

  const [globalFilter, setGlobalFilter] =
    React.useState("")

  const [statusFilter, setStatusFilter] =
    React.useState("ALL")

  const [countryFilter, setCountryFilter] =
    React.useState("ALL")

  const [supplierToDelete, setSupplierToDelete] =
    React.useState<any | null>(null)

  React.useEffect(() => {
    async function loadCountries() {
      const res = await fetch("/api/countries")

      const data = await res.json()

      setCountries(data)
    }

    loadCountries()
  }, [])

  const filteredData = React.useMemo(() => {
    return data.filter((supplier) => {
      const matchesSearch =
        supplier.name
          .toLowerCase()
          .includes(globalFilter.toLowerCase()) ||
        supplier.supplierCodeSap
          ?.toLowerCase()
          .includes(globalFilter.toLowerCase())

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : supplier.status === statusFilter

      const matchesCountry =
        countryFilter === "ALL"
          ? true
          : supplier.country?.isoCode ===
            countryFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCountry
      )
    })
  }, [
    data,
    globalFilter,
    statusFilter,
    countryFilter,
  ])

  async function handleDelete(id: string) {
    await fetch(`/api/suppliers/${id}`, {
      method: "DELETE",
    })

    setSupplierToDelete(null)

    onReload()
  }

  const columns = [
    {
      accessorKey: "name",
      header: "Supplier",
    },
    {
      accessorKey: "supplierCodeSap",
      header: "SAP Code",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant="outline">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "country",
      header: "Country",
      cell: ({ row }: any) =>
        row.original.country?.isoCode,
    },
    {
      accessorKey: "riskScore",
      header: "Risk",
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
            >
              <IconDotsVertical size={16} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                router.push(
                  `/dashboard/suppliers/${row.original.id}`
                )
              }
            >
              Edit
            </DropdownMenuItem>

            {hasPermission(
              "SUPPLIER_MANAGE"
            ) && (
              <DropdownMenuItem
                className="text-red-500"
                onClick={() =>
                  setSupplierToDelete(
                    row.original
                  )
                }
              >
                Inactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel:
      getPaginationRowModel(),
    getFilteredRowModel:
      getFilteredRowModel(),
    getSortedRowModel:
      getSortedRowModel(),
  })

  return (
    <div className="space-y-4">

      <div className="rounded-xl border p-4 space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="font-medium">
            Filters
          </h2>

          <Button>
            <IconPlus size={16} />
            New Supplier
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          <div className="relative">
            <IconSearch
              size={16}
              className="absolute left-3 top-3 text-muted-foreground"
            />

            <Input
              placeholder="Search supplier..."
              className="pl-9"
              value={globalFilter}
              onChange={(e) =>
                setGlobalFilter(
                  e.target.value
                )
              }
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">
                All Status
              </SelectItem>

              <SelectItem value="ACTIVE">
                Active
              </SelectItem>

              <SelectItem value="UNDER_MONITORING">
                Under Monitoring
              </SelectItem>

              <SelectItem value="AT_RISK">
                At Risk
              </SelectItem>

              <SelectItem value="BLOCKED">
                Blocked
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={countryFilter}
            onValueChange={setCountryFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Country" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">
                All Countries
              </SelectItem>

              {countries.map((country) => (
                <SelectItem
                  key={country.id}
                  value={country.isoCode}
                >
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input placeholder="Risk score >=" />
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            {table
              .getHeaderGroups()
              .map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map(
                    (header) => (
                      <TableHead
                        key={header.id}
                      >
                        {flexRender(
                          header.column
                            .columnDef
                            .header,
                          header.getContext()
                        )}
                      </TableHead>
                    )
                  )}
                </TableRow>
              ))}
          </TableHeader>

          <TableBody>
            {table
              .getRowModel()
              .rows.map((row) => (
                <TableRow key={row.id}>
                  {row
                    .getVisibleCells()
                    .map((cell) => (
                      <TableCell
                        key={cell.id}
                      >
                        {flexRender(
                          cell.column
                            .columnDef
                            .cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">

        <div className="text-sm text-muted-foreground">
          {
            table.getFilteredRowModel()
              .rows.length
          }{" "}
          suppliers
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              table.previousPage()
            }
            disabled={
              !table.getCanPreviousPage()
            }
          >
            <IconChevronLeft size={16} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              table.nextPage()
            }
            disabled={!table.getCanNextPage()}
          >
            <IconChevronRight size={16} />
          </Button>
        </div>
      </div>

      <AlertDialog
        open={!!supplierToDelete}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setSupplierToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Inactivate supplier?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This action will set the
              supplier as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() =>
                handleDelete(
                  supplierToDelete.id
                )
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}