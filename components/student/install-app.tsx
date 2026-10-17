"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronRight, Download, Share, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type InstallPrompt = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}
type InstallState = {
  ready: boolean
  installed: boolean
  dismissed: boolean
  busy: boolean
  install(): Promise<void>
  dismiss(): void
}
const InstallContext = createContext<InstallState | null>(null)
const DISMISS_KEY = "sga-install-dismissed-until"
const WEEK = 7 * 24 * 60 * 60 * 1000

export function InstallAppProvider({ children }: { children: ReactNode }) {
  const prompt = useRef<InstallPrompt | null>(null)
  const [ready, setReady] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)")
    const checkInstalled = () => setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    checkInstalled()
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
    try { setDismissed(Number(localStorage.getItem(DISMISS_KEY)) > Date.now()) } catch { /* Armazenamento pode estar indisponível. */ }
    const beforeInstall = (event: Event) => {
      event.preventDefault()
      prompt.current = event as InstallPrompt
    }
    const appInstalled = () => {
      prompt.current = null
      setInstalled(true)
      setHelp(false)
    }
    window.addEventListener("beforeinstallprompt", beforeInstall)
    window.addEventListener("appinstalled", appInstalled)
    display.addEventListener("change", checkInstalled)
    setReady(true)
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall)
      window.removeEventListener("appinstalled", appInstalled)
      display.removeEventListener("change", checkInstalled)
    }
  }, [])

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + WEEK)) } catch { /* A dispensa vale nesta sessão. */ }
  }

  async function install() {
    if (busy) return
    const pending = prompt.current
    if (!pending) { setHelp(true); return }
    // O evento só pode ser usado uma vez, mesmo quando a instalação é recusada.
    prompt.current = null
    setBusy(true)
    try {
      await pending.prompt()
      const choice = await pending.userChoice
      if (choice.outcome === "accepted") setDismissed(true)
    } catch {
      setHelp(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <InstallContext.Provider value={{ ready, installed, dismissed, busy, install, dismiss }}>
      {children}
      <Dialog open={help && !installed} onOpenChange={setHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar o SGA</DialogTitle>
            <DialogDescription>Coloque o SGA na sua tela inicial para acessar seus estudos com facilidade.</DialogDescription>
          </DialogHeader>
          {ios ? (
            <ol className="list-decimal space-y-3 pl-5 text-sm">
              <li>Abra esta plataforma no Safari.</li>
              <li>Toque em <Share className="inline size-4" aria-hidden="true" /> Compartilhar.</li>
              <li>Escolha “Adicionar à Tela de Início” e confirme em “Adicionar”.</li>
            </ol>
          ) : (
            <div className="space-y-3 text-sm">
              <p>No Chrome ou Edge, abra o menu do navegador e procure “Instalar aplicativo”, “Instalar página como app” ou “Adicionar à tela inicial”. O nome varia conforme o dispositivo.</p>
              <p>Se a opção não aparecer, abra a plataforma diretamente no Chrome ou Edge atualizado, fora do navegador do WhatsApp ou Instagram.</p>
              <p>Se já estiver instalado, abra o SGA pelo ícone na sua tela inicial ou na lista de aplicativos.</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Seu acesso continua o mesmo. É necessário ter internet para consultar metas e materiais.</p>
          <Button onClick={() => setHelp(false)}>Entendi</Button>
        </DialogContent>
      </Dialog>
    </InstallContext.Provider>
  )
}

export function InstallApp({ variant = "banner" }: { variant?: "banner" | "account" }) {
  const state = useContext(InstallContext)
  if (!state?.ready || state.installed || (variant === "banner" && state.dismissed)) return null
  if (variant === "account") return (
    <section className="mb-8 rounded-xl border border-border bg-card p-4 md:p-5" aria-label="Aplicativo SGA">
      <button type="button" onClick={state.install} disabled={state.busy} className="flex min-h-12 w-full items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
        <Download className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex-1"><span className="block text-sm font-semibold">Instalar aplicativo</span><span className="block text-sm text-muted-foreground">Tenha o SGA na sua tela inicial.</span></span>
        <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
      </button>
    </section>
  )
  return (
    <aside className="mb-6 flex flex-col gap-4 rounded-xl border border-primary/25 bg-card p-4 sm:flex-row sm:items-center" aria-label="Instalar aplicativo">
      <Smartphone className="size-6 shrink-0 text-primary" aria-hidden="true" />
      <div className="flex-1"><p className="text-sm font-semibold">Tenha o SGA na sua tela inicial</p><p className="text-sm text-muted-foreground">Acesse suas metas pelo ícone do aplicativo.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={state.install} disabled={state.busy}>{state.busy ? "Aguarde..." : "Instalar"}</Button>
        <Button type="button" variant="ghost" onClick={state.dismiss}>Agora não</Button>
      </div>
    </aside>
  )
}
