import Link from "next/link"
import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthShell, AuthCard } from "@/components/auth-shell"
import { signOut } from "@/lib/supabase/actions"
import { AccessSupport } from "@/components/auth/access-support"

export default function NoAccessPage() {
  return (
    <AuthShell>
      <AuthCard
        tone="danger"
        icon={<ShieldX className="size-5" />}
        title="Acesso não liberado"
        description="Não encontramos uma matrícula ativa para esta conta."
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          Entre com o mesmo e-mail usado na compra. Se não sabe qual foi, use{" "}
          <Link href="/auth/encontrar-compra" className="font-medium text-foreground underline underline-offset-4">
            Encontrar minha compra
          </Link>{" "}
          com o código da transação da Hotmart. Se a matrícula ainda não aparecer, a atendente do suporte pode conferir sua situação.
        </p>
        <AccessSupport />
        <div className="flex flex-col gap-2">
          <form action={signOut}>
            <Button type="submit" variant="outline" className="h-11 w-full">
              Sair e entrar com outro e-mail
            </Button>
          </form>
          <Button render={<Link href="/" />} nativeButton={false} variant="ghost" className="h-11">
            Voltar ao início
          </Button>
        </div>
      </AuthCard>
    </AuthShell>
  )
}
