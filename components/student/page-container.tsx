import type React from "react"
import { cn } from "@/lib/utils"

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-8", className)}>{children}</div>
}

export function PageHeading({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description ? <p className="text-pretty text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}
