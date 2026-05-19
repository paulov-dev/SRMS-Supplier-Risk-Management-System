"use client"

import React, { useState } from "react"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function CreateRMPage() {
  const { user } = useAuth()
  const router = useRouter()

  const canCreateRM = user?.permissions?.includes("RISK_CREATE")

  const [loading, setLoading] = useState(false)

  // FIELDS
  const [supplier, setSupplier] = useState("")
  const [engineer, setEngineer] = useState("")
  const [reason, setReason] = useState("")
  const [pns, setPns] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      await fetch("/api/rms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplier,
          engineer,
          reason,
          pns: pns.split(",").map((pn) => pn.trim()),
          description,
        }),
      })

      router.push("/rms")
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute permission="RISK_CREATE">
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

          {/* HEADER */}
          <div className="px-6 py-6">
            <h1 className="text-2xl font-semibold">Create Risk Management</h1>
            <p className="text-sm text-muted-foreground">
              Fill the information below to register a new RM
            </p>
          </div>

          {/* FORM */}
          <div className="px-6 pb-10">
            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-lg border p-6"
            >
              {/* GRID RESPONSIVO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* SUPPLIER */}
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Input
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Bosch, Valeo..."
                  />
                </div>

                {/* ENGINEER */}
                <div className="space-y-2">
                  <Label>Engineer</Label>
                  <Input
                    value={engineer}
                    onChange={(e) => setEngineer(e.target.value)}
                    placeholder="Responsible engineer"
                  />
                </div>

                {/* REASON */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Reason</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why is this RM being created?"
                  />
                </div>

                {/* PNs */}
                <div className="space-y-2 md:col-span-2">
                  <Label>PNs (comma separated)</Label>
                  <Input
                    value={pns}
                    onChange={(e) => setPns(e.target.value)}
                    placeholder="PN123, PN456, PN789"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple Part Numbers with commas
                  </p>
                </div>

                {/* DESCRIPTION */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed explanation of the risk..."
                    rows={5}
                  />
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/rms")}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create RM"}
                </Button>
              </div>
            </form>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}