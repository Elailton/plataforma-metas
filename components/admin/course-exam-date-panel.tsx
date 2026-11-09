"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { setCourseExamDate } from "@/lib/admin/actions/courses"

/** Data da prova do curso: contador na tela inicial do aluno e liberação da reta final. */
export function CourseExamDatePanel({
  courseId,
  examDate,
  confirmed,
}: {
  courseId: string
  examDate: string | null
  confirmed: boolean
}) {
  const [date, setDate] = useState(examDate ?? "")
  const [isConfirmed, setConfirmed] = useState(confirmed)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await setCourseExamDate(courseId, date || null, isConfirmed)
      if (result.ok) toast.success(date ? "Data da prova salva." : "Data da prova removida.")
      else toast.error(result.message)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">Data da prova</CardTitle>
        <CardDescription>
          Mostra ao aluno quantos dias faltam (função "Contador da prova" na aba Grupos). Some depois da data.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Data</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isConfirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          Data confirmada pela banca
        </label>
        <Button onClick={save} disabled={pending}>
          Salvar
        </Button>
      </CardContent>
    </Card>
  )
}
