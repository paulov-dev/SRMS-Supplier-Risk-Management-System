"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"

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
    AlertTriangle,
    CalendarClock,
    Eye,
    KeyRound,
    Loader2,
    RefreshCw,
    Search,
    ShieldCheck,
    UserCheck,
    Users,
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
    isActive: boolean
    status: "active" | "inactive"
    roles: UserRole[]
    permissions: string[]
    createdAt: string
    counters: UserCounters
}

type UserViewFilter =
    | "all"
    | "pending"
    | "active"
    | "inactive"
    | "admins"
    | "without_role"

const EMPTY_COUNTERS: UserCounters = {
    createdRisks: 0,
    assignedRisks: 0,
    requestedLogistics: 0,
    assignedLogistics: 0,
    reviewedLogistics: 0,
}

function getRoleName(role: UserRole) {
    return typeof role === "string" ? role : role.name
}

function getRoleNames(user: UserRow) {
    return user.roles.map(getRoleName)
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

function formatDate(value?: string | null) {
    if (!value) return "-"

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return "-"

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date)
}

function normalize(value?: string | null) {
    return (value || "")
        .trim()
        .toLocaleLowerCase("pt-BR")
}

function isAdmin(user: UserRow) {
    return getRoleNames(user).some((role) =>
        ["ADMIN", "SUPER_ADMIN"].includes(role)
    )
}

/*
 * O cadastro público cria o usuário inativo e sem cargo.
 * Por isso, essa combinação identifica uma solicitação nova.
 */
function isPendingApproval(user: UserRow) {
    return !user.isActive && user.roles.length === 0
}

function isRecentRegistration(value: string) {
    const createdAt = new Date(value)

    if (Number.isNaN(createdAt.getTime())) return false

    const difference = Date.now() - createdAt.getTime()
    const differenceInDays =
        difference / (1000 * 60 * 60 * 24)

    return differenceInDays <= 30
}

function getActivityTotal(user: UserRow) {
    return (
        user.counters.createdRisks +
        user.counters.assignedRisks +
        user.counters.requestedLogistics +
        user.counters.assignedLogistics +
        user.counters.reviewedLogistics
    )
}

function getUserPriority(user: UserRow) {
    if (isPendingApproval(user)) return 0
    if (!user.isActive) return 1
    if (user.roles.length === 0) return 2
    return 3
}

function getRoleBadge(role: string) {
    if (role === "SUPER_ADMIN") {
        return (
            <Badge variant="destructive">
                SUPER_ADMIN
            </Badge>
        )
    }

    if (role === "ADMIN") {
        return <Badge>ADMIN</Badge>
    }

    if (role.includes("LOGISTICS")) {
        return <Badge variant="outline">{role}</Badge>
    }

    return <Badge variant="secondary">{role}</Badge>
}

function getAccessBadge(user: UserRow) {
    if (isPendingApproval(user)) {
        return (
            <Badge className="bg-yellow-500 text-black">
                Aguardando ativação
            </Badge>
        )
    }

    if (!user.isActive) {
        return <Badge variant="destructive">Inativo</Badge>
    }

    if (user.roles.length === 0) {
        return (
            <Badge className="bg-orange-500">
                Ativo sem cargo
            </Badge>
        )
    }

    return <Badge className="bg-green-600">Ativo</Badge>
}

