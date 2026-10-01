/**
 * Tipos do domínio do MVP da Degga Beer. Tudo vive no `demo-store` (zustand +
 * localStorage); não existe API. Dinheiro em CENTAVOS, datas `YYYY-MM-DD`
 * (string), instantes (venda, auditoria, notificação) em ISO completo.
 *
 * ⚠️ ESTOQUE É EM UNIDADES DO PRODUTO (garrafa, lata, barril) e pode ser
 * FRACIONADO: um drink de 50 ml de gin consome 50/750 = 0,0667 garrafa. É o que
 * permite o mesmo número servir à venda da garrafa fechada e à dose.
 */

export type Perfil = "dono" | "gerente" | "caixa"

export interface Usuario {
  perfil: Perfil
  nome: string
  cargo: string
  email: string
}

// ------------------------------------------------------------------ produtos

export type CategoriaProduto =
  | "cerveja"
  | "chope"
  | "destilado"
  | "vinho"
  | "nao_alcoolico"
  | "petisco"
  | "insumo"

export type UnidadeProduto = "un" | "lata" | "long neck" | "garrafa" | "barril" | "kg" | "pacote"

export interface Produto {
  id: string
  nome: string
  categoria: CategoriaProduto
  marca: string
  unidade: UnidadeProduto
  /**
   * Volume de UMA unidade, em ml. Maior que zero = o produto pode ser usado em
   * DOSE nos drinks (o custo por ml sai daqui). Zero = só se usa inteiro
   * (petisco, limão por unidade).
   */
  volumeMl: number
  /** Custo de UMA unidade (o que se pagou). Atualizado por custo médio na entrada. */
  custoCents: number
  /** Preço de venda da unidade no PDV. Ignorado se `vendeAvulso` for falso. */
  precoVendaCents: number
  /** Aparece no PDV como item próprio? Insumo (gelo, xarope) normalmente não. */
  vendeAvulso: boolean
  /** Unidades em estoque — fracionado quando há dose aberta. */
  estoque: number
  estoqueMinimo: number
  fornecedor: string
  codigoBarras: string
  ativo: boolean
  criadoEm: string
}

/** Kit = combo de produtos inteiros vendido por um preço só. */
export interface ItemKit {
  produtoId: string
  quantidade: number
}

export interface Kit {
  id: string
  nome: string
  descricao: string
  itens: ItemKit[]
  precoCents: number
  ativo: boolean
  criadoEm: string
}

/**
 * Drink = receita. `quantidade` é em ML quando o produto tem `volumeMl > 0`, e
 * em UNIDADES quando não tem (1 limão, 0,5 pacote de gelo).
 */
export interface ItemDrink {
  produtoId: string
  quantidade: number
}

export interface Drink {
  id: string
  nome: string
  descricao: string
  itens: ItemDrink[]
  precoCents: number
  ativo: boolean
  criadoEm: string
}

// ------------------------------------------------------------------ vendas

export type TipoItemVenda = "produto" | "kit" | "drink"

export type FormaPagamento = "dinheiro" | "pix" | "debito" | "credito"

export interface ItemVenda {
  tipo: TipoItemVenda
  refId: string
  /** Snapshot do nome: renomear o produto não reescreve a venda antiga. */
  nome: string
  quantidade: number
  precoUnitCents: number
  /** Snapshot do custo na hora da venda — é o que a margem do relatório usa. */
  custoUnitCents: number
}

export type StatusVenda = "concluida" | "cancelada"

export interface Venda {
  id: string
  numero: number
  data: string // ISO
  itens: ItemVenda[]
  subtotalCents: number
  descontoCents: number
  totalCents: number
  forma: FormaPagamento
  operador: string
  status: StatusVenda
  /** A conta a receber que a venda gerou (sempre uma). */
  contaReceberId?: string
  canceladaEm?: string
  motivoCancelamento?: string
}

// ------------------------------------------------------------------ estoque

export type TipoMovEstoque = "entrada" | "venda" | "ajuste" | "perda" | "estorno"

export interface MovEstoque {
  id: string
  produtoId: string
  tipo: TipoMovEstoque
  /** Positivo entra, negativo sai — em unidades do produto (pode ser fração). */
  quantidade: number
  custoUnitCents?: number
  motivo: string
  vendaId?: string
  contaPagarId?: string
  responsavel: string
  data: string // ISO
}

// ------------------------------------------------------------------ financeiro

export type CategoriaDespesa =
  | "mercadoria"
  | "aluguel"
  | "energia"
  | "agua"
  | "folha"
  | "impostos"
  | "taxas_cartao"
  | "marketing"
  | "manutencao"
  | "outros"

export type MeioPagamento = "pix" | "boleto" | "transferencia" | "cartao" | "dinheiro"

export interface ContaPagar {
  id: string
  descricao: string
  valorCents: number
  vencimento: string
  categoria: CategoriaDespesa
  fornecedor: string
  pagoEm?: string
  forma?: MeioPagamento
  observacoes: string
  /** Entrada de mercadoria que gerou a conta. */
  entradaId?: string
  criadoEm: string
}

export type OrigemReceita = "venda" | "evento" | "outros"

export interface ContaReceber {
  id: string
  descricao: string
  valorCents: number
  vencimento: string
  origem: OrigemReceita
  cliente: string
  recebidoEm?: string
  forma?: FormaPagamento | MeioPagamento
  observacoes: string
  vendaId?: string
  criadoEm: string
}

// ------------------------------------------------------------------ auditoria

export type Entidade =
  | "produto"
  | "kit"
  | "drink"
  | "venda"
  | "estoque"
  | "conta_pagar"
  | "conta_receber"

export type AcaoAuditoria =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VENDA"
  | "CANCELAR"
  | "ENTRADA"
  | "AJUSTE"
  | "PERDA"
  | "PAGAR"
  | "RECEBER"

export interface Mudanca {
  campo: string
  de: string
  para: string
}

export interface Auditoria {
  id: string
  entidade: Entidade
  entidadeId: string
  acao: AcaoAuditoria
  rotulo: string
  mudancas?: Mudanca[]
  usuario: string
  perfil: Perfil
  data: string
}

export type TomNotificacao = "info" | "sucesso" | "alerta" | "perigo"

export interface Notificacao {
  id: string
  tom: TomNotificacao
  entidade: Entidade
  titulo: string
  corpo: string
  href: string
  para: Perfil[]
  ator?: string
  data: string
}
