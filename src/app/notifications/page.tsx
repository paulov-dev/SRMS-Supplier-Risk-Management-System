"use client"

import { useEffect, useState } from "react"
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
import { Badge } from "@/components/ui/badge"

import {
    Bell,
    CheckCheck,
    ClipboardList,
    Loader2,
    RefreshCcw,
} from "lucide-react"

import { toast } from "sonner"

type NotificationItem = {
    id: string
    title: string
    message: string
    type: string
    entity: string | null
    entityId: string | null
    isRead: boolean
    createdAt: string
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value))
}

function getNotificationTypeLabel(type: string) {
    switch (type) {
        case "RISK_ASSIGNED":
            return "RM atribuída"

        case "RISK_CLOSED":
            return "RM fechada"

        case "RISK_REOPENED":
            return "RM reaberta"

        case "RISK_PART_ASSIGNED":
            return "PN atribuído"

        case "ACTION_PLAN_ASSIGNED":
            return "Plano atribuído"

        case "ACTION_PLAN_OVERDUE":
            return "Plano atrasado"

        case "ACTION_PLAN_DUE_SOON":
            return "Plano próximo do prazo"

        case "LOGISTICS_REQUEST_CREATED":
            return "Solicitação logística"

        case "LOGISTICS_REQUEST_APPROVED":
            return "Logística aprovada"

        case "LOGISTICS_REQUEST_REJECTED":
            return "Logística recusada"

        case "USER_PROFILE_UPDATED":
            return "Usuário atualizado"

        case "USER_BLOCKED":
            return "Usuário bloqueado"

        case "USER_UNBLOCKED":
            return "Usuário desbloqueado"

        case "USER_ROLE_ADDED":
            return "Cargo adicionado"

        case "USER_ROLE_REMOVED":
            return "Cargo removido"

        default:
            return type
    }
}

function getNotificationIcon(type: string) {
    if (
        type.startsWith("RISK") ||
        type === "RISK_ASSIGNED"
    ) {
        return (
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
        )
    }

    return (
        <Bell className="h-5 w-5 text-muted-foreground" />
    )
}

