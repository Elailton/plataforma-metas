import type React from "react"

/**
 * As páginas do simulado e da correção servem ao Diagnóstico Semanal e ao Simulado Geral:
 * cada página confere a função do grupo pelo tipo do simulado (`requireStudentFeature`).
 */
export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
