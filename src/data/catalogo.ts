import type {
  CategoriaDespesa,
  CategoriaProduto,
  MeioPagamento,
  OrigemReceita,
  Perfil,
  TipoMovEstoque,
  UnidadeProduto,
  Usuario,
} from "./tipos"

/** Os três perfis da demo. O login escolhe um deles. */
export const USUARIOS: Record<Perfil, Usuario> = {
  dono: { perfil: "dono", nome: "Diego Degani", cargo: "Proprietário", email: "diego@deggabeer.com.br" },
  gerente: { perfil: "gerente", nome: "Larissa Prado", cargo: "Gerente", email: "gerencia@deggabeer.com.br" },
  caixa: { perfil: "caixa", nome: "Bruno Teixeira", cargo: "Caixa / atendimento", email: "caixa@deggabeer.com.br" },
}

export const CATEGORIA_PRODUTO: Record<CategoriaProduto, string> = {
  cerveja: "Cervejas",
  chope: "Chope",
  destilado: "Destilados",
  vinho: "Vinhos",
  nao_alcoolico: "Sem álcool",
  petisco: "Petiscos",
  insumo: "Insumos",
}

export const CATEGORIAS_PRODUTO = Object.keys(CATEGORIA_PRODUTO) as CategoriaProduto[]

export const UNIDADES: UnidadeProduto[] = ["un", "lata", "long neck", "garrafa", "barril", "kg", "pacote"]

export const CATEGORIA_DESPESA: Record<CategoriaDespesa, string> = {
  mercadoria: "Mercadoria",
  aluguel: "Aluguel",
  energia: "Energia",
  agua: "Água",
  folha: "Folha de pagamento",
  impostos: "Impostos",
  taxas_cartao: "Taxas de cartão",
  marketing: "Marketing",
  manutencao: "Manutenção",
  outros: "Outros",
}

export const CATEGORIAS_DESPESA = Object.keys(CATEGORIA_DESPESA) as CategoriaDespesa[]

export const ORIGEM_RECEITA: Record<OrigemReceita, string> = {
  venda: "Venda no balcão",
  evento: "Evento / reserva",
  outros: "Outros",
}

export const MEIO_PAGAMENTO: Record<MeioPagamento, string> = {
  pix: "Pix",
  boleto: "Boleto",
  transferencia: "Transferência",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
}

export const TIPO_MOV: Record<TipoMovEstoque, string> = {
  entrada: "Entrada",
  venda: "Venda",
  ajuste: "Ajuste",
  perda: "Perda / quebra",
  estorno: "Estorno de venda",
}
