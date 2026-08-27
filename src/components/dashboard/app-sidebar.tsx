"use client"

import * as React from "react"

import {
  type Icon,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAnalytics,
  IconFolder,
  IconHistory,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconShieldLock,
  IconTruck,
  IconUserHexagon,
  IconUsers,
} from "@tabler/icons-react"

import { useAuth } from "@/contexts/AuthContext"

import { NavDocuments } from "@/components/dashboard/nav-documents"
import { NavMain } from "@/components/dashboard/nav-main"
import { NavSecondary } from "@/components/dashboard/nav-secondary"
import { NavUser } from "@/components/dashboard/nav-user"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type PermissionRule = string | string[]
type RoleRule = string | string[]

type RoleLike =
  | string
  | {
      name?: string
      role?: {
        name?: string
      }
    }

type NavItem = {
  title: string
  url: string
  icon?: Icon
  permission?: PermissionRule
  role?: RoleRule
  items?: NavItem[]
}

type DocumentItem = {
  name: string
  url: string
  icon: Icon
  permission?: PermissionRule
  role?: RoleRule
}

function getRoleName(role: RoleLike) {
  if (typeof role === "string") {
    return role
  }

  return role.name || role.role?.name || ""
}

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  const hasPermission = (permission?: PermissionRule) => {
    if (!permission) return true

    if (Array.isArray(permission)) {
      return permission.some((item) =>
        user?.permissions?.includes(item)
      )
    }

    return user?.permissions?.includes(permission)
  }

  const hasRole = (role?: RoleRule) => {
    if (!role) return true

    const userRoles =
      user?.roles?.map((item: RoleLike) => getRoleName(item)) || []

    if (Array.isArray(role)) {
      return role.some((item) => userRoles.includes(item))
    }

    return userRoles.includes(role)
  }

  const canSee = ({
    permission,
    role,
  }: {
    permission?: PermissionRule
    role?: RoleRule
  }) => {
    return hasPermission(permission) && hasRole(role)
  }

  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items
      .map((item) => {
        const filteredChildren = item.items
          ? filterNavItems(item.items)
          : undefined

        const canSeeItem = canSee({
          permission: item.permission,
          role: item.role,
        })

        const hasVisibleChildren =
          filteredChildren && filteredChildren.length > 0

        if (!canSeeItem && !hasVisibleChildren) {
          return null
        }

        return {
          ...item,
          items: filteredChildren,
        }
      })
      .filter(Boolean) as NavItem[]
  }

  const filterDocuments = (
    items: DocumentItem[]
  ): DocumentItem[] => {
    return items.filter((item) =>
      canSee({
        permission: item.permission,
        role: item.role,
      })
    )
  }

  const data = {
    user: {
      name: user?.name || "Usuário SRMS",
      email: user?.email || "usuario@srms.com",
      avatar: "",
    },

    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: IconDashboard,
        permission: "DASHBOARD_VIEW",
      },
      {
        title: "Risk Management",
        url: "/rms",
        icon: IconListDetails,
        permission: "RISK_VIEW",
        items: [
          {
            title: "Todas as RMs",
            url: "/rms",
            permission: "RISK_VIEW",
          },
          {
            title: "Nova RM",
            url: "/rms/create",
            permission: "RISK_CREATE",
          },
        ],
      },
      {
        title: "Cadastros",
        url: "#",
        icon: IconDatabase,
        permission: [
          "RISK_VIEW",
          "RISK_CREATE",
          "RISK_UPDATE",
          "USER_MANAGE",
        ],
        items: [
          {
            title: "PNs",
            url: "/pns",
            icon: IconListDetails,
            permission: [
              "RISK_VIEW",
              "RISK_CREATE",
              "RISK_UPDATE",
              "USER_MANAGE",
            ],
          },
          {
            title: "Classes e Modelos",
            url: "/vehicles",
            icon: IconDatabase,
            permission: [
              "RISK_VIEW",
              "RISK_CREATE",
              "RISK_UPDATE",
              "USER_MANAGE",
            ],
          },
        ],
      },
      {
        title: "Fornecedores",
        url: "/suppliers",
        icon: IconFolder,
        permission: "SUPPLIER_VIEW",
      },
      {
        title: "Logística",
        url: "/logistics",
        icon: IconTruck,
        permission: ["LOGISTICS_REQUEST_REVIEW"],
      },
      {
        title: "Usuários",
        url: "/users",
        icon: IconUsers,
        permission: ["USER_MANAGE", "RISK_VIEW"],
      },
      {
        title: "Administração",
        url: "#",
        icon: IconUserHexagon,
        permission: ["USER_MANAGE", "AUDIT_LOG_VIEW"],
        items: [
          {
            title: "Perfis e permissões",
            url: "/admin/roles",
            icon: IconShieldLock,
            permission: "USER_MANAGE",
          },
          {
            title: "Auditoria",
            url: "/admin/audit-logs",
            icon: IconHistory,
            permission: "AUDIT_LOG_VIEW",
          },
        ],
      },
    ] satisfies NavItem[],

    navSecondary: [
      {
        title: "Buscar RM",
        url: "/rms",
        icon: IconSearch,
      },
    ],

    documents: [
      {
        name: "Análise semanal",
        url: "/analytics/weekly",
        icon: IconChartBar,
        permission: ["ANALYTICS_VIEW", "DASHBOARD_VIEW", "USER_MANAGE"],
      },
      {
        name: "Config de snapshot",
        url: "/settings/weekly-snapshot",
        icon: IconSettings,
        role: "RISK_MANAGER",
      }
    ] satisfies DocumentItem[],
  }

  const filteredNavMain = filterNavItems(data.navMain)
  const filteredDocuments = filterDocuments(data.documents)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a
                href="/dashboard"
                className="flex items-center gap-2"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconInnerShadowTop className="size-5!" />
                </div>

                <div className="grid flex-1 text-left leading-tight">
                  <span className="text-sm font-semibold">
                    SRMS
                  </span>

                  <span className="text-xs text-muted-foreground">
                    Supplier Risk Management
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={filteredNavMain} />

        <NavDocuments items={filteredDocuments} />

        <NavSecondary
          items={data.navSecondary}
          className="mt-auto"
        />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}