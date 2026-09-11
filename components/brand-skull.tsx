import Image from "next/image"
import type { ImgHTMLAttributes } from "react"

interface BrandSkullProps extends ImgHTMLAttributes<HTMLImageElement> {
  className?: string
}

export function BrandSkull({ className = "", ...props }: BrandSkullProps) {
  return (
    <Image
      src="/logo-el-branca-transparente.png"
      alt="Mentoria Imparáveis"
      width={32}
      height={32}
      className={className}
      priority
      {...props}
    />
  )
}
