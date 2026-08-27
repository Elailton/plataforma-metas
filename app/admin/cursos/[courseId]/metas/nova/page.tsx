import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NewGoalForm } from "./new-goal-form"
import { getCourse } from "@/lib/mock-data"

export default async function NewGoalPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const course = getCourse(courseId)
  if (!course) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          render={<Link href={`/admin/cursos/${course.id}`} aria-label="Voltar" />}
          nativeButton={false}
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
        >
          <ArrowLeft />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Criar meta</h1>
          <p className="text-sm text-muted-foreground">{course.name}</p>
        </div>
      </div>

      <NewGoalForm courseId={course.id} />
    </div>
  )
}
