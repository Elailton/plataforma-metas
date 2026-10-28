import { InstallApp } from "@/components/student/install-app"
import { studySummary } from "@/lib/groups/questionnaire.mjs"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LogOut, Mail, GraduationCap, ChevronRight, Pencil, LifeBuoy, ShieldCheck } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { SectionHeader } from "@/components/page-header"
import { getCurrentProfile } from "@/lib/supabase/queries"
import { signOut } from "@/lib/supabase/actions"
import { ProfileNameDialog } from "@/components/student/profile-name-dialog"
import { SUPPORT_WHATSAPP_URL } from "@/lib/support"

export default async function AccountPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/auth/login")

  const activeEnrollments = profile.enrollments.filter(
    (enrollment) => enrollment.status === "active",
  )
  const supportUrl = SUPPORT_WHATSAPP_URL

  return (
    <PageContainer>
      <PageHeading title="Conta" description="Seus dados de acesso e cursos ativos." />

      <div className="mb-8 flex items-center gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
        <Avatar className="size-14 shrink-0">
          <AvatarFallback className="bg-secondary text-base font-semibold text-secondary-foreground">
            {profile.avatarInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-base font-semibold text-foreground">{profile.fullName}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{profile.email}</span>
          </span>
        </div>
      </div>

      {activeEnrollments.length > 0 ? (
        <section aria-labelledby="cursos-ativos" className="mb-8">
          <SectionHeader title={<span id="cursos-ativos">Cursos ativos</span>} />
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {activeEnrollments.map((enrollment) => (
              <li key={enrollment.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <GraduationCap className="size-4.5" aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {enrollment.course?.name || "Curso matriculado"}
                  </span>
                  <span className="text-xs text-success">Matrícula ativa</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeEnrollments
        .filter((enrollment) => enrollment.questionnaire)
        .map((enrollment) => (
          <section key={enrollment.id} aria-label={`Informações de estudo — ${enrollment.course?.name ?? "curso"}`} className="mb-8">
            <SectionHeader title={`Informações de estudo — ${enrollment.course?.name ?? "curso"}`} />
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:p-5">
              <p className="text-sm text-muted-foreground">
                {studySummary(enrollment.questionnaire).join(" · ")}
              </p>
              {enrollment.questionnaire?.whatsapp && (
                <p className="text-sm text-foreground">WhatsApp: {enrollment.questionnaire.whatsapp}</p>
              )}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Todas as respostas do questionário
                </summary>
                <dl className="mt-3 flex flex-col gap-3">
                  {Object.entries(enrollment.questionnaire!.labels).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-medium text-foreground">Pergunta {Number(key.slice(1))}</dt>
                      <dd className="text-sm text-muted-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </div>
          </section>
        ))}

      <InstallApp variant="account" />

      <section aria-labelledby="preferencias" className="mb-8">
        <SectionHeader title={<span id="preferencias">Configurações</span>} />
        <nav className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <ProfileNameDialog
            currentName={profile.fullName}
            trigger={
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <Pencil className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1">Editar perfil</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
            }
          />
          <Separator />
          <a
            href={supportUrl || undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!supportUrl}
            className="flex min-h-12 items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <LifeBuoy className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">Ajuda e suporte</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </a>
          <Separator />
          <Link
            href="/privacidade"
            className="flex min-h-12 items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">Privacidade e termos de uso</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        </nav>
      </section>

      <form action={signOut}>
        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sair da plataforma
        </button>
      </form>
    </PageContainer>
  )
}
