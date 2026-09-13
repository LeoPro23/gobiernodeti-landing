import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "ISACA UNT Student Group - Auditoría, Gobierno y Seguridad de TI",
  description:
    "Grupo estudiantil de ISACA de la Universidad Nacional de Trujillo. Promovemos la educación en auditoría, gobierno de TI, riesgo y ciberseguridad.",
  keywords: [
    "ISACA",
    "UNT",
    "Auditoría de Sistemas",
    "Seguridad de la Información",
    "Gobierno de TI",
    "Ciberseguridad",
  ],
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} ${inter.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
