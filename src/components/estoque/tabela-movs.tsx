"use client"

import Link from "next/link"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from "@/components/ui/table"
import { StatusBadge, type TomDeEstado } from "@/components/common/status-badge"
import { fmtNum } from "@/components/produtos/comum"
import { TIPO_MOV } from "@/data/catalogo"
import type { MovEstoque, Produto, TipoMovEstoque } from "@/data/tipos"
import { formatDateTime, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

const TOM_MOV: Record<TipoMovEstoque, TomDeEstado> = {
  entrada: "ok",
  venda: "neutro",
  ajuste: "andamento",
  perda: "alerta",
  estorno: "espera",
}

/** Movimentações de estoque — usada na ficha do produto (sem coluna de produto) e na tela de Estoque. */
export function TabelaMovs({ movs, produtos, mostrarProduto = false }: { movs: MovEstoque[]; produtos: Produto[]; mostrarProduto?: boolean }) {
  return (
    <TableSurface className="first:mt-0 first:border-t">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            {mostrarProduto && <TableHead>Produto</TableHead>}
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="hidden text-right md:table-cell">Custo unit.</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="hidden lg:table-cell">Quem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movs.map((m) => {
            const p = produtos.find((x) => x.id === m.produtoId)
            return (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(m.data)}</TableCell>
                {mostrarProduto && (
                  <TableCell>
                    {p ? (
                      <Link href={`/painel/produtos/${p.id}`} className="font-semibold hover:underline">
                        {p.nome}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Produto removido</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <StatusBadge tom={TOM_MOV[m.tipo]}>{TIPO_MOV[m.tipo]}</StatusBadge>
                </TableCell>
                <TableCell className={cn("whitespace-nowrap text-right font-bold tabular-nums", m.quantidade < 0 && "text-muted-foreground")}>
                  {m.quantidade > 0 ? "+" : "−"}
                  {fmtNum(Math.abs(m.quantidade), 4)} {p?.unidade}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">{m.custoUnitCents ? formatPrice(m.custoUnitCents) : "—"}</TableCell>
                <TableCell className="text-sm">
                  {m.vendaId ? (
                    <Link href={`/painel/vendas/${m.vendaId}`} className="hover:underline">
                      {m.motivo}
                    </Link>
                  ) : (
                    m.motivo
                  )}
                  {m.contaPagarId && (
                    <Link href={`/painel/contas-a-pagar/${m.contaPagarId}`} className="ml-2 text-xs text-muted-foreground underline-offset-2 hover:underline">
                      ver conta
                    </Link>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{m.responsavel}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableSurface>
  )
}
