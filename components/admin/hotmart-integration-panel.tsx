"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  createHotmartProductMapping,
  setHotmartProductMappingActive,
} from "@/lib/admin/actions/hotmart"
import type { HotmartProductMapping } from "@/lib/admin/types"

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível atualizar a integração Hotmart."
}

export function HotmartIntegrationPanel({
  courseId,
  mappings,
}: {
  courseId: string
  mappings: HotmartProductMapping[]
}) {
  const router = useRouter()
  const [productId, setProductId] = useState("")
  const [productUcode, setProductUcode] = useState("")
  const [productName, setProductName] = useState("")
  const [pending, setPending] = useState(false)

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)

    try {
      await createHotmartProductMapping(courseId, {
        hotmartProductId: productId,
        hotmartProductUcode: productUcode,
        hotmartProductName: productName,
      })
      setProductId("")
      setProductUcode("")
      setProductName("")
      toast.success("Produto Hotmart vinculado.")
      router.refresh()
    } catch (error) {
      toast.error(messageFrom(error))
    } finally {
      setPending(false)
    }
  }

  async function toggleMapping(mapping: HotmartProductMapping) {
    setPending(true)
    try {
      await setHotmartProductMappingActive(courseId, mapping.id, !mapping.active)
      toast.success(mapping.active ? "Mapeamento desativado." : "Mapeamento ativado.")
      router.refresh()
    } catch (error) {
      toast.error(messageFrom(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">Integração Hotmart</CardTitle>
        <CardDescription>
          Cadastre os produtos que liberam este curso. O identificador principal é o product.ucode.
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

        {mappings.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Ucode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {mapping.hotmartProductName || "Produto sem nome"}
                      </span>
                      {mapping.hotmartProductId && (
                        <span className="text-xs text-muted-foreground">
                          ID {mapping.hotmartProductId}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-56 truncate font-mono text-xs">
                    {mapping.hotmartProductUcode}
                  </TableCell>
                  <TableCell>
                    <Badge variant={mapping.active ? "default" : "secondary"}>
                      {mapping.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => toggleMapping(mapping)}
                    >
                      {mapping.active ? "Desativar" : "Ativar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <p className="text-xs text-muted-foreground">
          Configure o endpoint /api/webhooks/hotmart como Webhook 2.0.0 e mantenha o HOTTOK apenas nas variáveis
          server-side.
        </p>
      </CardContent>
    </Card>
  )
}

