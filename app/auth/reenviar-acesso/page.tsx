import Link from "next/link"
import { MailCheck } from "lucide-react"
import { AuthCard, AuthShell } from "@/components/auth-shell"
import { ResendAccessForm } from "./resend-access-form"
import { AccessSupport } from "@/components/auth/access-support"

export const metadata = { title: "Reenviar acesso" }

export default function ResendAccessPage() {
  return (
    <AuthShell
      footer={
        <Link href="/auth/login" className="underline-offset-4 hover:text-foreground hover:underline">
          Voltar ao login
        </Link>
      }
    >
      <AuthCard
        icon={<MailCheck className="size-5" />}
        title="Reenviar acesso"
        description="Informe o e-mail usado na compra. O reenvio atende quem já tem matrícula ativa, mesmo que ainda não tenha concluído o primeiro acesso."
      >
        <ResendAccessForm />
        <p className="text-sm leading-relaxed text-muted-foreground">Esta opção não cria matrícula nem libera acesso a novos cursos.</p>
        <AccessSupport />
      </AuthCard>
    </AuthShell>
  )
}
