"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Archive, ArchiveRestore, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { setCourseStatus } from "@/lib/admin/actions/courses"
import type { AdminCourse } from "@/lib/admin/types"

export function CourseStatusActions({ course }: { course: AdminCourse }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function changeStatus(status: "draft" | "published" | "archived") {
    setPending(true)
    try {
      await setCourseStatus(course.id, status)
      toast.success(
        status === "archived"
          ? "Curso arquivado"
          : status === "published"
            ? "Curso publicado"
            : "Curso movido para rascunho",
      )
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o status.")
    } finally {
      setPending(false)
    }
  }

  if (course.status === "archived") {
    return (
      <Button variant="outline" disabled={pending} onClick={() => changeStatus("draft")}>
        <ArchiveRestore data-icon="inline-start" />
        Restaurar curso
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {course.status === "draft" ? (
        <Button variant="outline" disabled={pending} onClick={() => changeStatus("published")}>
          <Send data-icon="inline-start" />
          Publicar
        </Button>
      ) : (
        <Button variant="outline" disabled={pending} onClick={() => changeStatus("draft")}>
          Mover para rascunho
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" disabled={pending} />}>
          <Archive data-icon="inline-start" />
          Arquivar
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar este curso?</AlertDialogTitle>
            <AlertDialogDescription>
              O curso deixará de aparecer para os alunos. Você pode restaurá-lo depois, se precisar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => changeStatus("archived")}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
