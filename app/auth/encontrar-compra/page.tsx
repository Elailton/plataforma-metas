import Link from "next/link"
import { Receipt } from "lucide-react"
import { AuthCard, AuthShell } from "@/components/auth-shell"
import { AccessSupport } from "@/components/auth/access-support"
import { FindPurchaseForm } from "./find-purchase-form"

export const metadata = { title: "Encontrar minha compra" }

export default function FindPurchasePage() {
  return (
    <AuthShell
      footer={
        <Link href="/auth/login" className="underline-offset-4 hover:text-foreground hover:underline">
          Voltar ao login
        </Link>
      }
    >
      <AuthCard
        icon={<Receipt className="size-5" />}
        title="Encontrar minha compra"
        description="Não sabe com qual e-mail comprou ou o acesso não chegou? Informe o código da transação da Hotmart. Se a compra incluir o SGA, liberamos e enviamos o link para o e-mail da compra."
      >
        <FindPurchaseForm />
        <AccessSupport />
      </AuthCard>
    </AuthShell>
  )
}
