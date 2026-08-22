"use client"

import { useEffect, useState } from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

import {
  IconBellRinging,
  IconClipboardList,
  IconDotsVertical,
  IconLogout,
  IconShieldCheck,
  IconUserCircle,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(" ")
    .filter(Boolean)

  if (parts.length === 0) {
    return "SR"
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

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

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar?: string | null
  }
}) {
  const { isMobile } = useSidebar()

  const { logout } = useAuth()
  const router = useRouter()

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([])

  const [unreadCount, setUnreadCount] =
    useState(0)

  const [loadingNotifications, setLoadingNotifications] =
    useState(false)

  const initials = getInitials(user.name)

  async function handleLogout() {
    await logout()

    router.push("/")
  }

  async function loadNotifications() {
    try {
      setLoadingNotifications(true)

      const res = await fetch("/api/notifications", {
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
    } finally {
      setLoadingNotifications(false)
    }
  }

  async function handleNotificationClick(
    notification: NotificationItem
  ) {
    try {
      if (!notification.isRead) {
        await fetch(
          `/api/notifications/${notification.id}/read`,
          {
            method: "PATCH",
            credentials: "include",
          }
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
        notification.isRead
          ? current
          : Math.max(current - 1, 0)
      )

      if (
        notification.entity === "RiskEvent" &&
        notification.entityId
      ) {
        router.push(`/rms/${notification.entityId}`)
        return
      }

      router.push("/notifications")
    } catch (error) {
      console.error(error)
    }
  }

  function formatNotificationDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-lg border">
                  <AvatarImage
                    src={user.avatar || undefined}
                    alt={user.name}
                  />

                  <AvatarFallback className="rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-sidebar">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="flex items-center gap-2 truncate font-medium">
                  <span className="truncate">
                    {user.name}
                  </span>

                  {unreadCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-red-600" />
                  )}
                </span>

                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>

              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
                <Avatar className="h-10 w-10 rounded-lg border">
                  <AvatarImage
                    src={user.avatar || undefined}
                    alt={user.name}
                  />

                  <AvatarFallback className="rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name}
                  </span>

                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>

                  <span className="mt-1 inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    SRMS User
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => router.push("/profile")}
              >
                <IconUserCircle className="size-4" />
                Meu perfil
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => router.push("/rms")}
              >
                <IconClipboardList className="size-4" />
                Minhas RMs
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => router.push("/rms?risk=red")}
              >
                <IconShieldCheck className="size-4" />
                RMs críticas
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => router.push("/notifications")}
              >
                <IconBellRinging className="size-4" />

                <span className="flex flex-1 items-center justify-between gap-2">
                  Notificações

                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </span>
              </DropdownMenuItem>

              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Últimas notificações
                  </DropdownMenuLabel>

                  <div className="max-h-72 overflow-y-auto px-1">
                    {notifications.slice(0, 5).map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="flex cursor-pointer items-start gap-2 rounded-md p-2"
                        onSelect={(event) => {
                          event.preventDefault()
                          handleNotificationClick(notification)
                        }}
                      >
                        <IconBellRinging
                          className={
                            notification.isRead
                              ? "mt-0.5 size-4 text-muted-foreground"
                              : "mt-0.5 size-4 text-red-600"
                          }
                        />

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-xs font-medium">
                              {notification.title}
                            </p>

                            {!notification.isRead && (
                              <span className="h-2 w-2 rounded-full bg-red-600" />
                            )}
                          </div>

                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {notification.message}
                          </p>

                          <p className="text-[10px] text-muted-foreground">
                            {formatNotificationDate(
                              notification.createdAt
                            )}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onSelect={handleLogout}
            >
              <IconLogout className="size-4" />
              Sair do sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}