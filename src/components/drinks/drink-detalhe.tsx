"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from "@/components/ui/table"
import { StatusBadge } from "@/components/common/status-badge"
import { DeleteAction, EditAction } from "@/components/common/detail-view"
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog"
import { AuditTimeline } from "@/components/audit/audit-timeline"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Guard, NaoEncontrado } from "@/components/apae/comum"
import { Ficha, Identidade, LinhaInfo, SeloGrande } from "@/components/apae/ficha"
import { Margem, fmtCentavosFrac, fmtNum, qtdDaReceita } from "@/components/produtos/comum"
import { custoDoIngredienteCents, custoPorMl, estoqueEmTexto, unidadesConsumidas } from "@/lib/derivados"
import { formatPrice } from "@/lib/format"
import { MODULOS } from "@/lib/modulos"
import { useDemo } from "@/store/demo-store"
import { usePode } from "@/store/sessao-store"
import { MARGEM_ALVO_DRINK, numerosDoDrink } from "./numeros"

export function DrinkDetalhe({ id }: { id: string }) {
  return (
    <Guard permissao="produtos.ler" titulo="Drink">
      <Detalhe id={id} />
    </Guard>
  )
}

function Detalhe({ id }: { id: string }) {
  const router = useRouter()
  const drinks = useDemo((s) => s.drinks)
  const produtos = useDemo((s) => s.produtos)
  const auditoria = useDemo((s) => s.auditoria)
  const removerDrink = useDemo((s) => s.removerDrink)
  const podeEditar = usePode("produtos.editar")
  const [removendo, setRemovendo] = React.useState(false)

  const d = drinks.find((x) => x.id === id)
  if (!d) return <NaoEncontrado titulo="Drink" voltar="/painel/drinks" />

  const n = numerosDoDrink(d, produtos)
  const historico = auditoria.filter((a) => a.entidade === "drink" && a.entidadeId === id)
  const linhas = d.itens.map((i) => {
    const p = produtos.find((x) => x.id === i.produtoId)
    const porDrink = p ? unidadesConsumidas(p, i.quantidade) : 0
    return { i, p, daPara: p && porDrink > 0 ? Math.floor((Math.max(0, p.estoque) + 0.0001) / porDrink) : 0 }
  })
  const gargalo = d.itens.length > 1 ? linhas.reduce((min, l) => (l.daPara < min.daPara ? l : min), linhas[0]) : undefined

  return (
    <DashboardLayout title={d.nome} trilhaApenas>
      <Ficha
        identidade={
          <Identidade
            selo={<SeloGrande icone={MODULOS.drinks.icone} classe={MODULOS.drinks.selo} />}
            titulo={d.nome}
            subtitulo={d.descricao}
            badges={
              <>
                {n.daPara > 0 ? <StatusBadge tom="ok">Dá para montar {n.daPara}</StatusBadge> : <StatusBadge tom="alerta">Sem estoque</StatusBadge>}
                {!d.ativo && <StatusBadge tom="neutro">Inativo</StatusBadge>}
              </>
            }
            destaque={formatPrice(d.precoCents)}
            destaqueRotulo="Preço"
          >
            <div>
              <LinhaInfo rotulo="Custo">{formatPrice(n.custo)}</LinhaInfo>
              <LinhaInfo rotulo="Margem">
                <Margem pct={n.margem} />
              </LinhaInfo>
              <LinhaInfo rotulo="Lucro por drink">{formatPrice(n.lucro)}</LinhaInfo>
              <LinhaInfo rotulo={`Sugerido (${MARGEM_ALVO_DRINK * 100}%)`}>{formatPrice(n.sugerido)}</LinhaInfo>
            </div>
            {podeEditar && (
              <div className="flex flex-wrap gap-2">
                <EditAction href={`/painel/drinks/${d.id}/edicao`} label="Editar drink" variant="outline" />
                <DeleteAction onClick={() => setRemovendo(true)} label="Remover" />
              </div>
            )}
          </Identidade>
        }
        abas={[
          {
            valor: "receita",
            rotulo: "Receita",
            contagem: d.itens.length,
            conteudo: (
              <>
                <TableSurface className="first:mt-0 first:border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingrediente</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Custo/ml</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Em estoque</TableHead>
                        <TableHead className="text-right">Dá para</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.map((l) => {
                        const { i, p, daPara } = l
                        return (
                          <TableRow key={i.produtoId} className={p ? "cursor-pointer" : undefined} onClick={() => p && router.push(`/painel/produtos/${p.id}`)}>
                            <TableCell className="font-semibold">{p?.nome ?? <span className="text-muted-foreground">Produto removido</span>}</TableCell>
                            <TableCell className="text-right tabular-nums">{p ? qtdDaReceita(p, i.quantidade) : fmtNum(i.quantidade)}</TableCell>
                            <TableCell className="text-right tabular-nums">{p ? formatPrice(custoDoIngredienteCents(p, i.quantidade)) : "—"}</TableCell>
                            <TableCell className="hidden text-right tabular-nums sm:table-cell">{p && p.volumeMl > 0 ? fmtCentavosFrac(custoPorMl(p)) : "—"}</TableCell>
                            <TableCell className="hidden text-right tabular-nums md:table-cell">{p ? estoqueEmTexto(p) : "—"}</TableCell>
                            <TableCell className="text-right">
                              <span className="font-bold tabular-nums">{daPara}</span>
                              {l === gargalo && (
                                <StatusBadge tom="espera" className="ml-2">
                                  gargalo
                                </StatusBadge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableSurface>
                {gargalo?.p && (
                  <p className="text-sm text-muted-foreground">
                    Quem limita é <strong className="text-foreground">{gargalo.p.nome}</strong>: com {fmtNum(gargalo.p.estoque)} {gargalo.p.unidade} dá para{" "}
                    {gargalo.daPara} {gargalo.daPara === 1 ? "drink" : "drinks"}.
                  </p>
                )}
              </>
            ),
          },
          { valor: "historico", rotulo: "Histórico", contagem: historico.length, conteudo: <AuditTimeline entries={historico} semLink /> },
        ]}
      />
      <ConfirmDeleteDialog
        open={removendo}
        onOpenChange={setRemovendo}
        title="Remover drink?"
        description={
          <>
            <strong>{d.nome}</strong> sai do PDV. As vendas antigas continuam no histórico com o nome da época.
          </>
        }
        onConfirm={() => {
          removerDrink(d.id)
          toast.success("Drink removido")
          router.push("/painel/drinks")
        }}
      />
    </DashboardLayout>
  )
}
