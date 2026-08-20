"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  rms: "RMs",
  create: "Nova RM",
  users: "Usuários",
  suppliers: "Fornecedores",
  admin: "Administração",
  roles: "Perfis e permissões",
  "audit-logs": "Auditoria",
  profile: "Meu perfil",
  notifications: "Alertas",
}

export function SiteHeader() {
  const pathname = usePathname()

  const [dynamicLabel, setDynamicLabel] =
    React.useState<string | null>(null)

  const segments = pathname
    .split("/")
    .filter(Boolean)

  const lastSegment = segments[segments.length - 1]
  const previousSegment = segments[segments.length - 2]

  React.useEffect(() => {
    async function loadDynamicLabel() {
      setDynamicLabel(null)

      if (!lastSegment || !isUuid(lastSegment)) {
        return
      }

      try {
        if (previousSegment === "rms") {
          const res = await fetch(`/api/risk/${lastSegment}`, {
            credentials: "include",
          })

          if (!res.ok) {
            return
          }

          const json = await res.json()
          const risk = json.data || json

          const code = risk.code || "RM"
          const supplierName = risk.supplier?.name

          setDynamicLabel(
            supplierName
              ? `${code} - ${supplierName}`
              : code
          )
        }

        if (previousSegment === "users") {
          const res = await fetch(`/api/users/${lastSegment}`, {
            credentials: "include",
          })

          if (!res.ok) {
            return
          }

          const json = await res.json()
          const user = json.data || json

          setDynamicLabel(user.name || user.email || "Usuário")
        }

        if (previousSegment === "suppliers") {
          const res = await fetch(`/api/suppliers/${lastSegment}`, {
            credentials: "include",
          })

          if (!res.ok) {
            return
          }

          const json = await res.json()
          const supplier = json.data || json

          setDynamicLabel(supplier.name || "Fornecedor")
        }
      } catch {
        setDynamicLabel(null)
      }
    }

    loadDynamicLabel()
  }, [lastSegment, previousSegment])

  function getSegmentLabel(segment: string) {
    if (isUuid(segment)) {
      return dynamicLabel || "Carregando..."
    }

    return routeLabels[segment] || segment
  }

  function getSegmentHref(index: number) {
    return "/" + segments.slice(0, index + 1).join("/")
  }

  return (
  <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-4">
    <SidebarTrigger className="-ml-1" />

    <Separator
      orientation="vertical"
      className="mr-2 h-4"
    />

    <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="font-medium text-foreground hover:underline"
      >
        SRMS
      </Link>

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        const label = getSegmentLabel(segment)
        const href = getSegmentHref(index)

        return (
          <React.Fragment key={`${segment}-${index}`}>
            <span className="text-muted-foreground">
              /
            </span>

            {isLast ? (
              <span className="truncate font-medium text-foreground">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>

    <ThemeToggle />
  </header>
)
}