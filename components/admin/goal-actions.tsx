"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Copy, Send, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { deleteGoal, duplicateGoal, setGoalStatus } from "@/lib/admin/actions/goals"
import type { AdminGoal } from "@/lib/admin/types"

export function GoalActions({ goal }: { goal: AdminGoal }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleToggleStatus() {
    setPending(true)
    try {
      const nextStatus = goal.status === "published" ? "draft" : "published"
      await setGoalStatus(goal.id, goal.courseId, nextStatus)
      toast.success(nextStatus === "published" ? "Meta publicada" : "Meta despublicada")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a meta.")
    } finally {
      setPending(false)
    }
  }

  async function handleDuplicate() {
    setPending(true)
    try {
      const newGoalId = await duplicateGoal(goal.id, goal.courseId)
      toast.success("Meta duplicada como rascunho")
      router.push(`/admin/cursos/${goal.courseId}/metas/${newGoalId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível duplicar a meta.")
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    setPending(true)
    try {
      await deleteGoal(goal.id, goal.courseId)
      toast.success("Meta excluída")
      router.push(`/admin/cursos/${goal.courseId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir a meta.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
        <Badge variant={goal.status === "published" ? "default" : "secondary"}>
          {goal.status === "published" ? "Publicada" : "Rascunho"}
        </Badge>
        <Switch
          checked={goal.status === "published"}
          onCheckedChange={handleToggleStatus}
          disabled={pending}
          aria-label="Publicar meta"
        />
      </div>
      <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={pending}>
        <Copy data-icon="inline-start" />
        Duplicar
      </Button>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
          <Trash2 data-icon="inline-start" />
          Excluir
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens e vínculos de materiais desta meta serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
