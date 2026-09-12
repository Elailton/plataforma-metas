"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { releaseInstant } from "@/lib/goals/release.mjs"

export function GoalReleaseRefresh({ releaseDate, released }: { releaseDate: string | null; released: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!releaseDate || released) return
    const refresh = () => router.refresh()
    let timer: number | undefined
    const schedule = () => {
      const remaining = releaseInstant(releaseDate).getTime() - Date.now()
      if (remaining <= 0) {
        refresh()
        return
      }
      timer = window.setTimeout(() => {
        refresh()
        schedule()
      }, Math.min(remaining + 500, 2_147_483_647))
    }
    schedule()
    const onVisibility = () => { if (document.visibilityState === "visible") refresh() }
    window.addEventListener("focus", refresh)
    window.addEventListener("online", refresh)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      if (timer) window.clearTimeout(timer)
      window.removeEventListener("focus", refresh)
      window.removeEventListener("online", refresh)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [releaseDate, released, router])

  return null
}
