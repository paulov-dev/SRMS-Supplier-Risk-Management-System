"use client"

import { Fragment, useEffect, useState } from "react"

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
    Activity,
    Car,
    Layers3,
    Loader2,
    Plus,
    RotateCcw,
    Save,
} from "lucide-react"

import { toast } from "sonner"

type VehicleModel = {
    id: string
    familyId: string
    code: string
    name: string | null
    description: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
}

type VehicleFamily = {
    id: string
    name: string
    description: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
    models: VehicleModel[]
}

type FamilyForm = {
    id: string | null
    name: string
    description: string
    isActive: boolean
}

type ModelForm = {
    id: string | null
    familyId: string
    code: string
    name: string
    description: string
    isActive: boolean
}

const initialFamilyForm: FamilyForm = {
    id: null,
    name: "",
    description: "",
    isActive: true,
}

const initialModelForm: ModelForm = {
    id: null,
    familyId: "",
    code: "",
    name: "",
    description: "",
    isActive: true,
}

function formatDate(value: string | null | undefined) {
    if (!value) {
        return "-"
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return "-"
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date)
}

async function readJsonResponse(res: Response) {
    const text = await res.text()

    if (!text) {
        return {
            data: null,
            rawText: "",
        }
    }

    try {
        return {
            data: JSON.parse(text),
            rawText: text,
        }
    } catch {
        return {
            data: null,
            rawText: text,
        }
    }
}

