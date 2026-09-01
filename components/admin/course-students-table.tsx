"use client"

import { FormEvent, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import type { AdminStudent } from "@/lib/admin/types"
import { enrollExistingStudent, setEnrollmentStatus } from "@/lib/admin/actions/enrollments"

export function CourseStudentsTable({ courseId, students }: { courseId: string; students: AdminStudent[] }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [pending, startTransition] = useTransition()

  function handleEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      try {
        await enrollExistingStudent(courseId, email)
        setEmail("")
        toast.success("Aluno matriculado e acesso liberado.")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível matricular o aluno.")
      }
    })
  }

  function handleStatus(enrollmentId: string, status: "active" | "suspended" | "revoked") {
    startTransition(async () => {
      try {
        await setEnrollmentStatus(enrollmentId, courseId, status)
        toast.success(status === "active" ? "Acesso liberado." : "Acesso removido do aplicativo.")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível alterar a matrícula.")
      }
    })
  }

  return (
    <div className="flex flex-col">
      <form onSubmit={handleEnrollment} className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
        <div className="flex-1">
          <Input
            type="email"
            placeholder="E-mail do aluno de teste"
            aria-label="E-mail do aluno"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={pending}>
          <UserPlus data-icon="inline-start" />
          Liberar acesso
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
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Acesso</TableHead>
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
                {student.enrollmentStatus === "active"
                  ? "Ativa"
                  : student.enrollmentStatus === "suspended"
                    ? "Suspensa"
                    : "Revogada"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={student.enrollmentStatus}
                disabled={pending}
                onChange={(event) =>
                  handleStatus(
                    student.id,
                    event.target.value as "active" | "suspended" | "revoked",
                  )
                }
                aria-label={`Acesso de ${student.fullName}`}
              >
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
                <option value="revoked">Revogado</option>
              </select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
      )}
    </div>
  )
}
