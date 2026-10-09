"use client"

import { submitFirstAccessQuestionnaire } from "@/lib/groups/student-actions"
import { QuestionnaireFields } from "@/components/student/questionnaire-fields"
import type { QuestionnaireQuestion } from "@/lib/groups/schema.mjs"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export function FirstAccessForm({
  questionnaires,
}: {
  questionnaires: {
    enrollmentId: string
    courseName: string
    schema: QuestionnaireQuestion[]
  }[]
}) {
  const [answers, setAnswers] = useState<
    Record<string, Record<string, unknown>>
  >({})
  const [whatsapp, setWhatsapp] = useState("")
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Use uma senha com pelo menos 8 caracteres.")
      return
    }
    if (password !== repeatPassword) {
      setError("As senhas não coincidem.")
      return
    }

    setPending(true)
    try {
      for (const questionnaire of questionnaires)
        await submitFirstAccessQuestionnaire(
          questionnaire.enrollmentId,
          answers[questionnaire.enrollmentId] ?? {},
          whatsapp,
        )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o questionário.",
      )
      setPending(false)
      return
    }
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setPending(false)

    if (updateError) {
      setError("Não foi possível definir sua senha. Solicite um novo convite.")
      return
    }

    router.replace("/aluno")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </div>
          <CardTitle>Primeiro acesso</CardTitle>
          <CardDescription>
            Defina uma senha para entrar novamente com o e-mail usado na compra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {questionnaires.map((questionnaire) => (
              <section key={questionnaire.enrollmentId} className="space-y-4">
                <h2 className="font-semibold">
                  Seu plano de estudos — {questionnaire.courseName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Suas respostas ajudam o mentor a organizar seus estudos. A
                  disponibilidade diária define seu grupo inicial.
                </p>
                <QuestionnaireFields
                  schema={questionnaire.schema}
                  answers={answers[questionnaire.enrollmentId] ?? {}}
                  onChange={(next) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [questionnaire.enrollmentId]: next,
                    }))
                  }
                />
              </section>
            ))}
            {questionnaires.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  maxLength={40}
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repeat-password">Repita a senha</Label>
              <Input
                id="repeat-password"
                type="password"
                minLength={8}
                required
                value={repeatPassword}
                onChange={(event) => setRepeatPassword(event.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Definir senha e entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
