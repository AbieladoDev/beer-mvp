"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowDownToLine, ClipboardCheck, PackageX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from "@/components/ui/table"
import { StatusBadge } from "@/components/common/status-badge"
import { DeleteAction, EditAction } from "@/components/common/detail-view"
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog"
import { AuditTimeline } from "@/components/audit/audit-timeline"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Guard, NaoEncontrado } from "@/components/apae/comum"
import { Ficha, Identidade, LinhaInfo, SeloGrande } from "@/components/apae/ficha"
import { DialogosEstoque, type TipoDialogo } from "@/components/estoque/dialogos-estoque"
import { TabelaMovs } from "@/components/estoque/tabela-movs"
import { CATEGORIA_PRODUTO } from "@/data/catalogo"
import {
  ESTOQUE_LABEL,
  ESTOQUE_TOM,
  consumoDoDrink,
  consumoDoKit,
  custoPorMl,
  estoqueEmTexto,
  lucroCents,
  margemPct,
  precoPorMl,
  quantosDaParaMontar,
  situacaoEstoque,
  valorEmEstoqueCents,
} from "@/lib/derivados"
import { formatPrice } from "@/lib/format"
import { MODULOS } from "@/lib/modulos"
import { useDemo } from "@/store/demo-store"
import { usePode } from "@/store/sessao-store"
import { Margem, fmtCentavosFrac, fmtNum, qtdDaReceita } from "./comum"

export function ProdutoDetalhe({ id }: { id: string }) {
  return (
    <Guard permissao="produtos.ler" titulo="Produto">
      <Detalhe id={id} />
    </Guard>
  )
}

