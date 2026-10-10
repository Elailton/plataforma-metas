"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FolderKanban, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MaterialTypeIcon, materialTypeLabel } from "@/components/admin/material-type-icon"
import { MaterialFormDialog } from "@/components/admin/material-form-dialog"
import { MaterialImportDialog } from "@/components/admin/material-import-dialog"
import { SearchInput } from "@/components/search-input"
import { deleteMaterial } from "@/lib/admin/actions/materials"
import { filterBySearch } from "@/lib/search.mjs"
import type { AdminCourse, AdminMaterial, AdminSubject } from "@/lib/admin/types"

export function MaterialsBrowser({
  courses,
  materials,
  subjects,
}: {
  courses: AdminCourse[]
  materials: AdminMaterial[]
  subjects: AdminSubject[]
}) {
  const router = useRouter()
  const [courseId, setCourseId] = useState<string>("all")
  const [query, setQuery] = useState("")
  const courseSelectItems = [
    { label: "Todos os cursos", value: "all" },
    ...courses.map((course) => ({ label: course.name, value: course.id })),
  ]

  const filtered = useMemo(() => {
    const byCourse =
      courseId === "all"
        ? materials
        : materials.filter((material) => material.courseId === courseId)
    const courseNames = new Map(courses.map((course) => [course.id, course.name]))
    const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]))
    return filterBySearch(byCourse, query, (material) => [
      material.title,
      material.description,
      materialTypeLabel(material.type),
      material.subjectId ? subjectNames.get(material.subjectId) : null,
      material.courseId ? courseNames.get(material.courseId) : "Biblioteca geral",
    ])
  }, [materials, courseId, query, courses, subjects])

  async function handleDelete(materialId: string, materialCourseId: string | null) {
    try {
      await deleteMaterial(materialId, materialCourseId)
      toast.success("Material removido")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover o material.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-2xl">
        <Select items={courseSelectItems} value={courseId} onValueChange={(value) => setCourseId(value ?? "all")}>
          <SelectTrigger className="w-full sm:w-64" aria-label="Filtrar por curso"><SelectValue placeholder="Filtrar por curso" /></SelectTrigger>
          <SelectContent><SelectGroup>
            {courseSelectItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectGroup></SelectContent>
        </Select>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Pesquisar por título, disciplina ou tipo"
          label="Pesquisar materiais"
        />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs tabular-nums text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "material" : "materiais"}
          </span>
          <MaterialImportDialog courses={courses} subjects={subjects} />
          <MaterialFormDialog courses={courses.map((course) => ({ id: course.id, name: course.name }))} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><FolderKanban /></EmptyMedia>
            <EmptyTitle>Nenhum material encontrado</EmptyTitle>
            <EmptyDescription>Ajuste a pesquisa ou o filtro, ou adicione um novo material.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {filtered.map((material) => {
              const course = courses.find((candidate) => candidate.id === material.courseId)
              return (
                <div key={material.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/30 md:gap-3.5">
                  <MaterialTypeIcon type={material.type} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-foreground">{material.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {course ? `${course.name} · ` : "Biblioteca geral · "}
                      {materialTypeLabel(material.type)}
                    </span>
                  </div>
                  <MaterialFormDialog
                    material={material}
                    courses={courses.map((candidate) => ({ id: candidate.id, name: candidate.name }))}
                    trigger={<Button variant="ghost" size="sm">Editar</Button>}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Remover material" />}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover {material.title}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Este material deixará de estar disponível para uso em metas. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(material.id, material.courseId)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
