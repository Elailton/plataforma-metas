"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestAccessResend, type ResendAccessState } from "./actions"

const initialState: ResendAccessState = { message: null }

export function ResendAccessForm() {
  const [state, formAction, pending] = useActionState(requestAccessResend, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail da compra</Label>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="voce@email.com" required maxLength={320} className="h-11" />
      </div>
      {state.message && (
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
      )}
      <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link de acesso"}
      </Button>
    </form>
  )
}
