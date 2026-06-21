"use client"

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

  const initials = getInitials(user.name)

  async function handleLogout() {
    await logout()

    router.push("/")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg border">
                <AvatarImage
                  src={user.avatar || undefined}
                  alt={user.name}
                />

                <AvatarFallback className="rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
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
                Alertas de risco
              </DropdownMenuItem>
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