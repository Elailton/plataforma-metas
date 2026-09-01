import Link from "next/link"
import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signOut } from "@/lib/supabase/actions"

export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldX className="size-5" />
          </div>
          <CardTitle>Acesso não liberado</CardTitle>
          <CardDescription>
            Não encontramos uma matrícula ativa para esta conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Entre com o mesmo e-mail usado na compra. Se a compra foi aprovada recentemente, aguarde o processamento
            do convite ou fale com o suporte.
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              Sair
            </Button>
          </form>
          <Button render={<Link href="/" />} nativeButton={false} variant="ghost">
            Voltar ao início
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

