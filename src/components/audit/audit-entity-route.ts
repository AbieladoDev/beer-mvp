import type { AcaoAuditoria, Entidade } from "@/data/tipos"

/** Para onde leva uma linha do histórico. Remoção não leva a lugar nenhum. */
const ROTA: Record<Entidade, (id: string) => string> = {
  produto: (id) => `/painel/produtos/${id}`,
  kit: (id) => `/painel/kits/${id}`,
  drink: (id) => `/painel/drinks/${id}`,
  venda: (id) => `/painel/vendas/${id}`,
  // O `entidadeId` do estoque é o id do PRODUTO: a ficha do produto tem as movimentações.
  estoque: (id) => `/painel/produtos/${id}`,
  conta_pagar: (id) => `/painel/contas-a-pagar/${id}`,
  conta_receber: (id) => `/painel/contas-a-receber/${id}`,
}

export function auditEntityHref(entidade: Entidade, id: string, acao: AcaoAuditoria): string | null {
  if (acao === "DELETE") return null
  return ROTA[entidade]?.(id) ?? null
}

export const ENTIDADE_LABEL: Record<Entidade, string> = {
  produto: "Produto",
  kit: "Kit",
  drink: "Drink",
  venda: "Venda",
  estoque: "Estoque",
  conta_pagar: "Conta a pagar",
  conta_receber: "Conta a receber",
}
