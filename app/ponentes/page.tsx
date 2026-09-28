import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Menu } from "lucide-react"
import { speakers } from "../speakers"
import "./ponentes.css"

export const metadata: Metadata = {
  title: "Ponentes | XII FULLDAY",
  description: "Conoce a los seis ponentes del XII FULLDAY y los temas que compartirán sobre tecnología, gestión de TI e ingeniería de sistemas.",
}

const navigation = [
  { label: "Inicio", href: "/" },
  { label: "Ponentes", href: "/ponentes" },
  { label: "Temario", href: "/#temario" },
  { label: "Beneficios", href: "/#beneficios" },
  { label: "Lugar", href: "/#lugar" },
]

export default function SpeakersPage() {
  return <main className="speakers-page">
    <header className="speakers-header">
      <div className="page-width speakers-header-inner">
        <Link href="/" aria-label="XII FULLDAY, volver al inicio" className="speakers-brand">
          <Image src="/images/event/logo-navbar.png" alt="XII FULLDAY, Gestión de TI e Ingeniería de Sistemas" width={2170} height={725} priority />
        </Link>
        <nav className="speakers-nav" aria-label="Navegación principal">
          {navigation.map(item => <Link key={item.label} href={item.href} aria-current={item.href === "/ponentes" ? "page" : undefined}>{item.label}</Link>)}
        </nav>
        <Link className="button button--gradient speakers-header-cta" href="/#entradas">REGÍSTRATE AHORA</Link>
        <details className="speakers-mobile-nav"><summary aria-label="Abrir menú"><Menu size={23} /></summary><nav aria-label="Navegación móvil">{navigation.map(item => <Link key={item.label} href={item.href} aria-current={item.href === "/ponentes" ? "page" : undefined}>{item.label}</Link>)}<Link href="/#entradas">Regístrate ahora</Link></nav></details>
      </div>
    </header>

    <section className="speakers-hero" aria-labelledby="speakers-title">
      <Image className="speakers-stage" src="/images/event/speakers-stage.png" alt="Escenario tecnológico iluminado en azul y violeta" fill priority sizes="100vw" />
      <div className="page-width speakers-hero-inner">
        <div className="speakers-hero-topline"><span>XII FULLDAY</span><span>GESTIÓN DE TI · INGENIERÍA DE SISTEMAS</span></div>
        <p className="speakers-hero-kicker">TECNOLOGÍA · TALENTO · IMPACTO REAL</p>
        <div className="speakers-lineup" aria-label="Los seis ponentes del XII FULLDAY">
          {speakers.map((speaker, index) => <div className="speakers-lineup-photo" key={speaker.name}>
            <Image src={speaker.image} alt={speaker.name} fill sizes="(max-width: 620px) 45vw, (max-width: 980px) 30vw, 16vw" priority={index < 3} />
            <span>{String(index + 1).padStart(2, "0")}</span>
          </div>)}
        </div>
        <div className="speakers-hero-title">
          <span>NUESTROS</span>
          <h1 id="speakers-title">PONENTES</h1>
          <p>GRANDES IDEAS. UN MISMO PROPÓSITO.</p>
        </div>
      </div>
    </section>

    <section className="speakers-roster" aria-labelledby="roster-title">
      <div className="page-width">
        <div className="speakers-roster-heading">
          <div><span className="eyebrow">CONOCE A LOS EXPERTOS</span><h2 id="roster-title">VOCES QUE IMPULSAN EL FUTURO</h2></div>
          <p>Seis perspectivas para conectar la tecnología con desafíos reales.</p>
        </div>
        <div className="speakers-roster-grid">
          {speakers.map((speaker, index) => <article className="speakers-roster-card" key={speaker.name}>
            <span className="speakers-card-number">{String(index + 1).padStart(2, "0")}</span>
            <h3>{speaker.name}</h3>
            <p className="speakers-card-role">{speaker.role} <span>·</span> {speaker.company}</p>
            <div className="speakers-card-talk"><span>SU CHARLA</span><p>{speaker.talk}</p></div>
          </article>)}
        </div>
      </div>
    </section>

    <section className="speakers-cta" aria-label="Inscripción al evento">
      <div className="page-width speakers-cta-inner"><div><span className="eyebrow">SÉ PARTE DEL XII FULLDAY</span><h2>CONOCE LAS IDEAS QUE VIENEN.</h2><p>Conecta con los profesionales que están transformando la tecnología.</p></div><Link className="button button--gradient" href="/#entradas">ASEGURA TU ENTRADA <ArrowRight size={18} /></Link></div>
    </section>

    <footer className="speakers-footer"><div className="page-width speakers-footer-inner"><Link href="/">XII FULLDAY</Link><span>TECNOLOGÍA · TALENTO · IMPACTO REAL</span><Link href="/">VOLVER AL INICIO <ArrowUpRight size={15} /></Link></div></footer>
  </main>
}
