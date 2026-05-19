"use client"

import React from "react"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Badge } from "@/components/ui/badge"

type Permission = {
  key: string
  description: string
  rolesCount: number
}

const mockPermissions: Permission[] = [
  {
    key: "USERS_VIEW",
    description: "View users list",
    rolesCount: 2,
  },
  {
    key: "USERS_MANAGE",
    description: "Create and edit users",
    rolesCount: 1,
  },
  {
    key: "RISK_CREATE",
    description: "Create RM records",
    rolesCount: 3,
  },
]

export default function PermissionsPage() {
  return (
    <ProtectedRoute permission="USER_MANAGE">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="px-6 py-6">
            <h1 className="text-2xl font-semibold">
              Permissions
            </h1>
            <p className="text-sm text-muted-foreground">
              System permissions catalog
            </p>
          </div>

          <div className="px-6 pb-10">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Used in Roles</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {mockPermissions.map((p) => (
                    <TableRow key={p.key}>
                      <TableCell className="font-medium">
                        {p.key}
                      </TableCell>

                      <TableCell>
                        {p.description}
                      </TableCell>

                      <TableCell>
                        <Badge>{p.rolesCount}</Badge>
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