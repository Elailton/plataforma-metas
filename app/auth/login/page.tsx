"use client"

import { AccessSupport } from "@/components/auth/access-support"

import { AuthShell, AuthCard } from "@/components/auth-shell"

import type React from "react"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Apenas o sinal de credencial/existência é genérico — nomeá-lo confirmaria se
// um e-mail está cadastrado. Erros que o usuário pode agir são passados adiante,
// e qualquer falha inesperada é reportada como tal em vez de "senha incorreta".
const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha inválidos."

function loginErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }

  if (code === "email_not_confirmed") {
    return "Confirme seu e-mail para continuar — verifique sua caixa de entrada."
  }
  if (code === "over_request_rate_limit" || status === 429) {
    return "Muitas tentativas. Aguarde um momento e tente novamente."
  }
  if (code === "invalid_credentials") {
    return INVALID_CREDENTIALS_MESSAGE
  }
  return "Algo deu errado. Tente novamente."
}

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single()

      const isAdmin = profile?.role === "admin"
      let destination = isAdmin ? "/admin" : "/aluno"

      if (!isAdmin) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", data.user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle()

        if (!enrollment) destination = "/auth/sem-acesso"
      }

      const next = searchParams.get("next")
      const nextIsAllowed =
        next?.startsWith("/") &&
        !next.startsWith("//") &&
        ((isAdmin && next.startsWith("/admin")) || (!isAdmin && next.startsWith("/aluno")))
      if (nextIsAllowed && next && destination !== "/auth/sem-acesso") destination = next

      router.push(destination)
      router.refresh()
    } catch (error: unknown) {
      setError(loginErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      footer={
        <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">
          Voltar ao início
        </Link>
      }
    >
      <AuthCard
        title="Entrar"
        description="O acesso é liberado para alunos matriculados. Use o mesmo e-mail da compra."
      >
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@email.com"
              required
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Senha</Label>
              <Link
                href="/auth/reenviar-acesso"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div role="alert" className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <p>{error}</p>
              {error === INVALID_CREDENTIALS_MESSAGE ? (
                <p className="text-muted-foreground">
                  Não lembra a senha ou nunca criou uma?{" "}
                  <Link
                    href="/auth/reenviar-acesso"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Receber um link para criar nova senha
                  </Link>
                </p>
              ) : null}
            </div>
          )}
          <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Primeiro acesso ou não recebeu o e-mail?{" "}
          <Link href="/auth/reenviar-acesso" className="font-medium text-foreground underline-offset-4 hover:underline">
            Reenviar acesso
          </Link>
          {" · "}
          <Link href="/auth/codigo" className="font-medium text-foreground underline-offset-4 hover:underline">
            Tenho um código
          </Link>
        </p>

        <AccessSupport />
      </AuthCard>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

