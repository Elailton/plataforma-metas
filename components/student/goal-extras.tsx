import { ExternalLink, FileText, PlayCircle, Sparkles } from "lucide-react"
import type { StudentGoalExtraItem } from "@/lib/student/queries"
import type { StudentMaterial } from "@/lib/student/types"

const materialIcon: Record<StudentMaterial["type"], typeof FileText> = {
  apostila: FileText,
  videoaula: PlayCircle,
  link: ExternalLink,
}

/**
 * Bloco "Se sobrar tempo": questões e revisão extras para o ritmo do aluno.
 * Opcional, sem caixa de conclusão e fora do progresso da meta.
 */
export function GoalExtras({ items, locked = false }: { items: StudentGoalExtraItem[]; locked?: boolean }) {
  if (items.length === 0) return null
  return (
    <section aria-labelledby="se-sobrar-tempo" className="mt-8">
      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-start gap-3 p-4 md:p-5 [&::-webkit-details-marker]:hidden">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="flex-1">
            <span id="se-sobrar-tempo" className="block text-base font-semibold text-foreground">
              Se sobrar tempo
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Questões e revisão extras para o seu ritmo. São opcionais e não mudam o progresso da meta.
            </span>
          </span>
          <span className="text-sm font-medium text-primary group-open:hidden">Ver</span>
          <span className="hidden text-sm font-medium text-primary group-open:inline">Recolher</span>
        </summary>
        <ol className="flex flex-col gap-3 border-t border-border p-4 md:p-5">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border p-3 md:p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
                {item.instructions}
              </p>
              {!locked && item.materials.length > 0 ? (
                <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border">
                  {item.materials.map((material) => {
                    const Icon = materialIcon[material.type] ?? ExternalLink
                    return (
                      <li key={material.id}>
                        <a
                          href={material.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-h-11 items-center gap-2.5 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/60"
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="flex-1 truncate">{material.title}</span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </details>
    </section>
  )
}
