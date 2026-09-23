"use client"

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react"
import Image from "next/image"
import { ArrowRight, BarChart3, CalendarDays, Check, Clock3, Cloud, Crown, GraduationCap, MapPin, Menu, Network, Palette, Play, Rocket, Settings, ShieldCheck, Ticket, Users, X } from "lucide-react"

// Inicio del evento en hora de Lima: el contador y la fecha del hero se calculan desde aquí.
const EVENT_START = new Date("2026-11-21T09:00:00-05:00")
const eventDate = (options: Intl.DateTimeFormatOptions) => EVENT_START.toLocaleDateString("es-PE", { timeZone: "America/Lima", ...options })
const eventWeekday = eventDate({ weekday: "long" }).replace(/^./, letter => letter.toUpperCase())
const eventYear = eventDate({ year: "numeric" })

const navLinks = [["inicio", "Inicio"], ["ponentes", "Ponentes"], ["temario", "Temario"], ["beneficios", "Beneficios"], ["lugar", "Lugar"]]

const benefits = [
  { title: "Conocimiento", detail: "práctico y actualizado", icon: GraduationCap },
  { title: "Networking", detail: "con profesionales", icon: Users },
  { title: "Casos reales", detail: "de la industria", icon: Settings },
  { title: "Certificado", detail: "de participación", icon: Ticket },
  { title: "Oportunidades", detail: "laborales y alianzas", icon: BarChart3 },
]

const speakers = [
  { name: "Carlos Méndez", role: "Technology Lead", company: "Microsoft", talk: "IA y Productividad en la Empresa", image: "/images/event/speaker-carlos.png" },
  { name: "Lucía Torres", role: "Cloud Solutions Architect", company: "AWS", talk: "Arquitecturas en la Nube para el Futuro", image: "/images/event/speaker-lucia.png" },
  { name: "Andrés Rojas", role: "CTO LATAM", company: "Globant", talk: "Innovación y Transformación Digital", image: "/images/event/speaker-andres.png" },
  { name: "María Fernanda Díaz", role: "Cybersecurity Specialist", company: "Google", talk: "Ciberseguridad en la Era de la IA", image: "/images/event/speaker-maria.png" },
  { name: "Javier Soto", role: "Product Manager", company: "Meta", talk: "Gestión de Productos Tecnológicos", image: "/images/event/speaker-javier.png" },
  { name: "Diego Valverde", role: "Director de TI", company: "BBVA", talk: "Estrategia de TI para Negocios Agile", image: "/images/event/speaker-diego.png" },
]

const agenda = [
  { hour: "09:00 - 10:00", title: "Inteligencia Artificial", description: "Aplicaciones reales y su impacto en las organizaciones.", icon: Palette },
  { hour: "10:15 - 11:15", title: "Cloud & DevOps", description: "Estrategias, herramientas y casos de éxito.", icon: Cloud },
  { hour: "11:30 - 12:30", title: "Ciberseguridad", description: "Tendencias, riesgos y buenas prácticas.", icon: ShieldCheck },
  { hour: "14:00 - 15:00", title: "Gestión de TI", description: "Gobierno, métricas y alineación al negocio.", icon: BarChart3 },
  { hour: "15:15 - 16:15", title: "Transformación Digital", description: "Casos de empresas líderes en LATAM.", icon: Users },
  { hour: "16:30 - 17:30", title: "Tendencias Tecnológicas", description: "Qué viene en los próximos años.", icon: Rocket },
]

const plans = [
  { name: "ESTUDIANTE", price: "59", icon: GraduationCap, features: ["Ingreso al evento", "Kit digital", "Certificado de participación"] },
  { name: "PROFESIONAL", price: "99", icon: Network, popular: true, features: ["Ingreso al evento", "Kit digital + material exclusivo", "Coffee break", "Certificado de participación"] },
  { name: "VIP", price: "149", icon: Crown, features: ["Ingreso preferencial", "Asiento en zona VIP", "Networking con ponentes", "Kit premium", "Certificado de participación"] },
]

