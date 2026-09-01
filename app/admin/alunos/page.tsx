import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Users } from "lucide-react"
import { listAdminCourses, listAllStudents } from "@/lib/admin/queries"

export default async function AdminStudentsPage() {
  const [students, courses] = await Promise.all([listAllStudents(), listAdminCourses()])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Alunos</h1>
        <p className="text-sm text-muted-foreground">Todos os alunos matriculados nos cursos da plataforma.</p>
      </div>

      <Card>
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
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const course = courses.find((c) => c.id === student.courseId)
                  return (
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
                        {course ? <Badge variant="secondary">{course.name}</Badge> : <span className="text-muted-foreground">—</span>}
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
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
