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
        <div role="alert" className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>Este link expirou ou já foi usado.</p>
          <p className="text-muted-foreground">
            Digite o{" "}
            <Link href="/auth/codigo" className="font-medium text-foreground underline underline-offset-4">
              código do mesmo e-mail
            </Link>{" "}
            ou{" "}
            <Link href="/auth/reenviar-acesso" className="font-medium text-foreground underline underline-offset-4">
              peça um novo acesso
            </Link>
            .
          </p>
        </div>
      ) : null}
      <Button type="button" onClick={confirm} className="h-11 w-full text-sm font-semibold" disabled={pending}>
        {pending ? "Confirmando..." : "Continuar"}
      </Button>
    </div>
  )
}
