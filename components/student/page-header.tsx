import type React from "react"
import { PageHeader as SharedPageHeader } from "@/components/page-header"

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  action,
}: {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  action?: React.ReactNode
}) {
  return (
    <SharedPageHeader
      title={title}
      description={description}
      backHref={backHref}
      backLabel={backLabel}
      badge={action}
      className="md:items-start"
    />
  )
}
