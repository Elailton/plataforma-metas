import { notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { CourseDetailTabs } from "./course-detail-tabs"
import { CourseStatusActions } from "@/components/admin/course-status-actions"
import { CourseStatusBadge } from "@/components/admin/course-card"
import {
  getAdminCourse,
  listCourseEdital,
  listCourseGoals,
  listCourseStudents,
  listHotmartProductMappings,
  listRecentHotmartEvents,
  listMaterials,
  listCourseGroupSettings,
} from "@/lib/admin/queries"

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const course = await getAdminCourse(courseId)
  if (!course) notFound()

  const [goals, edital, students, materials, hotmartMappings, hotmartEvents, groupSettings] = await Promise.all([
    listCourseGoals(course.id),
    listCourseEdital(course.id),
    listCourseStudents(course.id),
    listMaterials(course.id),
    listHotmartProductMappings(course.id),
    listRecentHotmartEvents(),
    listCourseGroupSettings(course.id),
  ])
  const hotmartWebhookUrl = process.env.SITE_URL
    ? new URL("/api/webhooks/hotmart", process.env.SITE_URL).toString()
    : null

  return (
    <>
      <PageHeader
        backHref="/admin/cursos"
        backLabel="Cursos"
        title={course.name}
        badge={<CourseStatusBadge status={course.status} />}
        description={course.organization || "Sem instituição"}
        actions={<CourseStatusActions course={course} />}
      />

      <CourseDetailTabs
        course={course}
        goals={goals}
        edital={edital}
        students={students}
        materials={materials}
        hotmartMappings={hotmartMappings}
        hotmartEvents={hotmartEvents}
        hotmartWebhookUrl={hotmartWebhookUrl}
        groupSettings={groupSettings}
      />
    </>
  )
}
