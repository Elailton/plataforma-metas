import Link from "next/link"
import { GraduationCap, Users, ListChecks, ArrowRight } from "lucide-react"
import { PageHeader, SectionHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { CourseCard } from "@/components/admin/course-card"
import { countActiveStudents, listAdminCourses } from "@/lib/admin/queries"

export default async function AdminDashboardPage() {
  const [courses, totalStudents] = await Promise.all([listAdminCourses(), countActiveStudents()])

  const totalGoals = courses.reduce((sum, c) => sum + c.goalsCount, 0)
  const publishedCourses = courses.filter((c) => c.status === "published").length
  const orderedCourses = [...courses].sort(
    (a, b) => Number(b.status === "published") - Number(a.status === "published"),
  )

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral de todos os cursos da plataforma." />

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 md:mb-10 md:gap-4">
        <StatCard label="Cursos publicados" value={publishedCourses} suffix={`de ${courses.length}`} icon={GraduationCap} />
        <StatCard label="Alunos ativos" value={totalStudents} icon={Users} />
        <StatCard label="Metas cadastradas" value={totalGoals} icon={ListChecks} />
      </div>

      <section aria-labelledby="cursos-dashboard">
        <SectionHeader
          title={<span id="cursos-dashboard">Cursos</span>}
          action={
            <Link
              href="/admin/cursos"
              className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver todos
              <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {orderedCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </>
  )
}
