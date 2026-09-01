import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CourseDetailTabs } from "./course-detail-tabs"
import { CourseStatusActions } from "@/components/admin/course-status-actions"
import {
  getAdminCourse,
  listCourseEdital,
  listCourseGoals,
  listCourseStudents,
  listHotmartProductMappings,
  listMaterials,
} from "@/lib/admin/queries"

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
}

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const course = await getAdminCourse(courseId)
  if (!course) notFound()

  const [goals, edital, students, materials, hotmartMappings] = await Promise.all([
    listCourseGoals(course.id),
    listCourseEdital(course.id),
    listCourseStudents(course.id),
    listMaterials(course.id),
    listHotmartProductMappings(course.id),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          render={<Link href="/admin/cursos" aria-label="Voltar" />}
          nativeButton={false}
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
        >
          <ArrowLeft />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{course.name}</h1>
            <Badge variant={course.status === "published" ? "default" : "secondary"} className="shrink-0">
              {STATUS_LABEL[course.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{course.organization || "Sem instituição"}</p>
        </div>
        <CourseStatusActions course={course} />
      </div>

      <CourseDetailTabs
        course={course}
        goals={goals}
        edital={edital}
        students={students}
        materials={materials}
        hotmartMappings={hotmartMappings}
      />
    </div>
  )
}
