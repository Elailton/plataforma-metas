import Link from "next/link"
import { Plus, Users, ListChecks } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { courses, getEditalProgressByCourse, getGoalsSummary } from "@/lib/mock-data"

export default function AdminCoursesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cursos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os concursos disponíveis na plataforma.</p>
        </div>
        <Button>
          <Plus data-icon="inline-start" />
          Novo curso
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const edital = getEditalProgressByCourse(course.id)
          const goalsSummary = getGoalsSummary(course.id)
          return (
            <Link key={course.id} href={`/admin/cursos/${course.id}`}>
              <Card className="h-full transition-colors hover:border-primary/30">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base font-semibold text-foreground">{course.shortName}</CardTitle>
                    <span className="text-xs text-muted-foreground">{course.organization}</span>
                  </div>
                  <Badge variant={course.published ? "default" : "secondary"} className="shrink-0">
                    {course.published ? "Publicado" : "Rascunho"}
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
                      {goalsSummary.total} metas
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Edital concluído</span>
                    <span className="font-medium tabular-nums text-foreground">{edital.percentage}%</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
