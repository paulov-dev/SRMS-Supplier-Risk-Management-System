"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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
import { Textarea } from "@/components/ui/textarea"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  ArrowLeft,
  Building2,
  Loader2,
  Plus,
  Save,
  Trash2,
  UserRound,
} from "lucide-react"

import { toast } from "sonner"

type Country = {
  id: string
  name: string
  isoCode?: string
}

type ContactForm = {
  name: string
  email: string
  phone: string
  position: string
}

export default function CreateSupplierPage() {
  const router = useRouter()

  const [countries, setCountries] =
    useState<Country[]>([])

  const [loadingCountries, setLoadingCountries] =
    useState(true)

  const [saving, setSaving] = useState(false)

  const [errors, setErrors] =
    useState<Record<string, string>>({})

  const [form, setForm] = useState({
    name: "",
    supplierCodeSap: "",
    countryId: "",
    address: "",
  })

  const [contacts, setContacts] = useState<ContactForm[]>([
    {
      name: "",
      email: "",
      phone: "",
      position: "",
    },
  ])

  useEffect(() => {
    loadCountries()
  }, [])

  async function loadCountries() {
    try {
      setLoadingCountries(true)

      const res = await fetch("/api/countries", {
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error("Failed to load countries")
      }

      const data = await res.json()

      setCountries(data)
    } catch (error) {
      console.error(error)
      toast.error("Erro ao carregar países")
    } finally {
      setLoadingCountries(false)
    }
  }

  function validateForm() {
    const newErrors: Record<string, string> = {}

    if (!form.name.trim()) {
      newErrors.name =
        "O nome do fornecedor é obrigatório."
    }

    if (!form.countryId) {
      newErrors.countryId =
        "O país do fornecedor é obrigatório."
    }

    contacts.forEach((contact, index) => {
      const hasAnyContactData =
        contact.name.trim() ||
        contact.email.trim() ||
        contact.phone.trim() ||
        contact.position.trim()

      if (hasAnyContactData && !contact.name.trim()) {
        newErrors[`contacts.${index}.name`] =
          "O nome do contato é obrigatório quando algum dado do contato é preenchido."
      }

      if (
        contact.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)
      ) {
        newErrors[`contacts.${index}.email`] =
          "Informe um email válido."
      }
    })

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      toast.error("Preencha os campos obrigatórios.")

      return false
    }

    return true
  }

  function updateContact(
    index: number,
    field: keyof ContactForm,
    value: string
  ) {
    setContacts((prev) =>
      prev.map((contact, contactIndex) =>
        contactIndex === index
          ? {
              ...contact,
              [field]: value,
            }
          : contact
      )
    )
  }

  function addContact() {
    setContacts((prev) => [
      ...prev,
      {
        name: "",
        email: "",
        phone: "",
        position: "",
      },
    ])
  }

  function removeContact(index: number) {
    setContacts((prev) =>
      prev.filter(
        (_, contactIndex) => contactIndex !== index
      )
    )

    setErrors((prev) => {
      const updatedErrors = { ...prev }

      delete updatedErrors[`contacts.${index}.name`]
      delete updatedErrors[`contacts.${index}.email`]

      return updatedErrors
    })
  }

  async function handleSubmit() {
    try {
      if (!validateForm()) {
        return
      }

      const validContacts = contacts.filter(
        (contact) =>
          contact.name.trim() ||
          contact.email.trim() ||
          contact.phone.trim() ||
          contact.position.trim()
      )

      setSaving(true)

      const res = await fetch("/api/suppliers", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          supplierCodeSap:
            form.supplierCodeSap.trim() || null,
          countryId: form.countryId,
          address: form.address.trim() || null,
          contacts: validContacts.map((contact) => ({
            name: contact.name.trim(),
            email: contact.email.trim() || null,
            phone: contact.phone.trim() || null,
            position: contact.position.trim() || null,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error || "Erro ao criar fornecedor"
        )
      }

      toast.success("Fornecedor criado com sucesso")

      router.push(`/suppliers/${data.id}`)
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao criar fornecedor"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute permission="SUPPLIER_CREATE">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/suppliers")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div>
                  <h1 className="text-2xl font-semibold">
                    Novo Fornecedor
                  </h1>

                  <p className="text-sm text-muted-foreground">
                    Cadastre um novo fornecedor e seus contatos principais
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Fornecedor
                  </>
                )}
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Dados do Fornecedor
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-8">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2.5">
                      <Label htmlFor="name">
                        Nome do Fornecedor
                        <span className="ml-1 text-red-500">*</span>
                      </Label>

                      <Input
                        id="name"
                        placeholder="Ex: ABC Components LTDA"
                        value={form.name}
                        className={
                          errors.name
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }
                        onChange={(e) => {
                          setForm({
                            ...form,
                            name: e.target.value,
                          })

                          setErrors((prev) => ({
                            ...prev,
                            name: "",
                          }))
                        }}
                      />

                      {errors.name && (
                        <p className="text-xs text-red-500">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="supplierCodeSap">
                        Código SAP
                      </Label>

                      <Input
                        id="supplierCodeSap"
                        placeholder="Ex: 10002345"
                        value={form.supplierCodeSap}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            supplierCodeSap:
                              e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2.5">
                      <Label>
                        País
                        <span className="ml-1 text-red-500">*</span>
                      </Label>

                      <Select
                        value={form.countryId}
                        onValueChange={(value) => {
                          setForm({
                            ...form,
                            countryId: value,
                          })

                          setErrors((prev) => ({
                            ...prev,
                            countryId: "",
                          }))
                        }}
                        disabled={loadingCountries}
                      >
                        <SelectTrigger
                          className={
                            errors.countryId
                              ? "border-red-500 focus:ring-red-500"
                              : ""
                          }
                        >
                          <SelectValue
                            placeholder={
                              loadingCountries
                                ? "Carregando países..."
                                : "Selecione o país"
                            }
                          />
                        </SelectTrigger>

                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem
                              key={country.id}
                              value={country.id}
                            >
                              {country.name}
                              {country.isoCode
                                ? ` (${country.isoCode})`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {errors.countryId && (
                        <p className="text-xs text-red-500">
                          {errors.countryId}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="address">
                      Endereço
                    </Label>

                    <Textarea
                      id="address"
                      className="min-h-28"
                      placeholder="Informe o endereço do fornecedor..."
                      value={form.address}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Status Inicial
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">
                      Todo novo fornecedor será criado como:
                    </p>

                    <p className="mt-2 text-lg font-semibold text-green-600">
                      ACTIVE
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    O status poderá ser alterado posteriormente na tela de
                    detalhes do fornecedor.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserRound className="h-5 w-5" />
                    Contatos do Fornecedor
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Cadastre os principais contatos comerciais,
                    logísticos ou técnicos do fornecedor.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addContact}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Contato
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {contacts.map((contact, index) => (
                  <div
                    key={index}
                    className="rounded-xl border p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <p className="font-medium">
                        Contato {index + 1}
                      </p>

                      {contacts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeContact(index)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label>
                          Nome
                        </Label>

                        <Input
                          placeholder="Nome"
                          value={contact.name}
                          className={
                            errors[`contacts.${index}.name`]
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                          }
                          onChange={(e) => {
                            updateContact(
                              index,
                              "name",
                              e.target.value
                            )

                            setErrors((prev) => ({
                              ...prev,
                              [`contacts.${index}.name`]:
                                "",
                            }))
                          }}
                        />

                        {errors[
                          `contacts.${index}.name`
                        ] && (
                          <p className="text-xs text-red-500">
                            {
                              errors[
                                `contacts.${index}.name`
                              ]
                            }
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Email
                        </Label>

                        <Input
                          placeholder="email@empresa.com"
                          value={contact.email}
                          className={
                            errors[`contacts.${index}.email`]
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                          }
                          onChange={(e) => {
                            updateContact(
                              index,
                              "email",
                              e.target.value
                            )

                            setErrors((prev) => ({
                              ...prev,
                              [`contacts.${index}.email`]:
                                "",
                            }))
                          }}
                        />

                        {errors[
                          `contacts.${index}.email`
                        ] && (
                          <p className="text-xs text-red-500">
                            {
                              errors[
                                `contacts.${index}.email`
                              ]
                            }
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Telefone
                        </Label>

                        <Input
                          placeholder="+55 00 00000-0000"
                          value={contact.phone}
                          onChange={(e) =>
                            updateContact(
                              index,
                              "phone",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Cargo
                        </Label>

                        <Input
                          placeholder="Ex: Key Account"
                          value={contact.position}
                          onChange={(e) =>
                            updateContact(
                              index,
                              "position",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}