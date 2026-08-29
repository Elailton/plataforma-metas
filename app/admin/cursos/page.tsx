import Link from "next/link"
import { Users, ListChecks } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { CourseFormDialog } from "@/components/admin/course-form-dialog"
import { listAdminCourses } from "@/lib/admin/queries"
import { GraduationCap } from "lucide-react"

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
}

export default async function AdminCoursesPage() {
  const courses = await listAdminCourses()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cursos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os concursos disponíveis na plataforma.</p>
        </div>
        <CourseFormDialog />
      </div>

      {courses.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap />
            </EmptyMedia>
            <EmptyTitle>Nenhum curso cadastrado</EmptyTitle>
            <EmptyDescription>Crie o primeiro curso para começar a organizar disciplinas e metas.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/admin/cursos/${course.id}`}>
              <Card className="h-full transition-colors hover:border-primary/30">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base font-semibold text-foreground">{course.name}</CardTitle>
                    <span className="text-xs text-muted-foreground">{course.organization || "Sem instituição"}</span>
                  </div>
                  <Badge variant={course.status === "published" ? "default" : "secondary"} className="shrink-0">
                    {STATUS_LABEL[course.status]}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="size-3.5" />
                      {course.studentsCount} alunos
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ListChecks className="size-3.5" />
                      {course.goalsCount} metas
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
