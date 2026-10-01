import type {
  Auditoria,
  ContaPagar,
  ContaReceber,
  Drink,
  FormaPagamento,
  ItemVenda,
  Kit,
  MovEstoque,
  Notificacao,
  Produto,
  Venda,
} from "./tipos"
import { dataISO } from "@/lib/datas"
import { LIQUIDACAO, custoDoDrinkCents, custoDoKitCents } from "@/lib/derivados"

/**
 * DADOS DE DEMONSTRAÇÃO — FICTÍCIOS (pedido do Arthur: "dados irreais, mas
 * completinho").
 *
 * As datas são relativas a HOJE, para o painel sempre parecer vivo: 90 dias de
 * vendas (sexta e sábado cheios), contas vencendo esta semana, uma vencida,
 * produto abaixo do mínimo. O sorteio usa semente FIXA: restaurar a demo dá
 * sempre os mesmos números no mesmo dia.
 *
 * ⚠️ O histórico de vendas NÃO baixa o estoque do seed — o estoque atual é
 * escrito à mão. Só a venda feita no PDV da demo mexe no estoque.
 */

function dia(offset: number): string {
  const b = new Date()
  return dataISO(new Date(b.getFullYear(), b.getMonth(), b.getDate() + offset))
}

function instante(offsetDias: number, hora: number, minuto: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  d.setHours(hora, minuto, 0, 0)
  return d.toISOString()
}

