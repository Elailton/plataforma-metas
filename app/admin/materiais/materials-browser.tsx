"use client"

import { useMemo, useState } from "react"
import { Plus, FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { MaterialTypeIcon, materialTypeLabel } from "@/components/admin/material-type-icon"
import { getDiscipline } from "@/lib/mock-data"
import type { Course, Material } from "@/lib/types"

export function MaterialsBrowser({ courses, materials }: { courses: Course[]; materials: Material[] }) {
  const [courseId, setCourseId] = useState<string>("all")

  const filtered = useMemo(() => {
    if (courseId === "all") return materials
    return materials.filter((m) => m.courseId === courseId)
  }, [materials, courseId])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todos os cursos</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.shortName}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          Novo material
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban />
            </EmptyMedia>
            <EmptyTitle>Nenhum material encontrado</EmptyTitle>
            <EmptyDescription>Ajuste o filtro ou adicione um novo material.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {filtered.map((material) => {
              const discipline = getDiscipline(material.disciplineId)
              const course = courses.find((c) => c.id === material.courseId)
              return (
                <div key={material.id} className="flex items-center gap-3.5 px-4 py-3.5">
                  <MaterialTypeIcon type={material.type} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-foreground">{material.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {discipline?.name} · {course?.shortName}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {materialTypeLabel(material.type)}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
