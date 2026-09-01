import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function PageHeader({
  title,
  description,
  backHref,
  action,
}: {
  title: string
  description?: string
  backHref?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {backHref ? (
          <Button
            render={<Link href={backHref} aria-label="Voltar" />}
            nativeButton={false}
            variant="ghost"
            size="icon"
            className="-ml-2 shrink-0"
          >
            <ArrowLeft />
          </Button>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