/** mulberry32 — sorteio com semente, para a demo ser reproduzível. */
function sorteio(semente: number) {
  let a = semente
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface DadosDemo {
  produtos: Produto[]
  kits: Kit[]
  drinks: Drink[]
  vendas: Venda[]
  movsEstoque: MovEstoque[]
  contasPagar: ContaPagar[]
  contasReceber: ContaReceber[]
  auditoria: Auditoria[]
  notificacoes: Notificacao[]
  lidas: Record<string, string[]>
  /** Próximo número de venda do PDV. */
  proximaVenda: number
  seq: number
}

type P = Omit<Produto, "ativo" | "criadoEm" | "codigoBarras"> & { codigoBarras?: string }

const PRODUTOS: P[] = [
  // ---------------- cervejas
  { id: "pr01", nome: "Heineken Long Neck 330ml", categoria: "cerveja", marca: "Heineken", unidade: "long neck", volumeMl: 330, custoCents: 520, precoVendaCents: 1400, vendeAvulso: true, estoque: 96, estoqueMinimo: 48, fornecedor: "Distribuidora Serra Gaúcha" },
  { id: "pr02", nome: "Stella Artois Long Neck 330ml", categoria: "cerveja", marca: "Stella Artois", unidade: "long neck", volumeMl: 330, custoCents: 480, precoVendaCents: 1300, vendeAvulso: true, estoque: 72, estoqueMinimo: 48, fornecedor: "Distribuidora Serra Gaúcha" },
  { id: "pr03", nome: "Corona Extra Long Neck 330ml", categoria: "cerveja", marca: "Corona", unidade: "long neck", volumeMl: 330, custoCents: 560, precoVendaCents: 1500, vendeAvulso: true, estoque: 30, estoqueMinimo: 36, fornecedor: "Distribuidora Serra Gaúcha" },
  { id: "pr04", nome: "Original 600ml", categoria: "cerveja", marca: "Original", unidade: "garrafa", volumeMl: 600, custoCents: 790, precoVendaCents: 1900, vendeAvulso: true, estoque: 48, estoqueMinimo: 24, fornecedor: "Distribuidora Serra Gaúcha" },
  { id: "pr05", nome: "IPA Degga da Casa 473ml", categoria: "cerveja", marca: "Degga", unidade: "lata", volumeMl: 473, custoCents: 1150, precoVendaCents: 2800, vendeAvulso: true, estoque: 40, estoqueMinimo: 24, fornecedor: "Cervejaria Vale do Sinos" },
  { id: "pr06", nome: "APA Hop Session 473ml", categoria: "cerveja", marca: "Vale do Sinos", unidade: "lata", volumeMl: 473, custoCents: 1080, precoVendaCents: 2600, vendeAvulso: true, estoque: 18, estoqueMinimo: 24, fornecedor: "Cervejaria Vale do Sinos" },
  { id: "pr07", nome: "Weiss de Trigo 500ml", categoria: "cerveja", marca: "Vale do Sinos", unidade: "garrafa", volumeMl: 500, custoCents: 1240, precoVendaCents: 2900, vendeAvulso: true, estoque: 22, estoqueMinimo: 12, fornecedor: "Cervejaria Vale do Sinos" },
  { id: "pr08", nome: "Stout Café 473ml", categoria: "cerveja", marca: "Vale do Sinos", unidade: "lata", volumeMl: 473, custoCents: 1320, precoVendaCents: 3200, vendeAvulso: true, estoque: 0, estoqueMinimo: 12, fornecedor: "Cervejaria Vale do Sinos" },
  // ---------------- chope (barril, servido por dose nos drinks "Chope 300/500ml")
  { id: "pr09", nome: "Barril Chope Pilsen 50L", categoria: "chope", marca: "Degga", unidade: "barril", volumeMl: 50000, custoCents: 48000, precoVendaCents: 0, vendeAvulso: false, estoque: 2.6, estoqueMinimo: 1, fornecedor: "Cervejaria Vale do Sinos" },
  { id: "pr10", nome: "Barril Chope IPA 30L", categoria: "chope", marca: "Degga", unidade: "barril", volumeMl: 30000, custoCents: 42000, precoVendaCents: 0, vendeAvulso: false, estoque: 1.4, estoqueMinimo: 1, fornecedor: "Cervejaria Vale do Sinos" },
  // ---------------- destilados (garrafa fechada + dose nos drinks)
  { id: "pr11", nome: "Gin Tanqueray 750ml", categoria: "destilado", marca: "Tanqueray", unidade: "garrafa", volumeMl: 750, custoCents: 11900, precoVendaCents: 22000, vendeAvulso: true, estoque: 7.4, estoqueMinimo: 4, fornecedor: "Adega Central Distribuição" },
  { id: "pr12", nome: "Gin Bombay Sapphire 750ml", categoria: "destilado", marca: "Bombay", unidade: "garrafa", volumeMl: 750, custoCents: 10900, precoVendaCents: 20000, vendeAvulso: true, estoque: 3.2, estoqueMinimo: 4, fornecedor: "Adega Central Distribuição" },
  { id: "pr13", nome: "Vodka Absolut 1L", categoria: "destilado", marca: "Absolut", unidade: "garrafa", volumeMl: 1000, custoCents: 8900, precoVendaCents: 16000, vendeAvulso: true, estoque: 6.1, estoqueMinimo: 3, fornecedor: "Adega Central Distribuição" },
  { id: "pr14", nome: "Rum Bacardi Carta Blanca 980ml", categoria: "destilado", marca: "Bacardi", unidade: "garrafa", volumeMl: 980, custoCents: 5400, precoVendaCents: 11000, vendeAvulso: true, estoque: 4.5, estoqueMinimo: 2, fornecedor: "Adega Central Distribuição" },
  { id: "pr15", nome: "Cachaça Salinas 600ml", categoria: "destilado", marca: "Salinas", unidade: "garrafa", volumeMl: 600, custoCents: 3900, precoVendaCents: 8500, vendeAvulso: true, estoque: 5.8, estoqueMinimo: 3, fornecedor: "Adega Central Distribuição" },
  { id: "pr16", nome: "Whisky Jack Daniel's 1L", categoria: "destilado", marca: "Jack Daniel's", unidade: "garrafa", volumeMl: 1000, custoCents: 14900, precoVendaCents: 28000, vendeAvulso: true, estoque: 3.7, estoqueMinimo: 2, fornecedor: "Adega Central Distribuição" },
  { id: "pr17", nome: "Campari 900ml", categoria: "destilado", marca: "Campari", unidade: "garrafa", volumeMl: 900, custoCents: 5600, precoVendaCents: 0, vendeAvulso: false, estoque: 2.3, estoqueMinimo: 1, fornecedor: "Adega Central Distribuição" },
  { id: "pr18", nome: "Vermute Rosso 1L", categoria: "destilado", marca: "Martini", unidade: "garrafa", volumeMl: 1000, custoCents: 4200, precoVendaCents: 0, vendeAvulso: false, estoque: 1.8, estoqueMinimo: 1, fornecedor: "Adega Central Distribuição" },
  // ---------------- vinho
  { id: "pr19", nome: "Vinho Tinto Cabernet 750ml", categoria: "vinho", marca: "Serra Alta", unidade: "garrafa", volumeMl: 750, custoCents: 3800, precoVendaCents: 8900, vendeAvulso: true, estoque: 14, estoqueMinimo: 6, fornecedor: "Vinícola Serra Alta" },
  { id: "pr20", nome: "Espumante Brut 750ml", categoria: "vinho", marca: "Serra Alta", unidade: "garrafa", volumeMl: 750, custoCents: 4200, precoVendaCents: 9800, vendeAvulso: true, estoque: 9, estoqueMinimo: 6, fornecedor: "Vinícola Serra Alta" },
  // ---------------- sem álcool
  { id: "pr21", nome: "Água Tônica 350ml", categoria: "nao_alcoolico", marca: "Schweppes", unidade: "lata", volumeMl: 350, custoCents: 290, precoVendaCents: 800, vendeAvulso: true, estoque: 84, estoqueMinimo: 48, fornecedor: "Distribuidora Serra Gaúcha" },
  { id: "pr22", nome: "Refrigerante Cola 350ml", categoria: "nao_alcoolico", marca: "Coca-Cola", unidade: "lata", volumeMl: 350, custoCents: 310, precoVendaCents: 800, vendeAvulso: true, estoque: 120, estoqueMinimo: 48, fornecedor: "Distribuidora Serra Gaúcha" },
  { id: "pr23", nome: "Ginger Beer 350ml", categoria: "nao_alcoolico", marca: "Fever-Tree", unidade: "lata", volumeMl: 350, custoCents: 690, precoVendaCents: 1500, vendeAvulso: true, estoque: 36, estoqueMinimo: 24, fornecedor: "Distribuidora Serra Gaúcha" },
  { id: "pr24", nome: "Energético 250ml", categoria: "nao_alcoolico", marca: "Red Bull", unidade: "lata", volumeMl: 250, custoCents: 620, precoVendaCents: 1400, vendeAvulso: true, estoque: 48, estoqueMinimo: 24, fornecedor: "Distribuidora Serra Gaúcha" },
  { id: "pr25", nome: "Água Mineral 500ml", categoria: "nao_alcoolico", marca: "Fonte Clara", unidade: "un", volumeMl: 0, custoCents: 120, precoVendaCents: 500, vendeAvulso: true, estoque: 140, estoqueMinimo: 48, fornecedor: "Distribuidora Serra Gaúcha" },
  // ---------------- petiscos
  { id: "pr26", nome: "Porção de Batata Frita", categoria: "petisco", marca: "Cozinha Degga", unidade: "un", volumeMl: 0, custoCents: 950, precoVendaCents: 3200, vendeAvulso: true, estoque: 40, estoqueMinimo: 15, fornecedor: "Frigorífico Sul" },
  { id: "pr27", nome: "Porção de Calabresa", categoria: "petisco", marca: "Cozinha Degga", unidade: "un", volumeMl: 0, custoCents: 1400, precoVendaCents: 3900, vendeAvulso: true, estoque: 25, estoqueMinimo: 10, fornecedor: "Frigorífico Sul" },
  { id: "pr28", nome: "Amendoim Torrado", categoria: "petisco", marca: "Cozinha Degga", unidade: "un", volumeMl: 0, custoCents: 280, precoVendaCents: 1200, vendeAvulso: true, estoque: 60, estoqueMinimo: 20, fornecedor: "Atacado Bom Preço" },
  // ---------------- insumos (só entram em drink)
  { id: "pr29", nome: "Limão Taiti", categoria: "insumo", marca: "Hortifruti", unidade: "un", volumeMl: 0, custoCents: 45, precoVendaCents: 0, vendeAvulso: false, estoque: 160, estoqueMinimo: 60, fornecedor: "Ceasa — Hortifruti Silva" },
  { id: "pr30", nome: "Gelo em Cubos 5kg", categoria: "insumo", marca: "Gelo Polar", unidade: "pacote", volumeMl: 0, custoCents: 1200, precoVendaCents: 0, vendeAvulso: false, estoque: 22, estoqueMinimo: 10, fornecedor: "Gelo Polar" },
  { id: "pr31", nome: "Açúcar Refinado 1kg", categoria: "insumo", marca: "União", unidade: "kg", volumeMl: 0, custoCents: 590, precoVendaCents: 0, vendeAvulso: false, estoque: 6, estoqueMinimo: 3, fornecedor: "Atacado Bom Preço" },
  { id: "pr32", nome: "Xarope de Gengibre 700ml", categoria: "insumo", marca: "Monin", unidade: "garrafa", volumeMl: 700, custoCents: 4800, precoVendaCents: 0, vendeAvulso: false, estoque: 1.2, estoqueMinimo: 1, fornecedor: "Adega Central Distribuição" },
]

const KITS: Omit<Kit, "ativo" | "criadoEm">[] = [
  { id: "kt1", nome: "Balde 6 Heineken", descricao: "6 long necks no balde com gelo.", itens: [{ produtoId: "pr01", quantidade: 6 }], precoCents: 7500 },
  { id: "kt2", nome: "Balde Misto 6 Long Necks", descricao: "2 Heineken, 2 Stella e 2 Corona.", itens: [{ produtoId: "pr01", quantidade: 2 }, { produtoId: "pr02", quantidade: 2 }, { produtoId: "pr03", quantidade: 2 }], precoCents: 7800 },
  { id: "kt3", nome: "Combo Gin Tanqueray", descricao: "Garrafa de Tanqueray + 6 tônicas.", itens: [{ produtoId: "pr11", quantidade: 1 }, { produtoId: "pr21", quantidade: 6 }], precoCents: 24900 },
  { id: "kt4", nome: "Kit Degua — Artesanais", descricao: "1 IPA da casa, 1 APA e 1 Weiss + amendoim.", itens: [{ produtoId: "pr05", quantidade: 1 }, { produtoId: "pr06", quantidade: 1 }, { produtoId: "pr07", quantidade: 1 }, { produtoId: "pr28", quantidade: 1 }], precoCents: 8900 },
  { id: "kt5", nome: "Combo Whisky + Energético", descricao: "Jack Daniel's 1L + 4 energéticos.", itens: [{ produtoId: "pr16", quantidade: 1 }, { produtoId: "pr24", quantidade: 4 }], precoCents: 31900 },
]

const DRINKS: Omit<Drink, "ativo" | "criadoEm">[] = [
  { id: "dr1", nome: "Chope Pilsen 300ml", descricao: "Tulipa de 300 ml.", itens: [{ produtoId: "pr09", quantidade: 300 }], precoCents: 1200 },
  { id: "dr2", nome: "Chope Pilsen 500ml", descricao: "Caneca de 500 ml.", itens: [{ produtoId: "pr09", quantidade: 500 }], precoCents: 1800 },
  { id: "dr3", nome: "Chope IPA 400ml", descricao: "Copo americano de 400 ml.", itens: [{ produtoId: "pr10", quantidade: 400 }], precoCents: 2400 },
  { id: "dr4", nome: "Gin Tônica", descricao: "Tanqueray, tônica, limão e gelo.", itens: [{ produtoId: "pr11", quantidade: 50 }, { produtoId: "pr21", quantidade: 200 }, { produtoId: "pr29", quantidade: 0.5 }, { produtoId: "pr30", quantidade: 0.05 }], precoCents: 3200 },
  { id: "dr5", nome: "Caipirinha de Cachaça", descricao: "Salinas, limão, açúcar e gelo.", itens: [{ produtoId: "pr15", quantidade: 60 }, { produtoId: "pr29", quantidade: 1 }, { produtoId: "pr31", quantidade: 0.03 }, { produtoId: "pr30", quantidade: 0.05 }], precoCents: 2200 },
  { id: "dr6", nome: "Caipiroska", descricao: "Absolut, limão, açúcar e gelo.", itens: [{ produtoId: "pr13", quantidade: 60 }, { produtoId: "pr29", quantidade: 1 }, { produtoId: "pr31", quantidade: 0.03 }, { produtoId: "pr30", quantidade: 0.05 }], precoCents: 2600 },
  { id: "dr7", nome: "Moscow Mule", descricao: "Absolut, ginger beer, xarope de gengibre e limão.", itens: [{ produtoId: "pr13", quantidade: 50 }, { produtoId: "pr23", quantidade: 150 }, { produtoId: "pr32", quantidade: 15 }, { produtoId: "pr29", quantidade: 0.5 }, { produtoId: "pr30", quantidade: 0.05 }], precoCents: 3400 },
  { id: "dr8", nome: "Negroni", descricao: "Gin, Campari e vermute em partes iguais.", itens: [{ produtoId: "pr11", quantidade: 30 }, { produtoId: "pr17", quantidade: 30 }, { produtoId: "pr18", quantidade: 30 }, { produtoId: "pr30", quantidade: 0.03 }], precoCents: 3600 },
  { id: "dr9", nome: "Cuba Libre", descricao: "Bacardi, cola e limão.", itens: [{ produtoId: "pr14", quantidade: 50 }, { produtoId: "pr22", quantidade: 200 }, { produtoId: "pr29", quantidade: 0.5 }, { produtoId: "pr30", quantidade: 0.05 }], precoCents: 2600 },
  { id: "dr10", nome: "Dose de Whisky", descricao: "Jack Daniel's, 50 ml.", itens: [{ produtoId: "pr16", quantidade: 50 }], precoCents: 2800 },
]

const OPERADORES = ["Bruno Teixeira", "Larissa Prado", "Camila Rocha"]

export function gerarSeed(): DadosDemo {
  const rnd = sorteio(20261001)
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]

  const produtos: Produto[] = PRODUTOS.map((p, i) => ({
    ...p,
    codigoBarras: p.codigoBarras ?? `789${String(1000000000 + i * 7919).slice(0, 10)}`,
    ativo: true,
    criadoEm: dia(-120),
  }))
  const kits: Kit[] = KITS.map((k) => ({ ...k, ativo: true, criadoEm: dia(-90) }))
  const drinks: Drink[] = DRINKS.map((d) => ({ ...d, ativo: true, criadoEm: dia(-90) }))

  // ---------------------------------------------------------------- vendas
  const avulsos = produtos.filter((p) => p.vendeAvulso)
  // Peso de cada tipo de item no ticket do bar: chope e long neck dominam.
  const cardapio: { tipo: ItemVenda["tipo"]; ref: { id: string; nome: string }; preco: number; custo: number; peso: number }[] = [
    ...avulsos.map((p) => ({
      tipo: "produto" as const,
      ref: p,
      preco: p.precoVendaCents,
      custo: p.custoCents,
      peso: p.categoria === "cerveja" ? 6 : p.categoria === "petisco" ? 4 : p.categoria === "nao_alcoolico" ? 3 : 1,
    })),
    ...kits.map((k) => ({ tipo: "kit" as const, ref: k, preco: k.precoCents, custo: custoDoKitCents(k, produtos), peso: 2 })),
    ...drinks.map((d) => ({
      tipo: "drink" as const,
      ref: d,
      preco: d.precoCents,
      custo: custoDoDrinkCents(d, produtos),
      peso: d.nome.startsWith("Chope") ? 9 : 4,
    })),
  ]
  const pesoTotal = cardapio.reduce((t, c) => t + c.peso, 0)
  const sortearItem = () => {
    let r = rnd() * pesoTotal
    for (const c of cardapio) {
      r -= c.peso
      if (r <= 0) return c
    }
    return cardapio[0]
  }
  const sortearForma = (): FormaPagamento => {
    const r = rnd()
    return r < 0.38 ? "pix" : r < 0.68 ? "credito" : r < 0.88 ? "debito" : "dinheiro"
  }

  const vendas: Venda[] = []
  // Recebíveis do histórico agrupados por DIA + FORMA (o lote da maquininha),
  // e não um por venda: mil linhas de "venda #432" não dizem nada no financeiro.
  const lotes = new Map<string, { dia: string; forma: FormaPagamento; bruto: number; vendas: number }>()
  let numero = 1
  for (let d = -90; d <= 0; d++) {
    const data = new Date()
    data.setDate(data.getDate() + d)
    const dow = data.getDay()
    if (dow === 1) continue // segunda: fechado
    const base = dow === 5 || dow === 6 ? 26 : dow === 0 ? 14 : 9
    const qtdVendas = d === 0 ? 6 : Math.round(base + rnd() * base * 0.6)
    for (let v = 0; v < qtdVendas; v++) {
      const nItens = 1 + Math.floor(rnd() * 3)
      const itens: ItemVenda[] = []
      for (let k = 0; k < nItens; k++) {
        const c = sortearItem()
        const ja = itens.find((x) => x.refId === c.ref.id)
        if (ja) {
          ja.quantidade++
          continue
        }
        itens.push({
          tipo: c.tipo,
          refId: c.ref.id,
          nome: c.ref.nome,
          quantidade: 1 + (rnd() < 0.25 ? 1 : 0),
          precoUnitCents: c.preco,
          custoUnitCents: c.custo,
        })
      }
      const subtotal = itens.reduce((t, i) => t + i.precoUnitCents * i.quantidade, 0)
      const desconto = rnd() < 0.06 ? Math.round(subtotal * 0.1) : 0
      const forma = sortearForma()
      const hora = 17 + Math.floor(rnd() * 7)
      const venda: Venda = {
        id: `vd${numero}`,
        numero,
        data: instante(d, hora > 23 ? 23 : hora, Math.floor(rnd() * 60)),
        itens,
        subtotalCents: subtotal,
        descontoCents: desconto,
        totalCents: subtotal - desconto,
        forma,
        operador: pick(OPERADORES),
        status: rnd() < 0.01 ? "cancelada" : "concluida",
      }
      if (venda.status === "cancelada") {
        venda.canceladaEm = venda.data
        venda.motivoCancelamento = "Lançado em duplicidade"
      } else {
        const chave = `${dia(d)}|${forma}`
        const l = lotes.get(chave) ?? { dia: dia(d), forma, bruto: 0, vendas: 0 }
        l.bruto += venda.totalCents
        l.vendas++
        lotes.set(chave, l)
      }
      vendas.push(venda)
      numero++
    }
  }
  vendas.reverse() // mais recente primeiro

  // Acima de todo id do seed (as vendas usam `vd<numero>`), senão o próximo
  // id gerado pelo store colide com uma venda do histórico.
  let seq = numero + 1000
  const id = (p: string) => `${p}${++seq}`
  const hojeISO = dia(0)
  const somar = (iso: string, n: number) => {
    const [a, m, dd] = iso.split("-").map(Number)
    return dataISO(new Date(a, m - 1, dd + n))
  }

  const contasReceber: ContaReceber[] = []
  for (const l of lotes.values()) {
    const liq = LIQUIDACAO[l.forma]
    const taxa = Math.round((l.bruto * liq.taxaPct) / 100)
    const venc = somar(l.dia, liq.dias)
    contasReceber.push({
      id: id("cr"),
      descricao: `Vendas ${l.dia.split("-").reverse().join("/")} — ${{ dinheiro: "Dinheiro", pix: "Pix", debito: "Débito", credito: "Crédito" }[l.forma]} (${l.vendas})`,
      valorCents: l.bruto - taxa,
      vencimento: venc,
      origem: "venda",
      cliente: l.forma === "dinheiro" || l.forma === "pix" ? "Clientes do balcão" : "Adquirente — Stone",
      recebidoEm: venc <= hojeISO ? venc : undefined,
      forma: l.forma,
      observacoes: taxa ? `Bruto ${(l.bruto / 100).toFixed(2)} − taxa ${liq.taxaPct}%` : "",
      criadoEm: l.dia,
    })
  }
  // Eventos fechados (aniversário, confraternização) — receita fora do PDV.
  contasReceber.push(
    { id: id("cr"), descricao: "Reserva — confraternização Construtora Alfa", valorCents: 480000, vencimento: dia(-20), origem: "evento", cliente: "Construtora Alfa Ltda", recebidoEm: dia(-20), forma: "pix", observacoes: "40 pessoas, open chope 3h.", criadoEm: dia(-35) },
    { id: id("cr"), descricao: "Reserva — aniversário Mariana (sinal)", valorCents: 60000, vencimento: dia(-3), origem: "evento", cliente: "Mariana Fontes", observacoes: "Sinal de 50%. Restante no dia.", criadoEm: dia(-10) },
    { id: id("cr"), descricao: "Reserva — happy hour Escritório Lume", valorCents: 220000, vencimento: dia(5), origem: "evento", cliente: "Lume Contabilidade", observacoes: "", criadoEm: dia(-2) },
    { id: id("cr"), descricao: "Reserva — formatura Turma Direito", valorCents: 950000, vencimento: dia(18), origem: "evento", cliente: "Comissão de formatura", observacoes: "Faturado em boleto.", criadoEm: dia(-15) },
  )

  // ---------------------------------------------------------------- contas a pagar
  const contasPagar: ContaPagar[] = []
  const fixas: { descricao: string; categoria: ContaPagar["categoria"]; fornecedor: string; valor: number; diaVenc: number; varia?: number }[] = [
    { descricao: "Aluguel do salão", categoria: "aluguel", fornecedor: "Imobiliária Centro", valor: 650000, diaVenc: 5 },
    { descricao: "Energia elétrica", categoria: "energia", fornecedor: "RGE Sul", valor: 182000, diaVenc: 12, varia: 0.15 },
    { descricao: "Água e esgoto", categoria: "agua", fornecedor: "Corsan", valor: 34000, diaVenc: 15, varia: 0.1 },
    { descricao: "Folha de pagamento", categoria: "folha", fornecedor: "Equipe Degga", valor: 980000, diaVenc: 5 },
    { descricao: "Simples Nacional (DAS)", categoria: "impostos", fornecedor: "Receita Federal", valor: 520000, diaVenc: 20, varia: 0.12 },
    { descricao: "Anúncios Instagram", categoria: "marketing", fornecedor: "Meta Ads", valor: 80000, diaVenc: 10 },
    { descricao: "Sistema e maquininha", categoria: "taxas_cartao", fornecedor: "Stone", valor: 12900, diaVenc: 8 },
  ]
  for (let m = -3; m <= 1; m++) {
    for (const f of fixas) {
      const b = new Date()
      const venc = dataISO(new Date(b.getFullYear(), b.getMonth() + m, f.diaVenc))
      const valor = Math.round(f.valor * (1 + (f.varia ? (rnd() - 0.5) * 2 * f.varia : 0)))
      const pago = venc < hojeISO && !(m === 0 && f.categoria === "energia")
      contasPagar.push({
        id: id("cp"),
        descricao: f.descricao,
        valorCents: valor,
        vencimento: venc,
        categoria: f.categoria,
        fornecedor: f.fornecedor,
        pagoEm: pago ? venc : undefined,
        forma: pago ? (f.categoria === "folha" ? "transferencia" : "boleto") : undefined,
        observacoes: "",
        criadoEm: somar(venc, -20),
      })
    }
  }
  // Compras de mercadoria: semanais, a 21 dias.
  const fornecedoresMerc = [
    { nome: "Distribuidora Serra Gaúcha", min: 180000, max: 420000 },
    { nome: "Cervejaria Vale do Sinos", min: 150000, max: 380000 },
    { nome: "Adega Central Distribuição", min: 90000, max: 260000 },
    { nome: "Frigorífico Sul", min: 40000, max: 90000 },
  ]
  for (let s = -12; s <= 1; s++) {
    for (const f of fornecedoresMerc) {
      if (rnd() < 0.3) continue
      const compra = dia(s * 7 - Math.floor(rnd() * 3))
      const venc = somar(compra, 21)
      const valor = Math.round(f.min + rnd() * (f.max - f.min))
      contasPagar.push({
        id: id("cp"),
        descricao: `Mercadoria — ${f.nome}`,
        valorCents: valor,
        vencimento: venc,
        categoria: "mercadoria",
        fornecedor: f.nome,
        pagoEm: venc < hojeISO ? venc : undefined,
        forma: venc < hojeISO ? "boleto" : undefined,
        observacoes: `NF de ${compra.split("-").reverse().join("/")}`,
        criadoEm: compra,
      })
    }
  }
  contasPagar.push({ id: id("cp"), descricao: "Manutenção da chopeira", valorCents: 45000, vencimento: dia(-2), categoria: "manutencao", fornecedor: "Refrigeração Polar", observacoes: "Troca de borracha e limpeza das linhas.", criadoEm: dia(-9) })
  contasPagar.sort((a, b) => b.vencimento.localeCompare(a.vencimento))
  contasReceber.sort((a, b) => b.vencimento.localeCompare(a.vencimento))

  // ---------------------------------------------------------------- movimentações
  const movsEstoque: MovEstoque[] = [
    { id: id("me"), produtoId: "pr01", tipo: "entrada", quantidade: 96, custoUnitCents: 520, motivo: "NF 4821 — Distribuidora Serra Gaúcha", responsavel: "Larissa Prado", data: instante(-6, 14, 10) },
    { id: id("me"), produtoId: "pr21", tipo: "entrada", quantidade: 48, custoUnitCents: 290, motivo: "NF 4821 — Distribuidora Serra Gaúcha", responsavel: "Larissa Prado", data: instante(-6, 14, 12) },
    { id: id("me"), produtoId: "pr09", tipo: "entrada", quantidade: 2, custoUnitCents: 48000, motivo: "NF 1190 — Cervejaria Vale do Sinos", responsavel: "Diego Degani", data: instante(-4, 11, 30) },
    { id: id("me"), produtoId: "pr11", tipo: "entrada", quantidade: 6, custoUnitCents: 11900, motivo: "NF 772 — Adega Central", responsavel: "Larissa Prado", data: instante(-3, 15, 0) },
    { id: id("me"), produtoId: "pr03", tipo: "perda", quantidade: -2, motivo: "Garrafas quebradas na reposição", responsavel: "Bruno Teixeira", data: instante(-2, 19, 40) },
    { id: id("me"), produtoId: "pr26", tipo: "ajuste", quantidade: -3, motivo: "Contagem de fechamento", responsavel: "Larissa Prado", data: instante(-1, 1, 15) },
  ]
  // As vendas de hoje aparecem no histórico de movimentação.
  for (const v of vendas.filter((x) => x.data.slice(0, 10) === new Date().toISOString().slice(0, 10) && x.status === "concluida")) {
    for (const it of v.itens.filter((i) => i.tipo === "produto")) {
      movsEstoque.push({ id: id("me"), produtoId: it.refId, tipo: "venda", quantidade: -it.quantidade, motivo: `Venda #${v.numero}`, vendaId: v.id, responsavel: v.operador, data: v.data })
    }
  }
  movsEstoque.sort((a, b) => b.data.localeCompare(a.data))

  return {
    produtos,
    kits,
    drinks,
    vendas,
    movsEstoque,
    contasPagar,
    contasReceber,
    auditoria: [],
    notificacoes: [],
    lidas: {},
    proximaVenda: numero,
    seq,
  }
}
