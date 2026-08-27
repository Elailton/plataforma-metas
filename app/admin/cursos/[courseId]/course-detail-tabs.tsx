"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AdminGoalRow } from "@/components/admin/admin-goal-row"
import { CourseEditalSummary } from "@/components/admin/course-edital-summary"
import { CourseStudentsTable } from "@/components/admin/course-students-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { ListChecks } from "lucide-react"
import type { Course, Goal } from "@/lib/types"
import { getEditalProgressByCourse, getGoalsSummary } from "@/lib/mock-data"

export function CourseDetailTabs({ course, goals }: { course: Course; goals: Goal[] }) {
  const edital = getEditalProgressByCourse(course.id)
  const goalsSummary = getGoalsSummary(course.id)

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Visão geral</TabsTrigger>
        <TabsTrigger value="goals">Metas</TabsTrigger>
        <TabsTrigger value="edital">Edital</TabsTrigger>
        <TabsTrigger value="students">Alunos</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alunos</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold tabular-nums text-foreground">{course.studentsCount}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Metas concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold tabular-nums text-foreground">
                {goalsSummary.completed}/{goalsSummary.total}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Edital concluído</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold tabular-nums text-foreground">{edital.percentage}%</span>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="goals" className="flex flex-col gap-4">
        <div className="flex items-center justify-end">
          <Button asChild size="sm">
            <Link href={`/admin/cursos/${course.id}/metas/nova`}>
              <Plus data-icon="inline-start" />
              Criar meta
            </Link>
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
        <CourseEditalSummary courseId={course.id} />
      </TabsContent>

      <TabsContent value="students">
        <Card>
          <CardContent className="p-0">
            <CourseStudentsTable courseId={course.id} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
