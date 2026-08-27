import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getStudentsByCourse } from "@/lib/mock-data"
import { formatDate } from "@/lib/format"

export function CourseStudentsTable({ courseId }: { courseId: string }) {
  const students = getStudentsByCourse(courseId)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Aluno</TableHead>
          <TableHead>E-mail</TableHead>
          <TableHead className="text-right">Matriculado em</TableHead>
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
                <span className="font-medium text-foreground">{student.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{student.email}</TableCell>
            <TableCell className="text-right text-muted-foreground">{formatDate(student.joinedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
