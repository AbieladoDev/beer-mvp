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
import { Margem, fmtNum, fmtPct } from "@/components/produtos/comum"
import { estoqueEmTexto } from "@/lib/derivados"
import { formatPrice } from "@/lib/format"
import { MODULOS } from "@/lib/modulos"
import { useDemo } from "@/store/demo-store"
import { usePode } from "@/store/sessao-store"
import { numerosDoKit } from "./numeros"

export function KitDetalhe({ id }: { id: string }) {
  return (
    <Guard permissao="produtos.ler" titulo="Kit">
      <Detalhe id={id} />
    </Guard>
  )
}

function Detalhe({ id }: { id: string }) {
  const router = useRouter()
  const kits = useDemo((s) => s.kits)
  const produtos = useDemo((s) => s.produtos)
  const auditoria = useDemo((s) => s.auditoria)
  const removerKit = useDemo((s) => s.removerKit)
  const podeEditar = usePode("produtos.editar")
  const [removendo, setRemovendo] = React.useState(false)

  const k = kits.find((x) => x.id === id)
  if (!k) return <NaoEncontrado titulo="Kit" voltar="/painel/kits" />

  const n = numerosDoKit(k, produtos)
  const historico = auditoria.filter((a) => a.entidade === "kit" && a.entidadeId === id)
  const linhas = k.itens.map((i) => {
    const p = produtos.find((x) => x.id === i.produtoId)
    return { i, p, daPara: p && i.quantidade > 0 ? Math.floor((Math.max(0, p.estoque) + 0.0001) / i.quantidade) : 0 }
  })

  return (
    <DashboardLayout title={k.nome} trilhaApenas>
      <Ficha
        identidade={
          <Identidade
            selo={<SeloGrande icone={MODULOS.kits.icone} classe={MODULOS.kits.selo} />}
            titulo={k.nome}
            subtitulo={k.descricao}
            badges={
              <>
                {n.daPara > 0 ? <StatusBadge tom="ok">Dá para montar {n.daPara}</StatusBadge> : <StatusBadge tom="alerta">Sem estoque</StatusBadge>}
                {!k.ativo && <StatusBadge tom="neutro">Inativo</StatusBadge>}
              </>
            }
            destaque={formatPrice(k.precoCents)}
            destaqueRotulo="Preço do combo"
          >
            <div>
              <LinhaInfo rotulo="Custo">{formatPrice(n.custo)}</LinhaInfo>
              <LinhaInfo rotulo="Margem">
                <Margem pct={n.margem} />
              </LinhaInfo>
              <LinhaInfo rotulo="Lucro por kit">{formatPrice(n.lucro)}</LinhaInfo>
              <LinhaInfo rotulo="Avulso sairia">{formatPrice(n.avulso)}</LinhaInfo>
              <LinhaInfo rotulo="Cliente economiza">{n.economia > 0 ? `${formatPrice(n.economia)} (${fmtPct(n.economiaPct)})` : "—"}</LinhaInfo>
            </div>
            {podeEditar && (
              <div className="flex flex-wrap gap-2">
                <EditAction href={`/painel/kits/${k.id}/edicao`} label="Editar kit" variant="outline" />
                <DeleteAction onClick={() => setRemovendo(true)} label="Remover" />
              </div>
            )}
          </Identidade>
        }
        abas={[
          {
            valor: "composicao",
            rotulo: "Composição",
            contagem: k.itens.length,
            conteudo: (
              <TableSurface className="first:mt-0 first:border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Avulso</TableHead>
                      <TableHead className="hidden text-right md:table-cell">Em estoque</TableHead>
                      <TableHead className="text-right">Dá para</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map(({ i, p, daPara }) => (
                      <TableRow key={i.produtoId} className={p ? "cursor-pointer" : undefined} onClick={() => p && router.push(`/painel/produtos/${p.id}`)}>
                        <TableCell className="font-semibold">{p?.nome ?? <span className="text-muted-foreground">Produto removido</span>}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtNum(i.quantidade)} {p?.unidade}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p ? formatPrice(Math.round(p.custoCents * i.quantidade)) : "—"}</TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{p ? formatPrice(p.precoVendaCents * i.quantidade) : "—"}</TableCell>
                        <TableCell className="hidden text-right tabular-nums md:table-cell">{p ? estoqueEmTexto(p) : "—"}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold tabular-nums">{daPara}</span>
                          {daPara === n.daPara && k.itens.length > 1 && (
                            <StatusBadge tom="espera" className="ml-2">
                              gargalo
                            </StatusBadge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableSurface>
            ),
          },
          { valor: "historico", rotulo: "Histórico", contagem: historico.length, conteudo: <AuditTimeline entries={historico} semLink /> },
        ]}
      />
      <ConfirmDeleteDialog
        open={removendo}
        onOpenChange={setRemovendo}
        title="Remover kit?"
        description={
          <>
            <strong>{k.nome}</strong> sai do PDV. As vendas antigas continuam no histórico com o nome da época.
          </>
        }
        onConfirm={() => {
          removerKit(k.id)
          toast.success("Kit removido")
          router.push("/painel/kits")
        }}
      />
    </DashboardLayout>
  )
}
