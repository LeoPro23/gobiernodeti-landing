"use client"

import { useState, useSyncExternalStore } from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu, X } from "lucide-react"

const navLinks = [["inicio", "Inicio"], ["ponentes", "Ponentes"], ["temario", "Programa"], ["beneficios", "Beneficios"], ["lugar", "Lugar"], ["certificado", "Certificado"], ["yamboly", "🎡 Quiz Yámboly"]]

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true })
  window.addEventListener("resize", onChange)
  return () => { window.removeEventListener("scroll", onChange); window.removeEventListener("resize", onChange) }
}

function getActiveSection() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("main > section[id]"))
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
  const reached = atBottom ? sections : sections.filter(section => section.getBoundingClientRect().top <= window.innerHeight * .4)
  return reached[reached.length - 1]?.id ?? "inicio"
}

export function Brand({ dark = false, home = true }: { dark?: boolean; home?: boolean }) {
  const href = home ? "#inicio" : "/"
  if (!dark) return <a className="brand brand--image" href={href} aria-label="XII Fullday, ir al inicio">
    <Image src="/images/event/logo-navbar.png" alt="XII FULLDAY, Gestión de TI e Ingeniería de Sistemas" width={2170} height={725} className="navbar-logo" priority />
  </a>
  return <a className="brand brand--dark" href={href} aria-label="XII Fullday, ir al inicio">
    <Image src="/images/event/logo-mark.png" alt="" width={48} height={48} className="brand-mark" />
    <span className="brand-words"><strong>XII FULLDAY</strong><small>GESTIÓN DE TI | INGENIERÍA DE SISTEMAS</small></span>
  </a>
}

export function SiteHeader({ page, onFaq }: { page: "home" | "speakers" | "register" | "certificate"; onFaq?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrolled = useSyncExternalStore(subscribeToScroll, () => window.scrollY > 24, () => false)
  const active = useSyncExternalStore(subscribeToScroll, getActiveSection, () => "inicio")
  const isHome = page === "home"

  return <header className={scrolled || menuOpen ? "site-header site-header--scrolled" : "site-header"}><div className="page-width site-header-inner">
    <Brand home={isHome} />
    <nav className={menuOpen ? "nav-links nav-links--open" : "nav-links"} aria-label="Navegación principal">
      {navLinks.map(([id, label]) => {
        const current = isHome ? active === id : (id === "ponentes" && page === "speakers") || (id === "certificado" && page === "certificate")
        const href = id === "ponentes" ? "/ponentes" : id === "certificado" ? "/certificado" : id === "yamboly" ? "/yamboly" : `${isHome ? "" : "/"}#${id}`
        return <a key={id} href={href} className={current ? "is-active" : undefined} aria-current={current ? (isHome ? "true" : "page") : undefined} onClick={() => setMenuOpen(false)}>{label}</a>
      })}
      {isHome ? <button type="button" onClick={() => { onFaq?.(); setMenuOpen(false) }}>FAQ</button> : <Link href="/?faq=1" onClick={() => setMenuOpen(false)}>FAQ</Link>}
    </nav>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <Link
        href="/yamboly"
        className="button"
        style={{
          background: "linear-gradient(135deg, rgba(255, 0, 122, 0.2) 0%, rgba(174, 29, 245, 0.2) 100%)",
          border: "1px solid rgba(255, 0, 122, 0.5)",
          color: "#fff",
          height: "34px",
          padding: "0 13px",
        }}
      >
        🎡 QUIZ YÁMBOLY
      </Link>
      <Link className="button button--gradient header-cta" href="/registro">REGÍSTRATE GRATIS</Link>
    </div>
    <button type="button" className="menu-toggle" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
  </div></header>
}
