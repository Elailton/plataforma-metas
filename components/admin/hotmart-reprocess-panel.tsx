"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  previewPendingPurchases,
  reprocessPendingPurchases,
  type ReprocessPreviewView,
} from "@/lib/admin/actions/hotmart-reprocess"

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação."
}

/**
 * Compras que a Hotmart avisou, mas não geraram acesso (produto/oferta cadastrados
 * depois, aviso perdido). Prévia primeiro; envio só com confirmação, em lotes
 * pequenos para caber no limite diário de e-mails.
 */
export function HotmartReprocessPanel({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [preview, setPreview] = useState<ReprocessPreviewView | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)

  async function loadPreview() {
    setPending(true)
    setConfirmed(false)
    try {
      setPreview(await previewPendingPurchases(courseId))
    } catch (error) {
      toast.error(messageFrom(error))
    } finally {
      setPending(false)
    }
  }

  async function release() {
    if (!preview || !confirmed) return
    setPending(true)
    try {
      const result = await reprocessPendingPurchases(
        courseId, preview.batch.map((item) => item.transaction), true,
      )
      if (result.status === "draft") {
        toast.error("Publique o curso antes de reprocessar as compras.")
      } else {
        const parts = [`${result.processed} liberada(s)`]
        if (result.skipped) parts.push(`${result.skipped} já resolvida(s)`)
        if (result.failed) parts.push(`${result.failed} com falha (tente de novo depois)`)
        toast.success(parts.join(" · "))
      }
      router.refresh()
      setPreview(await previewPendingPurchases(courseId))
      setConfirmed(false)
    } catch (error) {
      toast.error(messageFrom(error))
    } finally {
      setPending(false)
    }
  }

  const counts = preview?.counts
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reprocessar compras pendentes</CardTitle>
        <CardDescription>
          Compras com oferta que libera acesso, mas que chegaram antes do cadastro do produto ou da oferta.
          Primeiro veja a prévia; nada é enviado sem a sua confirmação. Limite de {preview?.limit ?? 20} por dia
          para não estourar a cota de e-mails.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <Button type="button" variant="outline" disabled={pending} onClick={loadPreview}>
            <RefreshCw className="size-4" />
            {preview ? "Atualizar prévia" : "Ver prévia"}
          </Button>
        </div>

        {preview && counts ? (
          <div className="grid gap-4 text-sm">
            {preview.courseDraft ? (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                Este curso ainda não está publicado. Publique o curso antes de reprocessar: nenhum convite será enviado.
              </p>
            ) : null}

            <ul className="grid gap-1 text-muted-foreground">
              <li><strong className="text-foreground">{preview.eligibleCount}</strong> compra(s) prontas para liberar</li>
              <li>{counts.withoutEmail} sem e-mail guardado (compras recebidas antes desta função — liberar manualmente)</li>
              <li>{counts.refundedOrCanceled} reembolsada(s), cancelada(s) ou com chargeback — nunca liberam</li>
              <li>{counts.delayed} com pagamento atrasado — não liberam agora</li>
              <li>{counts.notGranting} de oferta que não libera ou ainda não cadastrada</li>
              <li>{counts.alreadyRegistered} já registradas (nada a fazer)</li>
              {counts.admin ? <li>{counts.admin} de conta administrativa — ignoradas</li> : null}
            </ul>

            {preview.similar.length ? (
              <div className="grid gap-2">
                <p className="font-medium text-foreground">
                  Possível conta duplicada ({preview.similar.length}) — conferir manualmente, fora do lote:
                </p>
                <ul className="grid gap-1 font-mono text-xs">
                  {preview.similar.map((item) => (
                    <li key={item.transaction}>
                      {item.transaction} · {item.maskedEmail} parece {item.similarTo}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!preview.courseDraft && preview.batch.length ? (
              <div className="grid gap-3">
                <p className="text-foreground">
                  Hoje: {preview.usedToday} de {preview.limit} usados. Este lote: <strong>{preview.batch.length}</strong>{" "}
                  ({preview.invitesInBatch} convite(s) por e-mail; quem já tem conta recebe o curso sem e-mail).
                  {preview.leftAfterBatch ? ` Ficam ${preview.leftAfterBatch} para os próximos dias.` : ""}
                </p>
                <ul className="grid gap-1 font-mono text-xs">
                  {preview.batch.map((item) => (
                    <li key={item.transaction} className="flex items-center gap-2">
                      <span>{item.transaction} · {item.maskedEmail}</span>
                      <Badge variant={item.hasAccount ? "secondary" : "default"}>
                        {item.hasAccount ? "conta existente" : "convite"}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`reprocess-confirm-${courseId}`}
                    checked={confirmed}
                    onCheckedChange={(value) => setConfirmed(value === true)}
                  />
                  <Label htmlFor={`reprocess-confirm-${courseId}`} className="font-normal leading-snug">
                    Confirmo que conferi estas compras e autorizo liberar o acesso e enviar os convites.
                  </Label>
                </div>
                <div>
                  <Button type="button" disabled={pending || !confirmed} onClick={release}>
                    Liberar {preview.batch.length} agora
                  </Button>
                </div>
              </div>
            ) : null}

            {!preview.courseDraft && !preview.batch.length && preview.eligibleCount ? (
              <p className="text-muted-foreground">Limite de hoje atingido. Faltam {preview.eligibleCount}; volte amanhã.</p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