export default function VehiclesPage() {
    const [families, setFamilies] = useState<VehicleFamily[]>([])
    const [loading, setLoading] = useState(true)
    const [savingFamily, setSavingFamily] = useState(false)
    const [savingModel, setSavingModel] = useState(false)

    const [familyForm, setFamilyForm] =
        useState<FamilyForm>(initialFamilyForm)

    const [modelForm, setModelForm] =
        useState<ModelForm>(initialModelForm)

    const [search, setSearch] = useState("")

    useEffect(() => {
        loadFamilies()
    }, [])

    async function loadFamilies() {
        try {
            setLoading(true)

            const res = await fetch("/api/vehicle-families", {
                credentials: "include",
            })

            const response = await readJsonResponse(res)
            const data = response.data

            if (!res.ok) {
                throw new Error(
                    data?.error || "Erro ao carregar classes e modelos"
                )
            }

            setFamilies(Array.isArray(data) ? data : [])

            setFamilies(data)
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar classes e modelos"
            )
        } finally {
            setLoading(false)
        }
    }

    async function handleSaveFamily() {
        const name = familyForm.name.trim()

        if (!name) {
            toast.error("Informe o nome da classe")
            return
        }

        try {
            setSavingFamily(true)

            const isEditing = !!familyForm.id

            const res = await fetch(
                isEditing
                    ? `/api/vehicle-families/${familyForm.id}`
                    : "/api/vehicle-families",
                {
                    method: isEditing ? "PATCH" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        name,
                        description:
                            familyForm.description.trim() || null,
                        isActive: familyForm.isActive,
                    }),
                }
            )

            const response = await readJsonResponse(res)
            const data = response.data

            if (!res.ok) {
                const message =
                    data?.error ||
                    response.rawText ||
                    `Erro ao salvar classe. Status: ${res.status} ${res.statusText}`

                console.error(
                    `Erro POST /api/vehicle-families | Status: ${res.status} | ${res.statusText} | Resposta: ${response.rawText}`
                )

                throw new Error(
                    `Erro ao salvar classe. Status: ${res.status} - ${message}`
                )
            }

            toast.success(
                isEditing
                    ? "Classe atualizada com sucesso"
                    : "Classe cadastrada com sucesso"
            )

            setFamilyForm(initialFamilyForm)
            await loadFamilies()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao salvar classe"
            )
        } finally {
            setSavingFamily(false)
        }
    }

    async function handleSaveModel() {
        const familyId = modelForm.familyId
        const code = modelForm.code.trim()

        if (!familyId) {
            toast.error("Selecione a classe do modelo")
            return
        }

        if (!code) {
            toast.error("Informe o código do modelo")
            return
        }

        try {
            setSavingModel(true)

            const isEditing = !!modelForm.id

            const res = await fetch(
                isEditing
                    ? `/api/vehicle-models/${modelForm.id}`
                    : "/api/vehicle-models",
                {
                    method: isEditing ? "PATCH" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        familyId,
                        code,
                        name: modelForm.name.trim() || null,
                        description:
                            modelForm.description.trim() || null,
                        isActive: modelForm.isActive,
                    }),
                }
            )

            const response = await readJsonResponse(res)
            const data = response.data

            if (!res.ok) {
                throw new Error(
                    data?.error || "Erro ao salvar modelo"
                )
            }

            toast.success(
                isEditing
                    ? "Modelo atualizado com sucesso"
                    : "Modelo cadastrado com sucesso"
            )

            setModelForm(initialModelForm)
            await loadFamilies()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao salvar modelo"
            )
        } finally {
            setSavingModel(false)
        }
    }

    function editFamily(family: VehicleFamily) {
        setFamilyForm({
            id: family.id,
            name: family.name,
            description: family.description || "",
            isActive: family.isActive,
        })
    }

    function editModel(
        family: VehicleFamily,
        model: VehicleModel
    ) {
        setModelForm({
            id: model.id,
            familyId: family.id,
            code: model.code,
            name: model.name || "",
            description: model.description || "",
            isActive: model.isActive,
        })
    }

    function cancelFamilyEdit() {
        setFamilyForm(initialFamilyForm)
    }

    function cancelModelEdit() {
        setModelForm(initialModelForm)
    }

    const filteredFamilies = families
        .map((family) => {
            const term = search.trim().toLowerCase()

            if (!term) return family

            const familyMatches =
                family.name.toLowerCase().includes(term) ||
                family.description?.toLowerCase().includes(term)

            const models = family.models.filter((model) => {
                return (
                    model.code.toLowerCase().includes(term) ||
                    model.name?.toLowerCase().includes(term) ||
                    model.description?.toLowerCase().includes(term)
                )
            })

            if (familyMatches) {
                return family
            }

            return {
                ...family,
                models,
            }
        })
        .filter((family) => {
            if (!search.trim()) return true

            return family.models.length > 0
        })

    const totalModels = families.reduce(
        (total, family) => total + family.models.length,
        0
    )

    const activeFamilies = families.filter(
        (family) => family.isActive
    ).length

    const activeModels = families.reduce(
        (total, family) =>
            total +
            family.models.filter((model) => model.isActive)
                .length,
        0
    )

    return (
        <ProtectedRoute permission="RISK_VIEW">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />
                    <div className="space-y-6 p-6">

                        <Card className="overflow-hidden border-none bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                    <div className="space-y-2">


                                        <div>
                                            <h1 className="text-3xl font-bold tracking-tight">
                                                Classes e Modelos
                                            </h1>

                                            <p className="mt-2 max-w-2xl text-sm text-slate-300">
                                                Cadastre classes veiculares e seus modelos
                                                para rastrear aplicações de PNs.
                                            </p>
                                        </div>

                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="secondary"
                                            onClick={loadFamilies}
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

                                </div>
                            </CardContent>
                        </Card>


                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Classes cadastradas
                                            </p>

                                            <p className="mt-2 text-3xl font-bold">
                                                {families.length}
                                            </p>

                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {activeFamilies} ativa(s)
                                            </p>
                                        </div>

                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                                            <Layers3 className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Modelos cadastrados
                                            </p>

                                            <p className="mt-2 text-3xl font-bold">
                                                {totalModels}
                                            </p>

                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {activeModels} ativo(s)
                                            </p>
                                        </div>

                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                                            <Car className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Plus className="h-5 w-5" />
                                        {familyForm.id
                                            ? "Editar classe"
                                            : "Nova classe"}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nome da classe</Label>

                                        <Input
                                            placeholder="Ex.: Delivery, Constellation, Meteor"
                                            value={familyForm.name}
                                            onChange={(e) =>
                                                setFamilyForm((prev) => ({
                                                    ...prev,
                                                    name: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Descrição</Label>

                                        <Input
                                            placeholder="Descrição opcional"
                                            value={familyForm.description}
                                            onChange={(e) =>
                                                setFamilyForm((prev) => ({
                                                    ...prev,
                                                    description: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Status</Label>

                                        <Select
                                            value={
                                                familyForm.isActive
                                                    ? "active"
                                                    : "inactive"
                                            }
                                            onValueChange={(value) =>
                                                setFamilyForm((prev) => ({
                                                    ...prev,
                                                    isActive: value === "active",
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="active">
                                                    Ativa
                                                </SelectItem>
                                                <SelectItem value="inactive">
                                                    Inativa
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            onClick={handleSaveFamily}
                                            disabled={savingFamily}
                                        >
                                            {savingFamily ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="mr-2 h-4 w-4" />
                                            )}
                                            Salvar classe
                                        </Button>

                                        {familyForm.id && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={cancelFamilyEdit}
                                                disabled={savingFamily}
                                            >
                                                Cancelar edição
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Plus className="h-5 w-5" />
                                        {modelForm.id
                                            ? "Editar modelo"
                                            : "Novo modelo"}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Classe</Label>

                                        <Select
                                            value={modelForm.familyId}
                                            onValueChange={(value) =>
                                                setModelForm((prev) => ({
                                                    ...prev,
                                                    familyId: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a classe" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                {families
                                                    .filter((family) => family.isActive)
                                                    .map((family) => (
                                                        <SelectItem
                                                            key={family.id}
                                                            value={family.id}
                                                        >
                                                            {family.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Código do modelo</Label>

                                        <Input
                                            placeholder="Ex.: 11.180, 12.260, 29.520"
                                            value={modelForm.code}
                                            onChange={(e) =>
                                                setModelForm((prev) => ({
                                                    ...prev,
                                                    code: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Nome complementar</Label>

                                        <Input
                                            placeholder="Opcional"
                                            value={modelForm.name}
                                            onChange={(e) =>
                                                setModelForm((prev) => ({
                                                    ...prev,
                                                    name: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Descrição</Label>

                                        <Input
                                            placeholder="Descrição opcional"
                                            value={modelForm.description}
                                            onChange={(e) =>
                                                setModelForm((prev) => ({
                                                    ...prev,
                                                    description: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Status</Label>

                                        <Select
                                            value={
                                                modelForm.isActive
                                                    ? "active"
                                                    : "inactive"
                                            }
                                            onValueChange={(value) =>
                                                setModelForm((prev) => ({
                                                    ...prev,
                                                    isActive: value === "active",
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="active">
                                                    Ativo
                                                </SelectItem>
                                                <SelectItem value="inactive">
                                                    Inativo
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            onClick={handleSaveModel}
                                            disabled={savingModel}
                                        >
                                            {savingModel ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="mr-2 h-4 w-4" />
                                            )}
                                            Salvar modelo
                                        </Button>

                                        {modelForm.id && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={cancelModelEdit}
                                                disabled={savingModel}
                                            >
                                                Cancelar edição
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Classes e modelos cadastrados
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="max-w-md space-y-2">
                                    <Label>Buscar</Label>

                                    <Input
                                        placeholder="Buscar por classe ou modelo..."
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr className="border-b">
                                                <th className="px-4 py-3 text-left font-medium">
                                                    Classe
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Modelo
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Descrição
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Status
                                                </th>

                                                <th className="px-4 py-3 text-left font-medium">
                                                    Atualizado em
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
                                                        colSpan={6}
                                                        className="px-4 py-10 text-center text-muted-foreground"
                                                    >
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Carregando classes e modelos...
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredFamilies.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="px-4 py-10 text-center text-muted-foreground"
                                                    >
                                                        Nenhuma classe ou modelo encontrado.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredFamilies.map((family) => (
                                                    <Fragment key={family.id}>
                                                        <tr className="border-b bg-muted/20">
                                                            <td className="px-4 py-3">
                                                                <div>
                                                                    <p className="font-semibold">
                                                                        {family.name}
                                                                    </p>

                                                                    <p className="text-xs text-muted-foreground">
                                                                        {family.models.length} modelo(s)
                                                                    </p>
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3 text-muted-foreground">
                                                                -
                                                            </td>

                                                            <td className="px-4 py-3 text-muted-foreground">
                                                                {family.description || "-"}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <Badge variant="outline">
                                                                    {family.isActive
                                                                        ? "Ativa"
                                                                        : "Inativa"}
                                                                </Badge>
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {formatDate(family.updatedAt)}
                                                            </td>

                                                            <td className="px-4 py-3 text-right">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        editFamily(family)
                                                                    }
                                                                >
                                                                    Editar classe
                                                                </Button>
                                                            </td>
                                                        </tr>

                                                        {family.models.length === 0 ? (
                                                            <tr className="border-b">
                                                                <td className="px-4 py-3" />

                                                                <td
                                                                    colSpan={5}
                                                                    className="px-4 py-3 text-muted-foreground"
                                                                >
                                                                    Nenhum modelo cadastrado
                                                                    para esta classe.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            family.models.map((model) => (
                                                                <tr
                                                                    key={model.id}
                                                                    className="border-b last:border-0 hover:bg-muted/40"
                                                                >
                                                                    <td className="px-4 py-3 text-muted-foreground">
                                                                        {family.name}
                                                                    </td>

                                                                    <td className="px-4 py-3">
                                                                        <p className="font-medium">
                                                                            {model.code}
                                                                        </p>

                                                                        {model.name && (
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {model.name}
                                                                            </p>
                                                                        )}
                                                                    </td>

                                                                    <td className="px-4 py-3 text-muted-foreground">
                                                                        {model.description || "-"}
                                                                    </td>

                                                                    <td className="px-4 py-3">
                                                                        <Badge variant="outline">
                                                                            {model.isActive
                                                                                ? "Ativo"
                                                                                : "Inativo"}
                                                                        </Badge>
                                                                    </td>

                                                                    <td className="px-4 py-3">
                                                                        {formatDate(model.updatedAt)}
                                                                    </td>

                                                                    <td className="px-4 py-3 text-right">
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                editModel(family, model)
                                                                            }
                                                                        >
                                                                            Editar modelo
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </Fragment>
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