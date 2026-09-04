"use client"

import { FormEvent, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import type { AdminCourseStudent } from "@/lib/admin/types"
import { enrollExistingStudent, setEnrollmentStatus, setCourseAccessBlock } from "@/lib/admin/actions/enrollments"

export function CourseStudentsTable({ courseId, students }: { courseId: string; students: AdminCourseStudent[] }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [pending, startTransition] = useTransition()
  const [blockTarget, setBlockTarget] = useState<AdminCourseStudent | null>(null)
  const [reason, setReason] = useState("")

  function handleEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      try {
        const result = await enrollExistingStudent(courseId, email)
        setEmail("")
        toast.success(result.message)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível matricular o aluno.")
      }
    })
  }

  function handleStatus(enrollmentId: string, status: "active" | "suspended" | "revoked") {
    startTransition(async () => {
      try {
        const result = await setEnrollmentStatus(enrollmentId, courseId, status)
        toast.success(result.message)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível alterar a matrícula.")
      }
    })
  }

  function handleBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!blockTarget) return
    startTransition(async () => {
      try {
        const result = await setCourseAccessBlock(blockTarget.id, courseId, !blockTarget.accessBlock, reason)
        toast.success(result.message)
        setBlockTarget(null)
        setReason("")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível alterar o bloqueio.")
      }
    })
  }

  return (
    <div className="flex flex-col">
      <p className="border-b border-border p-4 text-sm text-muted-foreground">
        O acesso pode vir de uma compra Hotmart ou de uma concessão manual. Suspender ou revogar
        a concessão manual não cancela compras. Para impedir todas as formas de acesso a este curso,
        use o bloqueio administrativo. Suspenso é uma pausa; revogado encerra a concessão.
      </p>
      <form onSubmit={handleEnrollment} className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
        <div className="flex-1">
          <Input
            type="email"
            placeholder="E-mail de uma conta de aluno existente"
            aria-label="E-mail do aluno"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={pending}>
          <UserPlus data-icon="inline-start" />
          Conceder acesso manual
        </Button>
      </form>

      {students.length === 0 ? (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>Nenhum aluno matriculado</EmptyTitle>
          <EmptyDescription>Os alunos aparecerão aqui após se matricularem neste curso.</EmptyDescription>
        </EmptyHeader>
      </Empty>
      ) : (
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Aluno</TableHead>
          <TableHead>Acesso efetivo</TableHead>
          <TableHead>Compras Hotmart</TableHead>
          <TableHead>Concessão manual</TableHead>
          <TableHead className="text-right">Bloqueio administrativo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => (
          <TableRow key={student.id}>
            <TableCell>
              <div className="flex items-center gap-2.5">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                    {student.avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">{student.fullName}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={student.enrollmentStatus === "active" ? "default" : "secondary"}>
                {student.accessBlock ? "Bloqueado pelo admin" : student.enrollmentStatus === "active"
                  ? "Ativa"
                  : student.enrollmentStatus === "suspended"
                    ? "Suspensa"
                    : "Revogada"}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              <div>{student.hotmartActiveCount} ativa(s)</div>
              <div>{student.hotmartSuspendedCount} suspensa(s) · {student.hotmartRevokedCount} revogada(s)</div>
            </TableCell>
            <TableCell>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={student.manualStatus ?? "none"}
                disabled={pending}
                onChange={(event) =>
                  handleStatus(
                    student.id,
                    event.target.value as "active" | "suspended" | "revoked",
                  )
                }
                aria-label={`Concessão manual de ${student.fullName}`}
              >
                <option value="none" disabled>Sem concessão manual</option>
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
                <option value="revoked">Revogado</option>
              </select>
            </TableCell>
            <TableCell className="max-w-64 whitespace-normal text-right">
              <Button
                size="sm"
                variant={student.accessBlock ? "outline" : "destructive"}
                disabled={pending}
                aria-label={`${student.accessBlock ? "Desbloquear" : "Bloquear"} ${student.fullName} neste curso`}
                onClick={() => { setReason(""); setBlockTarget(student) }}
              >
                {student.accessBlock ? "Desbloquear" : "Bloquear neste curso"}
              </Button>
              {student.accessBlock && (
                <div className="mt-2 break-words text-xs text-muted-foreground">
                  <p>{student.accessBlock.reason}</p>
                  <p>{student.accessBlock.blockedByName} · {new Date(student.accessBlock.blockedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Brasília)</p>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
      )}
      <Dialog open={Boolean(blockTarget)} onOpenChange={(open) => { if (!open && !pending) setBlockTarget(null) }}>
        <DialogContent showCloseButton={!pending}>
          <form onSubmit={handleBlock} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{blockTarget?.accessBlock ? "Desbloquear neste curso" : "Bloquear neste curso"}</DialogTitle>
              <DialogDescription>
                {blockTarget?.fullName}. {blockTarget?.accessBlock
                  ? "O acesso só voltará se houver compra válida ou concessão manual ativa."
                  : "O aluno ficará sem acesso a este curso, mesmo com compra válida. Outros cursos, conta e progresso serão preservados."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="course-block-reason">Motivo administrativo</Label>
              <Textarea id="course-block-reason" value={reason} onChange={(event) => setReason(event.target.value)}
                required minLength={3} maxLength={500} disabled={pending} />
              <p className="text-xs text-muted-foreground">Visível somente aos administradores. Não inclua dados pessoais sensíveis. A ação fica registrada com data e responsável.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setBlockTarget(null)}>Cancelar</Button>
              <Button type="submit" variant={blockTarget?.accessBlock ? "default" : "destructive"} disabled={pending || reason.trim().length < 3}>
                {pending ? "Salvando..." : blockTarget?.accessBlock ? "Confirmar desbloqueio" : "Confirmar bloqueio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
