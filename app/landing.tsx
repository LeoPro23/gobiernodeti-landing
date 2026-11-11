"use client"

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Award, BarChart3, CalendarDays, Check, Clock3, Coffee, GraduationCap, Linkedin, MapPin, Mic, Music, Play, Settings, Ticket, Users, UtensilsCrossed, X } from "lucide-react"
import { program, speakers, type ProgramItem } from "./speakers"
import { SpeakerPhoto } from "./speaker-photo"
import { Brand, SiteHeader } from "./site-header"

// Inicio del evento en hora de Lima: el contador y la fecha del hero se calculan desde aquí.
const EVENT_START = new Date("2026-11-21T08:00:00-05:00")
const eventDate = (options: Intl.DateTimeFormatOptions) => EVENT_START.toLocaleDateString("es-PE", { timeZone: "America/Lima", ...options })
const eventWeekday = eventDate({ weekday: "long" }).replace(/^./, letter => letter.toUpperCase())
const eventYear = eventDate({ year: "numeric" })

// La entrada es gratuita; solo el certificado (opcional) tiene costo. Precio en soles, null mientras no esté definido.
const CERTIFICATE_PRICE: number | null = null
const certificatePrice = CERTIFICATE_PRICE === null ? "precio por confirmar" : `S/ ${CERTIFICATE_PRICE}`

const benefits = [
  { title: "Conocimiento", detail: "práctico y actualizado", icon: GraduationCap },
  { title: "Networking", detail: "con profesionales", icon: Users },
  { title: "Casos reales", detail: "de la industria", icon: Settings },
  { title: "Entrada", detail: "libre y gratuita", icon: Ticket },
  { title: "Oportunidades", detail: "laborales y alianzas", icon: BarChart3 },
]

const programIcons = { welcome: Mic, break: Coffee, lunch: UtensilsCrossed, closing: Music }

function ProgramRow({ item }: { item: ProgramItem }) {
  if (item.kind === "talk") return <li className="program-row program-row--talk">
    <time>{item.time}</time>
    <span className="program-avatar"><SpeakerPhoto speaker={item.speaker} sizes="44px" /></span>
    <div><h4>{item.speaker.name}</h4><p>{item.speaker.talk ?? item.speaker.headline}</p></div>
    <a className="program-link" href={item.speaker.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`LinkedIn de ${item.speaker.name}`}><Linkedin size={15} /></a>
  </li>
  const Icon = programIcons[item.kind]
  return <li className={`program-row program-row--${item.kind}`}>
    <time>{item.time}</time>
    <span className="program-icon"><Icon size={18} /></span>
    <div><h4>{item.title}</h4>{item.detail && <p>{item.detail}</p>}</div>
  </li>
}

const plans = [
  { name: "ENTRADA GENERAL", badge: "CUPOS LIMITADOS", price: 0, icon: Ticket, certificate: false, cta: "REGÍSTRATE GRATIS", features: ["Acceso a todas las ponencias", "Networking con profesionales", "Casos reales de la industria"] },
  { name: "CERTIFICADO OPCIONAL", price: CERTIFICATE_PRICE, icon: Award, certificate: true, cta: "QUIERO MI CERTIFICADO", features: ["Certificado de participación", "Lo solicitas al registrarte", "Totalmente opcional"] },
]

function Price({ value }: { value: number | null }) {
  if (value === 0) return <p className="price"><strong>GRATIS</strong></p>
  if (value === null) return <p className="price price--pending">POR CONFIRMAR</p>
  return <p className="price">S/ <strong>{value}</strong></p>
}

const reasons = ["Aprende de expertos de la industria", "Conoce las últimas tendencias en TI", "Conecta con profesionales y empresas", "Fortalece tu perfil profesional", "Sé parte de una comunidad que impulsa la tecnología en el país"]

const stagger = (index: number, step = 90) => ({ "--reveal-delay": `${index * step}ms` }) as CSSProperties

function subscribeToClock(onTick: () => void) {
  let timer = 0
  const schedule = () => { timer = window.setTimeout(() => { onTick(); schedule() }, 1000 - Date.now() % 1000) }
  schedule()
  return () => window.clearTimeout(timer)
}

const currentSecond = (): number | null => Math.floor(Date.now() / 1000)

function Countdown() {
  const now = useSyncExternalStore(subscribeToClock, currentSecond, () => null)
  const left = now === null ? null : Math.max(0, EVENT_START.getTime() / 1000 - now)
  const values = left === null ? null : [Math.floor(left / 86400), Math.floor(left / 3600) % 24, Math.floor(left / 60) % 60, left % 60]

  return <div className="countdown" role="timer" aria-label="Cuenta regresiva para el XII FULLDAY"><strong>{left === 0 ? "¡EL EVENTO YA COMENZÓ!" : "EL EVENTO COMIENZA EN"}</strong><div className="countdown-grid">{["Días", "Horas", "Minutos", "Segundos"].map((label, index) => {
    const value = values ? String(values[index]).padStart(2, "0") : "--"
    return <div key={label}><b key={value}>{value}</b><span>{label}</span></div>
  })}</div></div>
}

