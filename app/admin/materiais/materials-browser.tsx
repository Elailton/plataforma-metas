"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FolderKanban, Trash2 } from "lucide-react"
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
import { deleteMaterial } from "@/lib/admin/actions/materials"
import type { AdminCourse, AdminMaterial } from "@/lib/admin/types"

export function MaterialsBrowser({ courses, materials }: { courses: AdminCourse[]; materials: AdminMaterial[] }) {
  const router = useRouter()
  const [courseId, setCourseId] = useState<string>("all")
  const courseSelectItems = [
    { label: "Todos os cursos", value: "all" },
    ...courses.map((course) => ({ label: course.name, value: course.id })),
  ]

  const filtered = useMemo(() => {
    if (courseId === "all") return materials
    return materials.filter((m) => m.courseId === courseId)
  }, [materials, courseId])

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
      <div className="flex items-center justify-between gap-3">
        <Select items={courseSelectItems} value={courseId} onValueChange={(value) => setCourseId(value ?? "all")}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {courseSelectItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <MaterialFormDialog courses={courses.map((c) => ({ id: c.id, name: c.name }))} />
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
              const course = courses.find((c) => c.id === material.courseId)
              return (
                <div key={material.id} className="flex items-center gap-3.5 px-4 py-3.5">
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
                    courses={courses.map((c) => ({ id: c.id, name: c.name }))}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
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
                        <AlertDialogAction onClick={() => handleDelete(material.id, material.courseId)}>
                          Remover
                        </AlertDialogAction>
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
