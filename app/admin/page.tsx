import Link from "next/link"
import { GraduationCap, Users, ListChecks, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { courses, getEditalProgressByCourse, getGoalsSummary } from "@/lib/mock-data"

export default function AdminDashboardPage() {
  const totalStudents = courses.reduce((sum, c) => sum + c.studentsCount, 0)
  const totalGoals = courses.reduce((sum, c) => sum + c.goalsCount, 0)
  const publishedCourses = courses.filter((c) => c.published).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral de todos os cursos da plataforma.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cursos publicados</CardTitle>
            <GraduationCap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold tabular-nums text-foreground">{publishedCourses}</span>
            <span className="ml-1 text-sm text-muted-foreground">de {courses.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alunos ativos</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold tabular-nums text-foreground">{totalStudents}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Metas publicadas</CardTitle>
            <ListChecks className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold tabular-nums text-foreground">{totalGoals}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Cursos</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/cursos">
              Ver todos
              <ArrowRight data-icon="inline-end" />
            </Link>
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
                        {course.studentsCount}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <ListChecks className="size-3.5" />
                        {goalsSummary.completed}/{goalsSummary.total} metas
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
    </div>
  )
}
