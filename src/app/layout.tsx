import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Degga Beer | Gestão",
    template: "Degga Beer | %s",
  },
  description: "Painel de gestão da Degga Beer — PDV, estoque, cardápio de kits e drinks e financeiro.",
}

/** O preto da barra lateral — cor da barra do navegador no mobile. */
export const viewport: Viewport = {
  themeColor: "#0e0e10",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      </body>
    </html>
  )
}
