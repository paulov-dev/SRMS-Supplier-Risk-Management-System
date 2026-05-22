"use client"

import { useEffect, useState } from "react"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

import { SuppliersTable } from "@/components/suppliers/suppliers-table"

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])

  async function loadSuppliers() {
    const res = await fetch("/api/suppliers")

    const data = await res.json()

    setSuppliers(data)
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  return (
    <ProtectedRoute permission="SUPPLIER_VIEW">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="px-6 py-6">
            <h1 className="text-2xl font-semibold">
              Suppliers
            </h1>

            <p className="text-sm text-muted-foreground">
              Supplier management and monitoring
            </p>
          </div>

          <div className="px-6 pb-8">
            <SuppliersTable
              data={suppliers}
              onReload={loadSuppliers}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}