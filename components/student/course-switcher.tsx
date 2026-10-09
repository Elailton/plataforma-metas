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
      <span
        className={cn("block truncate font-medium text-foreground", compact ? "text-xs" : "text-sm")}
        title={currentCourse.name}
      >
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
          "w-full truncate rounded-lg border border-border bg-background px-2.5 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "h-8 text-xs" : "h-9 text-sm",
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
