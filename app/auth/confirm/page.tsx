import Link from "next/link"
import { redirect } from "next/navigation"
import { KeyRound } from "lucide-react"
import { AuthCard, AuthShell } from "@/components/auth-shell"
import { ConfirmAccessButton } from "@/components/auth/confirm-access-button"
import { resolveConfirmRequest } from "@/lib/auth/confirm.mjs"

export const metadata = { title: "Confirmar acesso" }

// O link do e-mail abre esta página, mas o token só é usado quando a própria
// pessoa aperta "Continuar". Verificadores de e-mail (Gmail, Outlook, antivírus)
// abrem links automaticamente e, antes, consumiam o token de uso único.
export default async function ConfirmAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>
}) {
  const params = await searchParams
  const resolved = resolveConfirmRequest({
    tokenHash: params.token_hash ?? null,
    type: params.type ?? null,
    next: params.next ?? null,
  })
  if (!resolved.valid) redirect(`/auth/error?error=${resolved.errorCode}`)

  return (
    <AuthShell
      footer={
        <Link href="/auth/codigo" className="underline-offset-4 hover:text-foreground hover:underline">
          Prefere digitar o código do e-mail?
        </Link>
      }
    >
      <AuthCard
        icon={<KeyRound className="size-5" />}
        title={resolved.type === "invite" ? "Seu acesso está pronto" : "Redefinir acesso"}
        description="Toque em continuar para criar sua senha e entrar no Sistema Guiado de Aprovação."
      >
        <ConfirmAccessButton tokenHash={resolved.tokenHash} type={resolved.type} next={resolved.next} />
      </AuthCard>
    </AuthShell>
  )
}
