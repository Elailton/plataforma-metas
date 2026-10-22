import type React from "react"
import { requireStudentFeature } from "@/lib/student/experience"

/** Aba que o administrador pode desligar por grupo. */
export default async function FeatureLayout({ children }: { children: React.ReactNode }) {
  await requireStudentFeature("metas")
  return <>{children}</>
}
