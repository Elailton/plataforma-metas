import Link from "next/link"
import { CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthShell, AuthCard } from "@/components/auth-shell"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  // `error` vem da URL, portanto é controlado por quem acessa. Só exibimos
  // quando parece um código de erro do Supabase, nunca como texto livre —
  // caso contrário este card exibiria conteúdo malicioso escolhido por terceiros.
  const code = params?.error
  const isErrorCode = typeof code === "string" && /^[a-z0-9_]{1,64}$/.test(code)

  return (
    <AuthShell>
      <AuthCard
        tone="danger"
        icon={<CircleAlert className="size-5" />}
        title="Algo deu errado"
        description={
          isErrorCode ? (
            <>
              Não foi possível concluir o acesso. Código do erro:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{code}</code>
            </>
          ) : (
            "Ocorreu um erro inesperado. Tente novamente."
          )
        }
      >
        <Button render={<Link href="/auth/login" />} nativeButton={false} variant="outline" className="h-11 w-full">
          Ir para o login
        </Button>
        <Button render={<Link href="/auth/codigo" />} nativeButton={false} variant="ghost" className="h-11 w-full">
          Entrar com o código do e-mail
        </Button>
      </AuthCard>
    </AuthShell>
  )
}
