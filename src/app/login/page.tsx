"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Crown, Loader2, ShoppingCart, UserCog, type LucideIcon } from "lucide-react"

import { BrandLogo } from "@/components/common/brand-logo"
import { Button } from "@/components/ui/button"
import { USUARIOS } from "@/data/catalogo"
import type { Perfil } from "@/data/tipos"
import { useSessao } from "@/store/sessao-store"
import { cn } from "@/lib/utils"

/**
 * Login da demo — 30/70 como o da TodosDan: coluna preta com a marca, o resto
 * branco com a escolha de perfil. Não há senha; o perfil decide menu e blocos.
 */

const PRETO = "#0e0e10"

const PERFIS: { perfil: Perfil; icone: LucideIcon; faz: string; destino: string }[] = [
  { perfil: "dono", icone: Crown, faz: "Vê tudo: vendas, margem, estoque e o caixa da casa", destino: "/painel" },
  { perfil: "gerente", icone: UserCog, faz: "Cardápio, estoque, contas e o dia a dia do bar", destino: "/painel" },
  { perfil: "caixa", icone: ShoppingCart, faz: "Abre o PDV e registra as vendas do balcão", destino: "/painel/pdv" },
]

export default function LoginPage() {
  const router = useRouter()
  const entrar = useSessao((s) => s.entrar)
  const [escolhido, setEscolhido] = React.useState<Perfil>("dono")
  const [carregando, setCarregando] = React.useState(false)

  function onEntrar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    entrar(escolhido)
    const destino = PERFIS.find((p) => p.perfil === escolhido)?.destino ?? "/painel"
    setTimeout(() => router.push(destino), 300)
  }

  return (
    <div className="fixed inset-0 flex bg-white text-[#09090b]">
      <aside className="relative hidden w-[30%] shrink-0 flex-col justify-between overflow-hidden p-10 lg:flex" style={{ backgroundColor: PRETO }}>
        <BrandLogo height={22} variant="light" />
        <div className="max-w-xs text-white">
          <p className="text-2xl leading-snug font-semibold tracking-tight">Do balcão ao caixa, num lugar só.</p>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            PDV, estoque em garrafa e em dose, kits, drinks com custo por ml e o financeiro que a venda já alimenta.
          </p>
        </div>
        <p className="text-xs text-white/40">Demonstração — dados fictícios, guardados só neste navegador.</p>
      </aside>

      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <form onSubmit={onEntrar} className="anim-sobe w-full max-w-sm">
            <div className="mb-8 flex justify-center lg:hidden">
              <BrandLogo height={22} variant="ink" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">Entrar na demonstração</h1>
            <p className="mt-1.5 text-sm text-[#71717a]">Escolha um perfil. Cada um vê um menu diferente.</p>

            <div className="mt-8 space-y-2" role="radiogroup" aria-label="Perfil">
              {PERFIS.map(({ perfil, icone: Icone, faz }) => {
                const u = USUARIOS[perfil]
                const ativo = perfil === escolhido
                return (
                  <button
                    key={perfil}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setEscolhido(perfil)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border bg-white px-3.5 py-3 text-left transition-colors",
                      ativo ? "border-[#09090b]" : "border-[#e4e4e7] hover:border-[#a1a1aa]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                        ativo ? "bg-[#09090b] text-white" : "bg-[#f4f4f5] text-[#09090b]"
                      )}
                    >
                      <Icone className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {u.nome} <span className="font-normal text-[#71717a]">· {u.cargo}</span>
                      </span>
                      <span className="block truncate text-xs text-[#71717a]">{faz}</span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 rounded-full border-2 transition-colors",
                        ativo ? "border-[#09090b] bg-[#09090b] shadow-[inset_0_0_0_3px_white]" : "border-[#d4d4d8]"
                      )}
                    />
                  </button>
                )
              })}
            </div>

            <Button
              type="submit"
              className="mt-6 w-full text-white transition-[filter] hover:brightness-125"
              style={{ backgroundColor: PRETO }}
              disabled={carregando}
            >
              {carregando && <Loader2 className="mr-2 size-4 animate-spin" />}
              Entrar como {USUARIOS[escolhido].nome.split(" ")[0]}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