function MetricCard({
    title,
    value,
    description,
    icon,
    attention = false,
}: {
    title: string
    value: number
    description: string
    icon: React.ReactNode
    attention?: boolean
}) {
    return (
        <Card
            className={
                attention
                    ? "border-yellow-200 dark:border-yellow-900"
                    : undefined
            }
        >
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {title}
                        </p>

                        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                            {value}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                            {description}
                        </p>
                    </div>

                    <div
                        className={
                            attention
                                ? "rounded-lg bg-yellow-50 p-2.5 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300"
                                : "rounded-lg bg-muted p-2.5 text-muted-foreground"
                        }
                    >
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function GovernanceItem({
    icon,
    value,
    description,
}: {
    icon: React.ReactNode
    value: number
    description: string
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="rounded-md bg-muted p-2 text-muted-foreground">
                {icon}
            </div>

            <div>
                <p className="font-medium tabular-nums">
                    {value}
                </p>

                <p className="text-xs text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    )
}

export default function UsersPage() {
    const router = useRouter()

    const [users, setUsers] = useState<UserRow[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [search, setSearch] = useState("")
    const [viewFilter, setViewFilter] =
        useState<UserViewFilter>("all")
    const [roleFilter, setRoleFilter] = useState("all")

    const loadUsers = useCallback(
        async (showFullLoading = false) => {
            try {
                if (showFullLoading) {
                    setLoading(true)
                } else {
                    setRefreshing(true)
                }

                setError(null)

                const response = await fetch("/api/users", {
                    credentials: "include",
                    cache: "no-store",
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(
                        data.details ||
                            data.error ||
                            "Erro ao carregar usuários"
                    )
                }

                const receivedUsers = data.data || data

                const formattedUsers: UserRow[] = Array.isArray(
                    receivedUsers
                )
                    ? receivedUsers.map((user: UserRow) => ({
                          ...user,
                          isActive:
                              typeof user.isActive === "boolean"
                                  ? user.isActive
                                  : user.status === "active",
                          status:
                              user.status ||
                              (user.isActive
                                  ? "active"
                                  : "inactive"),
                          roles: user.roles || [],
                          permissions: user.permissions || [],
                          counters: {
                              ...EMPTY_COUNTERS,
                              ...(user.counters || {}),
                          },
                      }))
                    : []

                setUsers(formattedUsers)
            } catch (loadError) {
                console.error(loadError)

                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "Não foi possível carregar os usuários."
                )
            } finally {
                setLoading(false)
                setRefreshing(false)
            }
        },
        []
    )

    useEffect(() => {
        void loadUsers(true)
    }, [loadUsers])

    const roleOptions = useMemo(() => {
        const roles = users.flatMap((user) =>
            getRoleNames(user)
        )

        return Array.from(new Set(roles)).sort((a, b) =>
            a.localeCompare(b, "pt-BR")
        )
    }, [users])

    const stats = useMemo(() => {
        const total = users.length

        const active = users.filter(
            (user) => user.isActive
        ).length

        const inactive = users.filter(
            (user) => !user.isActive
        ).length

        const pending = users.filter(
            isPendingApproval
        ).length

        const admins = users.filter(isAdmin).length

        const withoutRole = users.filter(
            (user) => user.roles.length === 0
        ).length

        const activeWithoutRole = users.filter(
            (user) => user.isActive && user.roles.length === 0
        ).length

        const userManagers = users.filter((user) =>
            user.permissions.includes("USER_MANAGE")
        ).length

        const recentRegistrations = users.filter((user) =>
            isRecentRegistration(user.createdAt)
        ).length

        return {
            total,
            active,
            inactive,
            pending,
            admins,
            withoutRole,
            activeWithoutRole,
            userManagers,
            recentRegistrations,
        }
    }, [users])

    const roleDistribution = useMemo(() => {
        const distribution = new Map<string, number>()

        for (const user of users) {
            for (const role of getRoleNames(user)) {
                distribution.set(
                    role,
                    (distribution.get(role) || 0) + 1
                )
            }
        }

        return Array.from(distribution.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((roleA, roleB) => {
                if (roleB.total !== roleA.total) {
                    return roleB.total - roleA.total
                }

                return roleA.name.localeCompare(
                    roleB.name,
                    "pt-BR"
                )
            })
            .slice(0, 6)
    }, [users])

    const filteredUsers = useMemo(() => {
        const normalizedSearch = normalize(search)

        const filtered = users.filter((user) => {
            const roleNames = getRoleNames(user)

            const matchesSearch =
                !normalizedSearch ||
                normalize(user.name).includes(normalizedSearch) ||
                normalize(user.email).includes(normalizedSearch) ||
                roleNames.some((role) =>
                    normalize(role).includes(normalizedSearch)
                ) ||
                user.permissions.some((permission) =>
                    normalize(permission).includes(
                        normalizedSearch
                    )
                )

            const matchesView = (() => {
                switch (viewFilter) {
                    case "pending":
                        return isPendingApproval(user)
                    case "active":
                        return user.isActive
                    case "inactive":
                        return !user.isActive
                    case "admins":
                        return isAdmin(user)
                    case "without_role":
                        return user.roles.length === 0
                    default:
                        return true
                }
            })()

            const matchesRole =
                roleFilter === "all" ||
                roleNames.includes(roleFilter)

            return (
                matchesSearch && matchesView && matchesRole
            )
        })

        return [...filtered].sort((userA, userB) => {
            const priorityDifference =
                getUserPriority(userA) -
                getUserPriority(userB)

            if (priorityDifference !== 0) {
                return priorityDifference
            }

            return (
                new Date(userB.createdAt).getTime() -
                new Date(userA.createdAt).getTime()
            )
        })
    }, [users, search, viewFilter, roleFilter])

    function clearFilters() {
        setSearch("")
        setViewFilter("all")
        setRoleFilter("all")
    }

    function getPercentage(value: number) {
        if (stats.total === 0) return 0

        return (value / stats.total) * 100
    }

    return (
        <ProtectedRoute permission="USER_VIEW">
            <SidebarProvider>
                <AppSidebar variant="inset" />

                <SidebarInset>
                    <SiteHeader />

                    <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-6 p-4 md:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight">
                                    Gestão de acessos
                                </h1>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Priorize novas solicitações, revise cargos e acompanhe a atuação dos usuários no SRMS.
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void loadUsers(false)}
                                disabled={refreshing}
                            >
                                {refreshing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                Atualizar
                            </Button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <MetricCard
                                title="Base total"
                                value={stats.total}
                                description="Usuários cadastrados"
                                icon={<Users className="h-5 w-5" />}
                            />

                            <MetricCard
                                title="Acessos ativos"
                                value={stats.active}
                                description="Usuários liberados para entrar"
                                icon={
                                    <UserCheck className="h-5 w-5" />
                                }
                            />

                            <MetricCard
                                title="Aguardando ativação"
                                value={stats.pending}
                                description="Contas inativas e ainda sem cargo"
                                attention={stats.pending > 0}
                                icon={
                                    <CalendarClock className="h-5 w-5" />
                                }
                            />

                            <MetricCard
                                title="Administradores"
                                value={stats.admins}
                                description="ADMIN e SUPER_ADMIN"
                                icon={
                                    <ShieldCheck className="h-5 w-5" />
                                }
                            />
                        </div>

                        {error && (
                            <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
                                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        {error}
                                    </p>

                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            void loadUsers(true)
                                        }
                                    >
                                        Tentar novamente
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid items-start gap-6 xl:grid-cols-12">
                            <Card className="min-w-0 xl:col-span-9">
                                <CardHeader className="gap-4 border-b md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <CardTitle>
                                            Fila de gestão
                                        </CardTitle>

                                        <CardDescription className="mt-1">
                                            Solicitações novas e contas inativas aparecem primeiro.
                                        </CardDescription>
                                    </div>

                                    <Badge variant="secondary">
                                        {filteredUsers.length} de{" "}
                                        {users.length} usuário(s)
                                    </Badge>
                                </CardHeader>

                                <CardContent className="p-0">
                                    <div className="grid gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_210px_210px_auto] xl:items-end">
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="user-search"
                                                className="text-sm font-medium"
                                            >
                                                Busca
                                            </label>

                                            <div className="relative">
                                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                                <Input
                                                    id="user-search"
                                                    value={search}
                                                    onChange={(event) =>
                                                        setSearch(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Nome, e-mail, cargo ou permissão..."
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Visão
                                            </label>

                                            <Select
                                                value={viewFilter}
                                                onValueChange={(value) =>
                                                    setViewFilter(
                                                        value as UserViewFilter
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        Todos os usuários
                                                    </SelectItem>
                                                    <SelectItem value="pending">
                                                        Aguardando ativação
                                                    </SelectItem>
                                                    <SelectItem value="active">
                                                        Acessos ativos
                                                    </SelectItem>
                                                    <SelectItem value="inactive">
                                                        Contas inativas
                                                    </SelectItem>
                                                    <SelectItem value="admins">
                                                        Administradores
                                                    </SelectItem>
                                                    <SelectItem value="without_role">
                                                        Sem cargo
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
                                                onValueChange={setRoleFilter}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        Todos os cargos
                                                    </SelectItem>

                                                    {roleOptions.map((role) => (
                                                        <SelectItem
                                                            key={role}
                                                            value={role}
                                                        >
                                                            {role}
                                                        </SelectItem>
                                                    ))}
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

                                    <UsersTable
                                        users={filteredUsers}
                                        loading={loading}
                                        onOpen={(userId) =>
                                            router.push(`/users/${userId}`)
                                        }
                                    />
                                </CardContent>
                            </Card>

                            <div className="grid gap-6 xl:col-span-3">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Governança de acesso
                                        </CardTitle>

                                        <CardDescription>
                                            Situação dos acessos e pontos para revisão.
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="space-y-6">
                                        <div>
                                            <div
                                                className="flex h-2 overflow-hidden rounded-full bg-muted"
                                                role="img"
                                                aria-label="Distribuição entre usuários ativos e inativos"
                                            >
                                                <span
                                                    className="bg-green-600"
                                                    style={{
                                                        width: `${getPercentage(
                                                            stats.active
                                                        )}%`,
                                                    }}
                                                />

                                                <span
                                                    className="bg-red-500"
                                                    style={{
                                                        width: `${getPercentage(
                                                            stats.inactive
                                                        )}%`,
                                                    }}
                                                />
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 gap-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                                                    <span className="text-muted-foreground">
                                                        Ativos
                                                    </span>
                                                    <span className="ml-auto font-medium tabular-nums">
                                                        {stats.active}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                                                    <span className="text-muted-foreground">
                                                        Inativos
                                                    </span>
                                                    <span className="ml-auto font-medium tabular-nums">
                                                        {stats.inactive}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-3">
                                            <GovernanceItem
                                                icon={
                                                    <KeyRound className="h-4 w-4" />
                                                }
                                                value={stats.withoutRole}
                                                description="Usuários sem cargo"
                                            />

                                            <GovernanceItem
                                                icon={
                                                    <AlertTriangle className="h-4 w-4" />
                                                }
                                                value={stats.activeWithoutRole}
                                                description="Ativos sem cargo"
                                            />

                                            <GovernanceItem
                                                icon={
                                                    <ShieldCheck className="h-4 w-4" />
                                                }
                                                value={stats.userManagers}
                                                description="Com permissão USER_MANAGE"
                                            />

                                            <GovernanceItem
                                                icon={
                                                    <CalendarClock className="h-4 w-4" />
                                                }
                                                value={stats.recentRegistrations}
                                                description="Cadastrados nos últimos 30 dias"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Cobertura por cargo
                                        </CardTitle>

                                        <CardDescription>
                                            Cargos com mais usuários associados.
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        {roleDistribution.length === 0 ? (
                                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                                Nenhum cargo atribuído.
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {roleDistribution.map(
                                                    (role) => (
                                                        <div
                                                            key={role.name}
                                                            className="flex items-center gap-3"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-medium">
                                                                    {role.name}
                                                                </p>

                                                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                                                    <div
                                                                        className="h-full rounded-full bg-primary"
                                                                        style={{
                                                                            width: `${
                                                                                stats.total > 0
                                                                                    ? (role.total /
                                                                                          stats.total) *
                                                                                      100
                                                                                    : 0
                                                                            }%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <span className="text-sm font-medium tabular-nums">
                                                                {role.total}
                                                            </span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}

function UsersTable({
    users,
    loading,
    onOpen,
}: {
    users: UserRow[]
    loading: boolean
    onOpen: (userId: string) => void
}) {
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="min-w-[260px]">
                            Usuário
                        </TableHead>
                        <TableHead className="min-w-[210px]">
                            Cargos
                        </TableHead>
                        <TableHead>Acesso</TableHead>
                        <TableHead className="min-w-[170px]">
                            Governança
                        </TableHead>
                        <TableHead className="min-w-[170px]">
                            Atuação
                        </TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">
                            Ação
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell
                                colSpan={7}
                                className="h-40 text-center"
                            >
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Carregando usuários...
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : users.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={7}
                                className="h-40 text-center text-sm text-muted-foreground"
                            >
                                Nenhum usuário encontrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map((user) => {
                            const roleNames = getRoleNames(user)
                            const pending = isPendingApproval(user)
                            const activityTotal =
                                getActivityTotal(user)

                            return (
                                <TableRow
                                    key={user.id}
                                    className={
                                        pending
                                            ? "bg-yellow-50/60 dark:bg-yellow-950/10"
                                            : undefined
                                    }
                                >
                                    <TableCell>
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                {user.photoUrl && (
                                                    <AvatarImage
                                                        src={user.photoUrl}
                                                        alt={user.name}
                                                    />
                                                )}

                                                <AvatarFallback>
                                                    {getUserInitials(
                                                        user.name
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="min-w-0">
                                                <p className="truncate font-medium">
                                                    {user.name}
                                                </p>

                                                <p className="truncate text-sm text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex max-w-[260px] flex-wrap gap-1.5">
                                            {roleNames.length > 0 ? (
                                                roleNames.map((role) => (
                                                    <span key={role}>
                                                        {getRoleBadge(role)}
                                                    </span>
                                                ))
                                            ) : (
                                                <Badge variant="outline">
                                                    Sem cargo
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {getAccessBadge(user)}
                                    </TableCell>

                                    <TableCell>
                                        <div className="space-y-1 text-xs text-muted-foreground">
                                            <p>
                                                Permissões:{" "}
                                                <span className="font-medium text-foreground">
                                                    {
                                                        user.permissions
                                                            .length
                                                    }
                                                </span>
                                            </p>

                                            {user.permissions.includes(
                                                "USER_MANAGE"
                                            ) && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px]"
                                                >
                                                    USER_MANAGE
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="space-y-1 text-xs text-muted-foreground">
                                            <p>
                                                Total:{" "}
                                                <span className="font-medium text-foreground">
                                                    {activityTotal}
                                                </span>
                                            </p>

                                            <p>
                                                RMs:{" "}
                                                <span className="font-medium text-foreground">
                                                    {user.counters
                                                        .createdRisks +
                                                        user.counters
                                                            .assignedRisks}
                                                </span>{" "}
                                                · Logística:{" "}
                                                <span className="font-medium text-foreground">
                                                    {user.counters
                                                        .requestedLogistics +
                                                        user.counters
                                                            .assignedLogistics +
                                                        user.counters
                                                            .reviewedLogistics}
                                                </span>
                                            </p>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {formatDate(user.createdAt)}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                pending
                                                    ? "default"
                                                    : "outline"
                                            }
                                            onClick={() =>
                                                onOpen(user.id)
                                            }
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            {pending
                                                ? "Analisar"
                                                : "Visualizar"}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
