import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { getCourse, getDiscipline, getGoal } from "@/lib/mock-data"
import { formatDateLong } from "@/lib/format"

export default async function AdminGoalDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; goalId: string }>
}) {
  const { courseId, goalId } = await params
  const course = getCourse(courseId)
  const goal = getGoal(goalId)
  if (!course || !goal || goal.courseId !== courseId) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0">
          <Link href={`/admin/cursos/${course.id}`} aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-medium text-muted-foreground">Meta {goal.number}</span>
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{goal.title}</h1>
          <p className="text-sm text-muted-foreground">{formatDateLong(goal.date)}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">Meta publicada para os alunos</span>
            <span className="text-xs text-muted-foreground">
              Quando desativada, a meta fica visível apenas para o administrador.
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Badge variant={goal.published ? "default" : "secondary"}>
              {goal.published ? "Publicada" : "Rascunho"}
            </Badge>
            <Switch defaultChecked={goal.published} aria-label="Publicar meta" />
          </div>
        </CardContent>
      </Card>

      <p className="text-sm leading-relaxed text-muted-foreground">{goal.description}</p>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Itens da meta</h2>
        {goal.items.map((item, index) => {
          const discipline = getDiscipline(item.disciplineId)
          return (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">{discipline?.name}</span>
                  <span className="text-xs text-muted-foreground">Item {index + 1}</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">{item.orientation}</p>
                <span className="text-xs text-muted-foreground">
                  {item.suggestedQuestions} questões sugeridas
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
