import { redirect } from "next/navigation"

import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"

import {
    SidebarProvider,
    SidebarInset,
} from "@/components/ui/sidebar"

import { AIHistoryPanel } from "./panel"

export default async function Page() {
    const user = await getUserFromRequest()

    if (!user) {
        redirect("/")
    }

    if (
        !user.roles.some(
            item => item.role.name === "ADMIN"
        )
    ) {
        redirect("/403")
    }

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" />

            <SidebarInset>
                <SiteHeader />

                <main className="min-w-0 space-y-6 p-4 md:p-6">
                    <AIHistoryPanel />
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}