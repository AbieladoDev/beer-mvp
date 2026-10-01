import { cn } from "@/lib/utils"

/**
 * Marca da Degga Beer — wordmark tipográfico, mesmo desenho do `brand-logo` da
 * TodosDan (maiúsculas, tracking largo, corpo pequeno). Não há arte de logo:
 * quando chegar, troca-se só este componente.
 *
 * `variant="light"` / `"ink"` fixam a cor onde o fundo não segue o tema (coluna
 * preta do login); `sidebar` usa o token da barra.
 */

type Variant = "auto" | "ink" | "light" | "sidebar"

interface Props {
  /** Altura do bloco da marca em px. Define o corpo da fonte. */
  height?: number
  variant?: Variant
  className?: string
}

const WORDMARK = "Degga Beer"

const VARIANT_CLASS: Record<Variant, string> = {
  auto: "text-foreground",
  ink: "text-[#0e0e10]",
  light: "text-white",
  sidebar: "text-sidebar-foreground",
}

function Wordmark({ height, variant = "auto", className, ratio }: Props & { ratio: number }) {
  const fontSize = height ? Math.round(height * ratio) : undefined
  return (
    <span
      className={cn(
        "inline-block leading-none font-semibold tracking-[0.28em] whitespace-nowrap uppercase select-none",
        VARIANT_CLASS[variant],
        !fontSize && "text-2xl",
        className
      )}
      style={fontSize ? { fontSize } : undefined}
    >
      {WORDMARK}
    </span>
  )
}

export function BrandLogo(props: Props) {
  return <Wordmark {...props} ratio={0.62} />
}
