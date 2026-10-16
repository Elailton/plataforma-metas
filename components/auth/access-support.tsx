import { SUPPORT_PHONE_LABEL, SUPPORT_WHATSAPP_URL } from "@/lib/support"

export function AccessSupport() {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm leading-relaxed">
      <p className="font-medium text-foreground">Precisa de ajuda com seu acesso?</p>
      <p className="mt-1 text-muted-foreground">
        Se você ainda não tem matrícula ou não recebeu as instruções, fale com a atendente do suporte.
      </p>
      <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-foreground underline underline-offset-4">
        Falar com o suporte · {SUPPORT_PHONE_LABEL}
      </a>
    </div>
  )
}
