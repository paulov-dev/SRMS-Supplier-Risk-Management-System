"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

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

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  ArrowLeft,
  Calendar,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react"

import { toast } from "sonner"

type VehicleModel = {
  id: string
  code: string
  name: string | null
  description: string | null
  isActive: boolean
}

type VehicleFamily = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  models: VehicleModel[]
}

type PartNumber = {
  id: string
  partNumber: string
  description: string | null
}

type VehicleApplication = {
  id: string
  partNumberId: string
  vehicleModelId: string
  validFrom: string | null
  validTo: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
  vehicleModel: {
    id: string
    code: string
    name: string | null
    description: string | null
    family: {
      id: string
      name: string
    }
  }
}

type ApplicationsResponse = {
  partNumber: PartNumber
  data: VehicleApplication[]
}

type ApplicationForm = {
  vehicleModelId: string
  validFrom: string
  validTo: string
  notes: string
}

const initialForm: ApplicationForm = {
  vehicleModelId: "",
  validFrom: "",
  validTo: "",
  notes: "",
}

function formatDate(value: string | null) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

function getApplicationValidityText(application: VehicleApplication) {
  if (application.validFrom && application.validTo) {
    return `${formatDate(application.validFrom)} até ${formatDate(application.validTo)}`
  }

  if (application.validFrom && !application.validTo) {
    return `A partir de ${formatDate(application.validFrom)}`
  }

  if (!application.validFrom && application.validTo) {
    return `Válido até ${formatDate(application.validTo)}`
  }

  return "Sem data fim"
}

export default function PartNumberDetailPage() {
  const params = useParams()
  const router = useRouter()

  const id = String(params.id)

  const [partNumber, setPartNumber] =
    useState<PartNumber | null>(null)

  const [applications, setApplications] =
    useState<VehicleApplication[]>([])

  const [families, setFamilies] =
    useState<VehicleFamily[]>([])

  const [form, setForm] =
    useState<ApplicationForm>(initialForm)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [id])

  async function loadInitialData() {
    await Promise.all([
      loadApplications(),
      loadFamilies(),
    ])
  }

  async function loadApplications() {
    try {
      setLoading(true)

      const res = await fetch(
        `/api/part-numbers/${id}/vehicle-applications`,
        {
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Erro ao carregar aplicações veiculares"
        )
      }

      const response = data as ApplicationsResponse

      setPartNumber(response.partNumber)
      setApplications(response.data)
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar aplicações veiculares"
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadFamilies() {
    try {
      const res = await fetch("/api/vehicle-families", {
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Erro ao carregar famílias veiculares"
        )
      }

      setFamilies(data)
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar famílias veiculares"
      )
    }
  }

  async function handleCreateApplication() {
    if (!form.vehicleModelId) {
      toast.error("Selecione o modelo veicular")
      return
    }

    try {
      setSaving(true)

      const res = await fetch(
        `/api/part-numbers/${id}/vehicle-applications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            vehicleModelId: form.vehicleModelId,
            validFrom: form.validFrom || null,
            validTo: form.validTo || null,
            notes: form.notes.trim() || null,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Erro ao cadastrar aplicação veicular"
        )
      }

      toast.success("Aplicação veicular cadastrada")
      setForm(initialForm)
      await loadApplications()
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar aplicação veicular"
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleApplication(
    application: VehicleApplication
  ) {
    try {
      const res = await fetch(
        `/api/part-numbers/${id}/vehicle-applications/${application.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            isActive: !application.isActive,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Erro ao alterar aplicação veicular"
        )
      }

      toast.success(
        application.isActive
          ? "Aplicação inativada"
          : "Aplicação ativada"
      )

      await loadApplications()
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao alterar aplicação veicular"
      )
    }
  }

  async function handleDeleteApplication(
    application: VehicleApplication
  ) {
    const confirmed = window.confirm(
      `Deseja excluir a aplicação ${application.vehicleModel.family.name} / ${application.vehicleModel.code}?`
    )

    if (!confirmed) return

    try {
      const res = await fetch(
        `/api/part-numbers/${id}/vehicle-applications/${application.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Erro ao excluir aplicação veicular"
        )
      }

      toast.success("Aplicação veicular excluída")
      await loadApplications()
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao excluir aplicação veicular"
      )
    }
  }

  return (
    <ProtectedRoute permission="RISK_VIEW">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/pns")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para PNs
                </Button>

                <div>
                  <h1 className="text-2xl font-semibold">
                    {partNumber?.partNumber || "PN"}
                  </h1>

                  <p className="text-sm text-muted-foreground">
                    {partNumber?.description ||
                      "Detalhe do PN e suas aplicações veiculares."}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={loadApplications}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Atualizar
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">
                    Aplicações cadastradas
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {applications.length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">
                    Aplicações ativas
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {
                      applications.filter(
                        (application) =>
                          application.isActive
                      ).length
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">
                    Com data fim
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {
                      applications.filter(
                        (application) =>
                          application.validTo
                      ).length
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Cadastrar aplicação veicular
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-4">
                  <div className="space-y-2 lg:col-span-2">
                    <Label>Modelo veicular</Label>

                    <Select
                      value={form.vehicleModelId}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          vehicleModelId: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione família/modelo" />
                      </SelectTrigger>

                      <SelectContent>
                        {families.map((family) =>
                          family.models.map((model) => (
                            <SelectItem
                              key={model.id}
                              value={model.id}
                            >
                              {family.name} / {model.code}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Válido de</Label>

                    <Input
                      type="date"
                      value={form.validFrom}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          validFrom: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Válido até</Label>

                    <Input
                      type="date"
                      value={form.validTo}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          validTo: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observação</Label>

                  <Input
                    placeholder="Ex.: Aplicação válida até phase out do modelo"
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleCreateApplication}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar aplicação
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm(initialForm)}
                    disabled={saving}
                  >
                    Limpar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Aplicações veiculares do PN
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left font-medium">
                          Família / Modelo
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Validade
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Observação
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          Ações
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-muted-foreground"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Carregando aplicações...
                            </div>
                          </td>
                        </tr>
                      ) : applications.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-muted-foreground"
                          >
                            Nenhuma aplicação veicular cadastrada para este PN.
                          </td>
                        </tr>
                      ) : (
                        applications.map((application) => (
                          <tr
                            key={application.id}
                            className="border-b last:border-0 hover:bg-muted/40"
                          >
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">
                                  {
                                    application.vehicleModel
                                      .family.name
                                  }{" "}
                                  /{" "}
                                  {
                                    application.vehicleModel
                                      .code
                                  }
                                </p>

                                {application.vehicleModel
                                  .name && (
                                  <p className="text-xs text-muted-foreground">
                                    {
                                      application.vehicleModel
                                        .name
                                    }
                                  </p>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />

                                <span>
                                  {getApplicationValidityText(
                                    application
                                  )}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <Badge variant="outline">
                                {application.isActive
                                  ? "Ativa"
                                  : "Inativa"}
                              </Badge>
                            </td>

                            <td className="px-4 py-3">
                              <p className="max-w-[360px] text-muted-foreground">
                                {application.notes || "-"}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleToggleApplication(
                                      application
                                    )
                                  }
                                >
                                  {application.isActive
                                    ? "Inativar"
                                    : "Ativar"}
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteApplication(
                                      application
                                    )
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}