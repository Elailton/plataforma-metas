"use client"

import Link from "next/link"
import { ListChecks, Plus, BookOpen, FileText } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AdminGoalRow } from "@/components/admin/admin-goal-row"
import { CourseEditalEditor } from "@/components/admin/course-edital-editor"
import { CourseStudentsTable } from "@/components/admin/course-students-table"
import { CourseMaterialsPanel } from "@/components/admin/course-materials-panel"
import { CourseFormDialog } from "@/components/admin/course-form-dialog"
import { HotmartIntegrationPanel } from "@/components/admin/hotmart-integration-panel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import type {
  AdminCourse,
  AdminGoal,
  AdminMaterial,
  AdminCourseStudent,
  AdminSubject,
  AdminSyllabusTopic,
  HotmartProductMapping,
} from "@/lib/admin/types"

interface CourseDetailTabsProps {
  course: AdminCourse
  goals: AdminGoal[]
  edital: { subject: AdminSubject; topics: AdminSyllabusTopic[] }[]
  students: AdminCourseStudent[]
  materials: AdminMaterial[]
  hotmartMappings: HotmartProductMapping[]
}

export function CourseDetailTabs({
  course,
  goals,
  edital,
  students,
  materials,
  hotmartMappings,
}: CourseDetailTabsProps) {
  const totalTopics = edital.reduce((acc, group) => acc + group.topics.length, 0)

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Visão geral</TabsTrigger>
        <TabsTrigger value="goals">Metas</TabsTrigger>
        <TabsTrigger value="edital">Edital</TabsTrigger>
        <TabsTrigger value="materials">Materiais</TabsTrigger>
        <TabsTrigger value="students">Alunos</TabsTrigger>
        <TabsTrigger value="settings">Configurações</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alunos</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold tabular-nums text-foreground">
                {students.filter((student) => student.enrollmentStatus === "active").length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Metas</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold tabular-nums text-foreground">
                {goals.filter((g) => g.status === "published").length}/{goals.length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tópicos no edital</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold tabular-nums text-foreground">{totalTopics}</span>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="goals" className="flex flex-col gap-4">
        <div className="flex items-center justify-end">
          <Button render={<Link href={`/admin/cursos/${course.id}/metas/nova`} />} nativeButton={false} size="sm">
            <Plus data-icon="inline-start" />
            Criar meta
          </Button>
        </div>
        {goals.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListChecks />
              </EmptyMedia>
              <EmptyTitle>Nenhuma meta criada</EmptyTitle>
              <EmptyDescription>Crie a primeira meta para este curso.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
            {goals.map((goal) => (
              <AdminGoalRow key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="edital">
        {edital.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen />
              </EmptyMedia>
              <EmptyTitle>Nenhuma disciplina cadastrada</EmptyTitle>
              <EmptyDescription>Adicione disciplinas e tópicos para montar o edital deste curso.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        <CourseEditalEditor courseId={course.id} groups={edital} />
      </TabsContent>

      <TabsContent value="materials">
        {materials.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>Nenhum material vinculado</EmptyTitle>
              <EmptyDescription>Adicione videoaulas, apostilas ou links para este curso.</EmptyDescription>
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
        <Card>
          <CardContent className="p-0">
            <CourseStudentsTable courseId={course.id} students={students} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings" className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground">Informações do curso</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Atualize o nome, a instituição, a descrição e o status de publicação deste curso.
            </p>
            <div>
              <CourseFormDialog
                course={course}
                trigger={
                  <Button variant="outline">
                    Editar informações
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
        <HotmartIntegrationPanel courseId={course.id} mappings={hotmartMappings} />
      </TabsContent>
    </Tabs>
  )
}
