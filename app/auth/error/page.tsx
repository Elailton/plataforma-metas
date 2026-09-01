import { CircleAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 py-16 font-sans">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <CircleAlert className="size-5" />
            </div>
            <CardTitle className="text-lg">Algo deu errado</CardTitle>
          </CardHeader>
          <CardContent>
            {isErrorCode ? (
              <p className="text-sm text-muted-foreground">Código do erro: {code}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Ocorreu um erro inesperado. Tente novamente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
