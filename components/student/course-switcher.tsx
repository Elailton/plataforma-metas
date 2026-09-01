"use client"

import { selectStudentCourse } from "@/lib/student/actions"
import type { StudentCourse } from "@/lib/student/types"
import { cn } from "@/lib/utils"

export function CourseSwitcher({
  courses,
  currentCourseId,
  compact = false,
}: {
  courses: StudentCourse[]
  currentCourseId: string
  compact?: boolean
}) {
  const currentCourse = courses.find((course) => course.id === currentCourseId) ?? courses[0]

  if (courses.length === 1) {
    return (
      <span className={cn("truncate text-xs font-medium", compact ? "max-w-28" : "max-w-44")}>
        {currentCourse.name}
      </span>
    )
  }

  return (
    <form action={selectStudentCourse}>
      <select
        name="courseId"
        value={currentCourseId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        aria-label="Curso atual"
        className={cn(
          "h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground",
          compact ? "max-w-32" : "w-full max-w-48",
        )}
      >
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name}
          </option>
        ))}
      </select>
    </form>
  )
}