export default function NotificationsPage() {
    const router = useRouter()

    const [notifications, setNotifications] =
        useState<NotificationItem[]>([])

    const [unreadCount, setUnreadCount] = useState(0)

    const [loading, setLoading] = useState(true)

    const [markingAllAsRead, setMarkingAllAsRead] =
        useState(false)

    const [openingNotificationId, setOpeningNotificationId] =
        useState<string | null>(null)

    useEffect(() => {
        loadNotifications()
    }, [])

    async function loadNotifications() {
        try {
            setLoading(true)

            const res = await fetch("/api/notifications?limit=50", {
                credentials: "include",
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error || "Erro ao carregar notificações"
                )
            }

            setNotifications(data.data || [])
            setUnreadCount(data.unreadCount || 0)
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao carregar notificações"
            )
        } finally {
            setLoading(false)
        }
    }

    async function markNotificationAsRead(
        notification: NotificationItem
    ) {
        if (notification.isRead) return

        const res = await fetch(
            `/api/notifications/${notification.id}/read`,
            {
                method: "PATCH",
                credentials: "include",
            }
        )

        const data = await res.json()

        if (!res.ok) {
            throw new Error(
                data.error ||
                "Erro ao marcar notificação como lida"
            )
        }

        setNotifications((current) =>
            current.map((item) =>
                item.id === notification.id
                    ? {
                        ...item,
                        isRead: true,
                    }
                    : item
            )
        )

        setUnreadCount((current) =>
            Math.max(current - 1, 0)
        )
    }

    async function handleNotificationClick(
        notification: NotificationItem
    ) {
        try {
            setOpeningNotificationId(notification.id)

            await markNotificationAsRead(notification)

            if (
                notification.entity === "RiskEvent" &&
                notification.entityId
            ) {
                router.push(`/rms/${notification.entityId}`)
                return
            }

            if (
                notification.entity === "User" &&
                notification.entityId
            ) {
                router.push(`/users/${notification.entityId}`)
                return
            }

            if (
                notification.entity === "User" &&
                notification.entityId
            ) {
                router.push(`/users/${notification.entityId}`)
                return
            }

            toast.info(
                "Essa notificação ainda não possui destino configurado."
            )
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao abrir notificação"
            )
        } finally {
            setOpeningNotificationId(null)
        }
    }

    async function handleMarkAllAsRead() {
        try {
            setMarkingAllAsRead(true)

            const res = await fetch("/api/notifications", {
                method: "PATCH",
                credentials: "include",
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "Erro ao marcar notificações como lidas"
                )
            }

            setNotifications((current) =>
                current.map((item) => ({
                    ...item,
                    isRead: true,
                }))
            )

            setUnreadCount(0)

            toast.success(
                "Todas as notificações foram marcadas como lidas"
            )
        } catch (error) {
            console.error(error)

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Erro ao marcar notificações como lidas"
            )
        } finally {
            setMarkingAllAsRead(false)
        }
    }

    return (
        <ProtectedRoute permission="RISK_VIEW">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <div className="p-6 space-y-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Bell className="h-6 w-6" />

                                    <h1 className="text-2xl font-semibold">
                                        Notificações
                                    </h1>

                                    {unreadCount > 0 && (
                                        <Badge variant="destructive">
                                            {unreadCount} não lida
                                            {unreadCount > 1 ? "s" : ""}
                                        </Badge>
                                    )}
                                </div>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Acompanhe alertas e atribuições recebidas no SRMS.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={loadNotifications}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCcw className="mr-2 h-4 w-4" />
                                    )}
                                    Atualizar
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleMarkAllAsRead}
                                    disabled={
                                        markingAllAsRead || unreadCount === 0
                                    }
                                >
                                    {markingAllAsRead ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCheck className="mr-2 h-4 w-4" />
                                    )}
                                    Marcar todas como lidas
                                </Button>
                            </div>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Central de notificações
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                {loading ? (
                                    <div className="flex items-center justify-center p-10 text-muted-foreground">
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Carregando notificações...
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-10 text-center">
                                        <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                                        <p className="font-medium">
                                            Nenhuma notificação encontrada.
                                        </p>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Quando houver alertas ou atribuições, eles aparecerão aqui.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {notifications.map((notification) => (
                                            <button
                                                key={notification.id}
                                                type="button"
                                                onClick={() =>
                                                    handleNotificationClick(
                                                        notification
                                                    )
                                                }
                                                className={[
                                                    "w-full rounded-lg border p-4 text-left transition hover:bg-muted/60",
                                                    notification.isRead
                                                        ? "bg-background"
                                                        : "border-primary/40 bg-primary/5",
                                                ].join(" ")}
                                            >
                                                <div className="flex gap-4">
                                                    <div className="mt-1">
                                                        {getNotificationIcon(
                                                            notification.type
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1 space-y-2">
                                                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                <p className="truncate font-medium">
                                                                    {notification.title}
                                                                </p>

                                                                {!notification.isRead && (
                                                                    <Badge variant="default">
                                                                        Nova
                                                                    </Badge>
                                                                )}

                                                                <Badge variant="outline">
                                                                    {getNotificationTypeLabel(
                                                                        notification.type
                                                                    )}
                                                                </Badge>
                                                            </div>

                                                            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                                                {openingNotificationId ===
                                                                    notification.id && (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    )}

                                                                {formatDate(
                                                                    notification.createdAt
                                                                )}
                                                            </div>
                                                        </div>

                                                        <p className="text-sm text-muted-foreground">
                                                            {notification.message}
                                                        </p>

                                                        {notification.entity ===
                                                            "RiskEvent" &&
                                                            notification.entityId && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Clique para abrir a RM relacionada.
                                                                </p>
                                                            )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}