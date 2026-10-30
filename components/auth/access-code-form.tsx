"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { ACCESS_CODE_TYPES, DEFAULT_NEXT_PATH, normalizeAccessCode } from "@/lib/auth/confirm.mjs"
import { normalizeResendEmail } from "@/lib/auth/resend-access.mjs"

const INVALID_MESSAGE =
  "Código inválido ou expirado. Cada código vale uma única vez e cada novo pedido cancela os anteriores: use o do e-mail mais recente ou peça um novo acesso. Se você já criou sua senha, entre com e-mail e senha."

export function AccessCodeForm() {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (pending) return
    const normalizedEmail = normalizeResendEmail(email)
    const token = normalizeAccessCode(code)
    if (!normalizedEmail || !token) {
      setError(!normalizedEmail ? "Informe um e-mail válido." : "O código tem só números (normalmente 8). Confira o e-mail mais recente.")
      return
    }

    setPending(true)
    try {
      const supabase = createClient()
      // O código pode ter vindo do convite ou do reenvio; só esses tipos são aceitos.
      for (const type of ACCESS_CODE_TYPES) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ email: normalizedEmail, token, type })
        if (!verifyError) {
          window.location.assign(DEFAULT_NEXT_PATH)
          return
        }
        if (verifyError.status === 429) {
          setError("Muitas tentativas. Aguarde alguns minutos e tente de novo.")
          return
        }
      }
      setError(INVALID_MESSAGE)
    } catch {
      setError("Não foi possível confirmar o código. Confira sua conexão e tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail da compra</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@email.com"
          required
          maxLength={320}
          className="h-11"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="code">Código do e-mail</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="00000000"
          required
          maxLength={14}
          className="h-11 font-mono text-lg tracking-[0.3em]"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Digite todos os números do código (normalmente 8). Use sempre o e-mail mais recente: cada novo pedido de acesso cancela os
          códigos anteriores.
        </p>
      </div>
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={pending}>
        {pending ? "Verificando..." : "Entrar"}
      </Button>
    </form>
  )
}
