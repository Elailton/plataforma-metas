import Link from "next/link"
import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthShell, AuthCard } from "@/components/auth-shell"
import { signOut } from "@/lib/supabase/actions"

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
          Entre com o mesmo e-mail usado na compra. Se a compra foi aprovada recentemente, aguarde o processamento do
          convite ou fale com o suporte.
        </p>
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
