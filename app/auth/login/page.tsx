"use client"

import { BrandSkull } from "@/components/brand-skull"

import type React from "react"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Apenas o sinal de credencial/existência é genérico — nomeá-lo confirmaria se
// um e-mail está cadastrado. Erros que o usuário pode agir são passados adiante,
// e qualquer falha inesperada é reportada como tal em vez de "senha incorreta".
function loginErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }

  if (code === "email_not_confirmed") {
    return "Confirme seu e-mail para continuar — verifique sua caixa de entrada."
  }
  if (code === "over_request_rate_limit" || status === 429) {
    return "Muitas tentativas. Aguarde um momento e tente novamente."
  }
  if (code === "invalid_credentials") {
    return "E-mail ou senha inválidos."
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
      console.error("[v0] Erro no login:", error)
      setError(loginErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 py-16 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-sm border border-primary/80 bg-primary/10 text-primary shadow-[0_0_24px_rgba(255,226,2,0.12)]">
            <BrandSkull className="size-7" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">Mentoria Imparáveis</h1>
            <p className="text-sm text-muted-foreground">Entre para acompanhar suas metas de estudo</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entrar</CardTitle>
            <CardDescription>
              O acesso é liberado para alunos matriculados. Use o mesmo e-mail informado na compra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

