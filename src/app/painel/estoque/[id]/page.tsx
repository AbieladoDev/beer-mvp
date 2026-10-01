import { redirect } from "next/navigation"

/** A ficha de estoque virou a ficha do produto — o link antigo continua funcionando. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/painel/produtos/${id}`)
}
