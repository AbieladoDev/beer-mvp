"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { CurrencyInput, NumberInput } from "@/components/ui/currency-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bloco, CampoEmpilhado, FORM_MOLDE, FormFooter, Interruptor } from "@/components/common/form-layout"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Guard, NaoEncontrado, campoParaCents, centsParaCampo } from "@/components/apae/comum"
import { CATEGORIA_PRODUTO, CATEGORIAS_PRODUTO, UNIDADES } from "@/data/catalogo"
import type { CategoriaProduto, Produto, UnidadeProduto } from "@/data/tipos"
import { custoPorMl, lucroCents, margemPct, precoPorMl } from "@/lib/derivados"
import { formatPrice } from "@/lib/format"
import { useDemo } from "@/store/demo-store"
import { Margem, Previa, campoParaQtd, fmtCentavosFrac, qtdParaCampo } from "./comum"

/** Margem-alvo da dose sugerida — referência de bar, não regra. */
const MARGEM_ALVO_DOSE = 0.7
const DOSE_ML = 50

export function ProdutoForm({ id }: { id?: string }) {
  return (
    <Guard permissao="produtos.editar" titulo={id ? "Editar produto" : "Novo produto"}>
      <Formulario id={id} />
    </Guard>
  )
}

function Formulario({ id }: { id?: string }) {
  const router = useRouter()
  const produtos = useDemo((s) => s.produtos)
  const salvarProduto = useDemo((s) => s.salvarProduto)
  const ajustarEstoque = useDemo((s) => s.ajustarEstoque)
  const existente = id ? produtos.find((p) => p.id === id) : undefined

  const [nome, setNome] = React.useState(existente?.nome ?? "")
  const [categoria, setCategoria] = React.useState<CategoriaProduto>(existente?.categoria ?? "cerveja")
  const [marca, setMarca] = React.useState(existente?.marca ?? "")
  const [unidade, setUnidade] = React.useState<UnidadeProduto>(existente?.unidade ?? "un")
  const [volume, setVolume] = React.useState(qtdParaCampo(existente?.volumeMl))
  const [custo, setCusto] = React.useState(centsParaCampo(existente?.custoCents))
  const [preco, setPreco] = React.useState(centsParaCampo(existente?.precoVendaCents))
  const [vendeAvulso, setVendeAvulso] = React.useState(existente?.vendeAvulso ?? true)
  const [estoqueInicial, setEstoqueInicial] = React.useState("")
  const [minimo, setMinimo] = React.useState(qtdParaCampo(existente?.estoqueMinimo))
  const [fornecedor, setFornecedor] = React.useState(existente?.fornecedor ?? "")
  const [codigoBarras, setCodigoBarras] = React.useState(existente?.codigoBarras ?? "")
  const [ativo, setAtivo] = React.useState(existente?.ativo ?? true)
  const [erros, setErros] = React.useState<Record<string, string>>({})

  if (id && !existente) return <NaoEncontrado titulo="Editar produto" voltar="/painel/produtos" />

  const custoCents = campoParaCents(custo)
  const precoCents = campoParaCents(preco)
  const volumeMl = Math.max(0, Math.round(campoParaQtd(volume)))
  // Só os campos que custoPorMl/precoPorMl leem.
  const simulado = { volumeMl, custoCents, precoVendaCents: precoCents } as Produto
  const cpm = custoPorMl(simulado)
  const ppm = precoPorMl(simulado)
  const doseSugerida = Math.round((cpm * DOSE_ML) / (1 - MARGEM_ALVO_DOSE))
  const fornecedores = Array.from(new Set(produtos.map((p) => p.fornecedor).filter(Boolean))).sort()

  function validar() {
    const e: Record<string, string> = {}
    if (!nome.trim()) e.nome = "Dê um nome ao produto."
    if (custoCents <= 0) e.custo = "Informe quanto custa uma unidade."
    if (vendeAvulso && precoCents <= 0) e.preco = "Produto vendido no PDV precisa de preço."
    setErros(e)
    return Object.keys(e).length === 0
  }

  function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validar()) {
      toast.error("Faltam informações — veja os campos marcados.")
      return
    }
    const novoId = salvarProduto({
      id,
      nome: nome.trim(),
      categoria,
      marca: marca.trim(),
      unidade,
      volumeMl,
      custoCents,
      precoVendaCents: precoCents,
      vendeAvulso,
      // O estoque só muda por movimentação; no cadastro ele nasce zerado e o
      // inicial entra como ajuste, para aparecer no histórico.
      estoque: existente?.estoque ?? 0,
      estoqueMinimo: Math.max(0, campoParaQtd(minimo)),
      fornecedor: fornecedor.trim(),
      codigoBarras: codigoBarras.trim(),
      ativo,
    })
    const inicial = campoParaQtd(estoqueInicial)
    if (!id && inicial > 0) ajustarEstoque(novoId, inicial, "Estoque inicial do cadastro")
    toast.success(id ? "Produto atualizado" : "Produto cadastrado")
    router.push(`/painel/produtos/${novoId}`)
  }

  const erro = (k: string) => erros[k] && <p className="text-xs text-destructive">{erros[k]}</p>

  return (
    <DashboardLayout
      title={id ? "Editar produto" : "Novo produto"}
      description={id ? existente?.nome : "Os campos com * são obrigatórios"}
      degrauExtra={id && existente ? { title: existente.nome, url: `/painel/produtos/${id}` } : undefined}
    >
      <form onSubmit={enviar} className={FORM_MOLDE}>
        <div className="grid flex-1 bg-card md:grid-cols-2 md:divide-x">
          <div className="space-y-8 px-4 py-6 md:px-6">
            <Bloco titulo="O produto" descricao="Como ele aparece na lista, no PDV e na nota do fornecedor.">
              <CampoEmpilhado label="Nome" required largo>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Heineken Long Neck 330ml" aria-invalid={!!erros.nome} />
                {erro("nome")}
              </CampoEmpilhado>
              <CampoEmpilhado label="Categoria" required>
                <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaProduto)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_PRODUTO.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORIA_PRODUTO[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CampoEmpilhado>
              <CampoEmpilhado label="Marca">
                <Input value={marca} onChange={(e) => setMarca(e.target.value)} />
              </CampoEmpilhado>
              <CampoEmpilhado label="Unidade" required hint="Como o estoque é contado: garrafa, lata, barril…">
                <Select value={unidade} onValueChange={(v) => setUnidade(v as UnidadeProduto)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CampoEmpilhado>
              <CampoEmpilhado label="Volume da unidade" hint="Preencha para usar em dose nos drinks (o custo por ml sai daqui).">
                <NumberInput value={volume} onChange={setVolume} suffix="ml" />
              </CampoEmpilhado>
              <CampoEmpilhado label="Fornecedor">
                <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} list="fornecedores" />
                <datalist id="fornecedores">
                  {fornecedores.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </CampoEmpilhado>
              <CampoEmpilhado label="Código de barras">
                <Input value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} inputMode="numeric" />
              </CampoEmpilhado>
              <Interruptor rotulo="Produto ativo" descricao="Inativo some do PDV e das escolhas de kit e drink, mas mantém o histórico." marcado={ativo} onMarcar={setAtivo} />
            </Bloco>
          </div>

          <div className="space-y-8 border-t px-4 py-6 md:border-t-0 md:px-6">
            <Bloco titulo="Custo e preço" descricao="O custo é atualizado sozinho pela média a cada entrada de mercadoria.">
              <CampoEmpilhado label="Custo da unidade" required>
                <CurrencyInput value={custo} onChange={setCusto} error={!!erros.custo} />
                {erro("custo")}
              </CampoEmpilhado>
              <CampoEmpilhado label="Preço de venda" required={vendeAvulso}>
                <CurrencyInput value={preco} onChange={setPreco} error={!!erros.preco} />
                {erro("preco")}
              </CampoEmpilhado>
              <Interruptor
                rotulo="Vende no PDV"
                descricao="Desligue para insumo (gelo, limão, xarope) que só entra em drink."
                marcado={vendeAvulso}
                onMarcar={setVendeAvulso}
              />
              <Previa
                titulo="Prévia"
                linhas={[
                  { rotulo: "Margem", valor: precoCents > 0 ? <Margem pct={margemPct(precoCents, custoCents)} /> : "—", forte: true },
                  { rotulo: "Lucro por unidade", valor: precoCents > 0 ? formatPrice(lucroCents(precoCents, custoCents)) : "—", forte: true },
                  ...(volumeMl > 0
                    ? [
                        { rotulo: "Custo por ml", valor: fmtCentavosFrac(cpm) },
                        { rotulo: "Preço por ml", valor: precoCents > 0 ? fmtCentavosFrac(ppm) : "—" },
                        {
                          rotulo: `Dose de ${DOSE_ML} ml`,
                          valor: custoCents > 0 ? formatPrice(doseSugerida) : "—",
                          dica: `Sugestão para margem de ${MARGEM_ALVO_DOSE * 100}% (custo ${formatPrice(Math.round(cpm * DOSE_ML))}).`,
                        },
                      ]
                    : []),
                ]}
              />
            </Bloco>

            <Bloco titulo="Estoque" descricao="Abaixo do mínimo, o produto aparece em alerta e o dono recebe o aviso.">
              {!id && (
                <CampoEmpilhado label="Estoque inicial" hint="O que já está na prateleira hoje. Entra como ajuste no histórico.">
                  <NumberInput value={estoqueInicial} onChange={setEstoqueInicial} suffix={unidade} />
                </CampoEmpilhado>
              )}
              <CampoEmpilhado label="Estoque mínimo">
                <NumberInput value={minimo} onChange={setMinimo} suffix={unidade} />
              </CampoEmpilhado>
              {id && existente && (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  O estoque atual muda só por entrada, ajuste, perda ou venda — assim o histórico bate. Use as ações da ficha do produto.
                </p>
              )}
            </Bloco>
          </div>
        </div>
        <FormFooter submitLabel={id ? "Salvar alterações" : "Cadastrar produto"} onCancel={() => router.back()} />
      </form>
    </DashboardLayout>
  )
}
