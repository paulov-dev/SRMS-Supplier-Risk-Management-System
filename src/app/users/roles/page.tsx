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
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Role = {
  id: string
  name: string
  description: string
  usersCount: number
}

const mockRoles: Role[] = [
  {
    id: "1",
    name: "Admin",
    description: "Full system access",
    usersCount: 2,
  },
  {
    id: "2",
    name: "Engineer",
    description: "Engineering operations",
    usersCount: 5,
  },
  {
    id: "3",
    name: "Viewer",
    description: "Read-only access",
    usersCount: 10,
  },
]

export default function RolesPage() {
  const { user } = useAuth()
  const router = useRouter()

  const canManageRoles =
    user?.permissions?.includes("USER_MANAGE")

  return (
    <ProtectedRoute permission="USER_MANAGE">
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
          <div className="flex items-center justify-between px-6 py-6">
            <div>
              <h1 className="text-2xl font-semibold">
                Roles
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage system roles and permissions
              </p>
            </div>

            {canManageRoles && (
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Role
              </Button>
            )}
          </div>

          {/* TABLE */}
          <div className="px-6 pb-10">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead className="text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {mockRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        {role.name}
                      </TableCell>

                      <TableCell>
                        {role.description}
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary">
                          {role.usersCount}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button variant="ghost">
                          Manage Permissions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}