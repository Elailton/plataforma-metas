import { redirect } from "next/navigation"
import { PageContainer, PageHeading } from "@/components/student/page-container"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { EditalTopic } from "@/components/student/edital-topic"
import { getStudentContext, getStudentCourseSnapshot } from "@/lib/student/queries"

export default async function EditalPage() {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  const snapshot = await getStudentCourseSnapshot(context.currentCourse.id)
  if (!snapshot) redirect("/auth/sem-acesso")

  return (
    <PageContainer className="md:max-w-[1000px]">
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
                <div className="flex flex-col divide-y divide-border/50 pb-1">
                  {discipline.topics.map((topic, topicIndex) => (
                    <EditalTopic key={topic.id} topic={topic} index={topicIndex} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </PageContainer>
  )
}
