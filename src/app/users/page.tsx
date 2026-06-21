"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Loader2,
  Eye,
} from "lucide-react"

type UserRow = {
  id: string
  name: string
  email: string
  status: "active" | "inactive"
  roles: string[]
  createdAt: string
}

export default function UsersPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)

  const [users, setUsers] =
    useState<UserRow[]>([])

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const res = await fetch("/api/users")

      if (!res.ok) {
        throw new Error("Failed to load users")
      }

      const data = await res.json()

      setUsers(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "active":
        return (
          <Badge variant="default">
            Ativo
          </Badge>
        )

      case "inactive":
        return (
          <Badge variant="destructive">
            Inativo
          </Badge>
        )

      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <ProtectedRoute permission="USER_MANAGE">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="px-6 py-6">
            <h1 className="text-2xl font-semibold">
              Users
            </h1>

            <p className="text-sm text-muted-foreground">
              Manage and monitor system users
            </p>
          </div>

          <div className="px-6 pb-8">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Nome
                      </TableHead>

                      <TableHead>
                        Email
                      </TableHead>

                      <TableHead>
                        Cargos
                      </TableHead>

                      <TableHead>
                        Status
                      </TableHead>

                      <TableHead>
                        Criado em
                      </TableHead>

                      <TableHead className="text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>

                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading users...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center"
                        >
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            {user.name}
                          </TableCell>

                          <TableCell>
                            {user.email}
                          </TableCell>

                          <TableCell>
                            <div className="flex gap-2 flex-wrap">
                              {user.roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="secondary"
                                >
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>

                          <TableCell>
                            {getStatusBadge(user.status)}
                          </TableCell>

                          <TableCell>
                            {new Date(
                              user.createdAt
                            ).toLocaleDateString()}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/users/${user.id}`
                                )
                              }
                            >
                              Visualiar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}

                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}