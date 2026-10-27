"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { releaseInstant } from "@/lib/goals/release.mjs"
import { releaseRefreshDelay } from "@/lib/goals/release-refresh.mjs"

/**
 * Atualiza a tela quando a próxima meta é liberada.
 *
 * Todos os alunos com a aba aberta chegariam ao mesmo instante da liberação
 * (meia-noite). Para não concentrar todas as recargas no mesmo segundo, cada aba
 * espera um intervalo aleatório de até 90 s depois da liberação. Ao voltar para a
 * aba, só recarrega se a liberação já passou; antes disso apenas reagenda o timer.
 */
export function GoalReleaseRefresh({ releaseDate, released }: { releaseDate: string | null; released: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!releaseDate || released) return
    const releaseAt = releaseInstant(releaseDate).getTime()
    const jitter = Math.random()
    let timer: number | undefined
    let refreshed = false

    const refresh = () => {
      if (refreshed) return
      refreshed = true
      router.refresh()
    }
    const schedule = () => {
      if (timer) window.clearTimeout(timer)
      const delay = releaseRefreshDelay(releaseAt, Date.now(), jitter)
      // setTimeout aceita no máximo ~24,8 dias; reagenda até chegar a hora.
      timer = window.setTimeout(() => {
        if (Date.now() >= releaseAt) refresh()
        else schedule()
      }, Math.min(delay, 2_147_483_647))
    }
    const onReturn = () => {
      if (document.visibilityState === "hidden") return
      // Timers podem atrasar com a aba em segundo plano: reagenda com o relógio atual.
      schedule()
    }

    schedule()
    window.addEventListener("focus", onReturn)
    window.addEventListener("online", onReturn)
    document.addEventListener("visibilitychange", onReturn)
    return () => {
      if (timer) window.clearTimeout(timer)
      window.removeEventListener("focus", onReturn)
      window.removeEventListener("online", onReturn)
      document.removeEventListener("visibilitychange", onReturn)
    }
  }, [releaseDate, released, router])

  return null
}
