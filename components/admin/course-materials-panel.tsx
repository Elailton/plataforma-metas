"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import type { AdminMaterial, AdminSubject } from "@/lib/admin/types"

export function CourseMaterialsPanel({
  courseId,
  materials,
  subjects,
}: {
  courseId: string
  materials: AdminMaterial[]
  subjects: AdminSubject[]
}) {
  const router = useRouter()

  async function handleDelete(materialId: string) {
    try {
      await deleteMaterial(materialId, courseId)
      toast.success("Material removido")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover o material.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <MaterialFormDialog fixedCourseId={courseId} subjects={subjects} />
      </div>

      {materials.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {materials.map((material) => {
              const subject = subjects.find((s) => s.id === material.subjectId)
              return (
                <div key={material.id} className="flex items-center gap-3.5 px-4 py-3.5">
                  <MaterialTypeIcon type={material.type} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-foreground">{material.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {subject ? `${subject.name} · ` : ""}
                      {materialTypeLabel(material.type)}
                    </span>
                  </div>
                  <MaterialFormDialog
                    material={material}
                    fixedCourseId={courseId}
                    subjects={subjects}
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
                        <AlertDialogAction onClick={() => handleDelete(material.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
