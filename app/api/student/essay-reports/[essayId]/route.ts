import { getStudentContext } from "@/lib/student/queries"
import { getStudentExperience } from "@/lib/student/experience"
import { createClient } from "@/lib/supabase/server"
import { isUuid } from "@/lib/mini-quizzes/core.mjs"
import { getEssayAnalysisData } from "@/lib/mini-quizzes/essay-reports"
import { REPORT_BUCKET, REPORT_MAX_BYTES } from "@/lib/mini-quizzes/essay-report.mjs"
import { logSafeServerError } from "@/lib/security/safe-error"

export const dynamic = "force-dynamic"
const privateHeaders = { "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff" }
const missing = () => new Response("Arquivo indisponível.",{status:404,headers:privateHeaders})

export async function GET(_request:Request,{params}:{params:Promise<{essayId:string}>}) {
  const {essayId} = await params
  if (!isUuid(essayId)) return missing()
  const context = await getStudentContext()
  if (!context) return missing()
  const experience = await getStudentExperience()
  if (!experience.isEnabled("relatorio")) return missing()
  const supabase = await createClient()
  const data = await getEssayAnalysisData(context.currentCourse.id,context.profile.id)
  const report = data.reports.find((item) => item.essay_id === essayId)
  if (!report) return missing()
  // Cliente da sessão: o Storage aplica a RLS novamente, sem service_role e sem URL pública.
  const {data:file,error:downloadError} = await supabase.storage.from(REPORT_BUCKET).download(report.storage_path)
  if (downloadError || !file || file.size > REPORT_MAX_BYTES) {
    if (downloadError) logSafeServerError("essay_report.download_failed",downloadError)
    return missing()
  }
  return new Response(await file.arrayBuffer(),{headers:{...privateHeaders,
    "Content-Type":"application/pdf","Content-Disposition":'attachment; filename="analise-redacao.pdf"',
    "Content-Security-Policy":"sandbox; default-src 'none'", "Referrer-Policy":"no-referrer",
  }})
}
