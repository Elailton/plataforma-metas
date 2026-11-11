"use client"

import { useEffect } from "react"
import { viewEssayReport } from "@/lib/mini-quizzes/essay-report-actions"

/** Só marca após montar no navegador; prefetch do Next não consome o lembrete. */
export function EssayReportSeen({ essayId, storagePath }: { essayId: string; storagePath: string }) {
  useEffect(() => { void viewEssayReport(essayId, storagePath).catch(() => undefined) }, [essayId, storagePath])
  return null
}
