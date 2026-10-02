import { redirect } from "next/navigation"

import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"

import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"

import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { homeAccess } from "@/lib/home-data"

export default async function Page() {
  const user = await getUserFromRequest()

  if (!user) redirect("/")

  const permissions = user.roles.flatMap(userRole =>
    userRole.role.permissions.map(
      rolePermission => rolePermission.permission.name
    )
  )

  const access = homeAccess(
    permissions,
    user.roles.map(userRole => userRole.role.name)
  )

  if (!user.isActive || !access.home) {
    redirect("/403")
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="min-w-0 p-4 md:p-6">
          <DashboardOverview />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}