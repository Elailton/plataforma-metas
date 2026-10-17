import Image from "next/image"
import { BRAND_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  className?: string
  [key: string]: any
}

export function BrandLogo({ className = "", ...props }: BrandLogoProps) {
  return (
    <Image
      src="/brand/sga-transparent.png"
      alt={BRAND_NAME}
      width={192}
      height={80}
      className={cn("object-contain", className)}
      priority
      unoptimized
      {...props}
    />
  )
}

/** Logotipo com o nome da plataforma, usado nas barras laterais e telas de acesso. */
export function BrandLockup({
  subtitle,
  className,
  size = "sm",
}: {
  subtitle?: string
  className?: string
  size?: "sm" | "lg"
}) {
  return (
    <div className={cn("flex min-w-0 items-center", size === "lg" ? "gap-3" : "gap-2.5", className)}>
      <BrandLogo className={cn("shrink-0", size === "lg" ? "h-10 w-24" : "h-7 w-16")} alt="" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <span
          className={cn(
            "font-semibold leading-tight tracking-tight text-foreground",
            size === "lg" ? "text-lg" : "text-[13px]",
          )}
        >
          {BRAND_NAME}
        </span>
        {subtitle ? (
          <span className={cn("leading-tight text-muted-foreground", size === "lg" ? "text-sm" : "text-[11px]")}>
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  )
}
