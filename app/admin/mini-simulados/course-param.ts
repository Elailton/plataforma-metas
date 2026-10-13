import type { AdminCourse } from "@/lib/admin/types"
import { isUuid } from "@/lib/materials/pdf.mjs"

/** Curso escolhido pela URL (?curso=), ou o primeiro curso publicado/cadastrado. */
export function resolveCourse(courses: AdminCourse[], requested: string | undefined) {
  if (requested && isUuid(requested)) {
    const found = courses.find((course) => course.id === requested)
    if (found) return found
  }
  return courses.find((course) => course.status === "published") ?? courses[0] ?? null
}
