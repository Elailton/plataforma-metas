import { MaterialsBrowser } from "./materials-browser"
import { courses, materials } from "@/lib/mock-data"

export default function AdminMaterialsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Materiais</h1>
        <p className="text-sm text-muted-foreground">Biblioteca de videoaulas, apostilas e links de apoio.</p>
      </div>

      <MaterialsBrowser courses={courses} materials={materials} />
    </div>
  )
}
