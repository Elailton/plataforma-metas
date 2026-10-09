import { GraduationCap } from "lucide-react"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { PageHeader } from "@/components/page-header"
import { CourseFormDialog } from "@/components/admin/course-form-dialog"
import { CourseCard } from "@/components/admin/course-card"
import { listAdminCourses } from "@/lib/admin/queries"

export default async function AdminCoursesPage() {
  const courses = await listAdminCourses()

  return (
    <>
      <PageHeader
        title="Cursos"
        description="Gerencie os concursos disponíveis na plataforma."
        actions={<CourseFormDialog />}
      />

      {courses.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap />
            </EmptyMedia>
            <EmptyTitle>Nenhum curso cadastrado</EmptyTitle>
            <EmptyDescription>Crie o primeiro curso para começar a organizar disciplinas e metas.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </>
  )
}
