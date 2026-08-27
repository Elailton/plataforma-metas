import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CourseDetailTabs } from "./course-detail-tabs"
import { getCourse, getGoalsByCourse } from "@/lib/mock-data"

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const course = getCourse(courseId)
  if (!course) notFound()

  const goals = getGoalsByCourse(course.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0">
          <Link href="/admin/cursos" aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{course.name}</h1>
            <Badge variant={course.published ? "default" : "secondary"} className="shrink-0">
              {course.published ? "Publicado" : "Rascunho"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{course.organization}</p>
        </div>
      </div>

      <CourseDetailTabs course={course} goals={goals} />
    </div>
  )
}
