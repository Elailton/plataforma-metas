"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ShieldCheck, ShieldAlert, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  addHotmartOfferRule,
  createHotmartProductMapping,
  removeHotmartOfferRule,
  setHotmartOfferPolicy,
  setHotmartProductMappingActive,
} from "@/lib/admin/actions/hotmart"
import { offerConfigurationWarning } from "@/lib/hotmart/offers.mjs"
import type { HotmartEventSummary, HotmartProductMapping } from "@/lib/admin/types"

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível atualizar a integração Hotmart."
}

const EVENT_STATUS_LABEL: Record<string, string> = {
  processed: "Processado",
  ignored: "Ignorado",
  failed: "Falhou",
  processing: "Processando",
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso))
}

export function HotmartIntegrationPanel({
  courseId,
  mappings,
  events = [],
  webhookUrl = null,
}: {
  courseId: string
  mappings: HotmartProductMapping[]
  events?: HotmartEventSummary[]
  webhookUrl?: string | null
}) {
  const router = useRouter()
  const [productId, setProductId] = useState("")
  const [productUcode, setProductUcode] = useState("")
  const [productName, setProductName] = useState("")
  const [pending, setPending] = useState(false)

  async function run(action: () => Promise<void>, success: string) {
    setPending(true)
    try {
      await action()
      toast.success(success)
      router.refresh()
    } catch (error) {
      toast.error(messageFrom(error))
    } finally {
      setPending(false)
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(async () => {
      await createHotmartProductMapping(courseId, {
        hotmartProductId: productId,
        hotmartProductUcode: productUcode,
        hotmartProductName: productName,
      })
      setProductId("")
      setProductUcode("")
      setProductName("")
    }, "Produto Hotmart vinculado.")
  }

  const courseUcodes = new Set(mappings.map((mapping) => mapping.hotmartProductUcode))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">Integração Hotmart</CardTitle>
        <CardDescription>
          Cadastre os produtos que liberam este curso. Copie o campo data.product.ucode do Payload no Teste ou
          Histórico do Webhook; o ID numérico é apenas auxiliar. Quando o mesmo produto tem ofertas com e sem acesso à
          plataforma, ative a regra de ofertas autorizadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="hotmart-product-ucode">Product ucode</Label>
            <Input
              id="hotmart-product-ucode"
              required
              value={productUcode}
              onChange={(event) => setProductUcode(event.target.value)}
              placeholder="UUID informado pela Hotmart"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hotmart-product-id">Product ID</Label>
            <Input
              id="hotmart-product-id"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hotmart-product-name">Nome do produto</Label>
            <Input
              id="hotmart-product-name"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Vincular produto"}
            </Button>
          </div>
        </form>

        {mappings.map((mapping) => (
          <ProductMappingCard
            key={mapping.id}
            courseId={courseId}
            mapping={mapping}
            pending={pending}
            run={run}
          />
        ))}

        <section className="flex flex-col gap-3" aria-labelledby="hotmart-eventos">
          <div className="flex flex-col gap-0.5">
            <h3 id="hotmart-eventos" className="text-sm font-semibold text-foreground">Eventos recentes recebidos</h3>
            <p className="text-xs text-muted-foreground">
              Sem dados pessoais. Use para conferir o ucode do produto e o código da oferta que a Hotmart está enviando.
            </p>
          </div>
          {events.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhum evento recebido ainda.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Produto (ucode)</TableHead>
                    <TableHead>Oferta</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap text-xs">{formatDateTime(event.createdAt)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{event.eventType}</TableCell>
                      <TableCell className="max-w-48 truncate font-mono text-xs">
                        {event.productUcode ?? "—"}
                        {event.productUcode && courseUcodes.has(event.productUcode) ? (
                          <Badge variant="secondary" className="ml-2">este curso</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{event.offerCode ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium">{EVENT_STATUS_LABEL[event.status] ?? event.status}</span>
                        {event.message ? <span className="block text-muted-foreground">{event.message}</span> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground">
          Configure {webhookUrl ?? "https://SEU-DOMINIO/api/webhooks/hotmart"} como Webhook 2.0.0 na Hotmart e mantenha
          o HOTTOK apenas nas variáveis server-side.
        </p>
      </CardContent>
    </Card>
  )
}

function ProductMappingCard({
  courseId,
  mapping,
  pending,
  run,
}: {
  courseId: string
  mapping: HotmartProductMapping
  pending: boolean
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  const [offer, setOffer] = useState("")
  const [label, setLabel] = useState("")
  const [grantsAccess, setGrantsAccess] = useState<"yes" | "no">("yes")
  const restricted = mapping.offerPolicy === "authorized_offers"
  const warning = offerConfigurationWarning(mapping.offerPolicy, mapping.offerRules)
  const fieldId = `offer-${mapping.id}`

  async function addOffer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(async () => {
      await addHotmartOfferRule(courseId, mapping.id, { offer, label, grantsAccess: grantsAccess === "yes" })
      setOffer("")
      setLabel("")
    }, "Oferta cadastrada.")
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border p-4" aria-label={`Produto ${mapping.hotmartProductName ?? mapping.hotmartProductUcode}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-medium text-foreground">{mapping.hotmartProductName || "Produto sem nome"}</span>
          <span className="truncate font-mono text-xs text-muted-foreground">
            {mapping.hotmartProductUcode}
            {mapping.hotmartProductId ? ` · ID ${mapping.hotmartProductId}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={mapping.active ? "default" : "secondary"}>{mapping.active ? "Ativo" : "Inativo"}</Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () => setHotmartProductMappingActive(courseId, mapping.id, !mapping.active),
                mapping.active ? "Mapeamento desativado." : "Mapeamento ativado.",
              )
            }
          >
            {mapping.active ? "Desativar" : "Ativar"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
        <div className="flex items-start gap-2.5">
          {restricted ? (
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              {restricted ? "Exige oferta autorizada" : "Qualquer oferta deste produto libera o curso"}
            </span>
            <span className="text-xs text-muted-foreground">
              {restricted
                ? "Somente compras aprovadas das ofertas marcadas como “libera acesso” criam matrícula e enviam o primeiro acesso."
                : "Use “Exigir oferta autorizada” quando o produto tiver ofertas com e sem acesso à plataforma."}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant={restricted ? "outline" : "default"}
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              () => setHotmartOfferPolicy(courseId, mapping.id, restricted ? "any" : "authorized_offers"),
              restricted ? "Regra de ofertas desativada." : "Regra de ofertas autorizadas ativada.",
            )
          }
        >
          {restricted ? "Aceitar qualquer oferta" : "Exigir oferta autorizada"}
        </Button>
      </div>

      {warning ? (
        <p role="status" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {warning}
        </p>
      ) : null}

      {mapping.offerRules.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {mapping.offerRules.map((rule) => (
            <li key={rule.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="font-mono text-sm text-foreground">{rule.offerCode}</span>
              <Badge variant={rule.grantsAccess ? "default" : "secondary"}>
                {rule.grantsAccess ? "Libera acesso" : "Sem acesso à plataforma"}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{rule.label ?? ""}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover oferta ${rule.offerCode}`}
                disabled={pending}
                onClick={() => run(() => removeHotmartOfferRule(courseId, mapping.id, rule.id), "Oferta removida.")}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={addOffer} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end">
        <div className="grid gap-2">
          <Label htmlFor={`${fieldId}-code`}>Oferta (código ou link do checkout)</Label>
          <Input
            id={`${fieldId}-code`}
            required
            value={offer}
            onChange={(event) => setOffer(event.target.value)}
            placeholder="4e4p713s ou https://pay.hotmart.com/...?off=4e4p713s"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${fieldId}-label`}>Descrição</Label>
          <Input
            id={`${fieldId}-label`}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ex.: Curso + SGA"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${fieldId}-grants`}>Acesso à plataforma</Label>
          <select
            id={`${fieldId}-grants`}
            value={grantsAccess}
            onChange={(event) => setGrantsAccess(event.target.value === "no" ? "no" : "yes")}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground dark:bg-input/30"
          >
            <option value="yes">Libera acesso</option>
            <option value="no">Não libera (curso apenas)</option>
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          Adicionar oferta
        </Button>
      </form>
    </section>
  )
}
