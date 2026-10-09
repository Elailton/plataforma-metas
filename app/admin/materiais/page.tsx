import { MaterialsBrowser } from "./materials-browser"
import { PageHeader } from "@/components/page-header"
import { listAdminCourses, listMaterials } from "@/lib/admin/queries"
import { listAdminSubjectsForMaterialImport } from "@/lib/admin/material-import-queries"

export default async function AdminMaterialsPage() {
  const [courses, materials, subjects] = await Promise.all([
    listAdminCourses(),
    listMaterials(),
    listAdminSubjectsForMaterialImport(),
  ])

  return (
    <>
      <PageHeader title="Materiais" description="Biblioteca de videoaulas, apostilas e links de apoio." />
      <MaterialsBrowser courses={courses} materials={materials} subjects={subjects} />
    </>
  )
}
