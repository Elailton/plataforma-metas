import Image from "next/image"

interface BrandSkullProps {
  className?: string
  [key: string]: any
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
      unoptimized
    />
  )
}
