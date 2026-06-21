"use client"

import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"

import { useParams, useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"

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

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Save,
  UserCircle,
  XCircle,
} from "lucide-react"

import { toast } from "sonner"

type FeedbackModal = {
  open: boolean
  type: "success" | "error"
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

type UserProfile = {
  id: string
  name: string
  email: string
  photoUrl?: string | null
  isActive: boolean
  createdAt: string
}

export default function EditUserPage() {
  const params = useParams()
  const router = useRouter()

  const {
    user: loggedUser,
    loading: authLoading,
    refreshUser,
  } = useAuth()

  const rawId = params.id

  const userId = Array.isArray(rawId)
    ? rawId[0]
    : rawId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [feedbackModal, setFeedbackModal] =
    useState<FeedbackModal>({
      open: false,
      type: "success",
      title: "",
      description: "",
    })

  const [profile, setProfile] =
    useState<UserProfile | null>(null)

  const [form, setForm] = useState({
    name: "",
    email: "",
    photoUrl: "",
    isActive: true,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const isOwnProfile =
    loggedUser?.id === profile?.id

  const isAdmin =
    loggedUser?.permissions?.includes("USER_MANAGE") ||
    loggedUser?.roles?.includes("ADMIN")

  const canEditProfile =
    isOwnProfile || isAdmin

  const canChangePassword =
    isOwnProfile

  const canChangeStatus =
    isAdmin && !isOwnProfile

  useEffect(() => {
    if (userId) {
      loadUser()
    }
  }, [userId])

  function openFeedbackModal({
    type,
    title,
    description,
    actionLabel,
    onAction,
  }: Omit<FeedbackModal, "open">) {
    setFeedbackModal({
      open: true,
      type,
      title,
      description,
      actionLabel,
      onAction,
    })
  }

  async function loadUser() {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error("Erro ao carregar usuário")
      }

      const data = await res.json()

      setProfile(data)

      setForm((prev) => ({
        ...prev,
        name: data.name || "",
        email: data.email || "",
        photoUrl: data.photoUrl || "",
        isActive: data.isActive,
      }))
    } catch (error) {
      console.error(error)
      toast.error("Erro ao carregar usuário")
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

  async function handleSave() {
    try {
      if (!profile) {
        openFeedbackModal({
          type: "error",
          title: "Usuário não carregado",
          description:
            "Não foi possível carregar os dados do usuário. Tente atualizar a página.",
        })

        return
      }

      if (!canEditProfile) {
        openFeedbackModal({
          type: "error",
          title: "Acesso negado",
          description:
            "Você não possui permissão para editar este usuário.",
        })

        return
      }

      if (!form.name.trim()) {
        openFeedbackModal({
          type: "error",
          title: "Nome obrigatório",
          description:
            "Informe o nome do usuário antes de salvar.",
        })

        return
      }

      if (!form.email.trim()) {
        openFeedbackModal({
          type: "error",
          title: "Email obrigatório",
          description:
            "Informe o email do usuário antes de salvar.",
        })

        return
      }

      const wantsToChangePassword =
        form.currentPassword.trim() !== "" ||
        form.newPassword.trim() !== "" ||
        form.confirmPassword.trim() !== ""

      if (wantsToChangePassword && !canChangePassword) {
        openFeedbackModal({
          type: "error",
          title: "Alteração de senha não permitida",
          description:
            "Administradores não podem alterar a senha de outro usuário por esta tela. Use uma função de reset de senha.",
        })

        return
      }

      if (wantsToChangePassword) {
        if (!form.currentPassword.trim()) {
          openFeedbackModal({
            type: "error",
            title: "Senha atual obrigatória",
            description:
              "Para alterar a senha, informe sua senha atual.",
          })

          return
        }

        if (!form.newPassword.trim()) {
          openFeedbackModal({
            type: "error",
            title: "Nova senha obrigatória",
            description:
              "Informe a nova senha que deseja cadastrar.",
          })

          return
        }

        if (form.newPassword.length < 6) {
          openFeedbackModal({
            type: "error",
            title: "Senha muito curta",
            description:
              "A nova senha deve ter pelo menos 6 caracteres.",
          })

          return
        }

        if (form.newPassword !== form.confirmPassword) {
          openFeedbackModal({
            type: "error",
            title: "Senhas diferentes",
            description:
              "A confirmação de senha não confere com a nova senha informada.",
          })

          return
        }
      }

      setSaving(true)

      const res = await fetch(`/api/users/${profile.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          photoUrl: form.photoUrl || null,

          isActive: isAdmin
            ? form.isActive
            : undefined,

          currentPassword: wantsToChangePassword
            ? form.currentPassword
            : undefined,

          newPassword: wantsToChangePassword
            ? form.newPassword
            : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        openFeedbackModal({
          type: "error",
          title: "Não foi possível salvar",
          description:
            data.error ||
            "Ocorreu um erro ao atualizar o usuário.",
        })

        return
      }

      await refreshUser()

      setProfile((prev) =>
        prev
          ? {
            ...prev,
            name: form.name,
            email: form.email,
            photoUrl: form.photoUrl || null,
            isActive: form.isActive,
          }
          : prev
      )

      setForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))

      openFeedbackModal({
        type: "success",
        title: wantsToChangePassword
          ? "Senha alterada com sucesso"
          : "Usuário atualizado com sucesso",
        description: wantsToChangePassword
          ? "Sua senha foi atualizada. Use a nova senha no próximo login."
          : "As informações do usuário foram atualizadas corretamente.",
        actionLabel: "Ver Perfil",
        onAction: () => {
          router.push(`/users/${profile.id}`)
        },
      })
    } catch (error) {
      console.error(error)

      openFeedbackModal({
        type: "error",
        title: "Erro inesperado",
        description:
          "Não foi possível concluir a operação. Tente novamente.",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus() {
    try {
      if (!profile) return

      if (!canChangeStatus) {
        openFeedbackModal({
          type: "error",
          title: "Ação não permitida",
          description:
            "Você não possui permissão para alterar o status deste usuário.",
        })

        return
      }

      const newStatus = !form.isActive

      setSaving(true)

      const res = await fetch(`/api/users/${profile.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          photoUrl: form.photoUrl || null,
          isActive: newStatus,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        openFeedbackModal({
          type: "error",
          title: "Não foi possível alterar o status",
          description:
            data.error ||
            "Ocorreu um erro ao atualizar o status do usuário.",
        })

        return
      }

      setForm((prev) => ({
        ...prev,
        isActive: newStatus,
      }))

      setProfile((prev) =>
        prev
          ? {
            ...prev,
            isActive: newStatus,
          }
          : prev
      )

      openFeedbackModal({
        type: "success",
        title: newStatus
          ? "Usuário ativado"
          : "Usuário inativado",
        description: newStatus
          ? "O usuário foi ativado com sucesso."
          : "O usuário foi inativado com sucesso.",
      })
    } catch (error) {
      console.error(error)

      openFeedbackModal({
        type: "error",
        title: "Erro inesperado",
        description:
          "Não foi possível alterar o status do usuário.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || authLoading) {
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

  if (!canEditProfile) {
    return (
      <ProtectedRoute>
        <SidebarProvider>
          <AppSidebar variant="inset" />

          <SidebarInset>
            <SiteHeader />

            <div className="flex h-[calc(100vh-80px)] items-center justify-center">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>
                    Acesso negado
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Você não possui permissão para editar este usuário.
                  </p>

                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(`/users/${profile.id}`)
                    }
                  >
                    Voltar
                  </Button>
                </CardContent>
              </Card>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
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
                    router.push(`/users/${profile.id}`)
                  }
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div>
                  <h1 className="text-2xl font-semibold">
                    {isOwnProfile
                      ? "Editar Perfil"
                      : "Editar Usuário"}
                  </h1>

                  <p className="text-sm text-muted-foreground">
                    {isOwnProfile
                      ? "Atualize seus dados básicos, foto de perfil e senha"
                      : "Atualize os dados básicos e o status do usuário"}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Foto de Perfil
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex flex-col items-center gap-4">
                    <Avatar className="h-32 w-32">
                      {form.photoUrl && (
                        <AvatarImage
                          src={form.photoUrl}
                          alt={form.name}
                        />
                      )}

                      <AvatarFallback className="text-3xl">
                        {form.name ? (
                          getInitials(form.name)
                        ) : (
                          <UserCircle className="h-10 w-10" />
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div className="w-full space-y-2">
                      <Label htmlFor="photoUrl">
                        URL da Foto
                      </Label>

                      <Input
                        id="photoUrl"
                        placeholder="https://..."
                        value={form.photoUrl}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            photoUrl: e.target.value,
                          })
                        }
                      />

                      <p className="text-xs text-muted-foreground">
                        Caso não informe uma foto, o sistema usará as
                        iniciais do nome como imagem padrão.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {isAdmin && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Status do Usuário
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Status atual
                        </p>

                        <div className="mt-2">
                          {form.isActive ? (
                            <Badge variant="default">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Inativo
                            </Badge>
                          )}
                        </div>
                      </div>

                      {canChangeStatus ? (
                        <Button
                          type="button"
                          disabled={saving}
                          variant={
                            form.isActive
                              ? "destructive"
                              : "default"
                          }
                          onClick={handleToggleStatus}
                        >
                          {saving
                            ? "Salvando..."
                            : form.isActive
                              ? "Inativar Usuário"
                              : "Ativar Usuário"}
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Você não pode inativar o próprio usuário.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    Dados Básicos
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Nome
                      </Label>

                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email
                      </Label>

                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {canChangePassword && (
                    <>
                      <Separator />

                      <div>
                        <h3 className="text-lg font-medium">
                          Alterar Senha
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          Preencha esta seção somente se desejar alterar sua senha.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">
                            Senha Atual
                          </Label>

                          <Input
                            id="currentPassword"
                            type="password"
                            value={form.currentPassword}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                currentPassword:
                                  e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newPassword">
                            Nova Senha
                          </Label>

                          <Input
                            id="newPassword"
                            type="password"
                            value={form.newPassword}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                newPassword:
                                  e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">
                            Confirmar Senha
                          </Label>

                          <Input
                            id="confirmPassword"
                            type="password"
                            value={form.confirmPassword}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                confirmPassword:
                                  e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <FeedbackDialog
            feedbackModal={feedbackModal}
            setFeedbackModal={setFeedbackModal}
          />
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}

function FeedbackDialog({
  feedbackModal,
  setFeedbackModal,
}: {
  feedbackModal: FeedbackModal
  setFeedbackModal: Dispatch<
    SetStateAction<FeedbackModal>
  >
}) {
  return (
    <Dialog
      open={feedbackModal.open}
      onOpenChange={(open) =>
        setFeedbackModal((prev) => ({
          ...prev,
          open,
        }))
      }
    >
      <DialogContent className="w-[90vw] max-w-[420px]">
        <DialogHeader>
          <div className="flex justify-center">
            {feedbackModal.type === "success" ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>

          <DialogTitle className="text-center text-xl">
            {feedbackModal.title}
          </DialogTitle>

          <DialogDescription className="text-center">
            {feedbackModal.description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() =>
              setFeedbackModal((prev) => ({
                ...prev,
                open: false,
              }))
            }
          >
            Fechar
          </Button>

          {feedbackModal.actionLabel && (
            <Button
              onClick={() => {
                setFeedbackModal((prev) => ({
                  ...prev,
                  open: false,
                }))

                feedbackModal.onAction?.()
              }}
            >
              {feedbackModal.actionLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}