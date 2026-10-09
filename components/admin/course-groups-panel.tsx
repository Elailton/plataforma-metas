"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  setCourseGroups,
  importQuestionnaire,
} from "@/lib/admin/actions/groups"

export function CourseGroupsPanel({
  courseId,
  enabled,
  schema,
}: {
  courseId: string
  enabled: boolean
  schema: unknown[]
}) {
  const router = useRouter(),
    [pending, start] = useTransition(),
    [text, setText] = useState(""),
    [schemaText, setSchemaText] = useState(JSON.stringify(schema, null, 2))
  function configure(next: boolean) {
    start(async () => {
      try {
        const parsed = JSON.parse(schemaText)
        await setCourseGroups(courseId, next, parsed)
        toast.success(
          next ? "Divisão por grupos ativada" : "Divisão por grupos desativada",
        )
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Configuração inválida",
        )
      }
    })
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grupos e questionário do curso</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Grupo 1: até 4 horas por dia. Grupo 2: mais de 4 horas. Sem grupo: sem
          metas. Ao ativar, matrículas atuais sem classificação deixam de
          receber metas até serem atribuídas. Desativar devolve as metas a todos
          os matriculados ativos.
        </p>
        <Button disabled={pending} onClick={() => configure(!enabled)}>
          {enabled
            ? "Desativar divisão por grupos"
            : "Ativar divisão por grupos"}
        </Button>
        <label className="text-sm font-medium" htmlFor="questionnaire-schema">
          Configuração das perguntas de primeiro acesso (JSON)
        </label>
        <Textarea
          id="questionnaire-schema"
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          rows={5}
        />
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => configure(enabled)}
        >
          Salvar perguntas
        </Button>
        <label className="text-sm font-medium" htmlFor="questionnaire-import">
          Importar resposta do formulário externo
        </label>
        <Textarea
          id="questionnaire-import"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Cole aqui um objeto JSON retornado pelo formulário"
        />
        <p className="text-xs text-muted-foreground">
          O e-mail precisa corresponder a um aluno matriculado neste curso. A
          pergunta 1 define o grupo; uma atribuição manual anterior será
          preservada. Repetir o mesmo envio não duplica as respostas.
        </p>
        <Button
          disabled={pending || !text.trim()}
          onClick={() =>
            start(async () => {
              try {
                toast.success(await importQuestionnaire(courseId, text))
                setText("")
                router.refresh()
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível importar",
                )
              }
            })
          }
        >
          Importar resposta
        </Button>
      </CardContent>
    </Card>
  )
}
