"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Bloco, CampoEmpilhado, FORM_MOLDE, FormFooter, Interruptor } from "@/components/common/form-layout"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Guard, NaoEncontrado, campoParaCents, centsParaCampo } from "@/components/apae/comum"
import { Margem, Previa } from "@/components/produtos/comum"
import { EditorItens, linhasParaItens, novaLinha, type LinhaItem } from "@/components/produtos/editor-itens"
import { formatPrice } from "@/lib/format"
import { useDemo } from "@/store/demo-store"
import { MARGEM_ALVO_DRINK, numerosDoDrink } from "./numeros"

export function DrinkForm({ id }: { id?: string }) {
  return (
    <Guard permissao="produtos.editar" titulo={id ? "Editar drink" : "Novo drink"}>
      <Formulario id={id} />
    </Guard>
  )
}

function Formulario({ id }: { id?: string }) {
  const router = useRouter()
  const drinks = useDemo((s) => s.drinks)
  const produtos = useDemo((s) => s.produtos)
  const salvarDrink = useDemo((s) => s.salvarDrink)
  const existente = id ? drinks.find((d) => d.id === id) : undefined

  const [nome, setNome] = React.useState(existente?.nome ?? "")
  const [descricao, setDescricao] = React.useState(existente?.descricao ?? "")
  const [preco, setPreco] = React.useState(centsParaCampo(existente?.precoCents))
  const [ativo, setAtivo] = React.useState(existente?.ativo ?? true)
  const [linhas, setLinhas] = React.useState<LinhaItem[]>(() =>
    existente?.itens.length ? existente.itens.map((i) => novaLinha(i.produtoId, i.quantidade)) : [novaLinha()]
  )
  const [erros, setErros] = React.useState<Record<string, string>>({})

  if (id && !existente) return <NaoEncontrado titulo="Editar drink" voltar="/painel/drinks" />

  const escolhiveis = produtos.filter((p) => p.ativo || linhas.some((l) => l.produtoId === p.id))
  const itens = linhasParaItens(linhas)
  const precoCents = campoParaCents(preco)
  const n = numerosDoDrink({ id: "", nome, descricao, itens, precoCents, ativo, criadoEm: "" }, produtos)

  function validar() {
    const e: Record<string, string> = {}
    if (!nome.trim()) e.nome = "Dê um nome ao drink."
    if (precoCents <= 0) e.preco = "Informe o preço."
    if (itens.length === 0) e.itens = "Adicione pelo menos um ingrediente com quantidade."
    setErros(e)
    return Object.keys(e).length === 0
  }

  function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validar()) {
      toast.error("Faltam informações — veja os campos marcados.")
      return
    }
    const novoId = salvarDrink({ id, nome: nome.trim(), descricao: descricao.trim(), itens, precoCents, ativo })
    toast.success(id ? "Drink atualizado" : "Drink cadastrado")
    router.push(`/painel/drinks/${novoId}`)
  }

  const erro = (k: string) => erros[k] && <p className="text-xs text-destructive">{erros[k]}</p>

  return (
    <DashboardLayout
      title={id ? "Editar drink" : "Novo drink"}
      description={id ? existente?.nome : "Os campos com * são obrigatórios"}
      degrauExtra={id && existente ? { title: existente.nome, url: `/painel/drinks/${id}` } : undefined}
    >
      <form onSubmit={enviar} className={FORM_MOLDE}>
        <div className="grid flex-1 bg-card md:grid-cols-2 md:divide-x">
          <div className="space-y-8 px-4 py-6 md:px-6">
            <Bloco titulo="O drink" descricao="Como ele aparece no cardápio e no PDV.">
              <CampoEmpilhado label="Nome" required largo>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Gin Tônica" aria-invalid={!!erros.nome} />
                {erro("nome")}
              </CampoEmpilhado>
              <CampoEmpilhado label="Descrição" largo>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="Ingredientes, copo, guarnição" />
              </CampoEmpilhado>
              <CampoEmpilhado label="Preço" required>
                <CurrencyInput value={preco} onChange={setPreco} error={!!erros.preco} />
                {erro("preco")}
              </CampoEmpilhado>
              <Interruptor rotulo="Drink ativo" descricao="Inativo some do PDV." marcado={ativo} onMarcar={setAtivo} />
              <Previa
                titulo="Prévia"
                linhas={[
                  { rotulo: "Custo do drink", valor: formatPrice(n.custo), forte: true },
                  { rotulo: "Margem", valor: precoCents > 0 ? <Margem pct={n.margem} /> : "—", forte: true },
                  { rotulo: "Lucro por drink", valor: precoCents > 0 ? formatPrice(n.lucro) : "—" },
                  {
                    rotulo: "Preço sugerido",
                    valor: n.custo > 0 ? formatPrice(n.sugerido) : "—",
                    dica: `Sugestão para margem de ${MARGEM_ALVO_DRINK * 100}%.`,
                  },
                  { rotulo: "Dá para montar", valor: itens.length ? `${n.daPara} ${n.daPara === 1 ? "drink" : "drinks"}` : "—", dica: "Com o estoque de agora." },
                ]}
              />
            </Bloco>
          </div>
          <div className="space-y-8 border-t px-4 py-6 md:border-t-0 md:px-6">
            <Bloco titulo="Receita" descricao="Destilado e mixer em ml (o produto precisa ter volume); limão, gelo e açúcar em unidade — 0,5 limão, 0,05 pacote de gelo.">
              <EditorItens modo="drink" linhas={linhas} onChange={setLinhas} produtos={escolhiveis} erro={erros.itens} />
            </Bloco>
          </div>
        </div>
        <FormFooter submitLabel={id ? "Salvar alterações" : "Cadastrar drink"} onCancel={() => router.back()} />
      </form>
    </DashboardLayout>
  )
}
