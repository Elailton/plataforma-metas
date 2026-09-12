import { MaterialsBrowser } from "./materials-browser"
import { listAdminCourses, listMaterials } from "@/lib/admin/queries"
import { listAdminSubjectsForMaterialImport } from "@/lib/admin/material-import-queries"

export default async function AdminMaterialsPage() {
  const [courses, materials, subjects] = await Promise.all([
    listAdminCourses(),
    listMaterials(),
    listAdminSubjectsForMaterialImport(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Materiais</h1>
        <p className="text-sm text-muted-foreground">Biblioteca de videoaulas, apostilas e links de apoio.</p>
      </div>

      <MaterialsBrowser courses={courses} materials={materials} subjects={subjects} />
    </div>
  )
}
