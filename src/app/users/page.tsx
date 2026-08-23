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
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import {
    Eye,
    Loader2,
    RefreshCw,
    Search,
    ShieldCheck,
    UserCheck,
    Users,
    UserX,
} from "lucide-react"

type UserRole =
    | string
    | {
          id?: string
          name: string
      }

type UserCounters = {
    createdRisks: number
    assignedRisks: number
    requestedLogistics: number
    assignedLogistics: number
    reviewedLogistics: number
}

type UserRow = {
    id: string
    name: string
    email: string
    photoUrl?: string | null
    isActive?: boolean
    status: "active" | "inactive"
    roles: UserRole[]
    permissions?: string[]
    createdAt: string
    counters?: UserCounters
}

type UsersSummary = {
    total: number
    active: number
    inactive: number
    admins: number
}

function getRoleName(role: UserRole) {
    if (typeof role === "string") {
        return role
    }

    return role.name
}

function getUserInitials(name: string) {
    const parts = name
        .trim()
        .split(" ")
        .filter(Boolean)

    if (parts.length === 0) return "U"

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase()
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatDate(value: string) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return "-"
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date)
}

function getStatusBadge(status: string) {
    if (status === "active") {
        return <Badge>Ativo</Badge>
    }

    if (status === "inactive") {
        return <Badge variant="destructive">Inativo</Badge>
    }

    return <Badge variant="secondary">{status}</Badge>
}

function getRoleBadge(role: string) {
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
        return (
            <Badge variant="default">
                {role}
            </Badge>
        )
    }

    if (role.includes("LOGISTICS")) {
        return (
            <Badge variant="outline">
                {role}
            </Badge>
        )
    }

    return (
        <Badge variant="secondary">
            {role}
        </Badge>
    )
}

