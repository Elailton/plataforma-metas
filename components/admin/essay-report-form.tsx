"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { publishEssayReport } from "@/lib/mini-quizzes/essay-report-actions"

export function EssayReportForm({ essayId, currentPath }: { essayId: string; currentPath: string | null }) {
  const [pending, setPending] = useState(false)
  const router = useRouter()
  return (
    <form className="mt-4 space-y-3 border-t border-border pt-4" onSubmit={async (event) => {
      event.preventDefault()
      const form = event.currentTarget
      setPending(true)
      try {
        const result = await publishEssayReport(new FormData(form))
        if (!result.ok) toast.error(result.error ?? "Não foi possível publicar o PDF.")
        else { toast.success("PDF publicado. O lembrete aparece somente para o dono da redação."); form.reset(); router.refresh() }
      } catch { toast.error("Não foi possível publicar o PDF. Tente novamente.") }
      finally { setPending(false) }
    }}>
      <h3 className="font-semibold">PDF da análise</h3>
      <p className="text-sm text-muted-foreground">{currentPath ? "Já existe um PDF. Um novo envio preserva o arquivo anterior e renova o lembrete individual." : "Publique a devolutiva após salvar a nota. O arquivo fica disponível somente para o dono desta redação."}</p>
      <input type="hidden" name="essayId" value={essayId} />
      <input type="hidden" name="expectedPath" value={currentPath ?? ""} />
      <label className="block space-y-1 text-sm">
        <span>Arquivo PDF (até 3 MB)</span>
        <Input name="pdf" type="file" accept="application/pdf,.pdf" required disabled={pending} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Disponibilizar para o aluno se estiver no</span>
        <select name="targetGroup" defaultValue="1" disabled={pending} className="block rounded-md border border-border bg-background p-2">
          <option value="1">Grupo 1</option><option value="2">Grupo 2</option><option value="3">Grupo 3 (teste)</option>
        </select>
      </label>
      <p className="text-xs text-muted-foreground">Confira se o PDF pertence ao aluno identificado neste cartão. O envio não altera a nota e não envia e-mail.</p>
      <Button disabled={pending} type="submit">{pending ? "Publicando…" : currentPath ? "Substituir PDF e renovar lembrete" : "Publicar PDF e lembrete individual"}</Button>
    </form>
  )
}
