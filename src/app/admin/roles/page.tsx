"use client"

import { useEffect, useMemo, useState } from "react"
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  Eye,
  KeyRound,
  Loader2,
  Plus,
  Shield,
  UserCog,
} from "lucide-react"

import { toast } from "sonner"

type UserItem = {
  id: string
  name: string
  email: string
  isActive: boolean
  roles: string[]
}

type RoleItem = {
  id: string
  name: string
  permissions: string[]
  usersCount: number
}

type PermissionItem = {
  id: string
  name: string
  rolesCount: number
}

type OverviewData = {
  users: UserItem[]
  roles: RoleItem[]
  permissions: PermissionItem[]
}

export default function RbacManagementPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [data, setData] = useState<OverviewData>({
    users: [],
    roles: [],
    permissions: [],
  })

  const [searchUser, setSearchUser] = useState("")
  const [searchRole, setSearchRole] = useState("")
  const [searchPermission, setSearchPermission] = useState("")

  const [selectedUser, setSelectedUser] =
    useState<UserItem | null>(null)

  const [selectedUserRoleIds, setSelectedUserRoleIds] =
    useState<string[]>([])

  const [selectedRole, setSelectedRole] =
    useState<RoleItem | null>(null)

  const [
    selectedRolePermissionIds,
    setSelectedRolePermissionIds,
  ] = useState<string[]>([])

  const [openCreateRole, setOpenCreateRole] =
    useState(false)

  const [openCreatePermission, setOpenCreatePermission] =
    useState(false)

  const [newRoleName, setNewRoleName] = useState("")
  const [newPermissionName, setNewPermissionName] =
    useState("")

  useEffect(() => {
    loadOverview()
  }, [])

  async function loadOverview() {
    try {
      setLoading(true)

      const res = await fetch("/api/rbac/overview", {
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error("Erro ao carregar RBAC")
      }

      const json = await res.json()

      setData(json)
    } catch (error) {
      console.error(error)
      toast.error("Erro ao carregar dados de RBAC")
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = useMemo(() => {
    return data.users.filter((user) => {
      const value = searchUser.toLowerCase()

      return (
        user.name.toLowerCase().includes(value) ||
        user.email.toLowerCase().includes(value) ||
        user.roles.join(" ").toLowerCase().includes(value)
      )
    })
  }, [data.users, searchUser])

  const filteredRoles = useMemo(() => {
    return data.roles.filter((role) => {
      const value = searchRole.toLowerCase()

      return (
        role.name.toLowerCase().includes(value) ||
        role.permissions
          .join(" ")
          .toLowerCase()
          .includes(value)
      )
    })
  }, [data.roles, searchRole])

  const filteredPermissions = useMemo(() => {
    return data.permissions.filter((permission) =>
      permission.name
        .toLowerCase()
        .includes(searchPermission.toLowerCase())
    )
  }, [data.permissions, searchPermission])

  function getStatusBadge(isActive: boolean) {
    return isActive ? (
      <Badge className="bg-green-600">
        Ativo
      </Badge>
    ) : (
      <Badge variant="destructive">
        Inativo
      </Badge>
    )
  }

  function openUserRolesDialog(user: UserItem) {
    const roleIds = data.roles
      .filter((role) => user.roles.includes(role.name))
      .map((role) => role.id)

    setSelectedUser(user)
    setSelectedUserRoleIds(roleIds)
  }

  function openRolePermissionsDialog(role: RoleItem) {
    const permissionIds = data.permissions
      .filter((permission) =>
        role.permissions.includes(permission.name)
      )
      .map((permission) => permission.id)

    setSelectedRole(role)
    setSelectedRolePermissionIds(permissionIds)
  }

  function toggleUserRole(roleId: string) {
    setSelectedUserRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    )
  }

  function toggleRolePermission(permissionId: string) {
    setSelectedRolePermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  async function saveUserRoles() {
    if (!selectedUser) return

    try {
      setSaving(true)

      const res = await fetch(
        `/api/rbac/users/${selectedUser.id}/roles`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roleIds: selectedUserRoleIds,
          }),
        }
      )

      const json = await res.json()

      if (!res.ok) {
        throw new Error(
          json.error || "Erro ao atualizar roles"
        )
      }

      toast.success("Roles do usuário atualizadas")

      setSelectedUser(null)
      setSelectedUserRoleIds([])

      await loadOverview()
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar roles"
      )
    } finally {
      setSaving(false)
    }
  }

  async function saveRolePermissions() {
    if (!selectedRole) return

    try {
      setSaving(true)

      const res = await fetch(
        `/api/rbac/roles/${selectedRole.id}/permissions`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            permissionIds: selectedRolePermissionIds,
          }),
        }
      )

      const json = await res.json()

      if (!res.ok) {
        throw new Error(
          json.error ||
            "Erro ao atualizar permissões da role"
        )
      }

      toast.success("Permissões da role atualizadas")

      setSelectedRole(null)
      setSelectedRolePermissionIds([])

      await loadOverview()
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar permissões"
      )
    } finally {
      setSaving(false)
    }
  }

  async function createRole() {
    try {
      if (!newRoleName.trim()) {
        toast.error("Informe o nome da role")
        return
      }

      setSaving(true)

      const res = await fetch("/api/rbac/roles", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newRoleName,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(
          json.error || "Erro ao criar role"
        )
      }

      toast.success("Role criada com sucesso")

      setNewRoleName("")
      setOpenCreateRole(false)

      await loadOverview()
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao criar role"
      )
    } finally {
      setSaving(false)
    }
  }

  async function createPermission() {
    try {
      if (!newPermissionName.trim()) {
        toast.error("Informe o nome da permissão")
        return
      }

      setSaving(true)

      const res = await fetch("/api/rbac/permissions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newPermissionName,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(
          json.error || "Erro ao criar permissão"
        )
      }

      toast.success("Permissão criada com sucesso")

      setNewPermissionName("")
      setOpenCreatePermission(false)

      await loadOverview()
    } catch (error) {
      console.error(error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao criar permissão"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute permission="USER_MANAGE">
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">
                  RBAC Management
                </h1>

                <p className="text-sm text-muted-foreground">
                  Gerencie usuários, roles e permissões do
                  sistema
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setOpenCreatePermission(true)
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Permissão
                </Button>

                <Button
                  onClick={() => setOpenCreateRole(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Role
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Usuários
                      </p>

                      <p className="text-3xl font-bold">
                        {data.users.length}
                      </p>
                    </div>

                    <UserCog className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Roles
                      </p>

                      <p className="text-3xl font-bold">
                        {data.roles.length}
                      </p>
                    </div>

                    <Shield className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Permissões
                      </p>

                      <p className="text-3xl font-bold">
                        {data.permissions.length}
                      </p>
                    </div>

                    <KeyRound className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="users">
              <TabsList>
                <TabsTrigger value="users">
                  Users
                </TabsTrigger>

                <TabsTrigger value="roles">
                  Roles
                </TabsTrigger>

                <TabsTrigger value="permissions">
                  Permissions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <CardTitle>
                        Usuários do Sistema
                      </CardTitle>

                      <Input
                        className="md:w-80"
                        placeholder="Buscar por nome, email ou role..."
                        value={searchUser}
                        onChange={(e) =>
                          setSearchUser(e.target.value)
                        }
                      />
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-32 text-center"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Carregando usuários...
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center"
                            >
                              Nenhum usuário encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                {user.name}
                              </TableCell>

                              <TableCell>
                                {user.email}
                              </TableCell>

                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  {user.roles.length === 0 ? (
                                    <Badge variant="outline">
                                      Sem role
                                    </Badge>
                                  ) : (
                                    user.roles.map((role) => (
                                      <Badge
                                        key={role}
                                        variant="secondary"
                                      >
                                        {role}
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                {getStatusBadge(
                                  user.isActive
                                )}
                              </TableCell>

                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      router.push(
                                        `/users/${user.id}`
                                      )
                                    }
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver
                                  </Button>

                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      openUserRolesDialog(
                                        user
                                      )
                                    }
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Roles
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="roles" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <CardTitle>
                        Roles
                      </CardTitle>

                      <Input
                        className="md:w-80"
                        placeholder="Buscar role..."
                        value={searchRole}
                        onChange={(e) =>
                          setSearchRole(e.target.value)
                        }
                      />
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead>Permissões</TableHead>
                          <TableHead>Usuários</TableHead>
                          <TableHead className="text-right">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {filteredRoles.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center"
                            >
                              Nenhuma role encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRoles.map((role) => (
                            <TableRow key={role.id}>
                              <TableCell className="font-medium">
                                {role.name}
                              </TableCell>

                              <TableCell>
                                <div className="flex max-w-xl flex-wrap gap-2">
                                  {role.permissions.length ===
                                  0 ? (
                                    <Badge variant="outline">
                                      Sem permissão
                                    </Badge>
                                  ) : (
                                    role.permissions.map(
                                      (permission) => (
                                        <Badge
                                          key={permission}
                                          variant="outline"
                                        >
                                          {permission}
                                        </Badge>
                                      )
                                    )
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                {role.usersCount}
                              </TableCell>

                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    openRolePermissionsDialog(
                                      role
                                    )
                                  }
                                >
                                  <KeyRound className="mr-2 h-4 w-4" />
                                  Permissões
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="permissions"
                className="mt-4"
              >
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <CardTitle>
                        Permissões
                      </CardTitle>

                      <Input
                        className="md:w-80"
                        placeholder="Buscar permissão..."
                        value={searchPermission}
                        onChange={(e) =>
                          setSearchPermission(
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Permissão</TableHead>
                          <TableHead>Roles vinculadas</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {filteredPermissions.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              className="text-center"
                            >
                              Nenhuma permissão encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPermissions.map(
                            (permission) => (
                              <TableRow key={permission.id}>
                                <TableCell className="font-medium">
                                  {permission.name}
                                </TableCell>

                                <TableCell>
                                  {permission.rolesCount}
                                </TableCell>
                              </TableRow>
                            )
                          )
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <Dialog
            open={!!selectedUser}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedUser(null)
                setSelectedUserRoleIds([])
              }
            }}
          >
            <DialogContent className="w-[520px] max-w-[90vw]">
              <DialogHeader>
                <DialogTitle>
                  Gerenciar Roles do Usuário
                </DialogTitle>
              </DialogHeader>

              {selectedUser && (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">
                      {selectedUser.name}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {selectedUser.email}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {data.roles.map((role) => (
                      <label
                        key={role.id}
                        className="flex cursor-pointer items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {role.name}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {
                              role.permissions.length
                            }{" "}
                            permissões
                          </p>
                        </div>

                        <Checkbox
                          checked={selectedUserRoleIds.includes(
                            role.id
                          )}
                          onCheckedChange={() =>
                            toggleUserRole(role.id)
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null)
                    setSelectedUserRoleIds([])
                  }}
                >
                  Cancelar
                </Button>

                <Button
                  disabled={saving}
                  onClick={saveUserRoles}
                >
                  {saving ? "Salvando..." : "Salvar Roles"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!selectedRole}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedRole(null)
                setSelectedRolePermissionIds([])
              }
            }}
          >
            <DialogContent className="sm:max-w-350 max-w-[90vw]">
              <DialogHeader>
                <DialogTitle>
                  Gerenciar Permissões da Role
                </DialogTitle>
              </DialogHeader>

              {selectedRole && (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">
                      {selectedRole.name}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Selecione as permissões que esta role
                      deve possuir.
                    </p>
                  </div>

                  <div className="grid max-h-[420px] gap-3 overflow-y-auto md:grid-cols-2">
                    {data.permissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-center justify-between rounded-md border p-3"
                      >
                        <p className="text-sm font-medium">
                          {permission.name}
                        </p>

                        <Checkbox
                          checked={selectedRolePermissionIds.includes(
                            permission.id
                          )}
                          onCheckedChange={() =>
                            toggleRolePermission(
                              permission.id
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRole(null)
                    setSelectedRolePermissionIds([])
                  }}
                >
                  Cancelar
                </Button>

                <Button
                  disabled={saving}
                  onClick={saveRolePermissions}
                >
                  {saving
                    ? "Salvando..."
                    : "Salvar Permissões"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={openCreateRole}
            onOpenChange={setOpenCreateRole}
          >
            <DialogContent className="w-[420px] max-w-[90vw]">
              <DialogHeader>
                <DialogTitle>
                  Criar Nova Role
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-2">
                <Label>Nome da Role</Label>

                <Input
                  placeholder="Ex: QUALITY_ANALYST"
                  value={newRoleName}
                  onChange={(e) =>
                    setNewRoleName(e.target.value)
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    setOpenCreateRole(false)
                  }
                >
                  Cancelar
                </Button>

                <Button
                  disabled={saving}
                  onClick={createRole}
                >
                  Criar Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={openCreatePermission}
            onOpenChange={setOpenCreatePermission}
          >
            <DialogContent className="w-[420px] max-w-[90vw]">
              <DialogHeader>
                <DialogTitle>
                  Criar Nova Permissão
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-2">
                <Label>Nome da Permissão</Label>

                <Input
                  placeholder="Ex: RISK_DELETE"
                  value={newPermissionName}
                  onChange={(e) =>
                    setNewPermissionName(e.target.value)
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    setOpenCreatePermission(false)
                  }
                >
                  Cancelar
                </Button>

                <Button
                  disabled={saving}
                  onClick={createPermission}
                >
                  Criar Permissão
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}