export default function UsersPage() {
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<UserRow[]>([])

    const [summary, setSummary] =
        useState<UsersSummary | null>(null)

    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [roleFilter, setRoleFilter] = useState("all")

    useEffect(() => {
        loadUsers()
    }, [])

    async function loadUsers() {
        try {
            setLoading(true)

            const res = await fetch("/api/users", {
                credentials: "include",
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.details ||
                        data.error ||
                        "Erro ao carregar usuários"
                )
            }

            const nextUsers = data.data || data

            setUsers(Array.isArray(nextUsers) ? nextUsers : [])
            setSummary(data.summary || null)
        } catch (error) {
            console.error(error)
            setUsers([])
            setSummary(null)
        } finally {
            setLoading(false)
        }
    }

    const roleOptions = useMemo(() => {
        const roles = users.flatMap((user) =>
            user.roles.map((role) => getRoleName(role))
        )

        return Array.from(new Set(roles)).sort()
    }, [users])

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const normalizedSearch = search
                .trim()
                .toLowerCase()

            const roleNames = user.roles.map((role) =>
                getRoleName(role)
            )

            const matchesSearch =
                !normalizedSearch ||
                user.name
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                user.email
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                roleNames.some((role) =>
                    role
                        .toLowerCase()
                        .includes(normalizedSearch)
                )

            const matchesStatus =
                statusFilter === "all" ||
                user.status === statusFilter

            const matchesRole =
                roleFilter === "all" ||
                roleNames.includes(roleFilter)

            return (
                matchesSearch &&
                matchesStatus &&
                matchesRole
            )
        })
    }, [users, search, statusFilter, roleFilter])

    const computedSummary = useMemo(() => {
        if (summary) return summary

        return {
            total: users.length,
            active: users.filter(
                (user) => user.status === "active"
            ).length,
            inactive: users.filter(
                (user) => user.status === "inactive"
            ).length,
            admins: users.filter((user) =>
                user.roles.some((role) =>
                    ["ADMIN", "SUPER_ADMIN"].includes(
                        getRoleName(role)
                    )
                )
            ).length,
        }
    }, [summary, users])

    function clearFilters() {
        setSearch("")
        setStatusFilter("all")
        setRoleFilter("all")
    }

    return (
        <ProtectedRoute permission="USER_VIEW">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                                <h1 className="text-2xl font-semibold tracking-tight">
                                    Usuários
                                </h1>

                                <p className="text-sm text-muted-foreground">
                                    Gerencie acessos, cargos e acompanhe
                                    a atuação dos usuários no SRMS.
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={loadUsers}
                                disabled={loading}
                                className="w-full md:w-auto"
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                Atualizar
                            </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardDescription>
                                        Total de usuários
                                    </CardDescription>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>

                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {computedSummary.total}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Usuários cadastrados no sistema
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardDescription>
                                        Ativos
                                    </CardDescription>
                                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>

                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {computedSummary.active}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Usuários com acesso liberado
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardDescription>
                                        Inativos
                                    </CardDescription>
                                    <UserX className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>

                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {computedSummary.inactive}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Usuários bloqueados/inativos
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardDescription>
                                        Administradores
                                    </CardDescription>
                                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>

                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {computedSummary.admins}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Usuários com perfil administrativo
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Filtros
                                </CardTitle>

                                <CardDescription>
                                    Pesquise por nome, email ou cargo e
                                    filtre por status de acesso.
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_220px_auto] md:items-end">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Busca
                                        </label>

                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                            <Input
                                                value={search}
                                                onChange={(e) =>
                                                    setSearch(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Nome, email ou cargo..."
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Status
                                        </label>

                                        <Select
                                            value={statusFilter}
                                            onValueChange={
                                                setStatusFilter
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todos
                                                </SelectItem>
                                                <SelectItem value="active">
                                                    Ativos
                                                </SelectItem>
                                                <SelectItem value="inactive">
                                                    Inativos
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Cargo
                                        </label>

                                        <Select
                                            value={roleFilter}
                                            onValueChange={
                                                setRoleFilter
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Todos
                                                </SelectItem>

                                                {roleOptions.map(
                                                    (role) => (
                                                        <SelectItem
                                                            key={role}
                                                            value={role}
                                                        >
                                                            {role}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={clearFilters}
                                    >
                                        Limpar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle>
                                            Lista de usuários
                                        </CardTitle>

                                        <CardDescription>
                                            {filteredUsers.length} de{" "}
                                            {users.length} usuário(s)
                                            exibido(s)
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="min-w-[260px]">
                                                    Usuário
                                                </TableHead>

                                                <TableHead className="min-w-[220px]">
                                                    Cargos
                                                </TableHead>

                                                <TableHead>
                                                    Status
                                                </TableHead>

                                                <TableHead className="min-w-[180px]">
                                                    Atuação
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
                                                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Carregando usuários...
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredUsers.length ===
                                              0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={6}
                                                        className="h-32 text-center text-sm text-muted-foreground"
                                                    >
                                                        Nenhum usuário
                                                        encontrado.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredUsers.map(
                                                    (user) => {
                                                        const roleNames =
                                                            user.roles.map(
                                                                (
                                                                    role
                                                                ) =>
                                                                    getRoleName(
                                                                        role
                                                                    )
                                                            )

                                                        return (
                                                            <TableRow
                                                                key={
                                                                    user.id
                                                                }
                                                            >
                                                                <TableCell>
                                                                    <div className="flex min-w-0 items-center gap-3">
                                                                        {user.photoUrl ? (
                                                                            <img
                                                                                src={
                                                                                    user.photoUrl
                                                                                }
                                                                                alt={
                                                                                    user.name
                                                                                }
                                                                                className="h-10 w-10 rounded-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                                                                {getUserInitials(
                                                                                    user.name
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        <div className="min-w-0">
                                                                            <p className="truncate font-medium">
                                                                                {
                                                                                    user.name
                                                                                }
                                                                            </p>

                                                                            <p className="truncate text-sm text-muted-foreground">
                                                                                {
                                                                                    user.email
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>

                                                                <TableCell>
                                                                    <div className="flex max-w-[280px] flex-wrap gap-2">
                                                                        {roleNames.length >
                                                                        0 ? (
                                                                            roleNames.map(
                                                                                (
                                                                                    role
                                                                                ) => (
                                                                                    <span
                                                                                        key={
                                                                                            role
                                                                                        }
                                                                                    >
                                                                                        {getRoleBadge(
                                                                                            role
                                                                                        )}
                                                                                    </span>
                                                                                )
                                                                            )
                                                                        ) : (
                                                                            <Badge variant="outline">
                                                                                Sem cargo
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </TableCell>

                                                                <TableCell>
                                                                    {getStatusBadge(
                                                                        user.status
                                                                    )}
                                                                </TableCell>

                                                                <TableCell>
                                                                    <div className="space-y-1 text-xs text-muted-foreground">
                                                                        <p>
                                                                            RMs criadas:{" "}
                                                                            <span className="font-medium text-foreground">
                                                                                {user
                                                                                    .counters
                                                                                    ?.createdRisks ??
                                                                                    0}
                                                                            </span>
                                                                        </p>

                                                                        <p>
                                                                            RMs atribuídas:{" "}
                                                                            <span className="font-medium text-foreground">
                                                                                {user
                                                                                    .counters
                                                                                    ?.assignedRisks ??
                                                                                    0}
                                                                            </span>
                                                                        </p>

                                                                        <p>
                                                                            Logística:{" "}
                                                                            <span className="font-medium text-foreground">
                                                                                {user
                                                                                    .counters
                                                                                    ?.assignedLogistics ??
                                                                                    0}
                                                                            </span>
                                                                        </p>
                                                                    </div>
                                                                </TableCell>

                                                                <TableCell>
                                                                    {formatDate(
                                                                        user.createdAt
                                                                    )}
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
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        Visualizar
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    }
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}