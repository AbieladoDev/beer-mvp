"use client"

import { useParams } from "next/navigation"
import { KitDetalhe } from "@/components/kits/kit-detalhe"

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <KitDetalhe id={id} />
}
