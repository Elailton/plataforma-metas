import { studySummary } from "@/lib/groups/questionnaire.mjs"
import { redirect } from "next/navigation"
import { LogOut, Mail, GraduationCap, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { getCurrentProfile } from "@/lib/supabase/queries"
import { signOut } from "@/lib/supabase/actions"
import { ProfileNameDialog } from "@/components/student/profile-name-dialog"

export default async function AccountPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/auth/login")

  const activeEnrollments = profile.enrollments.filter(
    (enrollment) => enrollment.status === "active",
  )
  const supportUrl = process.env.SUPPORT_WHATSAPP_URL

  return (
    <PageContainer>
      <PageHeading title="Conta" />

      <Card className="mb-6">
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-secondary text-base font-semibold text-secondary-foreground">
              {profile.avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-foreground">
              {profile.fullName}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="size-3.5" />
              {profile.email}
            </span>
          </div>
        </CardContent>
      </Card>

      {activeEnrollments.length > 0 && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4">
            {activeEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <GraduationCap className="size-4.5" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {enrollment.course?.name || "Curso matriculado"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Curso ativo
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeEnrollments
        .filter((enrollment) => enrollment.questionnaire)
        .map((enrollment) => (
          <Card key={enrollment.id} className="mb-6">
            <CardContent className="space-y-3">
              <h2 className="font-semibold">
                Informações de estudo — {enrollment.course?.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {studySummary(enrollment.questionnaire).join(" · ")}
              </p>
              {enrollment.questionnaire?.whatsapp && (
                <p className="text-sm">
                  WhatsApp: {enrollment.questionnaire.whatsapp}
                </p>
              )}
              <details>
                <summary className="cursor-pointer text-sm font-medium">
                  Todas as respostas do questionário
                </summary>
                <dl className="mt-3 space-y-3">
                  {Object.entries(enrollment.questionnaire!.labels).map(
                    ([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs font-medium">
                          Pergunta {Number(key.slice(1))}
                        </dt>
                        <dd className="text-sm text-muted-foreground">
                          {value}
                        </dd>
                      </div>
                    ),
                  )}
                </dl>
              </details>
            </CardContent>
          </Card>
        ))}

      <nav className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <ProfileNameDialog
          currentName={profile.fullName}
          trigger={
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
            >
              Editar perfil
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          }
        />
        <Separator />
        <a
          href={supportUrl || undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!supportUrl}
          className="flex items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Ajuda e suporte
          <ChevronRight className="size-4 text-muted-foreground" />
        </a>
      </nav>

      <form action={signOut}>
        <button
          type="submit"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
        >
          <LogOut className="size-4" />
          Sair da plataforma
        </button>
      </form>
    </PageContainer>
  )
}
