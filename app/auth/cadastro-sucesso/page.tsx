import { MailCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 py-16 font-sans">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MailCheck className="size-5" />
            </div>
            <CardTitle className="text-lg">Confira seu e-mail</CardTitle>
            <CardDescription>Falta pouco para começar a estudar</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta antes de fazer
              login.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
