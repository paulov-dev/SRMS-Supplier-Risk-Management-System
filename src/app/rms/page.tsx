"use client"

import React from "react"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function Page() {
  const { user } = useAuth()

  const canCreateRM = user?.permissions?.includes("RISK_CREATE")

  return (
    <ProtectedRoute permission="RISK_VIEW">
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          {/* HEADER DA PÁGINA */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold">Risk Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage and track all RM records
              </p>
            </div>

            {/* BOTÃO CONDICIONAL */}
            {canCreateRM && (
              <Button className="gap-2">
              
                
                <Plus className="w-4 h-4" />
                Create RM
              </Button>
            )}
          </div>

          {/* CONTEÚDO PRINCIPAL */}
          <div className="px-6">
            <div className="rounded-lg border p-6">
              <p className="text-sm text-muted-foreground">
                Aqui entraria sua tabela de RMs
              </p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}