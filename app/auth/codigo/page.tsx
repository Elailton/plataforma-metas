import Link from "next/link"
import { KeyRound } from "lucide-react"
import { AuthCard, AuthShell } from "@/components/auth-shell"
import { AccessCodeForm } from "@/components/auth/access-code-form"
import { AccessSupport } from "@/components/auth/access-support"

export const metadata = { title: "Entrar com código" }

export default function AccessCodePage() {
  return (
    <AuthShell
      footer={
        <span className="flex flex-col gap-2">
          <Link href="/auth/reenviar-acesso" className="underline-offset-4 hover:text-foreground hover:underline">
            Não recebeu o código? Reenviar acesso
          </Link>
          <Link href="/auth/login" className="underline-offset-4 hover:text-foreground hover:underline">
            Voltar ao login
          </Link>
        </span>
      }
    >
      <AuthCard
        icon={<KeyRound className="size-5" />}
        title="Entrar com código"
        description="Use o e-mail da compra e o código numérico que chegou no e-mail de acesso. Depois você cria sua senha."
      >
        <AccessCodeForm />
        <p className="text-sm leading-relaxed text-muted-foreground">Esta tela confirma o código recebido por e-mail. Ela não consulta compras nem cria matrículas.</p>
        <AccessSupport />
      </AuthCard>
    </AuthShell>
  )
}
