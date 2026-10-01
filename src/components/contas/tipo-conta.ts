"use client"

import * as React from "react"

import { CATEGORIA_DESPESA, MEIO_PAGAMENTO, ORIGEM_RECEITA } from "@/data/catalogo"
import type { CategoriaDespesa, ContaPagar, ContaReceber, FormaPagamento, MeioPagamento, OrigemReceita } from "@/data/tipos"
import { FORMA_LABEL } from "@/lib/derivados"
import { MODULOS } from "@/lib/modulos"
import { useDemo } from "@/store/demo-store"

/**
 * Contas a pagar e a receber são a MESMA tela com vocabulário diferente.
 * Este arquivo é o "dicionário" das duas: um componente só de lista, ficha e
 * formulário, e aqui a diferença (categoria × origem, fornecedor × cliente,
 * paga × recebida).
 */
export type TipoConta = "pagar" | "receber"

export type FormaConta = MeioPagamento | FormaPagamento

export interface ContaView {
  id: string
  descricao: string
  valorCents: number
  vencimento: string
  classe: string
  contraparte: string
  quitadoEm?: string
  forma?: FormaConta
  observacoes: string
  /** Só a receber: venda do PDV que gerou a conta. */
  vendaId?: string
  /** Só a pagar: entrada de mercadoria que gerou a conta. */
  entradaId?: string
  criadoEm: string
}

// Recebimento aceita as formas do PDV (débito/crédito) além dos meios bancários.
const FORMAS_RECEBER: FormaConta[] = ["pix", "dinheiro", "debito", "credito", "transferencia", "boleto"]

export const TIPO = {
  pagar: {
    modulo: MODULOS.pagar,
    base: "/painel/contas-a-pagar",
    singular: "conta a pagar",
    titulo: "Contas a pagar",
    descricao: "Fornecedores, aluguel, folha, impostos e o que mais sai do caixa",
    classeRotulo: "Categoria",
    classes: CATEGORIA_DESPESA as Record<string, string>,
    contraparteRotulo: "Fornecedor",
    contrapartePlaceholder: "Quem vai receber o pagamento",
    formas: Object.keys(MEIO_PAGAMENTO) as FormaConta[],
    quitado: "Paga",
    quitar: "Marcar como paga",
    quitadoEm: "Paga em",
    desfazer: "Desfazer pagamento",
    lancar: "Lançar conta a pagar",
    nova: "Nova conta a pagar",
  },
  receber: {
    modulo: MODULOS.receber,
    base: "/painel/contas-a-receber",
    singular: "conta a receber",
    titulo: "Contas a receber",
    descricao: "Vendas do balcão (cartão e Pix), reservas de eventos e outras entradas",
    classeRotulo: "Origem",
    classes: ORIGEM_RECEITA as Record<string, string>,
    contraparteRotulo: "Cliente",
    contrapartePlaceholder: "Quem paga — cliente, empresa do evento…",
    formas: FORMAS_RECEBER,
    quitado: "Recebida",
    quitar: "Registrar recebimento",
    quitadoEm: "Recebida em",
    desfazer: "Desfazer recebimento",
    lancar: "Lançar conta a receber",
    nova: "Nova conta a receber",
  },
} as const

export const rotuloForma = (f?: string) => (f ? (FORMA_LABEL[f] ?? f) : "—")

function dePagar(c: ContaPagar): ContaView {
  return {
    id: c.id,
    descricao: c.descricao,
    valorCents: c.valorCents,
    vencimento: c.vencimento,
    classe: c.categoria,
    contraparte: c.fornecedor,
    quitadoEm: c.pagoEm,
    forma: c.forma,
    observacoes: c.observacoes,
    entradaId: c.entradaId,
    criadoEm: c.criadoEm,
  }
}

function deReceber(c: ContaReceber): ContaView {
  return {
    id: c.id,
    descricao: c.descricao,
    valorCents: c.valorCents,
    vencimento: c.vencimento,
    classe: c.origem,
    contraparte: c.cliente,
    quitadoEm: c.recebidoEm,
    forma: c.forma,
    observacoes: c.observacoes,
    vendaId: c.vendaId,
    criadoEm: c.criadoEm,
  }
}

export type ContaParaSalvar = Omit<ContaView, "id" | "criadoEm"> & { id?: string }

/** Lista + ações de um tipo de conta, já no formato comum. */
export function useContas(tipo: TipoConta) {
  const pagar = useDemo((s) => s.contasPagar)
  const receber = useDemo((s) => s.contasReceber)
  const movs = useDemo((s) => s.movsEstoque)
  const salvarContaPagar = useDemo((s) => s.salvarContaPagar)
  const salvarContaReceber = useDemo((s) => s.salvarContaReceber)
  const removerContaPagar = useDemo((s) => s.removerContaPagar)
  const removerContaReceber = useDemo((s) => s.removerContaReceber)
  const pagarConta = useDemo((s) => s.pagarConta)
  const receberConta = useDemo((s) => s.receberConta)
  const desfazerPagamento = useDemo((s) => s.desfazerPagamento)
  const desfazerRecebimento = useDemo((s) => s.desfazerRecebimento)

  const lista = React.useMemo(
    () => (tipo === "pagar" ? pagar.map(dePagar) : receber.map(deReceber)),
    [tipo, pagar, receber]
  )

  /**
   * Conta a pagar que veio de entrada de mercadoria. O store grava o vínculo
   * na movimentação (`contaPagarId`), não em `entradaId` — olha os dois.
   */
  const entradaDa = React.useCallback(
    (c: ContaView) => (tipo === "pagar" ? movs.find((m) => m.contaPagarId === c.id && m.tipo === "entrada") : undefined),
    [tipo, movs]
  )

  return {
    lista,
    entradaDa,
    salvar: (v: ContaParaSalvar) => {
      if (tipo === "pagar") {
        return salvarContaPagar({
          id: v.id,
          descricao: v.descricao,
          valorCents: v.valorCents,
          vencimento: v.vencimento,
          categoria: v.classe as CategoriaDespesa,
          fornecedor: v.contraparte,
          pagoEm: v.quitadoEm,
          forma: v.forma as MeioPagamento | undefined,
          observacoes: v.observacoes,
          entradaId: v.entradaId,
        })
      }
      return salvarContaReceber({
        id: v.id,
        descricao: v.descricao,
        valorCents: v.valorCents,
        vencimento: v.vencimento,
        origem: v.classe as OrigemReceita,
        cliente: v.contraparte,
        recebidoEm: v.quitadoEm,
        forma: v.forma,
        observacoes: v.observacoes,
        vendaId: v.vendaId,
      })
    },
    remover: (id: string) => (tipo === "pagar" ? removerContaPagar(id) : removerContaReceber(id)),
    quitar: (id: string, data: string, forma: FormaConta) =>
      tipo === "pagar" ? pagarConta(id, data, forma as MeioPagamento) : receberConta(id, data, forma),
    desfazer: (id: string) => (tipo === "pagar" ? desfazerPagamento(id) : desfazerRecebimento(id)),
  }
}

/** Motivo que bloqueia a remoção (conta gerada por venda). */
export function bloqueioRemocao(c: ContaView | null | undefined): string | undefined {
  return c?.vendaId ? "Esta conta foi gerada por venda; cancele a venda." : undefined
}
