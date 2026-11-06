import Link from "next/link"
import { cn } from "@/lib/utils"
import { getStudentExperience } from "@/lib/student/experience"
import { simuladosSections } from "@/lib/groups/experience.mjs"

/** Abas internas da aba "Simulados" (diagnóstico semanal e relatório), no estilo da plataforma. */
export async function SimuladosTabs({ current }: { current: string }) {
  const experience = await getStudentExperience()
  const sections = simuladosSections(experience.disabled)
  if (sections.length < 2) return null
  return (
    <nav aria-label="Simulados" className="mb-6">
      <ul className="inline-flex w-full gap-1 rounded-xl border border-border bg-card p-1 sm:w-auto">
        {sections.map((section) => {
          const active = section.href === current
          return (
            <li key={section.href} className="flex-1 sm:flex-none">
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {section.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
