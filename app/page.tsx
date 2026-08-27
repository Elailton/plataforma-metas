import Link from "next/link"
import { GraduationCap, ShieldCheck, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 font-sans">
      <main className="flex w-full max-w-lg flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground">Plataforma Metas</h1>
            <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
              Acompanhamento de metas de estudo para concursos públicos. Escolha como deseja entrar.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link
            href="/aluno"
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="size-5" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">Entrar como aluno</span>
              <span className="text-xs text-muted-foreground">Acompanhe suas metas, edital e progresso</span>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/admin"
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">Entrar como administrador</span>
              <span className="text-xs text-muted-foreground">Gerencie cursos, metas, materiais e alunos</span>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </main>
    </div>
  )
}
