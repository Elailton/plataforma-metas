"use client"

import { FormEvent, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { SearchInput } from "@/components/search-input"
import { setStudentGroup } from "@/lib/admin/actions/groups"
import { filterBySearch } from "@/lib/search.mjs"
import type { AdminCourseStudent } from "@/lib/admin/types"
import {
  enrollExistingStudent,
  setEnrollmentStatus,
  setCourseAccessBlock,
  createStudentAccessLink,
} from "@/lib/admin/actions/enrollments"

export function CourseStudentsTable({
  courseId,
  students,
}: {
  courseId: string
  students: AdminCourseStudent[]
}) {
  const router = useRouter()
  const [groupFilter, setGroupFilter] = useState("all")
  const [query, setQuery] = useState("")
  const visibleStudents = useMemo(
    () =>
      filterBySearch(
        students.filter(
          (s) =>
            groupFilter === "all" ||
            (groupFilter === "none"
              ? s.studyGroup == null
              : s.studyGroup === Number(groupFilter)),
        ),
        query,
        (student) => [student.fullName, student.email],
      ),
    [students, groupFilter, query],
  )
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [pending, startTransition] = useTransition()
  const [blockTarget, setBlockTarget] = useState<AdminCourseStudent | null>(
    null,
  )
  const [reason, setReason] = useState("")
  const [accessLink, setAccessLink] = useState<{
    name: string
    link: string
  } | null>(null)

  function handleAccessLink(student: AdminCourseStudent) {
    startTransition(async () => {
      try {
        const result = await createStudentAccessLink(student.id, courseId)
        setAccessLink({ name: student.fullName, link: result.link })
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível gerar o link de acesso.",
        )
      }
    })
  }

  async function copyAccessLink() {
    if (!accessLink) return
    try {
      await navigator.clipboard.writeText(accessLink.link)
      toast.success("Link copiado. Cole na conversa com o aluno.")
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.")
    }
  }

  function handleEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      try {
        const result = await enrollExistingStudent(courseId, email, fullName)
        setEmail("")
        setFullName("")
        if (result.emailWarning) toast.warning(result.message)
        else toast.success(result.message)
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível matricular o aluno.",
        )
      }
    })
  }

  function handleStatus(
    enrollmentId: string,
    status: "active" | "suspended" | "revoked",
  ) {
    startTransition(async () => {
      try {
        const result = await setEnrollmentStatus(enrollmentId, courseId, status)
        toast.success(result.message)
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível alterar a matrícula.",
        )
      }
    })
  }

  function handleBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!blockTarget) return
    startTransition(async () => {
      try {
        const result = await setCourseAccessBlock(
          blockTarget.id,
          courseId,
          !blockTarget.accessBlock,
          reason,
        )
        toast.success(result.message)
        setBlockTarget(null)
        setReason("")
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível alterar o bloqueio.",
        )
      }
    })
  }

  return (
    <div className="flex flex-col">
      <p className="border-b border-border p-4 text-sm text-muted-foreground">
        O acesso pode vir de uma compra Hotmart ou de uma concessão manual.
        Suspender ou revogar a concessão manual não cancela compras. Para
        impedir todas as formas de acesso a este curso, use o bloqueio
        administrativo. Suspenso é uma pausa; revogado encerra a concessão.
      </p>
      <form
        onSubmit={handleEnrollment}
        className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <Input
            type="text"
            placeholder="Nome (necessário para uma conta nova)"
            aria-label="Nome do aluno"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>
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

      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        {students.length > 0 ? (
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Pesquisar aluno pelo nome"
            label="Pesquisar aluno"
            className="sm:max-w-xs"
          />
        ) : null}
        <label htmlFor="group-filter">Filtrar grupo</label>
        <select
          id="group-filter"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded border p-2"
        >
          <option value="all">Todos ({students.length})</option>
          <option value="1">
            Grupo 1 ({students.filter((s) => s.studyGroup === 1).length})
          </option>
          <option value="2">
            Grupo 2 ({students.filter((s) => s.studyGroup === 2).length})
          </option>
          <option value="3">
            Grupo 3 · teste ({students.filter((s) => s.studyGroup === 3).length})
          </option>
          <option value="none">
            Sem grupo ({students.filter((s) => s.studyGroup == null).length})
          </option>
        </select>
      </div>
      {students.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>Nenhum aluno matriculado</EmptyTitle>
            <EmptyDescription>
              Os alunos aparecerão aqui após se matricularem neste curso.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Grupo e respostas</TableHead>
              <TableHead>Acesso efetivo</TableHead>
              <TableHead>Compras Hotmart</TableHead>
              <TableHead>Concessão manual</TableHead>
              <TableHead className="text-right">
                Bloqueio administrativo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleStudents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhum aluno encontrado com esta pesquisa e filtro.
                </TableCell>
              </TableRow>
            ) : null}
            {visibleStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                          {student.avatarInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">
                        {student.fullName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-80 whitespace-normal">
                    <select
                      aria-label={`Grupo de ${student.fullName}`}
                      value={student.studyGroup === 3 ? `3-${student.mirrorGroup ?? 1}` : student.studyGroup ?? "none"}
                      disabled={pending}
                      className="rounded border p-2"
                      onChange={(event) => {
                        const value = event.target.value
                        const [group, mirror] = value.split("-")
                        startTransition(async () => {
                          try {
                            await setStudentGroup(
                              student.id,
                              courseId,
                              value === "none" ? null : Number(group),
                              mirror ? Number(mirror) : null,
                            )
                            toast.success(
                              "Grupo atualizado; histórico preservado.",
                            )
                            router.refresh()
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Não foi possível alterar o grupo",
                            )
                          }
                        })
                      }}
                    >
                      <option value="none">Sem grupo</option>
                      <option value="1">Grupo 1 — até 4h</option>
                      <option value="2">Grupo 2 — mais de 4h</option>
                      <option value="3-1">Grupo 3 · teste (vê o G1 + testes)</option>
                      <option value="3-2">Grupo 3 · teste (vê o G2 + testes)</option>
                    </select>
                    {student.groupManualOverride && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Definido pelo administrador
                      </p>
                    )}
                    {student.questionnaire && (
                      <details className="mt-2 text-xs">
                        <summary>Respostas do formulário</summary>
                        <p>{student.questionnaire.whatsapp}</p>
                        {Object.entries(student.questionnaire.labels).map(
                          ([key, value]) => (
                            <p key={key} className="mt-2">
                              <strong>{key.toUpperCase()}:</strong> {value}
                            </p>
                          ),
                        )}
                      </details>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        student.enrollmentStatus === "active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {student.accessBlock
                        ? "Bloqueado pelo admin"
                        : student.enrollmentStatus === "active"
                          ? "Ativa"
                          : student.enrollmentStatus === "suspended"
                            ? "Suspensa"
                            : "Revogada"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{student.hotmartActiveCount} ativa(s)</div>
                    <div>
                      {student.hotmartSuspendedCount} suspensa(s) ·{" "}
                      {student.hotmartRevokedCount} revogada(s)
                    </div>
                  </TableCell>
                  <TableCell>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={student.manualStatus ?? "none"}
                      disabled={pending}
                      onChange={(event) =>
                        handleStatus(
                          student.id,
                          event.target.value as
                            | "active"
                            | "suspended"
                            | "revoked",
                        )
                      }
                      aria-label={`Concessão manual de ${student.fullName}`}
                    >
                      <option value="none" disabled>
                        Sem concessão manual
                      </option>
                      <option value="active">Ativo</option>
                      <option value="suspended">Suspenso</option>
                      <option value="revoked">Revogado</option>
                    </select>
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal text-right">
                    {student.enrollmentStatus === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mb-2"
                        disabled={pending}
                        aria-label={`Gerar link de acesso de ${student.fullName}`}
                        onClick={() => handleAccessLink(student)}
                      >
                        Copiar link de acesso
                      </Button>
                    )}{" "}
                    <Button
                      size="sm"
                      variant={student.accessBlock ? "outline" : "destructive"}
                      disabled={pending}
                      aria-label={`${student.accessBlock ? "Desbloquear" : "Bloquear"} ${student.fullName} neste curso`}
                      onClick={() => {
                        setReason("")
                        setBlockTarget(student)
                      }}
                    >
                      {student.accessBlock
                        ? "Desbloquear"
                        : "Bloquear neste curso"}
                    </Button>
                    {student.accessBlock && (
                      <div className="mt-2 break-words text-xs text-muted-foreground">
                        <p>{student.accessBlock.reason}</p>
                        <p>
                          {student.accessBlock.blockedByName} ·{" "}
                          {new Date(
                            student.accessBlock.blockedAt,
                          ).toLocaleString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                          })}{" "}
                          (Brasília)
                        </p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}
      <Dialog
        open={Boolean(accessLink)}
        onOpenChange={(open) => {
          if (!open) setAccessLink(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de acesso</DialogTitle>
            <DialogDescription>
              {accessLink?.name}. Envie este link só para o próprio aluno (por
              exemplo, no WhatsApp). Ao abrir, ele toca em &quot;Continuar&quot;,
              cria a senha e entra. O link funciona uma única vez, expira em
              algumas horas e substitui os links enviados antes por e-mail.
            </DialogDescription>
          </DialogHeader>
          <Input
            readOnly
            value={accessLink?.link ?? ""}
            aria-label="Link de acesso"
            onFocus={(event) => event.currentTarget.select()}
            className="text-xs"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAccessLink(null)}
            >
              Fechar
            </Button>
            <Button type="button" onClick={copyAccessLink}>
              Copiar link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(blockTarget)}
        onOpenChange={(open) => {
          if (!open && !pending) setBlockTarget(null)
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <form onSubmit={handleBlock} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>
                {blockTarget?.accessBlock
                  ? "Desbloquear neste curso"
                  : "Bloquear neste curso"}
              </DialogTitle>
              <DialogDescription>
                {blockTarget?.fullName}.{" "}
                {blockTarget?.accessBlock
                  ? "O acesso só voltará se houver compra válida ou concessão manual ativa."
                  : "O aluno ficará sem acesso a este curso, mesmo com compra válida. Outros cursos, conta e progresso serão preservados."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="course-block-reason">Motivo administrativo</Label>
              <Textarea
                id="course-block-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                minLength={3}
                maxLength={500}
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                Visível somente aos administradores. Não inclua dados pessoais
                sensíveis. A ação fica registrada com data e responsável.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setBlockTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={blockTarget?.accessBlock ? "default" : "destructive"}
                disabled={pending || reason.trim().length < 3}
              >
                {pending
                  ? "Salvando..."
                  : blockTarget?.accessBlock
                    ? "Confirmar desbloqueio"
                    : "Confirmar bloqueio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
