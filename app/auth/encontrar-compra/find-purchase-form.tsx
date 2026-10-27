"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { findPurchase, type FindPurchaseState } from "./actions"
import { SUPPORT_WHATSAPP_URL } from "@/lib/support"

const initialState: FindPurchaseState = { status: null, message: null, code: null }

const NEEDS_SUPPORT = new Set(["review", "error", "canceled", "course_only", "not_found"])

export function FindPurchaseForm() {
  const [state, formAction, pending] = useActionState(findPurchase, initialState)
  const success = state.status === "granted"

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="code">Código da transação</Label>
        <Input
          id="code"
          name="code"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="HP1234567890"
          required
          maxLength={40}
          className="h-11 uppercase"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Está no e-mail de confirmação da compra enviado pela Hotmart (procure por &quot;HP&quot;). Também aparece em hotmart.com, em Minhas compras.
        </p>
      </div>
      {state.message ? (
        <p
          role="status"
          className={
            success
              ? "rounded-lg border border-success/30 bg-success/10 px-3 py-3 text-sm text-foreground"
              : "rounded-lg border border-border bg-secondary/40 px-3 py-3 text-sm text-foreground"
          }
        >
          {state.message}
        </p>
      ) : null}
      {state.status && NEEDS_SUPPORT.has(state.status) && state.code ? (
        <a
          href={`${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(`Olá! Preciso de ajuda com meu acesso ao SGA. Código da compra na Hotmart: ${state.code}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-secondary/60"
        >
          Enviar este código ao suporte no WhatsApp
        </a>
      ) : null}
      <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={pending}>
        {pending ? "Consultando a Hotmart..." : "Encontrar minha compra"}
      </Button>
    </form>
  )
}
