"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ListChecks, Plus, BookOpen, FileText, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AdminGoalRow } from "@/components/admin/admin-goal-row"
import { CourseEditalEditor } from "@/components/admin/course-edital-editor"
import { CourseGroupsPanel } from "@/components/admin/course-groups-panel"
import { CourseStudentsTable } from "@/components/admin/course-students-table"
import { CourseMaterialsPanel } from "@/components/admin/course-materials-panel"
import { CourseFormDialog } from "@/components/admin/course-form-dialog"
import { HotmartIntegrationPanel } from "@/components/admin/hotmart-integration-panel"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { SearchInput } from "@/components/search-input"
import { filterBySearch } from "@/lib/search.mjs"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import type {
  AdminCourse,
  AdminGoal,
  AdminMaterial,
  AdminCourseStudent,
  AdminSubject,
  AdminSyllabusTopic,
  HotmartProductMapping,
  HotmartEventSummary,
} from "@/lib/admin/types"

interface CourseDetailTabsProps {
  course: AdminCourse
  goals: AdminGoal[]
  edital: { subject: AdminSubject; topics: AdminSyllabusTopic[] }[]
  students: AdminCourseStudent[]
  materials: AdminMaterial[]
  hotmartMappings: HotmartProductMapping[]
  hotmartEvents: HotmartEventSummary[]
  hotmartWebhookUrl: string | null
}

export function CourseDetailTabs({
  course,
  goals,
  edital,
  students,
  materials,
  hotmartMappings,
  hotmartEvents,
  hotmartWebhookUrl,
}: CourseDetailTabsProps) {
  const totalTopics = edital.reduce(
    (acc, group) => acc + group.topics.length,
    0,
  )
  const [goalQuery, setGoalQuery] = useState("")
  const filteredGoals = useMemo(() => {
    const subjectNames = new Map(edital.map((group) => [group.subject.id, group.subject.name]))
    const topicTitles = new Map(
      edital.flatMap((group) => group.topics.map((topic) => [topic.id, topic.title] as const)),
    )
    return filterBySearch(goals, goalQuery, (goal) => [
      goal.title,
      goal.description,
      goal.status === "published" ? "Publicada" : goal.status === "archived" ? "Arquivada" : "Rascunho",
      ...goal.items.flatMap((item) => [
        subjectNames.get(item.subjectId),
        item.topicId ? topicTitles.get(item.topicId) : null,
        item.subtopicId ? topicTitles.get(item.subtopicId) : null,
        item.instructions,
      ]),
    ])
  }, [goals, goalQuery, edital])

  return (
    <Tabs defaultValue="overview" className="gap-5">
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <TabsList className="w-max">
        <TabsTrigger value="overview">Visão geral</TabsTrigger>
        <TabsTrigger value="goals">Metas</TabsTrigger>
        <TabsTrigger value="edital">Edital</TabsTrigger>
        <TabsTrigger value="materials">Materiais</TabsTrigger>
        <TabsTrigger value="students">Alunos</TabsTrigger>
        <TabsTrigger value="settings">Configurações</TabsTrigger>
      </TabsList>
      </div>

      <TabsContent value="overview" className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
          <StatCard
            label="Alunos ativos"
            value={students.filter((student) => student.enrollmentStatus === "active").length}
            suffix={`de ${students.length}`}
            icon={Users}
          />
          <StatCard
            label="Metas publicadas"
            value={goals.filter((g) => g.status === "published").length}
            suffix={`de ${goals.length}`}
            icon={ListChecks}
          />
          <StatCard label="Tópicos no edital" value={totalTopics} suffix={`em ${edital.length} disciplinas`} icon={BookOpen} />
        </div>
      </TabsContent>

      <TabsContent value="goals" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {goals.length > 0 ? (
            <SearchInput
              value={goalQuery}
              onChange={setGoalQuery}
              placeholder="Pesquisar por título, disciplina ou tópico"
              label="Pesquisar metas"
              className="sm:max-w-md"
            />
          ) : null}
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-sm text-muted-foreground tabular-nums">
              {goalQuery
                ? `${filteredGoals.length} de ${goals.length}`
                : `${goals.length} ${goals.length === 1 ? "meta" : "metas"}`}
            </span>
            <Button render={<Link href={`/admin/cursos/${course.id}/metas/nova`} />} nativeButton={false}>
              <Plus data-icon="inline-start" />
              Criar meta
            </Button>
          </div>
        </div>
        {goals.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListChecks />
              </EmptyMedia>
              <EmptyTitle>Nenhuma meta criada</EmptyTitle>
              <EmptyDescription>
                Crie a primeira meta para este curso.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : filteredGoals.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma meta encontrada para “{goalQuery.trim()}”.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {filteredGoals.map((goal) => (
              <AdminGoalRow key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="edital">
        {edital.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen />
              </EmptyMedia>
              <EmptyTitle>Nenhuma disciplina cadastrada</EmptyTitle>
              <EmptyDescription>
                Adicione disciplinas e tópicos para montar o edital deste curso.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        <CourseEditalEditor courseId={course.id} groups={edital} />
      </TabsContent>

      <TabsContent value="materials">
        {materials.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>Nenhum material vinculado</EmptyTitle>
              <EmptyDescription>
                Adicione videoaulas, apostilas ou links para este curso.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        <CourseMaterialsPanel
          courseId={course.id}
          materials={materials}
          subjects={edital.map((group) => group.subject)}
        />
      </TabsContent>

      <TabsContent value="students">
        <Card className="py-0">
          <CardContent className="p-0">
            <CourseStudentsTable courseId={course.id} students={students} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings" className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Informações do curso</CardTitle>
            <CardDescription>Atualize o nome, a instituição, a descrição e o status de publicação deste curso.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <CourseFormDialog
                course={course}
                trigger={<Button variant="outline">Editar informações</Button>}
              />
            </div>
          </CardContent>
        </Card>
        <CourseGroupsPanel
          courseId={course.id}
          enabled={course.groupsEnabled}
          schema={course.questionnaireSchema}
        />
        <HotmartIntegrationPanel
          courseId={course.id}
          mappings={hotmartMappings}
          events={hotmartEvents}
          webhookUrl={hotmartWebhookUrl}
        />
      </TabsContent>
    </Tabs>
  )
}
