"use client"

import * as React from "react"
import Link from "next/link"
import { Ban } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from "@/components/ui/table"
import { DeleteAction, DetailRow, DetailSection } from "@/components/common/detail-view"
import { StatusBadge } from "@/components/common/status-badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { FORMA_LABEL, LIQUIDACAO, custoDaVendaCents, margemPct, rotuloSituacao, situacaoConta, SITUACAO_TOM } from "@/lib/derivados"
import { formatDate, formatDateTime, formatPrice } from "@/lib/format"
import { MODULOS } from "@/lib/modulos"
import { cn } from "@/lib/utils"
import { useDemo } from "@/store/demo-store"
import { usePode } from "@/store/sessao-store"
import { CancelarVendaDialog } from "./cancelar-venda-dialog"
import { Guard, NaoEncontrado, StatusVendaBadge } from "./comum"

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`

export function VendaDetalhe({ id }: { id: string }) {
  return (
    <Guard permissao="vendas.ler" titulo={MODULOS.vendas.titulo}>
      <Conteudo id={id} />
    </Guard>
  )
}

function Conteudo({ id }: { id: string }) {
  const venda = useDemo((s) => s.vendas.find((v) => v.id === id))
  const conta = useDemo((s) => (venda?.contaReceberId ? s.contasReceber.find((c) => c.id === venda.contaReceberId) : undefined))
  const podeCancelar = usePode("vendas.cancelar")
  const [cancelando, setCancelando] = React.useState(false)

  if (!venda) return <NaoEncontrado titulo={MODULOS.vendas.titulo} voltar={MODULOS.vendas.url} />

  const custo = custoDaVendaCents(venda)
  const lucro = venda.totalCents - custo
  const liq = LIQUIDACAO[venda.forma]
  const taxaCents = Math.round((venda.totalCents * liq.taxaPct) / 100)
  const cancelada = venda.status === "cancelada"

  return (
    <DashboardLayout
      title={`Venda #${venda.numero}`}
      description={`${formatDateTime(venda.data)} · ${venda.operador}`}
      actions={
        <>
          <StatusVendaBadge status={venda.status} />
          {podeCancelar && !cancelada && <DeleteAction label="Cancelar venda" onClick={() => setCancelando(true)} />}
        </>
      }
    >
      <div className="space-y-6">
        {cancelada && (
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
            <Ban className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p>
              Cancelada em {venda.canceladaEm ? formatDateTime(venda.canceladaEm) : "—"}
              {venda.motivoCancelamento && (
                <>
                  {" "}
                  — <span className="font-medium">{venda.motivoCancelamento}</span>
                </>
              )}
              . O estoque foi devolvido e a conta a receber removida.
            </p>
          </div>
        )}

        <DetailSection title="Itens" description="Preço e custo gravados no momento da venda.">
          <TableSurface bleed={false} className="border-y-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Custo</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Margem</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venda.itens.map((i) => (
                  <TableRow key={`${i.tipo}:${i.refId}`}>
                    <TableCell>
                      <p className="font-medium">{i.nome}</p>
                      <p className="text-xs text-muted-foreground">{i.tipo === "produto" ? "Produto" : i.tipo === "kit" ? "Kit" : "Drink"}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{i.quantidade}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(i.precoUnitCents)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">{formatPrice(i.custoUnitCents)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{pct(margemPct(i.precoUnitCents, i.custoUnitCents))}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatPrice(i.precoUnitCents * i.quantidade)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableSurface>
        </DetailSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <DetailSection title="Totais">
            <DetailRow label="Subtotal">{formatPrice(venda.subtotalCents)}</DetailRow>
            <DetailRow label="Desconto">{venda.descontoCents ? `− ${formatPrice(venda.descontoCents)}` : "—"}</DetailRow>
            <DetailRow label="Total">
              <span className={cn("text-base font-bold", cancelada && "line-through")}>{formatPrice(venda.totalCents)}</span>
            </DetailRow>
            <DetailRow label="Custo">{formatPrice(custo)}</DetailRow>
            <DetailRow label="Lucro bruto">
              {formatPrice(lucro)} <span className="text-muted-foreground">({pct(margemPct(venda.totalCents, custo))})</span>
            </DetailRow>
          </DetailSection>

          <DetailSection title="Pagamento" className="lg:border-t-0 lg:pt-0">
            <DetailRow label="Forma">{FORMA_LABEL[venda.forma]}</DetailRow>
            <DetailRow label="Prazo de recebimento">{liq.dias === 0 ? "Na hora" : `D+${liq.dias}`}</DetailRow>
            <DetailRow label="Taxa">{liq.taxaPct ? `${pct(liq.taxaPct)} (${formatPrice(taxaCents)})` : "Sem taxa"}</DetailRow>
            <DetailRow label="Líquido">{formatPrice(venda.totalCents - taxaCents)}</DetailRow>
            <DetailRow label="Conta a receber">
              {conta ? (
                <Link href={`/painel/contas-a-receber/${conta.id}`} className="inline-flex items-center gap-2 hover:underline">
                  {formatPrice(conta.valorCents)} · {formatDate(conta.vencimento)}
                  <StatusBadge tom={SITUACAO_TOM[situacaoConta(conta)]}>{rotuloSituacao(situacaoConta(conta), "receber")}</StatusBadge>
                </Link>
              ) : (
                <span className="text-muted-foreground">{cancelada ? "Removida no cancelamento" : "—"}</span>
              )}
            </DetailRow>
            <DetailRow label="Operador">{venda.operador}</DetailRow>
          </DetailSection>
        </div>
      </div>

      <CancelarVendaDialog venda={cancelando ? venda : null} onOpenChange={setCancelando} />
    </DashboardLayout>
  )
}