const reasons = ["Aprende de expertos de la industria", "Conoce las últimas tendencias en TI", "Conecta con profesionales y empresas", "Fortalece tu perfil profesional", "Sé parte de una comunidad que impulsa la tecnología en el país"]

const stagger = (index: number, step = 90) => ({ "--reveal-delay": `${index * step}ms` }) as CSSProperties

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

function subscribeToClock(onTick: () => void) {
  let timer = 0
  const schedule = () => { timer = window.setTimeout(() => { onTick(); schedule() }, 1000 - Date.now() % 1000) }
  schedule()
  return () => window.clearTimeout(timer)
}

const currentSecond = (): number | null => Math.floor(Date.now() / 1000)

function Brand({ dark = false }: { dark?: boolean }) {
  if (!dark) return <a className="brand brand--image" href="#inicio" aria-label="XII Fullday, ir al inicio">
    <Image src="/images/event/logo-navbar.png" alt="XII FULLDAY, Gestión de TI e Ingeniería de Sistemas" width={2170} height={725} className="navbar-logo" priority />
  </a>
  return <a className={`brand ${dark ? "brand--dark" : ""}`} href="#inicio" aria-label="XII Fullday, ir al inicio">
    <Image src="/images/event/logo-mark.png" alt="" width={48} height={48} className="brand-mark" />
    <span className="brand-words"><strong>XII FULLDAY</strong><small>GESTIÓN DE TI | INGENIERÍA DE SISTEMAS</small></span>
  </a>
}

