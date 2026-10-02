"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import {
    Archive,
    Loader2,
    Megaphone,
    Pencil,
    Pin,
    Plus,
} from "lucide-react"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import {
    announcementCategories,
    type AnnouncementItem,
} from "@/lib/announcements"

const blank = {
    title: "",
    content: "",
    category: "Geral",
    pinned: false,
    archived: false,
    id: "",
    updatedAt: "",
}

export function Announcements({
    compact = false,
}: {
    compact?: boolean
}) {
    const [data, setData] = useState<{
        items: AnnouncementItem[]
        total: number
        size: number
        canManage: boolean
    } | null>(null)

    const [page, setPage] = useState(1)
    const [archived, setArchived] = useState(false)
    const [refresh, setRefresh] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [editor, setEditor] = useState(false)
    const [form, setForm] = useState(blank)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState("")

    useEffect(() => {
        const controller = new AbortController()

        setLoading(true)
        setError("")

        fetch(
            `/api/announcements?page=${page}&size=${compact ? 3 : 10}&archived=${archived}`,
            {
                cache: "no-store",
                signal: controller.signal,
            }
        )
            .then(async response => {
                const body = await response.json()

                if (!response.ok) {
                    throw new Error(body.error)
                }

                return body
            })
            .then(body => {
                if (!controller.signal.aborted) {
                    setData(body)
                }
            })
            .catch(error => {
                if (!controller.signal.aborted) {
                    setError(error.message)
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            })

        return () => controller.abort()
    }, [page, compact, archived, refresh])

    async function save(event: React.FormEvent) {
        event.preventDefault()

        if (saving) return

        setSaving(true)
        setSaveError("")

        try {
            const response = await fetch(
                "/api/announcements",
                {
                    method: form.id ? "PATCH" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(form),
                }
            )

            const body = await response.json()

            if (!response.ok) {
                throw new Error(body.error)
            }

            setEditor(false)
            setPage(1)
            setRefresh(value => value + 1)
        } catch (error) {
            setSaveError(
                error instanceof Error
                    ? error.message
                    : "Falha ao salvar."
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5" />
                            Comunicados
                        </CardTitle>

                        <CardDescription className="mt-1">
                            Informações e alinhamentos
                            compartilhados com o time.
                        </CardDescription>
                    </div>

                    {compact ? (
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                        >
                            <Link href="/announcements">
                                Ver todos
                            </Link>
                        </Button>
                    ) : data?.canManage && (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setArchived(!archived)
                                    setPage(1)
                                }}
                            >
                                <Archive className="mr-2 h-4 w-4" />
                                {archived
                                    ? "Ver publicados"
                                    : "Ver arquivados"}
                            </Button>

                            <Button
                                onClick={() => {
                                    setForm(blank)
                                    setSaveError("")
                                    setEditor(true)
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Publicar
                            </Button>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="space-y-4">
                    {error && (
                        <p
                            role="alert"
                            className="text-sm text-destructive"
                        >
                            {error}
                        </p>
                    )}

                    {loading ? (
                        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Carregando comunicados…
                        </p>
                    ) : !error && !data?.items.length ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            Nenhum comunicado{" "}
                            {archived
                                ? "arquivado"
                                : "publicado"}.
                        </p>
                    ) : !error && (
                        <div
                            className={
                                compact
                                    ? "grid gap-4 lg:grid-cols-3"
                                    : "space-y-4"
                            }
                        >
                            {data?.items.map(item => (
                                <article
                                    key={item.id}
                                    id={`notice-${item.id}`}
                                    className="space-y-3 rounded-lg border p-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <Badge variant="secondary">
                                            {item.category}
                                        </Badge>

                                        <div className="flex items-center gap-2">
                                            {item.pinned && (
                                                <Badge variant="outline">
                                                    <Pin className="mr-1 h-3 w-3" />
                                                    Fixado
                                                </Badge>
                                            )}

                                            {item.archived && (
                                                <Badge variant="outline">
                                                    Arquivado
                                                </Badge>
                                            )}

                                            {!compact && data.canManage && (
                                                <Button
                                                    aria-label={`Editar ${item.title}`}
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setForm({ ...item })
                                                        setSaveError("")
                                                        setEditor(true)
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="break-words font-semibold">
                                        {item.title}
                                    </h3>

                                    <p className="text-xs text-muted-foreground">
                                        {item.author.name}
                                        {" · "}
                                        {new Date(
                                            item.createdAt
                                        ).toLocaleDateString("pt-BR")}
                                    </p>

                                    <p
                                        className={
                                            "whitespace-pre-wrap break-words text-sm leading-relaxed " +
                                            (compact ? "line-clamp-3" : "")
                                        }
                                    >
                                        {item.content}
                                    </p>

                                    {compact && (
                                        <Button
                                            asChild
                                            variant="link"
                                            className="h-auto p-0"
                                        >
                                            <Link href="/announcements">
                                                Ler comunicados
                                            </Link>
                                        </Button>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}

                    {!compact && data && (
                        <div className="flex items-center justify-between gap-3 border-t pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loading || page <= 1}
                                onClick={() =>
                                    setPage(value => value - 1)
                                }
                            >
                                Anterior
                            </Button>

                            <span className="text-xs text-muted-foreground">
                                Página {page} de{" "}
                                {Math.max(
                                    1,
                                    Math.ceil(data.total / data.size)
                                )}
                            </span>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    loading ||
                                    page * data.size >= data.total
                                }
                                onClick={() =>
                                    setPage(value => value + 1)
                                }
                            >
                                Próxima
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={editor}
                onOpenChange={value => {
                    if (!saving) setEditor(value)
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {form.id
                                ? "Editar comunicado"
                                : "Publicar comunicado"}
                        </DialogTitle>

                        <DialogDescription>
                            O conteúdo publicado fica disponível
                            para todos os usuários autenticados.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={save}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="notice-title">
                                Título
                            </Label>

                            <Input
                                id="notice-title"
                                required
                                maxLength={120}
                                value={form.title}
                                onChange={event =>
                                    setForm({
                                        ...form,
                                        title: event.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notice-category">
                                Categoria
                            </Label>

                            <Select
                                value={form.category}
                                onValueChange={category =>
                                    setForm({ ...form, category })
                                }
                            >
                                <SelectTrigger
                                    id="notice-category"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    {announcementCategories.map(
                                        category => (
                                            <SelectItem
                                                key={category}
                                                value={category}
                                            >
                                                {category}
                                            </SelectItem>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notice-content">
                                Conteúdo
                            </Label>

                            <Textarea
                                id="notice-content"
                                required
                                maxLength={10000}
                                rows={9}
                                value={form.content}
                                onChange={event =>
                                    setForm({
                                        ...form,
                                        content: event.target.value,
                                    })
                                }
                            />

                            <p className="text-xs text-muted-foreground">
                                {form.content.length}/10.000 caracteres
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-5">
                            <Label className="flex items-center gap-2">
                                <Checkbox
                                    checked={form.pinned}
                                    onCheckedChange={value =>
                                        setForm({
                                            ...form,
                                            pinned: value === true,
                                        })
                                    }
                                />
                                Fixar no topo
                            </Label>

                            {form.id && (
                                <Label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={form.archived}
                                        onCheckedChange={value =>
                                            setForm({
                                                ...form,
                                                archived: value === true,
                                            })
                                        }
                                    />
                                    Arquivar
                                </Label>
                            )}
                        </div>

                        {saveError && (
                            <p
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {saveError}
                            </p>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={saving}
                                onClick={() => setEditor(false)}
                            >
                                Cancelar
                            </Button>

                            <Button disabled={saving}>
                                {saving && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}

                                {form.id
                                    ? "Salvar alterações"
                                    : "Publicar para todos"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}