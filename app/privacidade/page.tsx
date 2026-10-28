import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"
import { PRIVACY } from "@/lib/legal/content"

export const metadata: Metadata = { title: "Aviso de Privacidade · SGA" }

export default function PrivacyPage() {
  return <LegalPage document={PRIVACY} other={{ href: "/termos", label: "Termos de uso" }} />
}
