import Image from "next/image"
import { cn } from "@/lib/utils"

export function BrandLogo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/images/brand-logo.png"
      alt="Mentoria Imparáveis"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      priority
    />
  )
}
