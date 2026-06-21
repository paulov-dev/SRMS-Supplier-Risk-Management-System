"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"


import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import {
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"

type Contact = {
  id: string
  name: string
  email?: string
  phone?: string
  position?: string
}

type RiskEvent = {
  id: string
  title: string
  riskLevel: string
  createdAt: string

  status: {
    name: string
  }
}

type Supplier = {
  id: string
  name: string
  supplierCodeSap?: string
  status: string
  address?: string
  riskScore?: number
  createdAt: string
  lastRiskCalculation?: string

  country: {
    id: string
    name: string
    isoCode: string
  }

  contacts: Contact[]

  riskEvents: RiskEvent[]
}

export default function SupplierDetailsPage() {
  const params = useParams()

  const [loading, setLoading] = useState(true)

  const [supplier, setSupplier] =
    useState<Supplier | null>(null)

  const [statusLoading, setStatusLoading] =
    useState(false)

  const [openContactDialog, setOpenContactDialog] =
    useState(false)

  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
  })

  useEffect(() => {
    loadSupplier()
  }, [])

  async function loadSupplier() {
    try {
      const res = await fetch(
        `/api/suppliers/${params.id}`
      )

      if (!res.ok) {
        throw new Error("Supplier not found")
      }

      const data = await res.json()

      setSupplier(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

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

  async function createContact() {
    try {
      const res = await fetch(
        `/api/suppliers/${params.id}/contacts`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(contact),
        }
      )

      if (!res.ok) {
        throw new Error("Failed to create contact")
      }

      setContact({
        name: "",
        email: "",
        phone: "",
        position: "",
      })

      setOpenContactDialog(false)

      loadSupplier()
    } catch (error) {
      console.error(error)
    }
  }

  async function deleteContact(contactId: string) {
    try {
      const res = await fetch(
        `/api/supplier-contacts/${contactId}`,
        {
          method: "DELETE",
        }
      )

      if (!res.ok) {
        throw new Error("Failed to delete contact")
      }

      loadSupplier()
    } catch (error) {
      console.error(error)
    }
  }

  async function updateStatus(status: string) {
    try {
      setStatusLoading(true)

      const res = await fetch(
        `/api/suppliers/${params.id}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status,
          }),
        }
      )

      if (!res.ok) {
        throw new Error("Failed to update supplier status")
      }

      setSupplier((old) =>
        old
          ? {
            ...old,
            status,
          }
          : old
      )

      toast.success("Supplier status updated")
    } catch (error) {
      console.error(error)

      toast.error("Failed to update supplier status")
    } finally {
      setStatusLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="flex h-screen items-center justify-center">
        Supplier not found
      </div>
    )
  }

  return (
    <ProtectedRoute permission="SUPPLIER_VIEW">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="p-6 space-y-6">

            {/* HEADER */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                  <div>
                    <h1 className="text-3xl font-bold">
                      {supplier.name}
                    </h1>

                    <p className="text-muted-foreground">
                      SAP Code: {supplier.supplierCodeSap || "-"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">

                    {getStatusBadge(supplier.status)}                 

                    <Select
                      disabled={statusLoading}
                      value={supplier.status}
                      onValueChange={updateStatus}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="ACTIVE">
                          Ativo
                        </SelectItem>

                        <SelectItem value="UNDER_MONITORING">
                          Em Monitoramento
                        </SelectItem>

                        <SelectItem value="AT_RISK">
                          RISK
                        </SelectItem>

                        <SelectItem value="BLOCKED">
                          Bloqueado
                        </SelectItem>

                        <SelectItem value="INACTIVE">
                          Inativo
                        </SelectItem>
                      </SelectContent>
                    </Select>

                  </div>

                </div>
              </CardContent>
            </Card>

            {/* SUPPLIER INFO */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Informação do Fornecedor
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">

                  <div>
                    <Label>País</Label>

                    <p className="mt-1">
                      {supplier.country.name}
                    </p>
                  </div>

                  <div>
                    <Label>Code</Label>

                    <p className="mt-1">
                      {supplier.country.isoCode}
                    </p>
                  </div>

                  <div>
                    <Label>Endereço</Label>

                    <p className="mt-1">
                      {supplier.address || "-"}
                    </p>
                  </div>

                  <div>
                    <Label>Criado em</Label>

                    <p className="mt-1">
                      {new Date(
                        supplier.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* RISK INFO */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Risk
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">

                  <div>
                    <Label>Risk Score</Label>

                    <p className="mt-1 text-3xl font-bold">
                      {supplier.riskScore ?? "-"}
                    </p>
                  </div>

                  <div>
                    <Label>
                      Last Risk Calculation
                    </Label>

                    <p className="mt-1">
                      {supplier.lastRiskCalculation
                        ? new Date(
                          supplier.lastRiskCalculation
                        ).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* CONTACTS */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  Contatos do Fornecedor
                </CardTitle>

                <Dialog
                  open={openContactDialog}
                  onOpenChange={setOpenContactDialog}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Contato
                    </Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Add Contact
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">

                      <Input
                        placeholder="Name"
                        value={contact.name}
                        onChange={(e) =>
                          setContact({
                            ...contact,
                            name: e.target.value,
                          })
                        }
                      />

                      <Input
                        placeholder="Email"
                        value={contact.email}
                        onChange={(e) =>
                          setContact({
                            ...contact,
                            email: e.target.value,
                          })
                        }
                      />

                      <Input
                        placeholder="Phone"
                        value={contact.phone}
                        onChange={(e) =>
                          setContact({
                            ...contact,
                            phone: e.target.value,
                          })
                        }
                      />

                      <Input
                        placeholder="Position"
                        value={contact.position}
                        onChange={(e) =>
                          setContact({
                            ...contact,
                            position: e.target.value,
                          })
                        }
                      />

                      <Button
                        className="w-full"
                        onClick={createContact}
                      >
                        Save Contact
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {supplier.contacts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center"
                        >
                          Nenhum contato encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      supplier.contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            {contact.name}
                          </TableCell>

                          <TableCell>
                            {contact.position || "-"}
                          </TableCell>

                          <TableCell>
                            {contact.email || "-"}
                          </TableCell>

                          <TableCell>
                            {contact.phone || "-"}
                          </TableCell>

                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                deleteContact(contact.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* RISK EVENTS */}
            <Card>
              <CardHeader>
                <CardTitle>
                  RMs por Fornecedor
                </CardTitle>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {supplier.riskEvents.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center"
                        >
                          Nenhuma RM encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      supplier.riskEvents.map((risk) => (
                        <TableRow key={risk.id}>
                          <TableCell>
                            {risk.title}
                          </TableCell>

                          <TableCell>
                            {risk.status.name}
                          </TableCell>

                          <TableCell>
                            {risk.riskLevel}
                          </TableCell>

                          <TableCell>
                            {new Date(
                              risk.createdAt
                            ).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}