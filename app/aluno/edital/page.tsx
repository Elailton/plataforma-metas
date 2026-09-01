import { redirect } from "next/navigation"
import { CheckCircle2, Circle } from "lucide-react"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { getStudentContext, getStudentCourseSnapshot } from "@/lib/student/queries"

export default async function EditalPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const snapshot = await getStudentCourseSnapshot(context.currentCourse.id)
  if (!snapshot) redirect("/auth/sem-acesso")

  return (
    <PageContainer>
      <PageHeading title="Edital" description="Acompanhe o que você já estudou em cada disciplina." />

      <div className="mb-6 flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Progresso geral do edital</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">{snapshot.editalPercentage}%</span>
        </div>
        <Progress value={snapshot.editalPercentage} className="h-2" />
        <span className="text-xs text-muted-foreground">
          {snapshot.studiedTopics} de {snapshot.totalTopics} tópicos estudados
        </span>
      </div>

      <Accordion multiple defaultValue={snapshot.subjects[0] ? [snapshot.subjects[0].id] : []} className="flex flex-col gap-2">
        {snapshot.subjects.map((discipline) => {
          return (
            <AccordionItem
              key={discipline.id}
              value={discipline.id}
              className="rounded-xl border border-border bg-card px-4 last:border-b"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 flex-col gap-1.5 pr-2 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{discipline.name}</span>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {discipline.studied}/{discipline.total}
                    </span>
                  </div>
                  <Progress value={discipline.percentage} className="h-1.5" />
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-2.5 pb-2 pt-1">
                  {discipline.topics.map((topic) => (
                    <li key={topic.id} className="flex items-start gap-2.5 text-sm">
                      {topic.studied ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      ) : (
                        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className={topic.studied ? "text-foreground" : "text-muted-foreground"}>
                        {topic.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </PageContainer>
  )
}
