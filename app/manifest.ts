import type { MetadataRoute } from "next"
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: "SGA",
    description: BRAND_TAGLINE,
    id: "/",
    start_url: "/aluno",
    scope: "/",
    display: "standalone",
    lang: "pt-BR",
    background_color: "#131417",
    theme_color: "#181718",
    icons: [
      { src: "/brand/sga-dark-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/sga-dark-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
