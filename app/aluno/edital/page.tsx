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
  const subjects = snapshot.subjects.filter((subject) => subject.topics.length > 0)

  return (
    <PageContainer>
      <PageHeading title="Edital" description="Acompanhe o que você já estudou em cada disciplina." />

      <div className="mb-8 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">Progresso geral do edital</span>
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{snapshot.studiedTopics}</span> de{" "}
              <span className="tabular-nums">{snapshot.totalTopics}</span> tópicos estudados
            </span>
          </div>
          <span className="text-3xl font-semibold leading-none tabular-nums tracking-tight text-primary">
            {snapshot.editalPercentage}%
          </span>
        </div>
        <Progress value={snapshot.editalPercentage} className="h-2" aria-label={`Edital: ${snapshot.editalPercentage}%`} />
      </div>

      {subjects.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          O edital deste curso ainda não foi cadastrado.
        </p>
      ) : (
        <Accordion
          multiple
          defaultValue={subjects[0] ? [subjects[0].id] : []}
          className="flex flex-col gap-2.5"
        >
          {subjects.map((discipline) => (
            <AccordionItem
              key={discipline.id}
              value={discipline.id}
              className="rounded-xl border border-border bg-card px-4 last:border-b md:px-5"
            >
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex flex-1 flex-col gap-2 pr-3 text-left">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold leading-snug text-foreground">{discipline.name}</span>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {discipline.studied}/{discipline.total} · {discipline.percentage}%
                    </span>
                  </div>
                  <Progress value={discipline.percentage} className="h-1.5" />
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col divide-y divide-border/60 border-t border-border/60 pb-2">
                  {discipline.topics.map((topic, topicIndex) => (
                    <EditalTopic key={topic.id} topic={topic} index={topicIndex} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </PageContainer>
  )
}
