import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Users } from "lucide-react"
import type { AdminStudent } from "@/lib/admin/types"

export function CourseStudentsTable({ students }: { students: AdminStudent[] }) {
  if (students.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>Nenhum aluno matriculado</EmptyTitle>
          <EmptyDescription>Os alunos aparecerão aqui após se matricularem neste curso.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Aluno</TableHead>
          <TableHead>Status</TableHead>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
