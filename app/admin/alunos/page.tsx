import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Users } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { listAdminCourses, listAllStudents } from "@/lib/admin/queries"

export default async function AdminStudentsPage() {
  const [students, courses] = await Promise.all([listAllStudents(), listAdminCourses()])

  return (
    <>
      <PageHeader
        title="Alunos"
        description="Todos os alunos matriculados nos cursos da plataforma."
        badge={
          students.length > 0 ? (
            <Badge variant="secondary" className="tabular-nums">
              {students.length} {students.length === 1 ? "matrícula" : "matrículas"}
            </Badge>
          ) : null
        }
      />

      <Card className="py-0">
        <CardContent className="p-0">
          {students.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>Nenhum aluno matriculado</EmptyTitle>
                <EmptyDescription>Os alunos aparecerão aqui após se matricularem em um curso.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 px-4">Aluno</TableHead>
                  <TableHead className="h-11 px-4">Curso</TableHead>
                  <TableHead className="h-11 px-4 text-right">Matrícula</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const course = courses.find((c) => c.id === student.courseId)
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                              {student.avatarInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{student.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {course ? <Badge variant="secondary">{course.name}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Badge variant={student.enrollmentStatus === "active" ? "default" : "secondary"}>
                          {student.enrollmentStatus === "active"
                            ? "Ativa"
                            : student.enrollmentStatus === "suspended"
                              ? "Suspensa"
                              : "Revogada"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
