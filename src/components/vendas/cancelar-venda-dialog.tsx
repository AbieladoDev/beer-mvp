"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Venda } from "@/data/tipos"
import { formatPrice } from "@/lib/format"
import { useDemo } from "@/store/demo-store"

/** Cancelamento com motivo obrigatório — devolve o estoque e apaga a conta a receber. */
export function CancelarVendaDialog({ venda, onOpenChange }: { venda: Venda | null; onOpenChange: (open: boolean) => void }) {
  const cancelarVenda = useDemo((s) => s.cancelarVenda)
  const [motivo, setMotivo] = React.useState("")

  const fechar = (v: boolean) => {
    if (!v) setMotivo("")
    onOpenChange(v)
  }

  const confirmar = () => {
    if (!venda || !motivo.trim()) return
    cancelarVenda(venda.id, motivo.trim())
    toast.success(`Venda #${venda.numero} cancelada`, { description: "O estoque voltou e a conta a receber saiu." })
    fechar(false)
  }

  return (
    <Dialog open={!!venda} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar venda #{venda?.numero}?</DialogTitle>
          <DialogDescription>
            {venda && formatPrice(venda.totalCents)} · os itens voltam ao estoque e a conta a receber da venda é removida. Não dá para desfazer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="motivo-cancelamento">Motivo</Label>
          <Textarea
            id="motivo-cancelamento"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: cliente desistiu, lançado em duplicidade"
            rows={3}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => fechar(false)}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={!motivo.trim()}>
            Cancelar venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
