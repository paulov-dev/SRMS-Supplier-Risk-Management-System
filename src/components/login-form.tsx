"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { login } from "@/services/auth/login"
import { useAuth } from "@/contexts/AuthContext"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"

import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()

  const { refreshUser } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      // LOGIN
      await login(email, password)

      // atualiza contexto global
      await refreshUser()

      // redirect
      router.push("/dashboard")

    } catch (err: any) {
      setError(
        err.message || "Erro ao realizar login"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        className
      )}
      {...props}
    >
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            Bem vindo de volta
          </CardTitle>

          <CardDescription>
            Realize login na sua conta para continuar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <FieldSeparator />

              {/* EMAIL */}
              <Field>
                <FieldLabel htmlFor="email">
                  Email
                </FieldLabel>

                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>

              {/* PASSWORD */}
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">
                    Senha
                  </FieldLabel>
                </div>

                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                />
              </Field>

              {/* ERROR */}
              {error && (
                <p className="text-center text-sm text-red-500">
                  {error}
                </p>
              )}

              {/* BUTTON */}
              <Field>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading
                    ? "Entrando..."
                    : "Entrar"}
                </Button>

                <FieldDescription className="text-center">
                  Não tem uma conta?{" "}
                  <a
                    href="#"
                    className="underline underline-offset-4"
                  >
                    Solicite acesso
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}