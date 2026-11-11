import "server-only"
import { createClient } from "@/lib/supabase/server"
import { logSafeServerError } from "@/lib/security/safe-error"
import { isUuid } from "@/lib/mini-quizzes/core.mjs"

export interface EssayReport {
  essay_id: string
  storage_path: string
  published_at: string
  viewed_at: string | null
}

/** RLS verifica dono, matrícula, curso publicado, grupo e status da correção. */
export async function getEssayReports(essayIds: string[]): Promise<EssayReport[]> {
  const ids = essayIds.filter(isUuid)
  if (!ids.length) return []
  const supabase = await createClient()
  const { data, error } = await supabase.from("mini_quiz_essay_reports")
    .select("essay_id, storage_path, published_at, viewed_at").in("essay_id", ids)
  if (error) {
    // Antes da migração, o relatório e as notas existentes continuam funcionando.
    if (error.code !== "42P01" && error.code !== "PGRST205") logSafeServerError("essay_report.read_failed", error)
    return []
  }
  return data ?? []
}