function HeroPhoto() {
  const [loaded, setLoaded] = useState(false)
  return <div className={loaded ? "hero-photo hero-photo--loaded" : "hero-photo"}><Image src="/images/event/hero-stage-logo.png" alt="" width={1672} height={941} preload className="hero-photo-img" onLoad={() => setLoaded(true)} /></div>
}

export default function Landing() {
  const [modal, setModal] = useState<"video" | "faq" | null>(null)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("faq") !== "1") return
    const timer = window.setTimeout(() => setModal("faq"), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return
      entry.target.classList.add("is-visible")
      observer.unobserve(entry.target)
    }), { threshold: .15, rootMargin: "0px 0px -8% 0px" })
    document.querySelectorAll("[data-reveal]").forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return <>
    <SiteHeader page="home" onFaq={() => setModal("faq")} />
    <main>
      <noscript><style>{"[data-reveal],.hero-photo-img{opacity:1!important}"}</style></noscript>

      <section className="hero" id="inicio" aria-label="XII Fullday">
        <HeroPhoto />
        <div className="hero-content page-width"><div className="hero-copy">
          <Image src="/images/event/logo-horizontal.png" alt="XII FULLDAY, Gestión de TI e Ingeniería de Sistemas" width={500} height={183} className="hero-logo" priority />
          <p className="hero-kicker">TECNOLOGÍA <span>·</span> TALENTO <span>·</span> IMPACTO REAL</p>
          <p className="hero-description">El evento académico y profesional más importante<br className="desktop-break" /> de Gestión de TI e Ingeniería de Sistemas.<br className="desktop-break" /> Conecta, aprende y sé parte del cambio.</p>
          <div className="event-details"><div><CalendarDays /><span>{eventWeekday}<br />{eventDate({ day: "numeric", month: "long" })} {eventYear}</span></div><div><Clock3 /><span>8:00 a. m.</span></div><div><MapPin /><span>Auditorio de<br />Humanidades UNT</span></div></div>
          <div className="hero-actions"><Link className="button button--gradient button--large" href="/registro">REGÍSTRATE GRATIS <ArrowRight size={17} /></Link><button type="button" className="button button--outline button--large" onClick={() => setModal("video")}><span className="play-dot"><Play size={10} fill="currentColor" /></span> VER VIDEO</button></div>
        </div></div>
        <Countdown />
      </section>

      <section className="benefit-strip" id="beneficios" aria-label="Beneficios del evento"><div className="page-width benefit-grid">
        {benefits.map((benefit, index) => <div key={benefit.title} data-reveal style={stagger(index)}><benefit.icon /><span>{benefit.title}<br />{benefit.detail}</span></div>)}
      </div></section>

      <section className="section speakers-section" id="ponentes"><div className="page-width">
        <div className="section-heading" data-reveal><div><span className="eyebrow">PONENTES</span><h2>LÍDERES QUE ESTÁN TRANSFORMANDO EL FUTURO</h2><i /></div><a className="button button--outline section-link" href="/ponentes">VER TODOS LOS PONENTES <ArrowRight size={16} /></a></div>
        <div className="speaker-grid" id="speakers-list">{speakers.map((speaker, index) => <a className="speaker-card" key={speaker.name} href={speaker.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${speaker.name}, ${speaker.time}. Ver perfil en LinkedIn`} data-reveal style={stagger(index)}><div className="speaker-photo"><SpeakerPhoto speaker={speaker} sizes="(max-width: 560px) 45vw, (max-width: 800px) 30vw, 200px" /><span className="speaker-linkedin" aria-hidden="true"><Linkedin size={12} /></span></div><div className="speaker-info"><h3>{speaker.name}</h3><p>{speaker.headline}</p>{speaker.detail && <p className="speaker-detail">{speaker.detail}</p>}</div><div className="speaker-talk">{speaker.talk ?? <><Clock3 size={12} aria-hidden="true" /> {speaker.time}</>}</div></a>)}</div>
      </div></section>

      <section className="section agenda-section" id="temario"><div className="page-width">
        <div className="section-heading" data-reveal><div><span className="eyebrow">PROGRAMA</span><h2>UNA JORNADA COMPLETA<br />PARA TU CRECIMIENTO</h2><i /></div><p className="program-note"><CalendarDays size={15} /> {eventWeekday} {eventDate({ day: "numeric", month: "long" })} · 8:30 a. m. – 6:00 p. m.</p></div>
        <div className="program-grid">{program.map((block, index) => <div className="program-block" key={block.label} data-reveal style={stagger(index, 140)}><h3><span>{block.label}</span>{block.range}</h3><ol>{block.items.map(item => <ProgramRow key={item.time} item={item} />)}</ol></div>)}</div>
      </div></section>

      <section className="section tickets-section" id="entradas"><div className="page-width tickets-layout">
        <div className="tickets-title" data-reveal><span className="eyebrow">ENTRADAS</span><h2>ENTRADA LIBRE</h2><i /><p>El evento es gratuito: solo regístrate. El certificado es opcional.</p></div>
        <div className="pricing-grid">{plans.map((plan, index) => <article className={`price-card ${plan.badge ? "price-card--popular" : ""}`} key={plan.name} data-reveal style={stagger(index, 120)}>{plan.badge && <span className="popular-label">{plan.badge}</span>}<h3><plan.icon size={20} /> {plan.name}</h3><Price value={plan.price} /><ul>{plan.features.map(feature => <li key={feature}><Check size={12} /> {feature}</li>)}</ul><Link href="/registro" className={plan.badge ? "button button--gradient price-button" : "button button--outline price-button"}>{plan.cta}</Link></article>)}</div>
        <div className="why-attend" data-reveal style={stagger(3, 120)}><h2>¿POR QUÉ ASISTIR?</h2><ul>{reasons.map((reason, index) => <li key={reason} style={stagger(index, 80)}><span><Check size={14} strokeWidth={3} /></span>{reason}</li>)}</ul></div>
      </div></section>

      <section className="venue-section" id="lugar"><div className="page-width venue-grid"><div className="venue-copy" data-reveal="left"><span className="eyebrow">LUGAR</span><h2>AUDITORIO DE<br />HUMANIDADES UNT</h2><p><MapPin size={19} fill="currentColor" /> Universidad Nacional de Trujillo</p></div><Image src="/images/event/venue.png" alt="Imagen referencial de un recinto para eventos" width={400} height={200} className="venue-photo" data-reveal="zoom" style={stagger(1, 120)} /><div className="last-call" data-reveal="right" style={stagger(2, 120)}><Ticket /><div><h3>LOS CUPOS SON LIMITADOS</h3><p>La entrada es libre. Sé parte del XII FULLDAY y vive una experiencia que potenciará tu futuro profesional.</p><Link className="button button--gradient" href="/registro">REGÍSTRATE GRATIS <ArrowRight size={16} /></Link></div></div></div></section>

      <footer className="footer"><div className="page-width footer-inner"><Brand dark /><nav aria-label="Navegación del pie de página"><a href="#inicio">Inicio</a><a href="/ponentes">Ponentes</a><a href="#temario">Programa</a><a href="#lugar">Lugar</a><button type="button" onClick={() => setModal("faq")}>FAQ</button><a href="mailto:contacto@fullday.pe">Contacto</a></nav><div className="socials"><a href="https://www.linkedin.com/company/full-day-gestion-de-ti/posts/" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">in</a><a href="https://www.instagram.com/fulldaygestiondeti/" aria-label="Instagram" target="_blank" rel="noopener noreferrer">◎</a><a href="https://www.facebook.com/profile.php?id=61594697699354" aria-label="Facebook" target="_blank" rel="noopener noreferrer">f</a></div><small>© {eventYear} XII FULLDAY.<br />Todos los derechos reservados.</small></div></footer>

      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" role="dialog" aria-modal="true" aria-label={modal === "video" ? "Video del evento" : "Preguntas frecuentes"} onMouseDown={event => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Cerrar" onClick={() => setModal(null)}><X /></button>{modal === "video" ? <><h2>VIVE EL XII FULLDAY</h2><div className="video-preview"><Image src="/images/event/hero-stage-logo.png" alt="Auditorio del evento" fill sizes="(max-width: 600px) 90vw, 650px" /><Play size={46} fill="currentColor" /></div><p>Conecta con los profesionales que están transformando la tecnología.</p></> : <><h2>PREGUNTAS FRECUENTES</h2><details open><summary>¿El evento tiene costo?</summary><p>No. La entrada es libre y gratuita; solo necesitas registrarte.</p></details><details><summary>¿Dónde se realiza el evento?</summary><p>En el Auditorio de Humanidades de la Universidad Nacional de Trujillo (UNT).</p></details><details><summary>¿Cómo obtengo el certificado?</summary><p>El certificado de participación es opcional y tiene un costo ({certificatePrice}). Puedes solicitarlo al registrarte.</p></details><details><summary>¿A qué hora empieza?</summary><p>El evento comienza a las 8:00 a. m.</p></details></>}</div></div>}
    </main>
  </>
}
