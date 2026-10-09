import Link from "next/link"
import { redirect } from "next/navigation"
import { LogIn, ArrowRight, Target, BookOpen, LineChart } from "lucide-react"
import { AuthShell, AuthCard } from "@/components/auth-shell"
import { getCurrentProfile } from "@/lib/supabase/queries"

const highlights = [
  { icon: Target, label: "Metas de estudo organizadas pelo seu mentor" },
  { icon: BookOpen, label: "Progresso no edital por disciplina e tópico" },
  { icon: LineChart, label: "Acompanhamento da sua evolução no curso" },
]

export default async function Home() {
  const profile = await getCurrentProfile()

  if (profile) {
    const hasActiveEnrollment = profile.enrollments.some((enrollment) => enrollment.status === "active")
    redirect(profile.role === "admin" ? "/admin" : hasActiveEnrollment ? "/aluno" : "/auth/sem-acesso")
  }

  return (
    <AuthShell>
      <AuthCard
        title="Boas-vindas"
        description="Acesse sua conta para acompanhar suas metas de estudo para concursos públicos."
      >
        <ul className="flex flex-col gap-3">
          {highlights.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-3 text-sm text-muted-foreground">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
        <Link
          href="/auth/login"
          className="group flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <LogIn className="size-4" aria-hidden="true" />
          Entrar
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
        <p className="text-center text-xs text-muted-foreground">Acesso para alunos matriculados e administradores.</p>
      </AuthCard>
    </AuthShell>
  )
}
