import { requireStudentFeature } from "@/lib/student/experience"

export default async function RetaFinalLayout({ children }: { children: React.ReactNode }) {
  await requireStudentFeature("reta_final")
  return children
}
