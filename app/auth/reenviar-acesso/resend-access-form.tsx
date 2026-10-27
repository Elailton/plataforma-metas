"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestAccessResend, type ResendAccessState } from "./actions"

const initialState: ResendAccessState = { message: null, email: null }

export function ResendAccessForm() {
  const [state, formAction, pending] = useActionState(requestAccessResend, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail da compra</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@email.com"
          required
          maxLength={320}
          className="h-11"
          defaultValue={state.email ?? ""}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Use o mesmo e-mail que aparece no comprovante da Hotmart. Se você comprou com outro e-mail, o acesso foi enviado para ele.
        </p>
      </div>
      {state.message && (
        <div role="status" className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-3 text-sm">
          {state.email ? (
            <p className="text-foreground">
              Pedido registrado para <span className="font-semibold [overflow-wrap:anywhere]">{state.email}</span>. Confira se o e-mail está escrito certo.
            </p>
          ) : null}
          <p className="text-muted-foreground">{state.message}</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            <li>A mensagem vem de <span className="font-medium text-foreground">Sistema Guiado da Aprovação</span> e pode levar alguns minutos.</li>
            <li>No Gmail, olhe também em Promoções e Spam. No Hotmail/Outlook, em Lixo eletrônico.</li>
            <li>Use sempre o link do e-mail mais recente: os anteriores deixam de valer.</li>
          </ul>
        </div>
      )}
      <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={pending}>
        {pending ? "Enviando..." : state.message ? "Enviar de novo" : "Enviar link de acesso"}
      </Button>
    </form>
  )
}
