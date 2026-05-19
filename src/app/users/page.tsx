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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { MoreHorizontal } from "lucide-react"

type UserRow = {
  id: string
  name: string
  email: string
  roles: string[]
  status: "active" | "inactive"
}

const mockUsers: UserRow[] = [
  {
    id: "1",
    name: "Paulo Ferraz",
    email: "paulo@email.com",
    roles: ["Admin", "Engineer"],
    status: "active",
  },
  {
    id: "2",
    name: "Maria Silva",
    email: "maria@email.com",
    roles: ["Engineer"],
    status: "active",
  },
  {
    id: "3",
    name: "João Souza",
    email: "joao@email.com",
    roles: ["Viewer", "Engineer", "Admin"],
    status: "inactive",
  },
]

export default function UsersPage() {
  const { user } = useAuth()
  const router = useRouter()

  const canManageUsers =
    user?.permissions?.includes("USER_MANAGE")

  const canViewUsers =
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
                Users
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage users, roles and access permissions
              </p>
            </div>

            {canManageUsers && (
              <Button
                className="gap-2"
                onClick={() => router.push("/users/create")}
              >
                <Plus className="w-4 h-4" />
                Create User
              </Button>
            )}
          </div>

          {/* TABLE */}
          <div className="px-6 pb-10">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {mockUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.name}
                      </TableCell>

                      <TableCell>{u.email}</TableCell>

                      {/* ROLES (MULTI ROLE UX) */}
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {u.roles.slice(0, 2).map((role) => (
                            <Badge
                              key={role}
                              variant="secondary"
                            >
                              {role}
                            </Badge>
                          ))}

                          {u.roles.length > 2 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline">
                                  +{u.roles.length - 2}
                                </Badge>
                              </TooltipTrigger>

                              <TooltipContent>
                                {u.roles.slice(2).join(", ")}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>

                      {/* STATUS */}
                      <TableCell>
                        {u.status === "active" ? (
                          <Badge className="bg-green-500">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>

                      {/* ACTIONS */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/users/${u.id}`)}>
                              View
                            </DropdownMenuItem>

                            {canManageUsers && (
                              <>
                                <DropdownMenuItem onClick={() => router.push(`/users/${u.id}/edit`)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/users/${u.id}/roles`)}>
                                  Manage Roles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/users/${u.id}/permissions`)}>
                                  Disable User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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