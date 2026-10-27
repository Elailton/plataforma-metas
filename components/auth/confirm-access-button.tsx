"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function ConfirmAccessButton({
  tokenHash,
  type,
  next,
}: {
  tokenHash: string
  type: "invite" | "recovery"
  next: string
}) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function confirm() {
    setPending(true)
    setFailed(false)
    // Verificação no navegador: o limite de tentativas do Supabase vale por aluno,
    // não para o servidor inteiro, e a sessão já fica salva nos cookies.
    const { error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      setFailed(true)
      setPending(false)
      return
    }
    window.location.assign(next)
  }

  return (
    <div className="flex flex-col gap-4">
      {failed ? (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
          <p>Este link expirou ou já foi usado. Isso acontece quando um link mais novo foi pedido depois, ou quando passou o prazo.</p>
          <Link
            href="/auth/reenviar-acesso"
            className="flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Receber um novo link
          </Link>
          <p className="text-muted-foreground">
            Se já tem senha, é só{" "}
            <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
              entrar normalmente
            </Link>
            . Também dá para digitar o{" "}
            <Link href="/auth/codigo" className="font-medium text-foreground underline underline-offset-4">
              código do e-mail mais recente
            </Link>
            .
          </p>
        </div>
      ) : null}
      {failed ? null : (
        <Button type="button" onClick={confirm} className="h-11 w-full text-sm font-semibold" disabled={pending}>
          {pending ? "Confirmando..." : "Continuar"}
        </Button>
      )}
    </div>
  )
}
