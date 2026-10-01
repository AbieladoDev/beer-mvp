"use client"

import { useParams } from "next/navigation"
import { KitForm } from "@/components/kits/kit-form"

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <KitForm id={id} />
}
