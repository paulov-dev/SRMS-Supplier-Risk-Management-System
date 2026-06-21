"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  Save,
  ShieldAlert,
  UserRound,
} from "lucide-react"

import { toast } from "sonner"

type Supplier = {
  id: string
  name: string
  supplierCodeSap?: string | null
  country: {
    id: string
    name: string
    isoCode: string
  }
}

type UserOption = {
  id: string
  name: string
  email: string
}

type OpeningReason =
  | "TIER_2_CHANGE"
  | "PLANT_CHANGE"
  | "SUPPLIER_TRANSFER_PHASE_OUT"
  | "MANUFACTURING_PROCESS_CHANGE"

type RiskLevel = "GREEN" | "YELLOW" | "RED"

type FormState = {
  supplierId: string
  openingReason: OpeningReason | ""
  assignedToId: string
  commodity: string
  title: string
  description: string
}

const openingReasonOptions: {
  value: OpeningReason
  label: string
}[] = [
    {
      value: "TIER_2_CHANGE",
      label: "Troca ou Adição de Tier 2",
    },
    {
      value: "PLANT_CHANGE",
      label: "Alteração de Planta",
    },
    {
      value: "SUPPLIER_TRANSFER_PHASE_OUT",
      label: "Transferência de Fornecedor (Phase Out)",
    },
    {
      value: "MANUFACTURING_PROCESS_CHANGE",
      label: "Mudança no Processo de Fabricação",
    },
  ]

const commodityOptions = [
  "ELE/QUI",
  "MET",
  "PWT",
  "CAB",
  "CHA",
  "MOT",
  "OUTROS",
]

const initialForm: FormState = {
  supplierId: "",
  openingReason: "",
  assignedToId: "",
  commodity: "",
  title: "",
  description: "",
}

