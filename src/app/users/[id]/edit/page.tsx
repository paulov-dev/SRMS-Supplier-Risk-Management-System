"use client"

import React, { useState } from "react"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type Role = {
  id: string
  name: string
  permissions: string[]
}

const allPermissions = [
  "USERS_VIEW",
  "USERS_MANAGE",
  "ROLES_VIEW",
  "ROLES_MANAGE",
  "RISK_CREATE",
]

const mockRole: Role = {
  id: "1",
  name: "Engineer",
  permissions: ["USERS_VIEW", "RISK_CREATE"],
}

export default function RoleEditPage() {
  const router = useRouter()

  const [name, setName] = useState(mockRole.name)
  const [permissions, setPermissions] = useState<string[]>(
    mockRole.permissions
  )

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    )
  }

  const handleSave = async () => {
    await fetch(`/api/roles/${mockRole.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        permissions,
      }),
    })

    router.push("/roles")
  }

  return (
    <ProtectedRoute permission="USER_MANAGE">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          {/* HEADER */}
          <div className="px-6 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">
                Edit Role
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage role permissions and access
              </p>
            </div>

            <Badge variant="secondary">
              {permissions.length} permissions
            </Badge>
          </div>

          {/* CONTENT */}
          <div className="px-6 pb-10 space-y-6 max-w-3xl">

            {/* ROLE NAME */}
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* PERMISSIONS */}
            <div className="space-y-4">
              <Label>Permissions</Label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allPermissions.map((perm) => (
                  <div
                    key={perm}
                    className="flex items-center gap-2 border rounded-md p-3"
                  >
                    <Checkbox
                      checked={permissions.includes(perm)}
                      onCheckedChange={() =>
                        togglePermission(perm)
                      }
                    />
                    <span className="text-sm">{perm}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/roles")}
              >
                Cancel
              </Button>

              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}