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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    ArrowLeft,
    Boxes,
    CalendarClock,
    Loader2,
    Package,
    Pencil,
    Plus,
    Save,
    Trash2,
    Truck,
} from "lucide-react"

import { toast } from "sonner"

type VehicleModelOption = {
    id: string
    familyId: string
    code: string
    name: string | null
    description: string | null
    isActive: boolean
}

type VehicleFamilyOption = {
    id: string
    name: string
    description: string | null
    isActive: boolean
    models: VehicleModelOption[]
}

type VehicleApplication = {
    id: string
    partNumberId?: string
    vehicleModelId?: string
    validFrom: string | null
    validTo: string | null
    isActive: boolean
    notes: string | null
    vehicleModel: {
        id: string
        familyId?: string
        code: string
        name: string | null
        description?: string | null
        isActive?: boolean
        family: {
            id: string
            name: string
            description?: string | null
            isActive?: boolean
        }
    }
}

type PartNumberDetail = {
    id: string
    partNumber: string
    description: string | null
    vehicleProgram: string | null
    createdAt: string
    vehicleApplications: VehicleApplication[]
}

type ApplicationForm = {
    id: string | null
    vehicleFamilyId: string
    vehicleModelId: string
    validFrom: string
    validTo: string
    notes: string
    isActive: boolean
}

const emptyApplicationForm: ApplicationForm = {
    id: null,
    vehicleFamilyId: "none",
    vehicleModelId: "none",
    validFrom: "",
    validTo: "",
    notes: "",
    isActive: true,
}

function formatDate(value: string | null) {
    if (!value) return "-"

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

function toDateInputValue(value: string | null) {
    if (!value) return ""

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return ""
    }

    return date.toISOString().slice(0, 10)
}

async function readJsonResponse(res: Response) {
    const text = await res.text()

    if (!text) {
        return null
    }

    try {
        return JSON.parse(text)
    } catch {
        throw new Error(
            "A API não retornou JSON. Verifique se o endpoint existe e se está compilando corretamente."
        )
    }
}

function ApplicationStatusBadge({
    isActive,
}: {
    isActive: boolean
}) {
    return (
        <Badge variant="outline">
            {isActive ? "Ativa" : "Inativa"}
        </Badge>
    )
}

