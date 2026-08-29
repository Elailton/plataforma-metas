import { PlayCircle, FileText, Link2 } from "lucide-react"
import type { AdminMaterialType } from "@/lib/admin/types"

const config: Record<AdminMaterialType, { icon: typeof PlayCircle; label: string; className: string }> = {
  videoaula: { icon: PlayCircle, label: "Videoaula", className: "bg-primary/10 text-primary" },
  apostila: { icon: FileText, label: "Apostila", className: "bg-accent/20 text-accent-foreground" },
  link: { icon: Link2, label: "Link", className: "bg-success/15 text-success" },
}

export function MaterialTypeIcon({ type }: { type: AdminMaterialType }) {
  const { icon: Icon, className } = config[type]
  return (
    <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${className}`}>
      <Icon className="size-4.5" />
    </div>
  )
}

export function materialTypeLabel(type: AdminMaterialType): string {
  return config[type].label
}
