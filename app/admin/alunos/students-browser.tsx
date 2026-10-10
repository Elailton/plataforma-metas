"use client"

import { useMemo, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SearchInput } from "@/components/search-input"
import { filterBySearch } from "@/lib/search.mjs"
import type { AdminCourse, AdminStudent } from "@/lib/admin/types"

function statusLabel(status: AdminStudent["enrollmentStatus"]) {
  if (status === "active") return "Ativa"
  if (status === "suspended") return "Suspensa"
  return "Revogada"
}

export function StudentsBrowser({
  students,
  courses,
}: {
  students: AdminStudent[]
  courses: AdminCourse[]
}) {
  const [query, setQuery] = useState("")
  const courseNames = useMemo(
    () => new Map(courses.map((course) => [course.id, course.name])),
    [courses],
  )
  const filtered = useMemo(
    () =>
      filterBySearch(students, query, (student) => [
        student.fullName,
        student.email,
        courseNames.get(student.courseId),
        statusLabel(student.enrollmentStatus),
      ]),
    [students, query, courseNames],
  )

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Pesquisar por nome, curso ou situação"
          label="Pesquisar alunos"
          className="sm:max-w-md"
        />
        {query ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {filtered.length} de {students.length}
          </span>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-11 px-4">Aluno</TableHead>
            <TableHead className="h-11 px-4">Curso</TableHead>
            <TableHead className="h-11 px-4 text-right">Matrícula</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                Nenhum aluno encontrado para “{query.trim()}”.
              </TableCell>
            </TableRow>
          ) : null}
          {filtered.map((student) => {
            const courseName = courseNames.get(student.courseId)
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
                  {courseName ? <Badge variant="secondary">{courseName}</Badge> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <Badge variant={student.enrollmentStatus === "active" ? "default" : "secondary"}>
                    {statusLabel(student.enrollmentStatus)}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
