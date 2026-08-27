import { PlayCircle, FileText, Link2 } from "lucide-react"
import type { MaterialType } from "@/lib/types"

const config: Record<MaterialType, { icon: typeof PlayCircle; label: string; className: string }> = {
  videoaula: { icon: PlayCircle, label: "Videoaula", className: "bg-primary/10 text-primary" },
  apostila: { icon: FileText, label: "Apostila", className: "bg-accent/20 text-accent-foreground" },
  link: { icon: Link2, label: "Link", className: "bg-success/15 text-success" },
}

export function MaterialTypeIcon({ type }: { type: MaterialType }) {
  const { icon: Icon, className } = config[type]
  return (
    <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${className}`}>
      <Icon className="size-4.5" />
    </div>
  )
}

export function materialTypeLabel(type: MaterialType): string {
  return config[type].label
}
