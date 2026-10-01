import type { Perfil } from "@/data/tipos"

/**
 * Quem pode o quê. É o que filtra menu, botões e blocos do dashboard.
 * No sistema real isto vira o registro de permissões da API (padrão Vetro/TodosDan);
 * os NOMES já seguem o formato `recurso.acao` para a migração ser só trocar a fonte.
 */
export type Permissao =
  | "pdv.vender"
  | "vendas.ler"
  | "vendas.cancelar"
  | "produtos.ler"
  | "produtos.editar"
  | "estoque.ler"
  | "estoque.editar"
  | "financeiro.ler"
  | "financeiro.editar"
  | "historico.ler"

export const PERMISSOES: Record<Perfil, Permissao[] | ["*"]> = {
  dono: ["*"],
  gerente: [
    "pdv.vender",
    "vendas.ler",
    "vendas.cancelar",
    "produtos.ler",
    "produtos.editar",
    "estoque.ler",
    "estoque.editar",
    "financeiro.ler",
    "financeiro.editar",
    "historico.ler",
  ],
  // O caixa vende e consulta; não mexe em preço, estoque nem dinheiro.
  caixa: ["pdv.vender", "vendas.ler", "produtos.ler", "estoque.ler"],
}

export function temPermissao(perfil: Perfil | null, p: Permissao | undefined): boolean {
  if (!p) return true
  if (!perfil) return false
  const lista = PERMISSOES[perfil] as string[]
  return lista.includes("*") || lista.includes(p)
}