export default function CreateRiskPage() {
  const router = useRouter()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [users, setUsers] = useState<UserOption[]>([])

  const [form, setForm] =
    useState<FormState>(initialForm)

  const [errors, setErrors] =
    useState<Record<string, string>>({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const selectedSupplier = useMemo(() => {
    return suppliers.find(
      (supplier) => supplier.id === form.supplierId
    )
  }, [suppliers, form.supplierId])

  const codePrefixPreview = useMemo(() => {
    if (!selectedSupplier) return "RM/IRM"

    return selectedSupplier.country.isoCode === "BR"
      ? "RM"
      : "IRM"
  }, [selectedSupplier])

  useEffect(() => {
    loadPageData()
  }, [])

  async function loadPageData() {
    try {
      setLoading(true)

      const [suppliersRes, usersRes] =
        await Promise.all([
          fetch("/api/suppliers", {
            credentials: "include",
          }),
          fetch("/api/users/options", {
            credentials: "include",
          }),
        ])

      const suppliersData = await suppliersRes.json()
      const usersData = await usersRes.json()

      if (!suppliersRes.ok) {
        throw new Error(
          suppliersData.error ||
          "Erro ao carregar fornecedores"
        )
      }

      if (!usersRes.ok) {
        throw new Error(
          usersData.error ||
          "Erro ao carregar usuários"
        )
      }

      setSuppliers(suppliersData)
      setUsers(usersData)
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar dados da página"
      )
    } finally {
      setLoading(false)
    }
  }

  function clearError(field: string) {
    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }))
  }

  function validateForm() {
    const newErrors: Record<string, string> = {}

    if (!form.supplierId) {
      newErrors.supplierId =
        "Selecione o fornecedor da RM."
    }

    if (!form.openingReason) {
      newErrors.openingReason =
        "Selecione o motivo da abertura da RM."
    }

    if (!form.assignedToId) {
      newErrors.assignedToId =
        "Selecione o responsável pela RM."
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      toast.error("Preencha os campos obrigatórios.")

      return false
    }

    return true
  }

  async function handleSubmit() {
    try {
      if (!validateForm()) {
        return
      }

      setSaving(true)

      const res = await fetch("/api/risk", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplierId: form.supplierId,
          openingReason: form.openingReason,
          assignedToId: form.assignedToId,
          commodity: form.commodity.trim() || null,
          title: form.title.trim() || null,
          description:
            form.description.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error || "Erro ao criar RM"
        )
      }

      const createdRisk = data.data || data

      toast.success(
        `RM ${createdRisk.code} criada com sucesso`
      )

      router.push(`/rms/${createdRisk.id}`)

    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao criar RM"
      )
    } finally {
      setSaving(false)
    }
  }

  function getRiskLevelBadge(level: RiskLevel) {
    const config = {
      GREEN: {
        label: "Green",
        backgroundColor: "#16a34a",
        borderColor: "#16a34a",
        color: "#ffffff",
      },
      YELLOW: {
        label: "Yellow",
        backgroundColor: "#eab308",
        borderColor: "#eab308",
        color: "#000000",
      },
      RED: {
        label: "Red",
        backgroundColor: "#dc2626",
        borderColor: "#dc2626",
        color: "#ffffff",
      },
    }[level]

    if (!config) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "6px",
            border: "1px solid #525252",
            padding: "2px 8px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#e5e5e5",
          }}
        >
          {level}
        </span>
      )
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          borderRadius: "6px",
          border: `1px solid ${config.borderColor}`,
          backgroundColor: config.backgroundColor,
          color: config.color,
          padding: "2px 8px",
          fontSize: "12px",
          fontWeight: 600,
          lineHeight: "16px",
        }}
      >
        {config.label}
      </span>
    )
  }

  return (
    <ProtectedRoute permission="RISK_CREATE">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/rms")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div>
                  <h1 className="text-2xl font-semibold">
                    Nova RM
                  </h1>

                  <p className="text-sm text-muted-foreground">
                    Abra uma nova RM para monitoramento de risco.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={saving || loading}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando RM...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Criar RM
                  </>
                )}
              </Button>
            </div>

            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center p-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando dados...
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5" />
                        Dados da RM
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-8">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-3">
                          <Label>
                            Fornecedor
                            <span className="ml-1 text-red-500 p-2">*</span>
                          </Label>

                          <Select
                            value={form.supplierId}
                            onValueChange={(value) => {
                              setForm((prev) => ({
                                ...prev,
                                supplierId: value,
                              }))

                              clearError("supplierId")
                            }}
                          >
                            <SelectTrigger
                              className={
                                errors.supplierId
                                  ? "border-red-500 focus:ring-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Selecione o fornecedor" />
                            </SelectTrigger>

                            <SelectContent>
                              {suppliers.map((supplier) => (
                                <SelectItem
                                  key={supplier.id}
                                  value={supplier.id}
                                >
                                  {supplier.name}
                                  {supplier.supplierCodeSap
                                    ? ` — ${supplier.supplierCodeSap}`
                                    : ""}
                                  {supplier.country?.isoCode
                                    ? ` (${supplier.country.isoCode})`
                                    : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {errors.supplierId && (
                            <p className="text-xs text-red-500">
                              {errors.supplierId}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          <Label>
                            Responsável pela RM
                            <span className="ml-1 text-red-500 p-2">*</span>
                          </Label>

                          <Select
                            value={form.assignedToId}
                            onValueChange={(value) => {
                              setForm((prev) => ({
                                ...prev,
                                assignedToId: value,
                              }))

                              clearError("assignedToId")
                            }}
                          >
                            <SelectTrigger
                              className={
                                errors.assignedToId
                                  ? "border-red-500 focus:ring-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Selecione o responsável" />
                            </SelectTrigger>

                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem
                                  key={user.id}
                                  value={user.id}
                                >
                                  {user.name} — {user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {errors.assignedToId && (
                            <p className="text-xs text-red-500">
                              {errors.assignedToId}
                            </p>
                          )}
                        </div>
                      </div>


                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2.5">
                          <Label>
                            Motivo da abertura
                            <span className="ml-1 text-red-500 p-2">*</span>
                          </Label>

                          <Select
                            value={form.openingReason}
                            onValueChange={(value) => {
                              setForm((prev) => ({
                                ...prev,
                                openingReason:
                                  value as OpeningReason,
                              }))

                              clearError("openingReason")
                            }}
                          >
                            <SelectTrigger
                              className={
                                errors.openingReason
                                  ? "border-red-500 focus:ring-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Selecione o motivo" />
                            </SelectTrigger>

                            <SelectContent>
                              {openingReasonOptions.map(
                                (reason) => (
                                  <SelectItem
                                    key={reason.value}
                                    value={reason.value}
                                  >
                                    {reason.label}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>

                          {errors.openingReason && (
                            <p className="text-xs text-red-500">
                              {errors.openingReason}
                            </p>
                          )}
                        </div>                      
                      </div>


                      <div className="space-y-2.5">
                        <Label htmlFor="title" className="p-2">
                          Commodity
                        </Label>

                        <Select
                          value={form.commodity || "none"}
                          onValueChange={(value) => {
                            setForm((prev) => ({
                              ...prev,
                              commodity:
                                value === "none" ? "" : value,
                            }))
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a commodity" />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="none">
                              Não informado
                            </SelectItem>

                            {commodityOptions.map((commodity) => (
                              <SelectItem
                                key={commodity}
                                value={commodity}
                              >
                                {commodity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="title" className="p-2">
                          Título
                        </Label>

                        <Input
                          id="title"
                          placeholder="Ex: Alteração de planta do fornecedor"
                          value={form.title}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="description" className="p-2">
                          Descrição
                        </Label>

                        <Textarea
                          id="description"
                          className="min-h-50"
                          placeholder="Descreva o contexto da abertura da RM..."
                          value={form.description}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              description:
                                e.target.value,
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Código da RM
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="rounded-lg border bg-muted/40 p-4">
                        <p className="text-sm text-muted-foreground">
                          O código será gerado automaticamente.
                        </p>

                        <p className="mt-2 text-2xl font-bold">
                          {codePrefixPreview}XXX
                        </p>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Fornecedores brasileiros geram código RM.
                        Fornecedores internacionais geram código IRM.
                        A sequência é global.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Resumo
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Status inicial
                        </p>

                        <div className="mt-2">
                          <Badge variant="outline">
                            OPEN
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Farol inicial
                        </p>

                        <div className="mt-2">
                          {getRiskLevelBadge("YELLOW")}
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Definido automaticamente pelo sistema.
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Fornecedor
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {selectedSupplier
                            ? selectedSupplier.name
                            : "Nenhum fornecedor selecionado"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Commodity
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {form.commodity || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Semana/Ano
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          Calculado automaticamente no padrão ISO
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />

                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            Próximo passo
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Após criar a RM, você poderá vincular PNs,
                            criar planos de ação e solicitar logística.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}