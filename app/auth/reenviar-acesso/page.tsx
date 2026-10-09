import Link from "next/link"
import { BrandSkull } from "@/components/brand-skull"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResendAccessForm } from "./resend-access-form"

export const metadata = { title: "Reenviar acesso" }

export default function ResendAccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 py-16 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <BrandSkull className="size-12" />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">Sistema Guiado de Aprovação</h1>
            <p className="text-sm text-muted-foreground">Receba novamente o link do seu primeiro acesso</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reenviar acesso</CardTitle>
            <CardDescription>
              Informe o mesmo e-mail usado na compra. O acesso é liberado somente para alunos matriculados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResendAccessForm />
          </CardContent>
        </Card>

        <Link
          href="/auth/login"
          className="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  )
}
