"use client"

import Link from "next/link"
import { useState } from "react"

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

type RegisterResponse = {
  message?: string
  error?: string
}

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError(null)
    setSuccess(null)

    const form = event.currentTarget
    const formData = new FormData(form)

    const name = String(formData.get("name") ?? "").trim()
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase()

    const password = String(formData.get("password") ?? "")
    const passwordConfirmation = String(
      formData.get("passwordConfirmation") ?? ""
    )

    if (password !== passwordConfirmation) {
      setError("As senhas não coincidem.")
      return
    }

    if (password.length < 8) {
      setError("A senha deve possuir pelo menos 8 caracteres.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      })

      const data = (await response.json()) as RegisterResponse

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível criar a conta."
        )
      }

      form.reset()

      setSuccess(
        data.message ||
          "Conta criada com sucesso. Aguarde a ativação por um administrador."
      )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a conta."
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div
        className={cn("flex flex-col gap-6", className)}
        {...props}
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              Solicitação enviada
            </CardTitle>

            <CardDescription>
              Sua conta foi criada e está aguardando ativação.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <p
              role="status"
              className="text-center text-sm text-green-600"
            >
              {success}
            </p>

            <Button asChild className="w-full">
              <Link href="/">
                Voltar para o login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            Solicitar acesso
          </CardTitle>

          <CardDescription>
            Preencha seus dados para criar uma conta.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <FieldSeparator />

              <Field>
                <FieldLabel htmlFor="name">
                  Nome completo
                </FieldLabel>

                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="João da Silva"
                  autoComplete="name"
                  minLength={3}
                  disabled={loading}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">
                  E-mail
                </FieldLabel>

                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nome@empresa.com"
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">
                  Senha
                </FieldLabel>

                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  disabled={loading}
                  required
                />

                <FieldDescription>
                  Utilize pelo menos 8 caracteres.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="passwordConfirmation">
                  Confirmar senha
                </FieldLabel>

                <Input
                  id="passwordConfirmation"
                  name="passwordConfirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  disabled={loading}
                  required
                />
              </Field>

              {error && (
                <p
                  role="alert"
                  className="text-center text-sm text-red-500"
                >
                  {error}
                </p>
              )}

              <Field>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading
                    ? "Enviando solicitação..."
                    : "Solicitar acesso"}
                </Button>

                <FieldDescription className="text-center">
                  Já possui uma conta?{" "}
                  <Link
                    href="/"
                    className="underline underline-offset-4"
                  >
                    Entrar
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}