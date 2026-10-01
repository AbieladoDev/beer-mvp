"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, PackagePlus, Receipt, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DetailRow, DetailSection, DeleteAction, EditAction } from "@/components/common/detail-view"
import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog"
import { AuditTimeline } from "@/components/audit/audit-timeline"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Guard, NaoEncontrado, SituacaoContaBadge } from "@/components/apae/comum"
import { Ficha, Identidade, LinhaInfo, SeloGrande } from "@/components/apae/ficha"
import { formatDate, formatDateTime, formatPrice } from "@/lib/format"
import { useDemo } from "@/store/demo-store"
import { usePode } from "@/store/sessao-store"
import { DialogoQuitar } from "./dialogo-quitar"
import { TIPO, bloqueioRemocao, rotuloForma, useContas, type TipoConta } from "./tipo-conta"

export function ContaDetalhe({ tipo, id }: { tipo: TipoConta; id: string }) {
  return (
    <Guard permissao="financeiro.ler" titulo={TIPO[tipo].titulo}>
      <Conteudo tipo={tipo} id={id} />
    </Guard>
  )
}

/** Cartão-link para a origem da conta (venda ou entrada de mercadoria). */
function Origem({ href, icone: Icone, titulo, detalhe }: { href?: string; icone: React.ElementType; titulo: string; detalhe: string }) {
  const corpo = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
        <Icone className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{titulo}</span>
        <span className="block truncate text-xs text-muted-foreground">{detalhe}</span>
      </span>
    </>
  )
  const cls = "flex items-center gap-3 rounded-2xl border bg-card p-4"
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:bg-muted`}>
      {corpo}
    </Link>
  ) : (
    <div className={cls}>{corpo}</div>
  )
}

function Conteudo({ tipo, id }: { tipo: TipoConta; id: string }) {
  const t = TIPO[tipo]
  const router = useRouter()
  const { lista, entradaDa, remover, quitar, desfazer } = useContas(tipo)
  const vendas = useDemo((s) => s.vendas)
  const auditoria = useDemo((s) => s.auditoria)
  const podeEditar = usePode("financeiro.editar")
  const [quitando, setQuitando] = React.useState(false)
  const [removendo, setRemovendo] = React.useState(false)
  const c = lista.find((x) => x.id === id)
  if (!c) return <NaoEncontrado titulo={t.titulo} voltar={t.base} />

  const venda = c.vendaId ? vendas.find((v) => v.id === c.vendaId) : undefined
  const entrada = entradaDa(c)
  const historico = auditoria.filter((a) => a.entidade === (tipo === "pagar" ? "conta_pagar" : "conta_receber") && a.entidadeId === id)

  return (
    <DashboardLayout title={c.descricao} trilhaApenas>
      <Ficha
        identidade={
          <Identidade
            selo={<SeloGrande icone={t.modulo.icone} classe={t.modulo.selo} />}
            titulo={c.descricao}
            subtitulo={c.contraparte || "—"}
            badges={<SituacaoContaBadge conta={{ vencimento: c.vencimento, pagoEm: c.quitadoEm }} tipo={tipo} />}
            destaque={formatPrice(c.valorCents)}
            destaqueRotulo={`Vence em ${formatDate(c.vencimento)}`}
            acoes={
              podeEditar && (
                <>
                  {c.quitadoEm ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        desfazer(c.id)
                        toast.success("A conta voltou para em aberto")
                      }}
                    >
                      <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                      {t.desfazer}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setQuitando(true)}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      {t.quitar}
                    </Button>
                  )}
                  <EditAction href={`${t.base}/${c.id}/edicao`} variant="outline" />
                </>
              )
            }
          >
            <div>
              <LinhaInfo rotulo={t.classeRotulo}>{t.classes[c.classe] ?? c.classe}</LinhaInfo>
              <LinhaInfo rotulo="Forma">{rotuloForma(c.forma)}</LinhaInfo>
              {c.quitadoEm && <LinhaInfo rotulo={t.quitadoEm}>{formatDate(c.quitadoEm)}</LinhaInfo>}
            </div>
          </Identidade>
        }
        abas={[
          {
            valor: "resumo",
            rotulo: "Resumo",
            conteudo: (
              <>
                {c.vendaId && (
                  <Origem
                    href={`/painel/vendas/${c.vendaId}`}
                    icone={Receipt}
                    titulo={venda ? `Gerada pela venda #${venda.numero}` : "Gerada por uma venda do PDV"}
                    detalhe={
                      venda
                        ? `${formatDateTime(venda.data)} · ${venda.operador} · total ${formatPrice(venda.totalCents)}${venda.status === "cancelada" ? " · cancelada" : ""}`
                        : "Para remover esta conta, cancele a venda."
                    }
                  />
                )}
                {(c.entradaId || entrada) && (
                  <Origem
                    href={entrada ? `/painel/estoque/${entrada.produtoId}` : undefined}
                    icone={PackagePlus}
                    titulo="Gerada por entrada de mercadoria"
                    detalhe={entrada ? `${entrada.motivo} · ${formatDateTime(entrada.data)}` : "A nota de compra lançou esta conta."}
                  />
                )}
                <DetailSection title="Dados da conta">
                  <DetailRow label="Descrição">{c.descricao}</DetailRow>
                  <DetailRow label={t.contraparteRotulo}>{c.contraparte || "—"}</DetailRow>
                  <DetailRow label={t.classeRotulo}>{t.classes[c.classe] ?? c.classe}</DetailRow>
                  <DetailRow label="Valor">{formatPrice(c.valorCents)}</DetailRow>
                  <DetailRow label={tipo === "pagar" ? "Vencimento" : "Data prevista"}>{formatDate(c.vencimento)}</DetailRow>
                  <DetailRow label={t.quitadoEm}>{c.quitadoEm ? `${formatDate(c.quitadoEm)} · ${rotuloForma(c.forma)}` : "Em aberto"}</DetailRow>
                  <DetailRow label="Lançada em">{formatDate(c.criadoEm)}</DetailRow>
                  {c.observacoes && <DetailRow label="Observações">{c.observacoes}</DetailRow>}
                </DetailSection>
              </>
            ),
          },
          {
            valor: "historico",
            rotulo: "Histórico",
            contagem: historico.length,
            conteudo: <AuditTimeline entries={historico} semLink vazio="Esta conta ainda não teve alterações registradas." />,
          },
        ]}
      />
      {podeEditar && (
        <div className="mt-6 flex justify-end">
          <DeleteAction onClick={() => setRemovendo(true)} label="Remover conta" />
        </div>
      )}

      <DialogoQuitar tipo={tipo} conta={quitando ? c : null} onOpenChange={setQuitando} onConfirmar={(dt, f) => quitar(c.id, dt, f)} />
      <ConfirmDeleteDialog
        open={removendo}
        onOpenChange={setRemovendo}
        title={`Remover ${t.singular}?`}
        description={`"${c.descricao}" sai da lista e do fluxo de caixa.${entrada ? " O estoque da entrada não é desfeito." : ""}`}
        blockedReason={bloqueioRemocao(c)}
        onConfirm={() => {
          remover(c.id)
          toast.success("Conta removida")
          router.push(t.base)
        }}
      />
    </DashboardLayout>
  )
}
