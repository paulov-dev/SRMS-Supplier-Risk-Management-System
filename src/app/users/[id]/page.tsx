"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader } from "@/components/dashboard/site-header"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
  ArrowLeft,
  Calendar,
  Edit,
  KeyRound,
  Loader2,
  Mail,
  Shield,
  UserCircle,
} from "lucide-react"

type Role = {
  id: string
  name: string
}

type RiskItem = {
  id: string
  title: string
  riskLevel: string
  createdAt: string
  supplier: {
    id: string
    name: string
  }
  status: {
    id: string
    name: string
  }
}

type LogisticsItem = {
  id: string
  status: string
  requestedAt: string
  reviewedAt?: string | null
  riskEvent: {
    id: string
    title: string
    riskLevel: string
    supplier: {
      id: string
      name: string
    }
    status: {
      id: string
      name: string
    }
  }
}

type UserProfile = {
  id: string
  name: string
  email: string
  photoUrl?: string | null
  isActive: boolean
  createdAt: string

  roles: Role[]
  permissions: string[]

  createdRisks: RiskItem[]
  assignedRisks: RiskItem[]

  requestedLogistics: LogisticsItem[]
  reviewedLogistics: LogisticsItem[]
}

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()

  const { user: loggedUser } = useAuth()

  const [profile, setProfile] =
    useState<UserProfile | null>(null)

  const [loading, setLoading] = useState(true)

  const isOwnProfile =
    loggedUser?.id === profile?.id

  const isAdmin =
    loggedUser?.permissions?.includes("USER_MANAGE") ||
    loggedUser?.roles?.includes("ADMIN")

  const canEditProfile =
    isOwnProfile || isAdmin

  useEffect(() => {
    loadUser()
  }, [])

  async function loadUser() {
    try {
      const res = await fetch(
        `/api/users/${params.id}`,
        {
          credentials: "include",
        }
      )

      if (!res.ok) {
        throw new Error("Erro ao buscar usuário")
      }

      const data = await res.json()

      setProfile(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  function getStatusBadge(active: boolean) {
    return active ? (
      <Badge className="bg-green-600">
        Ativo
      </Badge>
    ) : (
      <Badge variant="destructive">
        Inativo
      </Badge>
    )
  }

  function getRiskBadge(level: string) {
    switch (level) {
      case "GREEN":
        return (
          <Badge className="bg-green-600">
            Green
          </Badge>
        )

      case "YELLOW":
        return (
          <Badge className="bg-yellow-500 text-black">
            Yellow
          </Badge>
        )

      case "RED":
        return (
          <Badge variant="destructive">
            Red
          </Badge>
        )

      default:
        return <Badge variant="outline">{level}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        Usuário não encontrado
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader />

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    router.push("/users")
                  }
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div>
                  <h1 className="text-2xl font-semibold">
                    Perfil do Usuário
                  </h1>

                  <p className="text-sm text-muted-foreground">
                    Dados cadastrais, permissões e vínculos operacionais
                  </p>
                </div>
              </div>

              {canEditProfile && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(`/users/${profile.id}/edit`)
                    }
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Usuário
                  </Button>


                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardContent className="flex flex-col items-center pt-6">
                  <Avatar className="h-32 w-32">
                    {profile.photoUrl && (
                      <AvatarImage
                        src={profile.photoUrl}
                        alt={profile.name}
                      />
                    )}

                    <AvatarFallback className="text-3xl">
                      {profile.name ? (
                        getInitials(profile.name)
                      ) : (
                        <UserCircle className="h-10 w-10" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <h2 className="mt-4 text-xl font-semibold text-center">
                    {profile.name}
                  </h2>

                  <p className="text-sm text-muted-foreground text-center">
                    {profile.email}
                  </p>

                  <div className="mt-4">
                    {getStatusBadge(profile.isActive)}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    Dados Básicos
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserCircle className="h-4 w-4" />
                        Nome
                      </div>

                      <p className="mt-1 font-medium">
                        {profile.name}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>

                      <p className="mt-1 font-medium">
                        {profile.email}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Criado em
                      </div>

                      <p className="mt-1 font-medium">
                        {new Date(
                          profile.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        ID do Usuário
                      </div>

                      <p className="mt-1 break-all text-sm font-medium">
                        {profile.id}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Roles
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {profile.roles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma role vinculada.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.roles.map((role) => (
                        <Badge
                          key={role.id}
                          variant="secondary"
                        >
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Permissões Efetivas
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {profile.permissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma permissão encontrada.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.permissions.map(
                        (permission) => (
                          <Badge
                            key={permission}
                            variant="outline"
                          >
                            {permission}
                          </Badge>
                        )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="assigned">
              <TabsList>
                <TabsTrigger value="assigned">
                  RMs Atribuídas
                </TabsTrigger>

                <TabsTrigger value="created">
                  RMs Criadas
                </TabsTrigger>

                <TabsTrigger value="logistics">
                  Solicitações Logísticas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assigned" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      RMs Atribuídas ao Usuário
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <RiskTable
                      risks={profile.assignedRisks}
                      getRiskBadge={getRiskBadge}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="created" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      RMs Criadas pelo Usuário
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <RiskTable
                      risks={profile.createdRisks}
                      getRiskBadge={getRiskBadge}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logistics" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Solicitações Logísticas
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <LogisticsTable
                      requested={
                        profile.requestedLogistics
                      }
                      reviewed={
                        profile.reviewedLogistics
                      }
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}

function RiskTable({
  risks,
  getRiskBadge,
}: {
  risks: RiskItem[]
  getRiskBadge: (level: string) => React.ReactNode
}) {
  if (risks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma RM encontrada.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Título</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Risco</TableHead>
          <TableHead>Criado em</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {risks.map((risk) => (
          <TableRow key={risk.id}>
            <TableCell className="font-medium">
              {risk.title}
            </TableCell>

            <TableCell>
              {risk.supplier.name}
            </TableCell>

            <TableCell>
              <Badge variant="outline">
                {risk.status.name}
              </Badge>
            </TableCell>

            <TableCell>
              {getRiskBadge(risk.riskLevel)}
            </TableCell>

            <TableCell>
              {new Date(
                risk.createdAt
              ).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function LogisticsTable({
  requested,
  reviewed,
}: {
  requested: LogisticsItem[]
  reviewed: LogisticsItem[]
}) {
  const logistics = [
    ...requested.map((item) => ({
      ...item,
      type: "Solicitada",
    })),
    ...reviewed.map((item) => ({
      ...item,
      type: "Revisada",
    })),
  ]

  if (logistics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma solicitação logística encontrada.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>RM</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Solicitada em</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {logistics.map((item) => (
          <TableRow key={`${item.type}-${item.id}`}>
            <TableCell>
              <Badge variant="secondary">
                {item.type}
              </Badge>
            </TableCell>

            <TableCell className="font-medium">
              {item.riskEvent.title}
            </TableCell>

            <TableCell>
              {item.riskEvent.supplier.name}
            </TableCell>

            <TableCell>
              <Badge variant="outline">
                {item.status}
              </Badge>
            </TableCell>

            <TableCell>
              {new Date(
                item.requestedAt
              ).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}