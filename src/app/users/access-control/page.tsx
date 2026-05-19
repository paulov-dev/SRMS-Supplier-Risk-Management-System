"use client"

import React from "react"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Check, X } from "lucide-react"

const roles = ["Admin", "Engineer", "Viewer"]

const permissions = [
  "USERS_VIEW",
  "USERS_MANAGE",
  "ROLES_MANAGE",
  "RISK_CREATE",
]

const matrix: Record<string, Record<string, boolean>> = {
  USERS_VIEW: {
    Admin: true,
    Engineer: false,
    Viewer: false,
  },
  USERS_MANAGE: {
    Admin: true,
    Engineer: false,
    Viewer: false,
  },
  ROLES_MANAGE: {
    Admin: true,
    Engineer: false,
    Viewer: false,
  },
  RISK_CREATE: {
    Admin: true,
    Engineer: true,
    Viewer: false,
  },
}

export default function AccessControlPage() {
  return (
    <ProtectedRoute permission="USER_MANAGE">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="px-6 py-6">
            <h1 className="text-2xl font-semibold">
              Access Control Matrix
            </h1>
            <p className="text-sm text-muted-foreground">
              Role vs Permission mapping
            </p>
          </div>

          <div className="px-6 pb-10 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role}>
                      {role}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {permissions.map((perm) => (
                  <TableRow key={perm}>
                    <TableCell className="font-medium">
                      {perm}
                    </TableCell>

                    {roles.map((role) => (
                      <TableCell key={role}>
                        {matrix[perm][role] ? (
                          <Check className="text-green-500 w-4 h-4" />
                        ) : (
                          <X className="text-muted-foreground w-4 h-4" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}