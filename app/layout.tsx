import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"
import "./landing.css"

export const metadata: Metadata = {
  title: "XII FULLDAY | Gestión de TI e Ingeniería de Sistemas",
  description: "Tecnología, talento e impacto real. Conoce a los ponentes, explora el temario y asegura tu entrada al XII FULLDAY.",
  icons: { icon: "/images/event/logo-mark.png" },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es"><body>{children}</body></html>
}