export default function PartNumberDetailPage() {
    const router = useRouter()

    const params = useParams<{
        id: string
    }>()

    const [part, setPart] =
        useState<PartNumberDetail | null>(null)

    const [vehicleFamilies, setVehicleFamilies] =
        useState<VehicleFamilyOption[]>([])

    const [loading, setLoading] = useState(true)

    const [editPartOpen, setEditPartOpen] = useState(false)
    const [savingPart, setSavingPart] = useState(false)
    const [partDescription, setPartDescription] = useState("")

    const [applicationDialogOpen, setApplicationDialogOpen] =
        useState(false)
    const [savingApplication, setSavingApplication] =
        useState(false)
    const [applicationForm, setApplicationForm] =
        useState<ApplicationForm>(emptyApplicationForm)

    const selectedVehicleFamily =
        applicationForm.vehicleFamilyId === "none"
            ? null
            : vehicleFamilies.find(
                  (family) =>
                      family.id === applicationForm.vehicleFamilyId
              ) || null

    const availableVehicleModels = selectedVehicleFamily
        ? selectedVehicleFamily.models
        : vehicleFamilies.flatMap((family) => family.models)

    useEffect(() => {
        loadPageData()
    }, [])

    async function loadPageData() {
        await Promise.all([
            loadPart(),
            loadVehicleFamilies(),
        ])
    }

    async function loadPart() {
        try {
            setLoading(true)

            const res = await fetch(
                `/api/part-numbers/${params.id}`,
                {
                    credentials: "include",
                }
            )

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error || "Erro ao carregar PN"
                )
            }

            setPart(data)
            setPartDescription(data.description || "")
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar PN"
            )
        } finally {
            setLoading(false)
        }
    }

    async function loadVehicleFamilies() {
        try {
            const res = await fetch("/api/vehicle-families", {
                credentials: "include",
            })

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                        "Erro ao carregar classes e modelos"
                )
            }

            setVehicleFamilies(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar classes e modelos"
            )
        }
    }

    async function handleUpdatePartDescription() {
        if (!part) return

        try {
            setSavingPart(true)

            const res = await fetch(
                `/api/part-numbers/${part.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        description:
                            partDescription.trim() || null,
                    }),
                }
            )

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                        "Erro ao atualizar nome da peça"
                )
            }

            toast.success(
                "Nome da peça atualizado com sucesso"
            )

            setPart(data)
            setPartDescription(data.description || "")
            setEditPartOpen(false)
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao atualizar nome da peça"
            )
        } finally {
            setSavingPart(false)
        }
    }

    function openCreateApplicationDialog() {
        setApplicationForm(emptyApplicationForm)
        setApplicationDialogOpen(true)
    }

    function openEditApplicationDialog(
        application: VehicleApplication
    ) {
        setApplicationForm({
            id: application.id,
            vehicleFamilyId:
                application.vehicleModel.family.id || "none",
            vehicleModelId: application.vehicleModel.id || "none",
            validFrom: toDateInputValue(application.validFrom),
            validTo: toDateInputValue(application.validTo),
            notes: application.notes || "",
            isActive: application.isActive,
        })

        setApplicationDialogOpen(true)
    }

    async function handleSaveApplication() {
        if (!part) return

        if (applicationForm.vehicleModelId === "none") {
            toast.error("Selecione o modelo veicular")
            return
        }

        try {
            setSavingApplication(true)

            const isEditing = Boolean(applicationForm.id)

            const url = isEditing
                ? `/api/part-numbers/${part.id}/vehicle-applications/${applicationForm.id}`
                : `/api/part-numbers/${part.id}/vehicle-applications`

            const res = await fetch(url, {
                method: isEditing ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    vehicleModelId: applicationForm.vehicleModelId,
                    validFrom: applicationForm.validFrom || null,
                    validTo: applicationForm.validTo || null,
                    notes: applicationForm.notes.trim() || null,
                    isActive: applicationForm.isActive,
                }),
            })

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                        "Erro ao salvar aplicação veicular"
                )
            }

            toast.success(
                isEditing
                    ? "Aplicação veicular atualizada com sucesso"
                    : "Aplicação veicular cadastrada com sucesso"
            )

            setApplicationDialogOpen(false)
            setApplicationForm(emptyApplicationForm)
            await loadPart()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao salvar aplicação veicular"
            )
        } finally {
            setSavingApplication(false)
        }
    }

    async function handleToggleApplication(
        application: VehicleApplication
    ) {
        if (!part) return

        try {
            const res = await fetch(
                `/api/part-numbers/${part.id}/vehicle-applications/${application.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        vehicleModelId: application.vehicleModel.id,
                        validFrom: application.validFrom,
                        validTo: application.validTo,
                        notes: application.notes,
                        isActive: !application.isActive,
                    }),
                }
            )

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                        "Erro ao atualizar aplicação"
                )
            }

            toast.success(
                application.isActive
                    ? "Aplicação inativada"
                    : "Aplicação ativada"
            )

            await loadPart()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao atualizar aplicação"
            )
        }
    }

    async function handleDeleteApplication(
        application: VehicleApplication
    ) {
        if (!part) return

        const confirmDelete = window.confirm(
            "Deseja remover esta aplicação veicular do PN? Caso ela já esteja vinculada a uma RM, o sistema pode impedir a exclusão."
        )

        if (!confirmDelete) return

        try {
            const res = await fetch(
                `/api/part-numbers/${part.id}/vehicle-applications/${application.id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            )

            const data = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(
                    data?.error ||
                        "Erro ao remover aplicação veicular"
                )
            }

            toast.success(
                "Aplicação veicular removida com sucesso"
            )

            await loadPart()
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao remover aplicação veicular"
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
                        {loading ? (
                            <Card>
                                <CardContent className="flex items-center justify-center p-10 text-muted-foreground">
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Carregando PN...
                                </CardContent>
                            </Card>
                        ) : !part ? (
                            <Card>
                                <CardContent className="p-10 text-center text-muted-foreground">
                                    PN não encontrado.
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <div className="rounded-xl border bg-card p-6">
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex gap-4">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() =>
                                                    router.push("/pns")
                                                }
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                            </Button>

                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h1 className="text-2xl font-semibold">
                                                        {part.partNumber}
                                                    </h1>

                                                    <Badge variant="outline">
                                                        PN
                                                    </Badge>
                                                </div>

                                                <p className="max-w-3xl text-sm text-muted-foreground">
                                                    {part.description ||
                                                        "Sem nome/descrição cadastrada"}
                                                </p>

                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    <Badge variant="outline">
                                                        {part.vehicleApplications.length} aplicação(ões)
                                                    </Badge>

                                                    <Badge variant="outline">
                                                        Criado em {formatDate(part.createdAt)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setPartDescription(
                                                        part.description || ""
                                                    )
                                                    setEditPartOpen(true)
                                                }}
                                            >
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Editar nome
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={
                                                    openCreateApplicationDialog
                                                }
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Nova aplicação
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Número do PN
                                                    </p>

                                                    <p className="mt-2 font-medium">
                                                        {part.partNumber}
                                                    </p>
                                                </div>

                                                <Package className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Nome da peça
                                                    </p>

                                                    <p className="mt-2 line-clamp-2 font-medium">
                                                        {part.description || "-"}
                                                    </p>
                                                </div>

                                                <Boxes className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Aplicações ativas
                                                    </p>

                                                    <p className="mt-2 font-medium">
                                                        {
                                                            part.vehicleApplications.filter(
                                                                (application) =>
                                                                    application.isActive
                                                            ).length
                                                        }
                                                    </p>
                                                </div>

                                                <Truck className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Criado em
                                                    </p>

                                                    <p className="mt-2 font-medium">
                                                        {formatDate(part.createdAt)}
                                                    </p>
                                                </div>

                                                <CalendarClock className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <CardTitle>
                                                Aplicações veiculares
                                            </CardTitle>

                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Gerencie as classes e modelos onde este PN é aplicado.
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={
                                                openCreateApplicationDialog
                                            }
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Adicionar aplicação
                                        </Button>
                                    </CardHeader>

                                    <CardContent>
                                        {part.vehicleApplications.length === 0 ? (
                                            <div className="rounded-lg border border-dashed p-10 text-center">
                                                <Truck className="mx-auto h-8 w-8 text-muted-foreground" />

                                                <p className="mt-3 font-medium">
                                                    Nenhuma aplicação cadastrada
                                                </p>

                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    Cadastre a classe e o modelo veicular associado a este PN.
                                                </p>

                                                <Button
                                                    type="button"
                                                    className="mt-4"
                                                    onClick={
                                                        openCreateApplicationDialog
                                                    }
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Nova aplicação
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                {part.vehicleApplications.map(
                                                    (application) => (
                                                        <div
                                                            key={
                                                                application.id
                                                            }
                                                            className="rounded-lg border p-4"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {
                                                                            application
                                                                                .vehicleModel
                                                                                .family
                                                                                .name
                                                                        }
                                                                    </p>

                                                                    <p className="text-sm text-muted-foreground">
                                                                        Modelo:{" "}
                                                                        {
                                                                            application
                                                                                .vehicleModel
                                                                                .code
                                                                        }
                                                                        {application
                                                                            .vehicleModel
                                                                            .name
                                                                            ? ` — ${application.vehicleModel.name}`
                                                                            : ""}
                                                                    </p>
                                                                </div>

                                                                <ApplicationStatusBadge
                                                                    isActive={
                                                                        application.isActive
                                                                    }
                                                                />
                                                            </div>

                                                            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                                                                <p>
                                                                    Válido de:{" "}
                                                                    <span className="font-medium text-foreground">
                                                                        {formatDate(
                                                                            application.validFrom
                                                                        )}
                                                                    </span>
                                                                </p>

                                                                <p>
                                                                    Válido até:{" "}
                                                                    <span className="font-medium text-foreground">
                                                                        {formatDate(
                                                                            application.validTo
                                                                        )}
                                                                    </span>
                                                                </p>

                                                                {application.notes && (
                                                                    <p className="pt-2">
                                                                        Observação:{" "}
                                                                        {
                                                                            application.notes
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="mt-4 flex flex-wrap gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        openEditApplicationDialog(
                                                                            application
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Editar
                                                                </Button>

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
                                                                    Remover
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Dialog
                                    open={editPartOpen}
                                    onOpenChange={(open) => {
                                        setEditPartOpen(open)

                                        if (!open) {
                                            setPartDescription(
                                                part.description || ""
                                            )
                                        }
                                    }}
                                >
                                    <DialogContent className="sm:max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>
                                                Editar nome da peça
                                            </DialogTitle>

                                            <DialogDescription>
                                                Atualize a descrição principal vinculada ao PN.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>PN</Label>

                                                <Input
                                                    value={part.partNumber}
                                                    disabled
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>
                                                    Nome da peça
                                                </Label>

                                                <Input
                                                    value={
                                                        partDescription
                                                    }
                                                    onChange={(e) =>
                                                        setPartDescription(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Ex.: Suporte, chicote, conector..."
                                                />

                                                <p className="text-xs text-muted-foreground">
                                                    Esse campo altera a descrição principal do PN.
                                                </p>
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setEditPartOpen(false)
                                                }
                                                disabled={savingPart}
                                            >
                                                Cancelar
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={
                                                    handleUpdatePartDescription
                                                }
                                                disabled={savingPart}
                                            >
                                                {savingPart ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                Salvar alteração
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog
                                    open={applicationDialogOpen}
                                    onOpenChange={(open) => {
                                        setApplicationDialogOpen(open)

                                        if (!open) {
                                            setApplicationForm(
                                                emptyApplicationForm
                                            )
                                        }
                                    }}
                                >
                                    <DialogContent className="sm:max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {applicationForm.id
                                                    ? "Editar aplicação veicular"
                                                    : "Nova aplicação veicular"}
                                            </DialogTitle>

                                            <DialogDescription>
                                                Vincule este PN a uma classe e modelo veicular.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Classe</Label>

                                                <Select
                                                    value={
                                                        applicationForm.vehicleFamilyId
                                                    }
                                                    onValueChange={(
                                                        value
                                                    ) =>
                                                        setApplicationForm(
                                                            (prev) => ({
                                                                ...prev,
                                                                vehicleFamilyId:
                                                                    value,
                                                                vehicleModelId:
                                                                    "none",
                                                            })
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione a classe" />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            Selecione
                                                        </SelectItem>

                                                        {vehicleFamilies.map(
                                                            (family) => (
                                                                <SelectItem
                                                                    key={
                                                                        family.id
                                                                    }
                                                                    value={
                                                                        family.id
                                                                    }
                                                                >
                                                                    {
                                                                        family.name
                                                                    }
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Modelo</Label>

                                                <Select
                                                    value={
                                                        applicationForm.vehicleModelId
                                                    }
                                                    onValueChange={(
                                                        value
                                                    ) =>
                                                        setApplicationForm(
                                                            (prev) => ({
                                                                ...prev,
                                                                vehicleModelId:
                                                                    value,
                                                            })
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o modelo" />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            Selecione
                                                        </SelectItem>

                                                        {availableVehicleModels.map(
                                                            (model) => (
                                                                <SelectItem
                                                                    key={
                                                                        model.id
                                                                    }
                                                                    value={
                                                                        model.id
                                                                    }
                                                                >
                                                                    {
                                                                        model.code
                                                                    }
                                                                    {model.name
                                                                        ? ` — ${model.name}`
                                                                        : ""}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>
                                                    Válido de
                                                </Label>

                                                <Input
                                                    type="date"
                                                    value={
                                                        applicationForm.validFrom
                                                    }
                                                    onChange={(e) =>
                                                        setApplicationForm(
                                                            (prev) => ({
                                                                ...prev,
                                                                validFrom:
                                                                    e
                                                                        .target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>
                                                    Válido até
                                                </Label>

                                                <Input
                                                    type="date"
                                                    value={
                                                        applicationForm.validTo
                                                    }
                                                    onChange={(e) =>
                                                        setApplicationForm(
                                                            (prev) => ({
                                                                ...prev,
                                                                validTo:
                                                                    e
                                                                        .target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                />
                                            </div>

                                            {applicationForm.id && (
                                                <div className="space-y-2">
                                                    <Label>Status</Label>

                                                    <Select
                                                        value={
                                                            applicationForm.isActive
                                                                ? "true"
                                                                : "false"
                                                        }
                                                        onValueChange={(
                                                            value
                                                        ) =>
                                                            setApplicationForm(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    isActive:
                                                                        value ===
                                                                        "true",
                                                                })
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>

                                                        <SelectContent>
                                                            <SelectItem value="true">
                                                                Ativa
                                                            </SelectItem>

                                                            <SelectItem value="false">
                                                                Inativa
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Observação</Label>

                                                <textarea
                                                    value={
                                                        applicationForm.notes
                                                    }
                                                    onChange={(e) =>
                                                        setApplicationForm(
                                                            (prev) => ({
                                                                ...prev,
                                                                notes:
                                                                    e
                                                                        .target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                    placeholder="Observações sobre a aplicação deste PN..."
                                                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                />
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setApplicationDialogOpen(
                                                        false
                                                    )
                                                }
                                                disabled={
                                                    savingApplication
                                                }
                                            >
                                                Cancelar
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={
                                                    handleSaveApplication
                                                }
                                                disabled={
                                                    savingApplication
                                                }
                                            >
                                                {savingApplication ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                Salvar
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </>
                        )}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}