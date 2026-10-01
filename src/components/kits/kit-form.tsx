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
import { Margem, Previa, fmtPct } from "@/components/produtos/comum"
import { EditorItens, linhasParaItens, novaLinha, type LinhaItem } from "@/components/produtos/editor-itens"
import { formatPrice } from "@/lib/format"
import { useDemo } from "@/store/demo-store"
import { numerosDoKit } from "./numeros"

export function KitForm({ id }: { id?: string }) {
  return (
    <Guard permissao="produtos.editar" titulo={id ? "Editar kit" : "Novo kit"}>
      <Formulario id={id} />
    </Guard>
  )
}

function Formulario({ id }: { id?: string }) {
  const router = useRouter()
  const kits = useDemo((s) => s.kits)
  const produtos = useDemo((s) => s.produtos)
  const salvarKit = useDemo((s) => s.salvarKit)
  const existente = id ? kits.find((k) => k.id === id) : undefined

  const [nome, setNome] = React.useState(existente?.nome ?? "")
  const [descricao, setDescricao] = React.useState(existente?.descricao ?? "")
  const [preco, setPreco] = React.useState(centsParaCampo(existente?.precoCents))
  const [ativo, setAtivo] = React.useState(existente?.ativo ?? true)
  const [linhas, setLinhas] = React.useState<LinhaItem[]>(() =>
    existente?.itens.length ? existente.itens.map((i) => novaLinha(i.produtoId, i.quantidade)) : [novaLinha()]
  )
  const [erros, setErros] = React.useState<Record<string, string>>({})

  if (id && !existente) return <NaoEncontrado titulo="Editar kit" voltar="/painel/kits" />

  // Ativos + os que já estão no kit (um produto desativado não some da composição).
  const escolhiveis = produtos.filter((p) => p.ativo || linhas.some((l) => l.produtoId === p.id))
  const itens = linhasParaItens(linhas)
  const precoCents = campoParaCents(preco)
  const n = numerosDoKit({ id: "", nome, descricao, itens, precoCents, ativo, criadoEm: "" }, produtos)

  function validar() {
    const e: Record<string, string> = {}
    if (!nome.trim()) e.nome = "Dê um nome ao kit."
    if (precoCents <= 0) e.preco = "Informe o preço do combo."
    if (itens.length === 0) e.itens = "Adicione pelo menos um produto com quantidade."
    setErros(e)
    return Object.keys(e).length === 0
  }

  function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validar()) {
      toast.error("Faltam informações — veja os campos marcados.")
      return
    }
    const novoId = salvarKit({ id, nome: nome.trim(), descricao: descricao.trim(), itens, precoCents, ativo })
    toast.success(id ? "Kit atualizado" : "Kit cadastrado")
    router.push(`/painel/kits/${novoId}`)
  }

  const erro = (k: string) => erros[k] && <p className="text-xs text-destructive">{erros[k]}</p>

  return (
    <DashboardLayout
      title={id ? "Editar kit" : "Novo kit"}
      description={id ? existente?.nome : "Os campos com * são obrigatórios"}
      degrauExtra={id && existente ? { title: existente.nome, url: `/painel/kits/${id}` } : undefined}
    >
      <form onSubmit={enviar} className={FORM_MOLDE}>
        <div className="grid flex-1 bg-card md:grid-cols-2 md:divide-x">
          <div className="space-y-8 px-4 py-6 md:px-6">
            <Bloco titulo="O combo" descricao="Como ele aparece no PDV.">
              <CampoEmpilhado label="Nome" required largo>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Balde 6 Heineken" aria-invalid={!!erros.nome} />
                {erro("nome")}
              </CampoEmpilhado>
              <CampoEmpilhado label="Descrição" largo>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="O que vem no combo" />
              </CampoEmpilhado>
              <CampoEmpilhado label="Preço do combo" required>
                <CurrencyInput value={preco} onChange={setPreco} error={!!erros.preco} />
                {erro("preco")}
              </CampoEmpilhado>
              <Interruptor rotulo="Kit ativo" descricao="Inativo some do PDV." marcado={ativo} onMarcar={setAtivo} />
              <Previa
                titulo="Prévia"
                linhas={[
                  { rotulo: "Custo do kit", valor: formatPrice(n.custo), forte: true },
                  { rotulo: "Margem", valor: precoCents > 0 ? <Margem pct={n.margem} /> : "—", forte: true },
                  { rotulo: "Lucro por kit", valor: precoCents > 0 ? formatPrice(n.lucro) : "—" },
                  { rotulo: "Avulso sairia", valor: formatPrice(n.avulso) },
                  {
                    rotulo: "Cliente economiza",
                    valor: precoCents > 0 && n.economia > 0 ? `${formatPrice(n.economia)} (${fmtPct(n.economiaPct)})` : "—",
                  },
                  { rotulo: "Dá para montar", valor: itens.length ? `${n.daPara} ${n.daPara === 1 ? "kit" : "kits"}` : "—", dica: "Com o estoque de agora." },
                ]}
              />
            </Bloco>
          </div>
          <div className="space-y-8 border-t px-4 py-6 md:border-t-0 md:px-6">
            <Bloco titulo="Composição" descricao="Produtos inteiros que saem do estoque a cada kit vendido.">
              <EditorItens modo="kit" linhas={linhas} onChange={setLinhas} produtos={escolhiveis} erro={erros.itens} />
            </Bloco>
          </div>
        </div>
        <FormFooter submitLabel={id ? "Salvar alterações" : "Cadastrar kit"} onCancel={() => router.back()} />
      </form>
    </DashboardLayout>
  )
}