function SiteHeader({ onFaq }: { onFaq: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrolled = useSyncExternalStore(subscribeToScroll, () => window.scrollY > 24, () => false)
  const active = useSyncExternalStore(subscribeToScroll, getActiveSection, () => "inicio")

  return <header className={scrolled || menuOpen ? "site-header site-header--scrolled" : "site-header"}><div className="page-width site-header-inner">
    <Brand />
    <nav className={menuOpen ? "nav-links nav-links--open" : "nav-links"} aria-label="Navegación principal">
      {navLinks.map(([id, label]) => <a key={id} href={`#${id}`} className={active === id ? "is-active" : undefined} aria-current={active === id ? "true" : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}<button type="button" onClick={() => { onFaq(); setMenuOpen(false) }}>FAQ</button>
    </nav>
    <a className="button button--gradient header-cta" href="#entradas">REGÍSTRATE AHORA</a>
    <button type="button" className="menu-toggle" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
  </div></header>
}

function Countdown() {
  const now = useSyncExternalStore(subscribeToClock, currentSecond, () => null)
  const left = now === null ? null : Math.max(0, EVENT_START.getTime() / 1000 - now)
  const values = left === null ? null : [Math.floor(left / 86400), Math.floor(left / 3600) % 24, Math.floor(left / 60) % 60, left % 60]

  return <div className="countdown" role="timer" aria-label="Cuenta regresiva para el XII FULLDAY"><strong>{left === 0 ? "¡EL EVENTO YA COMENZÓ!" : "EL EVENTO COMIENZA EN"}</strong><div className="countdown-grid">{["Días", "Horas", "Minutos", "Segundos"].map((label, index) => {
    const value = values ? String(values[index]).padStart(2, "0") : "--"
    return <div key={label}><b key={value}>{value}</b><span>{label}</span></div>
  })}</div></div>
}

export default function Landing() {
  const [modal, setModal] = useState<"video" | "faq" | "ticket" | null>(null)
  const [selectedPlan, setSelectedPlan] = useState("PROFESIONAL")
  const openTicket = (name: string) => { setSelectedPlan(name); setModal("ticket") }

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
    <SiteHeader onFaq={() => setModal("faq")} />
    <main>
      <noscript><style>{"[data-reveal]{opacity:1!important}"}</style></noscript>
      <section className="hero" id="inicio" aria-label="XII Fullday">
        <div className="hero-photo" />
        <div className="hero-content page-width"><div className="hero-copy">
          <Image src="/images/event/logo-horizontal.png" alt="XII Fullday, Gestión de TI e Ingeniería de Sistemas" width={500} height={183} className="hero-logo" priority />
          <p className="hero-kicker">TECNOLOGÍA <span>·</span> TALENTO <span>·</span> IMPACTO REAL</p>
          <p className="hero-description">El evento académico y profesional más importante<br className="desktop-break" /> de Gestión de TI e Ingeniería de Sistemas.<br className="desktop-break" /> Conecta, aprende y sé parte del cambio.</p>
          <div className="event-details"><div><CalendarDays /><span>{eventWeekday}<br />{eventDate({ day: "numeric", month: "long" })} {eventYear}</span></div><div><MapPin /><span>Centro de Convenciones<br />Lima, Perú</span></div><div><Users /><span>+500<br />Asistentes</span></div></div>
          <div className="hero-actions"><a className="button button--gradient button--large" href="#entradas">ASEGURA TU ENTRADA <ArrowRight size={17} /></a><button type="button" className="button button--outline button--large" onClick={() => setModal("video")}><span className="play-dot"><Play size={10} fill="currentColor" /></span> VER VIDEO</button></div>
        </div></div>
        <Countdown />
      </section>

      <section className="benefit-strip" id="beneficios" aria-label="Beneficios del evento"><div className="page-width benefit-grid">
        {benefits.map((benefit, index) => <div key={benefit.title} data-reveal style={stagger(index)}><benefit.icon /><span>{benefit.title}<br />{benefit.detail}</span></div>)}
      </div></section>

      <section className="section speakers-section" id="ponentes"><div className="page-width">
        <div className="section-heading" data-reveal><div><span className="eyebrow">PONENTES</span><h2>LÍDERES QUE ESTÁN TRANSFORMANDO EL FUTURO</h2><i /></div><a className="button button--outline section-link" href="#speakers-list">VER TODOS LOS PONENTES <ArrowRight size={16} /></a></div>
        <div className="speaker-grid" id="speakers-list">{speakers.map((speaker, index) => <article className="speaker-card" key={speaker.name} data-reveal style={stagger(index)}><div className="speaker-photo"><Image src={speaker.image} alt={`Retrato de ${speaker.name}`} width={400} height={300} /></div><div className="speaker-info"><h3>{speaker.name}</h3><p>{speaker.role}</p><p className={speaker.company === "Google" ? "google-word" : ""}>{speaker.company}</p></div><div className="speaker-talk">{speaker.talk}</div></article>)}</div>
      </div></section>

      <section className="section agenda-section" id="temario"><div className="page-width">
        <div className="section-heading" data-reveal><div><span className="eyebrow">TEMARIO</span><h2>UNA AGENDA DISEÑADA<br />PARA TU CRECIMIENTO</h2><i /></div><a className="button button--outline section-link" href="#agenda-list">VER AGENDA COMPLETA <ArrowRight size={16} /></a></div>
        <div className="agenda-grid" id="agenda-list">{agenda.map((item, index) => <article className="agenda-card" key={item.title} data-reveal style={stagger(index)}><div className="agenda-top"><span>{String(index + 1).padStart(2, "0")}</span><item.icon /></div><div className="agenda-body"><h3>{item.title}</h3><p>{item.description}</p></div><div className="agenda-time"><Clock3 size={13} /><span>{item.hour}</span></div></article>)}</div>
      </div></section>

      <section className="section tickets-section" id="entradas"><div className="page-width tickets-layout">
        <div className="tickets-title" data-reveal><span className="eyebrow">ENTRADAS</span><h2>ELIGE TU EXPERIENCIA</h2><i /></div>
        <div className="pricing-grid">{plans.map((plan, index) => <article className={`price-card ${plan.popular ? "price-card--popular" : ""}`} key={plan.name} data-reveal style={stagger(index, 120)}>{plan.popular && <span className="popular-label">MÁS POPULAR</span>}<h3><plan.icon size={20} /> {plan.name}</h3><p className="price">S/ <strong>{plan.price}</strong></p><ul>{plan.features.map(feature => <li key={feature}><Check size={12} /> {feature}</li>)}</ul><button type="button" className={plan.popular ? "button button--gradient price-button" : "button button--outline price-button"} onClick={() => openTicket(plan.name)}>COMPRAR AHORA</button></article>)}</div>
        <div className="why-attend" data-reveal style={stagger(3, 120)}><h2>¿POR QUÉ ASISTIR?</h2><ul>{reasons.map((reason, index) => <li key={reason} style={stagger(index, 80)}><span><Check size={14} strokeWidth={3} /></span>{reason}</li>)}</ul></div>
      </div></section>

      <section className="venue-section" id="lugar"><div className="page-width venue-grid"><div className="venue-copy" data-reveal="left"><span className="eyebrow">LUGAR</span><h2>CENTRO DE CONVENCIONES LIMA</h2><p><MapPin size={19} fill="currentColor" /> Av. Arequipa 1234, Lima, Perú</p></div><Image src="/images/event/venue.png" alt="Exterior iluminado del centro de convenciones al atardecer" width={400} height={200} className="venue-photo" data-reveal="zoom" style={stagger(1, 120)} /><div className="last-call" data-reveal="right" style={stagger(2, 120)}><Ticket /><div><h3>LAS ENTRADAS SON LIMITADAS</h3><p>Sé parte del XII FULLDAY y vive una experiencia que potenciará tu futuro profesional.</p><a className="button button--gradient" href="#entradas">REGÍSTRATE AHORA <ArrowRight size={16} /></a></div></div></div></section>

      <footer className="footer"><div className="page-width footer-inner"><Brand dark /><nav aria-label="Navegación del pie de página"><a href="#inicio">Inicio</a><a href="#ponentes">Ponentes</a><a href="#temario">Temario</a><a href="#lugar">Lugar</a><button type="button" onClick={() => setModal("faq")}>FAQ</button><a href="mailto:contacto@fullday.pe">Contacto</a></nav><div className="socials"><a href="https://www.linkedin.com/" aria-label="LinkedIn">in</a><a href="https://www.instagram.com/" aria-label="Instagram">◎</a><a href="https://www.facebook.com/" aria-label="Facebook">f</a><a href="https://www.youtube.com/" aria-label="YouTube">▶</a></div><small>© {eventYear} XII FULLDAY.<br />Todos los derechos reservados.</small></div></footer>

      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" role="dialog" aria-modal="true" aria-label={modal === "video" ? "Video del evento" : modal === "faq" ? "Preguntas frecuentes" : "Comprar entrada"} onMouseDown={event => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Cerrar" onClick={() => setModal(null)}><X /></button>{modal === "video" ? <><h2>VIVE EL XII FULLDAY</h2><div className="video-preview"><Image src="/images/event/hero-stage-logo.png" alt="Auditorio del evento" fill sizes="(max-width: 600px) 90vw, 650px" /><Play size={46} fill="currentColor" /></div><p>Conecta con los profesionales que están transformando la tecnología.</p></> : modal === "faq" ? <><h2>PREGUNTAS FRECUENTES</h2><details open><summary>¿Dónde se realiza el evento?</summary><p>En el Centro de Convenciones Lima, Av. Arequipa 1234, Lima, Perú.</p></details><details><summary>¿La entrada incluye certificado?</summary><p>Sí, todos los tipos de entrada incluyen certificado de participación.</p></details><details><summary>¿A qué hora empieza?</summary><p>La primera sesión comienza a las 09:00.</p></details></> : <><h2>ENTRADA {selectedPlan}</h2><p>Completa tu inscripción para asegurar tu lugar en el XII FULLDAY.</p><form action="mailto:contacto@fullday.pe" method="post" encType="text/plain"><label>Nombre completo<input name="nombre" required placeholder="Tu nombre" /></label><label>Correo electrónico<input name="correo" type="email" required placeholder="tu@correo.com" /></label><input type="hidden" name="entrada" value={selectedPlan} /><button className="button button--gradient" type="submit">SOLICITAR ENTRADA <ArrowRight size={16} /></button></form></>}</div></div>}
    </main>
  </>
}
