import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Users } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { listAdminCourses, listAllStudents } from "@/lib/admin/queries"
import { StudentsBrowser } from "./students-browser"

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
            <StudentsBrowser students={students} courses={courses} />
          )}
        </CardContent>
      </Card>
    </>
  )
}
