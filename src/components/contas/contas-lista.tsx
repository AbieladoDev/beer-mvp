"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, Eye, Pencil, Plus, Receipt, Trash2, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MonthPicker } from "@/components/ui/month-picker"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from "@/components/ui/table"
import { FiltroChips, classeFiltroSelect } from "@/components/common/filtro-chips"
import { RowActions } from "@/components/common/row-actions"
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { FaixaTotais } from "@/components/finance/faixa-totais"
import { Guard, SituacaoContaBadge, Vazio } from "@/components/apae/comum"
import { situacaoConta, somaCents } from "@/lib/derivados"
import { hoje, mesDe, rotuloMes } from "@/lib/datas"
import { formatDate, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { usePode } from "@/store/sessao-store"
import { DialogoQuitar } from "./dialogo-quitar"
import { TIPO, bloqueioRemocao, useContas, type ContaView, type TipoConta } from "./tipo-conta"

type Situacao = "abertas" | "vencidas" | "semana" | "quitadas" | "todas"

export function ContasLista({ tipo }: { tipo: TipoConta }) {
  return (
    <Guard permissao="financeiro.ler" titulo={TIPO[tipo].titulo}>
      <Conteudo tipo={tipo} />
    </Guard>
  )
}

function Conteudo({ tipo }: { tipo: TipoConta }) {
  const t = TIPO[tipo]
  const router = useRouter()
  const { lista, entradaDa, remover, quitar, desfazer } = useContas(tipo)
  const podeEditar = usePode("financeiro.editar")

  const [situacao, setSituacao] = React.useState<Situacao>("abertas")
  const [mes, setMes] = React.useState(mesDe(hoje()))
  const [classe, setClasse] = React.useState("todas")
  const [busca, setBusca] = React.useState("")
  const [quitando, setQuitando] = React.useState<ContaView | null>(null)
  const [removendo, setRemovendo] = React.useState<ContaView | null>(null)

  // Filtros que não dependem de período: classe e busca.
  const base = React.useMemo(() => {
    const b = busca.trim().toLowerCase()
    return lista.filter((c) => {
      if (classe !== "todas" && c.classe !== classe) return false
      if (b && !`${c.descricao} ${c.contraparte}`.toLowerCase().includes(b)) return false
      return true
    })
  }, [lista, classe, busca])

  /**
   * O mês vale pelo VENCIMENTO, e pela data de quitação nas quitadas.
   * "Vencidas" e "Vence em 7 dias" olham para hoje e ignoram o mês: conta de
   * agosto atrasada continua sendo problema em outubro.
   */
  const noMes = (d?: string) => !mes || (!!d && mesDe(d) === mes)
  const PRED: Record<Situacao, (c: ContaView) => boolean> = {
    abertas: (c) => !c.quitadoEm && noMes(c.vencimento),
    vencidas: (c) => situacaoConta(c) === "vencida",
    semana: (c) => {
      const s = situacaoConta(c)
      return s === "hoje" || s === "semana"
    },
    quitadas: (c) => !!c.quitadoEm && noMes(c.quitadoEm),
    todas: (c) => noMes(c.vencimento),
  }
  const conta = (s: Situacao) => base.filter(PRED[s]).length

  const filtradas = base
    .filter(PRED[situacao])
    .sort((a, b) => (situacao === "quitadas" ? (b.quitadoEm ?? "").localeCompare(a.quitadoEm ?? "") : a.vencimento.localeCompare(b.vencimento)))

  const abertas = base.filter(PRED.abertas)
  const vencidas = base.filter(PRED.vencidas)
  const quitadas = base.filter(PRED.quitadas)
  const ignoraMes = situacao === "vencidas" || situacao === "semana"

  return (
    <DashboardLayout
      title={t.titulo}
      description={t.descricao}
      actions={
        podeEditar && (
          <Button asChild size="sm">
            <Link href={`${t.base}/cadastro`}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t.nova}
            </Link>
          </Button>
        )
      }
      toolbar={
        <div className="flex flex-col gap-3">
          <FiltroChips
            ariaLabel="Situação"
            value={situacao}
            onChange={(v) => setSituacao(v as Situacao)}
            options={[
              { value: "abertas", label: "Em aberto", count: conta("abertas") },
              { value: "vencidas", label: "Vencidas", count: conta("vencidas") },
              { value: "semana", label: "Vence em 7 dias", count: conta("semana") },
              { value: "quitadas", label: tipo === "pagar" ? "Pagas" : "Recebidas", count: conta("quitadas") },
              { value: "todas", label: "Todas", count: conta("todas") },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={busca} onChange={setBusca} placeholder={`Buscar descrição ou ${t.contraparteRotulo.toLowerCase()}`} className="w-full sm:w-72" />
            <MonthPicker value={mes} onChange={setMes} compact className="w-36" aria-label="Mês" disabled={ignoraMes} />
            {mes && !ignoraMes && (
              <Button variant="ghost" size="sm" onClick={() => setMes("")}>
                Todos os meses
              </Button>
            )}
            <Select value={classe} onValueChange={setClasse}>
              <SelectTrigger size="sm" className={cn("w-48", classeFiltroSelect(classe !== "todas"))}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">{tipo === "pagar" ? "Todas as categorias" : "Todas as origens"}</SelectItem>
                {Object.entries(t.classes).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      <FaixaTotais
        className="mb-4"
        contagem={filtradas.length}
        substantivo={{ um: "conta", muitos: "contas" }}
        itens={[
          { rotulo: mes ? `Em aberto (${rotuloMes(mes)})` : "Em aberto", valorCents: somaCents(abertas, (c) => c.valorCents) },
          { rotulo: "Vencido", valorCents: somaCents(vencidas, (c) => c.valorCents) },
          {
            rotulo: `${tipo === "pagar" ? "Pago" : "Recebido"}${mes ? ` em ${rotuloMes(mes)}` : ""}`,
            valorCents: somaCents(quitadas, (c) => c.valorCents),
            destaque: true,
          },
        ]}
      />

      {filtradas.length === 0 ? (
        <Vazio
          icone={t.modulo.icone}
          titulo="Nenhuma conta com esses filtros"
          descricao={mes && !ignoraMes ? "Tente outro mês ou limpe os filtros." : "Ajuste os filtros ou lance uma conta nova."}
          acao={
            podeEditar && (
              <Button asChild size="sm">
                <Link href={`${t.base}/cadastro`}>{t.nova}</Link>
              </Button>
            )
          }
        />
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">{t.classeRotulo}</TableHead>
                <TableHead>{situacao === "quitadas" ? t.quitadoEm : "Vencimento"}</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`${t.base}/${c.id}`)}>
                  <TableCell className="max-w-[20rem]">
                    <p className="flex items-center gap-1.5 truncate font-semibold">
                      {c.vendaId && <Receipt className="size-3.5 shrink-0 text-muted-foreground" aria-label="Gerada por venda" />}
                      <span className="truncate">{c.descricao}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.contraparte || "—"}
                      {(c.entradaId || entradaDa(c)) && " · entrada de mercadoria"}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">{t.classes[c.classe] ?? c.classe}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(situacao === "quitadas" && c.quitadoEm ? c.quitadoEm : c.vencimento)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{formatPrice(c.valorCents)}</TableCell>
                  <TableCell>
                    <SituacaoContaBadge conta={{ vencimento: c.vencimento, pagoEm: c.quitadoEm }} tipo={tipo} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex">
                      <RowActions
                        actions={[
                          { label: "Ver", icon: Eye, onSelect: () => router.push(`${t.base}/${c.id}`) },
                          { label: t.quitar, icon: CheckCircle2, onSelect: () => setQuitando(c), hidden: !podeEditar || !!c.quitadoEm },
                          {
                            label: t.desfazer,
                            icon: Undo2,
                            onSelect: () => {
                              desfazer(c.id)
                              toast.success("Pronto, a conta voltou para em aberto")
                            },
                            hidden: !podeEditar || !c.quitadoEm,
                          },
                          { label: "Editar", icon: Pencil, onSelect: () => router.push(`${t.base}/${c.id}/edicao`), hidden: !podeEditar },
                          { label: "Remover", icon: Trash2, onSelect: () => setRemovendo(c), destructive: true, hidden: !podeEditar },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableSurface>
      )}

      <DialogoQuitar tipo={tipo} conta={quitando} onOpenChange={(v) => !v && setQuitando(null)} onConfirmar={(d, f) => quitando && quitar(quitando.id, d, f)} />
      <ConfirmDeleteDialog
        open={!!removendo}
        onOpenChange={(v) => !v && setRemovendo(null)}
        title={`Remover ${t.singular}?`}
        description={`"${removendo?.descricao}" sai da lista e do fluxo de caixa. O histórico guarda que ela existiu.`}
        blockedReason={bloqueioRemocao(removendo)}
        onConfirm={() => {
          if (removendo) remover(removendo.id)
          toast.success("Conta removida")
          setRemovendo(null)
        }}
      />
    </DashboardLayout>
  )
}
