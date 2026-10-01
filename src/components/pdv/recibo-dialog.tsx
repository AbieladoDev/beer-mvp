"use client"

import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FORMA_LABEL } from "@/lib/derivados"
import { formatDateTime, formatPrice } from "@/lib/format"
import { useDemo } from "@/store/demo-store"

/** O "cupom" da venda que acabou de sair — lido do store, não do carrinho. */
export function ReciboDialog({
  vendaId,
  trocoCents,
  onNovaVenda,
}: {
  vendaId: string | null
  trocoCents: number
  onNovaVenda: () => void
}) {
  const venda = useDemo((s) => (vendaId ? s.vendas.find((v) => v.id === vendaId) : undefined))

  return (
    <Dialog open={!!vendaId} onOpenChange={(v) => !v && onNovaVenda()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {venda && (
          <>
            <DialogHeader className="items-center text-center">
              <CheckCircle2 className="size-10 text-emerald-600" />
              <DialogTitle className="text-xl">Venda #{venda.numero} concluída</DialogTitle>
              <DialogDescription>
                {formatDateTime(venda.data)} · {venda.operador}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-dashed px-4 py-3 font-mono text-sm">
              <ul className="space-y-1">
                {venda.itens.map((i) => (
                  <li key={`${i.tipo}:${i.refId}`} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {i.quantidade}× {i.nome}
                    </span>
                    <span className="tabular-nums">{formatPrice(i.precoUnitCents * i.quantidade)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 space-y-0.5 border-t border-dashed pt-2">
                {venda.descontoCents > 0 && (
                  <>
                    <Linha rotulo="Subtotal" valor={formatPrice(venda.subtotalCents)} />
                    <Linha rotulo="Desconto" valor={`− ${formatPrice(venda.descontoCents)}`} />
                  </>
                )}
                <Linha rotulo="Total" valor={formatPrice(venda.totalCents)} forte />
                <Linha rotulo="Pagamento" valor={FORMA_LABEL[venda.forma]} />
                {venda.forma === "dinheiro" && trocoCents > 0 && <Linha rotulo="Troco" valor={formatPrice(trocoCents)} forte />}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" asChild>
                <Link href={`/painel/vendas/${venda.id}`}>Ver venda</Link>
              </Button>
              <Button size="lg" autoFocus onClick={onNovaVenda}>
                Nova venda
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className={`flex justify-between ${forte ? "font-bold" : ""}`}>
      <span>{rotulo}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  )
}
