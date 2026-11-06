import { redirect } from "next/navigation"
import { getStudentExperience } from "@/lib/student/experience"
import { simuladosSections } from "@/lib/groups/experience.mjs"

export const dynamic = "force-dynamic"

/** Aba "Simulados": abre a primeira seção liberada para o grupo do aluno. */
export default async function SimuladosPage() {
  const experience = await getStudentExperience()
  const [first] = simuladosSections(experience.disabled)
  redirect(first ? first.href : "/aluno")
}