function Detalhe({ id }: { id: string }) {
  const router = useRouter()
  const produtos = useDemo((s) => s.produtos)
  const kits = useDemo((s) => s.kits)
  const drinks = useDemo((s) => s.drinks)
  const movsEstoque = useDemo((s) => s.movsEstoque)
  const auditoria = useDemo((s) => s.auditoria)
  const removerProduto = useDemo((s) => s.removerProduto)
  const podeEditar = usePode("produtos.editar")
  const podeEstoque = usePode("estoque.editar")
  const [dialogo, setDialogo] = React.useState<TipoDialogo | null>(null)
  const [removendo, setRemovendo] = React.useState(false)

  const p = produtos.find((x) => x.id === id)
  if (!p) return <NaoEncontrado titulo="Produto" voltar="/painel/produtos" />

  const s = situacaoEstoque(p)
  const movs = movsEstoque.filter((m) => m.produtoId === id)
  const historico = auditoria.filter((a) => (a.entidade === "produto" || a.entidade === "estoque") && a.entidadeId === id)
  const emKits = kits.filter((k) => k.itens.some((i) => i.produtoId === id))
  const emDrinks = drinks.filter((d) => d.itens.some((i) => i.produtoId === id))
  const usos = emKits.length + emDrinks.length

  return (
    <DashboardLayout title={p.nome} trilhaApenas>
      <Ficha
        identidade={
          <Identidade
            selo={<SeloGrande icone={MODULOS.produtos.icone} classe={MODULOS.produtos.selo} />}
            titulo={p.nome}
            subtitulo={[CATEGORIA_PRODUTO[p.categoria], p.marca].filter(Boolean).join(" · ")}
            badges={
              <>
                <StatusBadge tom={ESTOQUE_TOM[s]}>{ESTOQUE_LABEL[s]}</StatusBadge>
                {!p.ativo && <StatusBadge tom="neutro">Inativo</StatusBadge>}
                {!p.vendeAvulso && <StatusBadge tom="neutro">Só insumo</StatusBadge>}
              </>
            }
            destaque={estoqueEmTexto(p)}
            destaqueRotulo="Em estoque agora"
            acoes={
              podeEstoque && (
                <>
                  <Button size="sm" onClick={() => setDialogo("entrada")}>
                    <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                    Entrada
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDialogo("ajuste")}>
                    <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                    Ajuste
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDialogo("perda")}>
                    <PackageX className="mr-1.5 h-3.5 w-3.5" />
                    Perda
                  </Button>
                </>
              )
            }
          >
            <div>
              <LinhaInfo rotulo="Custo">{formatPrice(p.custoCents)}</LinhaInfo>
              <LinhaInfo rotulo="Preço de venda">{p.vendeAvulso ? formatPrice(p.precoVendaCents) : "—"}</LinhaInfo>
              <LinhaInfo rotulo="Margem">{p.vendeAvulso ? <Margem pct={margemPct(p.precoVendaCents, p.custoCents)} /> : "—"}</LinhaInfo>
              <LinhaInfo rotulo="Mínimo">
                {fmtNum(p.estoqueMinimo)} {p.unidade}
              </LinhaInfo>
              <LinhaInfo rotulo="Valor em estoque">{formatPrice(valorEmEstoqueCents(p))}</LinhaInfo>
              {p.volumeMl > 0 && <LinhaInfo rotulo="Volume">{fmtNum(p.volumeMl, 0)} ml</LinhaInfo>}
              <LinhaInfo rotulo="Fornecedor">{p.fornecedor || "—"}</LinhaInfo>
              {p.codigoBarras && <LinhaInfo rotulo="Código de barras">{p.codigoBarras}</LinhaInfo>}
            </div>
            {podeEditar && (
              <div className="flex flex-wrap gap-2">
                <EditAction href={`/painel/produtos/${p.id}/edicao`} label="Editar produto" variant="outline" />
                <DeleteAction onClick={() => setRemovendo(true)} label="Remover" />
              </div>
            )}
          </Identidade>
        }
        abas={[
          {
            valor: "resumo",
            rotulo: "Resumo",
            conteudo: (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Numero rotulo="Lucro por unidade" valor={p.vendeAvulso ? formatPrice(lucroCents(p.precoVendaCents, p.custoCents)) : "—"} />
                <Numero rotulo="Custo por ml" valor={p.volumeMl > 0 ? fmtCentavosFrac(custoPorMl(p)) : "—"} detalhe={p.volumeMl > 0 ? undefined : "Sem volume: não é dosável"} />
                <Numero rotulo="Preço por ml" valor={p.volumeMl > 0 && p.vendeAvulso ? fmtCentavosFrac(precoPorMl(p)) : "—"} />
                <Numero rotulo="Usado em" valor={`${usos} ${usos === 1 ? "item" : "itens"}`} detalhe={`${emKits.length} kits · ${emDrinks.length} drinks`} />
              </div>
            ),
          },
          {
            valor: "movs",
            rotulo: "Movimentações",
            contagem: movs.length,
            conteudo: movs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p> : <TabelaMovs movs={movs} produtos={produtos} />,
          },
          {
            valor: "usos",
            rotulo: "Usado em",
            contagem: usos,
            conteudo:
              usos === 0 ? (
                <p className="text-sm text-muted-foreground">Este produto não entra em nenhum kit nem drink.</p>
              ) : (
                <TableSurface className="first:mt-0 first:border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kit / drink</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Usa por unidade</TableHead>
                        <TableHead className="text-right">Dá para montar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emKits.map((k) => {
                        const q = k.itens.filter((i) => i.produtoId === id).reduce((t, i) => t + i.quantidade, 0)
                        const n = quantosDaParaMontar(consumoDoKit(k), produtos)
                        return (
                          <TableRow key={k.id} className="cursor-pointer" onClick={() => router.push(`/painel/kits/${k.id}`)}>
                            <TableCell className="font-semibold">{k.nome}</TableCell>
                            <TableCell>Kit</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtNum(q)} {p.unidade}
                            </TableCell>
                            <TableCell className="text-right font-bold tabular-nums">{n}</TableCell>
                          </TableRow>
                        )
                      })}
                      {emDrinks.map((d) => {
                        const q = d.itens.filter((i) => i.produtoId === id).reduce((t, i) => t + i.quantidade, 0)
                        const n = quantosDaParaMontar(consumoDoDrink(d, produtos), produtos)
                        return (
                          <TableRow key={d.id} className="cursor-pointer" onClick={() => router.push(`/painel/drinks/${d.id}`)}>
                            <TableCell className="font-semibold">{d.nome}</TableCell>
                            <TableCell>Drink</TableCell>
                            <TableCell className="text-right tabular-nums">{qtdDaReceita(p, q)}</TableCell>
                            <TableCell className="text-right font-bold tabular-nums">{n}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableSurface>
              ),
          },
          { valor: "historico", rotulo: "Histórico", contagem: historico.length, conteudo: <AuditTimeline entries={historico} semLink /> },
        ]}
      />
      <DialogosEstoque aberto={dialogo} produtoId={p.id} onClose={() => setDialogo(null)} />
      <ConfirmDeleteDialog
        open={removendo}
        onOpenChange={setRemovendo}
        title="Remover produto?"
        description={
          <>
            <strong>{p.nome}</strong> sai da lista e do PDV. As vendas e movimentações antigas continuam no histórico.
          </>
        }
        blockedReason={
          usos > 0 ? (
            <>
              Ele é usado em {[...emKits, ...emDrinks].map((x) => x.nome).join(", ")}. Tire-o desses kits e drinks antes — ou apenas desative o produto
              na{" "}
              <Link href={`/painel/produtos/${p.id}/edicao`} className="font-semibold underline">
                edição
              </Link>
              .
            </>
          ) : undefined
        }
        onConfirm={() => {
          removerProduto(p.id)
          toast.success("Produto removido")
          router.push("/painel/produtos")
        }}
      />
    </DashboardLayout>
  )
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-xs font-semibold text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums">{valor}</p>
      {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  )
}
