import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarDays, Facebook, Instagram, Linkedin, MapPin, Users, Youtube } from "lucide-react"
import { speakers } from "../speakers"
import { SiteHeader } from "../site-header"
import "./ponentes.css"

export const metadata: Metadata = {
  title: "Ponentes | XII FULLDAY",
  description: "Conoce a los ponentes del XII FULLDAY y las ideas que compartirán sobre tecnología, gestión de TI e ingeniería de sistemas.",
}

function EventDetails({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? "ps-event-details ps-event-details--compact" : "ps-event-details"}>
    <div><CalendarDays aria-hidden="true" /><span>Sábado<br /><strong>23 de noviembre 2024</strong></span></div>
    <div><MapPin aria-hidden="true" /><span>Centro de Convenciones<br /><strong>Lima, Perú</strong></span></div>
    <div><Users aria-hidden="true" /><span><strong>+500</strong><br />Asistentes</span></div>
  </div>
}

export default function PonentesPage() {
  return <>
    <SiteHeader page="speakers" />
    <main className="ps-page">
    <section className="ps-hero" aria-labelledby="ps-title">
      <Image className="ps-hero-photo" src="/images/event/ponentes-hero-branded.png" alt="" width={1672} height={941} priority sizes="100vw" />
      <Image className="ps-hero-photo-mobile" src="/images/event/ponentes-hero-mobile.png" alt="" width={1024} height={1536} sizes="(max-width: 520px) 100vw, 1px" />
      <h1 className="ps-visually-hidden" id="ps-title">Nuestros ponentes: grandes ideas, un mismo propósito</h1>
      <div className="ps-mini-speakers" aria-label="Los seis ponentes del XII FULLDAY">
        {speakers.map(speaker => <div className="ps-mini-speaker" key={speaker.name}><h2>{speaker.name}</h2><p>{speaker.role}<br /><strong>{speaker.company}</strong></p><span>{speaker.talk}</span></div>)}
      </div>
      <div className="ps-hero-bottom"><EventDetails compact /><Link className="ps-button ps-button--gradient ps-hero-register" href="/#entradas">REGÍSTRATE AHORA <ArrowRight size={17} /></Link></div>
    </section>

    <section className="ps-speakers" aria-labelledby="ps-speakers-title"><div className="ps-content-width">
      <div className="ps-section-heading"><div><span>PONENTES</span><h2 id="ps-speakers-title">LÍDERES QUE ESTÁN TRANSFORMANDO EL FUTURO</h2><i /></div><p>Conoce a los expertos, sus experiencias<br />y las ideas que compartirán en XII FULLDAY.</p></div>
      <div className="ps-speaker-grid">{speakers.map(speaker => <article className="ps-speaker-card" key={speaker.name}><div className="ps-card-photo"><Image src={speaker.image} alt={`Retrato de ${speaker.name}`} fill sizes="(max-width: 600px) 90vw, (max-width: 800px) 45vw, 30vw" loading="eager" /></div><div className="ps-card-info"><h3>{speaker.name}</h3><p>{speaker.role}</p><strong>{speaker.company}</strong><div className="ps-card-talk">{speaker.talk}</div></div></article>)}</div>
    </div></section>

    <section className="ps-cta" aria-labelledby="ps-cta-title"><div className="ps-content-width ps-cta-inner"><h2 id="ps-cta-title">ASEGURA TU ENTRADA</h2><p>SÉ PARTE DE XII FULLDAY</p><EventDetails /><Link className="ps-button ps-button--gradient ps-cta-register" href="/#entradas">REGÍSTRATE AHORA <ArrowRight size={18} /></Link></div></section>

    <footer className="ps-footer"><div className="ps-footer-inner"><Link className="ps-footer-brand" href="/" aria-label="XII FULLDAY, ir al inicio"><Image src="/images/event/logo-mark.png" alt="" width={44} height={44} /><span><strong>XII FULLDAY</strong><small>GESTIÓN DE TI | INGENIERÍA DE SISTEMAS</small></span></Link><nav aria-label="Navegación del pie de página"><Link href="/">Inicio</Link><Link href="/ponentes">Ponentes</Link><Link href="/#temario">Temario</Link><Link href="/#lugar">Lugar</Link><Link href="/?faq=1">FAQ</Link><a href="mailto:contacto@fullday.pe">Contacto</a></nav><div className="ps-socials"><a href="https://www.linkedin.com/" aria-label="LinkedIn"><Linkedin /></a><a href="https://www.instagram.com/" aria-label="Instagram"><Instagram /></a><a href="https://www.facebook.com/" aria-label="Facebook"><Facebook /></a><a href="https://www.youtube.com/" aria-label="YouTube"><Youtube /></a></div><small className="ps-copyright">© 2024 XII FULLDAY.<br />Todos los derechos reservados.</small><strong className="ps-footer-tagline">TECNOLOGÍA<br />TALENTO<br />IMPACTO REAL</strong></div></footer>
    </main>
  </>
}
