"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { saveGroupSettings } from "@/lib/admin/actions/groups"
import { GROUP_FEATURES } from "@/lib/groups/experience.mjs"
import type { AdminGroupSettings } from "@/lib/admin/queries"

const GROUP_INFO: Record<number, { title: string; description: string }> = {
  1: { title: "Grupo 1", description: "Alunos do Grupo 1." },
  2: { title: "Grupo 2", description: "Alunos do Grupo 2." },
  3: {
    title: "Grupo 3 · teste",
    description: "Só a conta de teste. Ligue aqui primeiro o que for novo, confira como aluno e depois ligue nos outros grupos.",
  },
}

function GroupCard({ courseId, group, initial, title, description }: {
  courseId: string
  group: number
  initial: AdminGroupSettings | undefined
  title: string
  description: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [disabled, setDisabled] = useState<string[]>(initial?.disabledFeatures ?? [])
  const [notice, setNotice] = useState(initial?.notice ?? "")

  function save() {
    startTransition(async () => {
      try {
        await saveGroupSettings(courseId, group, disabled, notice)
        toast.success(`${title}: configuração salva.`)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Abas e funções visíveis</legend>
          {GROUP_FEATURES.map((feature) => {
            const on = !disabled.includes(feature.key)
            return (
              <label key={feature.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(event) =>
                    setDisabled((current) =>
                      event.target.checked ? current.filter((key) => key !== feature.key) : [...current, feature.key],
                    )
                  }
                />
                {feature.label}
              </label>
            )
          })}
        </fieldset>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Aviso na tela inicial</span>
          <textarea
            value={notice}
            maxLength={600}
            rows={3}
            placeholder="Opcional. Ex.: O Diagnóstico Semanal da semana 2 sai na segunda-feira."
            onChange={(event) => setNotice(event.target.value)}
            className="rounded-lg border border-border bg-transparent p-2.5 text-sm"
          />
          <span className="text-xs text-muted-foreground">O aluno nunca vê o número do grupo, só o aviso.</span>
        </label>
        <div>
          <Button onClick={save} disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** Configuração da área do aluno por grupo (abas, funções e aviso). */
export function GroupExperiencePanel({
  courseId,
  groupsEnabled,
  settings,
}: {
  courseId: string
  groupsEnabled: boolean
  settings: AdminGroupSettings[]
}) {
  const groups = groupsEnabled ? [3, 1, 2] : [1]
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {groupsEnabled
          ? "Para lançar algo com segurança: libere primeiro só no Grupo 3 (teste), confira com a conta de teste e depois libere nos Grupos 1 e 2. A conta de teste também vê tudo do grupo que ela espelha (escolhido na aba Alunos)."
          : "A divisão em grupos está desligada neste curso; esta configuração vale para todos os alunos. Ligue os grupos em Configurações para ter o Grupo 3 (teste)."}
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <GroupCard
            key={group}
            courseId={courseId}
            group={group}
            initial={settings.find((row) => row.studyGroup === group)}
            title={groupsEnabled ? GROUP_INFO[group].title : "Todos os alunos"}
            description={groupsEnabled ? GROUP_INFO[group].description : "Curso sem divisão em grupos."}
          />
        ))}
      </div>
    </div>
  )
}
