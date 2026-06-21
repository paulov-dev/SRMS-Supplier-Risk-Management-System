"use client"

import * as React from "react"
import {
  IconDashboard,
  IconDatabase,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconHistory,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconShieldLock,
  IconUsers,
  IconUserHexagon,
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

type NavItem = {
  title: string
  url: string
  icon?: React.ComponentType<{
    className?: string
  }>
  permission?: PermissionRule
  items?: NavItem[]
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

  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items
      .map((item) => {
        const filteredChildren = item.items
          ? filterNavItems(item.items)
          : undefined

        const canSeeItem = hasPermission(item.permission)

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

  const data = {
    user: {
      name: user?.name || "Paulo Ferraz",
      email: user?.email || "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },

    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: IconDashboard,
        permission: "DASHBOARD_VIEW",
      },
      {
        title: "RMs",
        url: "/rms",
        icon: IconListDetails,
        permission: "RISK_VIEW",
      },
      {
        title: "Usuários",
        url: "/users",
        icon: IconUsers,
        permission: "USER_MANAGE",
      },
      {
        title: "Fornecedores",
        url: "/suppliers",
        icon: IconFolder,
        permission: "SUPPLIER_VIEW",
      },
      {
        title: "Admin",
        url: "#",
        icon: IconUserHexagon,
        permission: ["MANAGE_USERS", "AUDIT_LOG_VIEW"],
        items: [
          {
            title: "Roles",
            url: "/admin/roles",
            icon: IconShieldLock,
            permission: "USER_MANAGE",
          },
          {
            title: "Audit Logs",
            url: "/admin/audit-logs",
            icon: IconHistory,
            permission: "AUDIT_LOG_VIEW",
          },
        ],
      },
    ] satisfies NavItem[],

    navSecondary: [
      {
        title: "Settings",
        url: "#",
        icon: IconSettings,
      },
      {
        title: "Get Help",
        url: "#",
        icon: IconHelp,
      },
      {
        title: "Search",
        url: "#",
        icon: IconSearch,
      },
    ],

    documents: [
      {
        name: "Data Library",
        url: "#",
        icon: IconDatabase,
      },
      {
        name: "Reports",
        url: "#",
        icon: IconReport,
      },
      {
        name: "Word Assistant",
        url: "#",
        icon: IconFileWord,
      },
    ],
  }

  const filteredNavMain = filterNavItems(data.navMain)

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
                <IconInnerShadowTop className="size-5!" />

                <span className="text-base font-semibold">
                  SRMS | Supplier Risk Management System
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={filteredNavMain} />

        <NavDocuments items={data.documents} />

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