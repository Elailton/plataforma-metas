import Link from "next/link"
import { MailCheck } from "lucide-react"
import { AuthCard, AuthShell } from "@/components/auth-shell"
import { ResendAccessForm } from "./resend-access-form"

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
        description="Informe o mesmo e-mail usado na compra. O link é enviado somente para alunos matriculados."
      >
        <ResendAccessForm />
      </AuthCard>
    </AuthShell>
  )
}
