import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { AdminSubject } from "@/lib/admin/types"

export async function listAdminSubjectsForMaterialImport(): Promise<AdminSubject[]> {
  const supabase = await createClient()
  const { data: subjects } = await supabase
    .from("subjects")
    .select("*, syllabus_topics(id)")
    .order("position", { ascending: true })

  return (subjects ?? []).map((subject: any) => ({
    id: subject.id,
    courseId: subject.course_id,
    name: subject.name,
    position: subject.position,
    topicsCount: subject.syllabus_topics?.length ?? 0,
  }))
}
