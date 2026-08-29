"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { GraduationCap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { courses } from "@/lib/mock-data"

type Role = "student" | "admin"

// O Supabase não revela se um e-mail já está cadastrado, então o fallback
// permanece genérico. Falhas de validação descrevem a entrada do próprio
// usuário e não são um oráculo de enumeração, então são exibidas.
function signUpErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }

  if (code === "weak_password") {
    return "Escolha uma senha mais forte."
  }
  if (code === "email_address_invalid") {
    return "Use um e-mail válido — domínios de teste ou exemplo não são aceitos."
  }
  if (code === "email_address_not_authorized") {
    return "Não foi possível enviar o e-mail de confirmação para este endereço. Use outro."
  }
  if (code === "validation_failed") {
    return "Verifique os dados informados."
  }
  if (code === "over_email_send_rate_limit" || status === 429) {
    return "Muitas tentativas. Aguarde um momento e tente novamente."
  }
  return "Não foi possível concluir o cadastro. Tente novamente."
}

const publishedCourses = courses.filter((course) => course.published)
const courseSelectItems = publishedCourses.map((course) => ({ label: course.name, value: course.id }))

export default function SignUpPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [role, setRole] = useState<Role>("student")
  const [courseId, setCourseId] = useState<string>(publishedCourses[0]?.id ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("As senhas não coincidem.")
      setIsLoading(false)
      return
    }

    if (role === "student" && !courseId) {
      setError("Selecione um curso para continuar.")
      setIsLoading(false)
      return
    }

    const avatarInitials = fullName
      .trim()
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("")

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            role,
            course_id: role === "student" ? courseId : null,
            avatar_initials: avatarInitials || null,
          },
        },
      })
      if (error) throw error
      router.push("/auth/cadastro-sucesso")
    } catch (error: unknown) {
      console.error("[v0] Erro no cadastro:", error)
      setError(signUpErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 py-16 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">Plataforma Metas</h1>
            <p className="text-sm text-muted-foreground">Crie sua conta para começar a estudar</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Criar conta</CardTitle>
            <CardDescription>Escolha seu perfil de acesso e preencha seus dados</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label>Perfil de acesso</Label>
                  <ToggleGroup
                    value={[role]}
                    onValueChange={(value) => value[0] && setRole(value[0] as Role)}
                    variant="outline"
                    className="w-full"
                  >
                    <ToggleGroupItem value="student" className="flex-1 text-xs">
                      Sou aluno
                    </ToggleGroupItem>
                    <ToggleGroupItem value="admin" className="flex-1 text-xs">
                      Sou administrador
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {role === "student" && (
                  <div className="grid gap-2">
                    <Label htmlFor="course">Curso</Label>
                    <Select
                      items={courseSelectItems}
                      value={courseId}
                      onValueChange={(value) => setCourseId(value ?? "")}
                    >
                      <SelectTrigger id="course" className="w-full">
                        <SelectValue placeholder="Selecione um curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {publishedCourses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="full-name">Nome completo</Label>
                  <Input
                    id="full-name"
                    type="text"
                    placeholder="Seu nome completo"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
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
                <div className="grid gap-2">
                  <Label htmlFor="repeat-password">Repita a senha</Label>
                  <Input
                    id="repeat-password"
                    type="password"
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Criando conta..." : "Criar conta"}
                </Button>
              </div>
              <div className="mt-5 text-center text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
                  Entrar
                </Link>
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
