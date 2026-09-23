"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowRight, BarChart3, CalendarDays, Check, Clock3, Cloud, Crown, GraduationCap, MapPin, Menu, Network, Palette, Play, Rocket, Settings, ShieldCheck, Ticket, Users, X } from "lucide-react"

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

function Brand({ dark = false }: { dark?: boolean }) {
  if (!dark) return <a className="brand brand--image" href="#inicio" aria-label="XII Fullday, ir al inicio">
    <Image src="/images/event/logo-navbar.png" alt="XII FULLDAY, Gestión de TI e Ingeniería de Sistemas" width={2170} height={725} className="navbar-logo" priority />
  </a>
  return <a className={`brand ${dark ? "brand--dark" : ""}`} href="#inicio" aria-label="XII Fullday, ir al inicio">
    <Image src="/images/event/logo-mark.png" alt="" width={48} height={48} className="brand-mark" />
    <span className="brand-words"><strong>XII FULLDAY</strong><small>GESTIÓN DE TI | INGENIERÍA DE SISTEMAS</small></span>
  </a>
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<"video" | "faq" | "ticket" | null>(null)
  const [selectedPlan, setSelectedPlan] = useState("PROFESIONAL")
  const openTicket = (name: string) => { setSelectedPlan(name); setModal("ticket") }

  return <main id="inicio">
    <section className="hero" aria-label="XII Fullday">
      <div className="hero-photo" />
      <header className="site-header page-width">
        <Brand />
        <nav className={menuOpen ? "nav-links nav-links--open" : "nav-links"} aria-label="Navegación principal">
          <a href="#inicio" onClick={() => setMenuOpen(false)}>Inicio</a><a href="#ponentes" onClick={() => setMenuOpen(false)}>Ponentes</a><a href="#temario" onClick={() => setMenuOpen(false)}>Temario</a><a href="#beneficios" onClick={() => setMenuOpen(false)}>Beneficios</a><a href="#lugar" onClick={() => setMenuOpen(false)}>Lugar</a><button type="button" onClick={() => { setModal("faq"); setMenuOpen(false) }}>FAQ</button>
        </nav>
        <a className="button button--gradient header-cta" href="#entradas">REGÍSTRATE AHORA</a>
        <button type="button" className="menu-toggle" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </header>

      <div className="hero-content page-width"><div className="hero-copy">
        <Image src="/images/event/logo-horizontal.png" alt="XII Fullday, Gestión de TI e Ingeniería de Sistemas" width={500} height={183} className="hero-logo" priority />
        <p className="hero-kicker">TECNOLOGÍA <span>·</span> TALENTO <span>·</span> IMPACTO REAL</p>
        <p className="hero-description">El evento académico y profesional más importante<br className="desktop-break" /> de Gestión de TI e Ingeniería de Sistemas.<br className="desktop-break" /> Conecta, aprende y sé parte del cambio.</p>
        <div className="event-details"><div><CalendarDays /><span>Sábado<br />23 de noviembre 2024</span></div><div><MapPin /><span>Centro de Convenciones<br />Lima, Perú</span></div><div><Users /><span>+500<br />Asistentes</span></div></div>
        <div className="hero-actions"><a className="button button--gradient button--large" href="#entradas">ASEGURA TU ENTRADA <ArrowRight size={17} /></a><button type="button" className="button button--outline button--large" onClick={() => setModal("video")}><span className="play-dot"><Play size={10} fill="currentColor" /></span> VER VIDEO</button></div>
      </div></div>
      <div className="countdown" aria-label="El evento comienza en 25 días, 14 horas, 32 minutos y 10 segundos"><strong>EL EVENTO COMIENZA EN</strong><div className="countdown-grid">{[["25", "Días"], ["14", "Horas"], ["32", "Minutos"], ["10", "Segundos"]].map(([number, label]) => <div key={label}><b>{number}</b><span>{label}</span></div>)}</div></div>
    </section>

    <section className="benefit-strip" id="beneficios" aria-label="Beneficios del evento"><div className="page-width benefit-grid">
      <div><GraduationCap /><span>Conocimiento<br />práctico y actualizado</span></div><div><Users /><span>Networking<br />con profesionales</span></div><div><Settings /><span>Casos reales<br />de la industria</span></div><div><Ticket /><span>Certificado<br />de participación</span></div><div><BarChart3 /><span>Oportunidades<br />laborales y alianzas</span></div>
    </div></section>

    <section className="section speakers-section" id="ponentes"><div className="page-width">
      <div className="section-heading"><div><span className="eyebrow">PONENTES</span><h2>LÍDERES QUE ESTÁN TRANSFORMANDO EL FUTURO</h2><i /></div><a className="button button--outline section-link" href="#speakers-list">VER TODOS LOS PONENTES <ArrowRight size={16} /></a></div>
      <div className="speaker-grid" id="speakers-list">{speakers.map(speaker => <article className="speaker-card" key={speaker.name}><Image src={speaker.image} alt={`Retrato de ${speaker.name}`} width={400} height={300} className="speaker-photo" /><div className="speaker-info"><h3>{speaker.name}</h3><p>{speaker.role}</p><p className={speaker.company === "Google" ? "google-word" : ""}>{speaker.company}</p></div><div className="speaker-talk">{speaker.talk}</div></article>)}</div>
    </div></section>

    <section className="section agenda-section" id="temario"><div className="page-width">
      <div className="section-heading"><div><span className="eyebrow">TEMARIO</span><h2>UNA AGENDA DISEÑADA<br />PARA TU CRECIMIENTO</h2><i /></div><a className="button button--outline section-link" href="#agenda-list">VER AGENDA COMPLETA <ArrowRight size={16} /></a></div>
      <div className="agenda-grid" id="agenda-list">{agenda.map((item, index) => <article className="agenda-card" key={item.title}><div className="agenda-top"><span>{String(index + 1).padStart(2, "0")}</span><item.icon /></div><div className="agenda-body"><h3>{item.title}</h3><p>{item.description}</p></div><div className="agenda-time"><Clock3 size={13} /><span>{item.hour}</span></div></article>)}</div>
    </div></section>

    <section className="section tickets-section" id="entradas"><div className="page-width tickets-layout">
      <div className="tickets-title"><span className="eyebrow">ENTRADAS</span><h2>ELIGE TU EXPERIENCIA</h2><i /></div>
      <div className="pricing-grid">{plans.map(plan => <article className={`price-card ${plan.popular ? "price-card--popular" : ""}`} key={plan.name}>{plan.popular && <span className="popular-label">MÁS POPULAR</span>}<h3><plan.icon size={20} /> {plan.name}</h3><p className="price">S/ <strong>{plan.price}</strong></p><ul>{plan.features.map(feature => <li key={feature}><Check size={12} /> {feature}</li>)}</ul><button type="button" className={plan.popular ? "button button--gradient price-button" : "button button--outline price-button"} onClick={() => openTicket(plan.name)}>COMPRAR AHORA</button></article>)}</div>
      <div className="why-attend"><h2>¿POR QUÉ ASISTIR?</h2><ul>{["Aprende de expertos de la industria", "Conoce las últimas tendencias en TI", "Conecta con profesionales y empresas", "Fortalece tu perfil profesional", "Sé parte de una comunidad que impulsa la tecnología en el país"].map(item => <li key={item}><span><Check size={14} strokeWidth={3} /></span>{item}</li>)}</ul></div>
    </div></section>

    <section className="venue-section" id="lugar"><div className="page-width venue-grid"><div className="venue-copy"><span className="eyebrow">LUGAR</span><h2>CENTRO DE CONVENCIONES LIMA</h2><p><MapPin size={19} fill="currentColor" /> Av. Arequipa 1234, Lima, Perú</p></div><Image src="/images/event/venue.png" alt="Exterior iluminado del centro de convenciones al atardecer" width={400} height={200} className="venue-photo" /><div className="last-call"><Ticket /><div><h3>LAS ENTRADAS SON LIMITADAS</h3><p>Sé parte del XII FULLDAY y vive una experiencia que potenciará tu futuro profesional.</p><a className="button button--gradient" href="#entradas">REGÍSTRATE AHORA <ArrowRight size={16} /></a></div></div></div></section>

    <footer className="footer"><div className="page-width footer-inner"><Brand dark /><nav aria-label="Navegación del pie de página"><a href="#inicio">Inicio</a><a href="#ponentes">Ponentes</a><a href="#temario">Temario</a><a href="#lugar">Lugar</a><button type="button" onClick={() => setModal("faq")}>FAQ</button><a href="mailto:contacto@fullday.pe">Contacto</a></nav><div className="socials"><a href="https://www.linkedin.com/" aria-label="LinkedIn">in</a><a href="https://www.instagram.com/" aria-label="Instagram">◎</a><a href="https://www.facebook.com/" aria-label="Facebook">f</a><a href="https://www.youtube.com/" aria-label="YouTube">▶</a></div><small>© 2024 XII FULLDAY.<br />Todos los derechos reservados.</small></div></footer>

    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" role="dialog" aria-modal="true" aria-label={modal === "video" ? "Video del evento" : modal === "faq" ? "Preguntas frecuentes" : "Comprar entrada"} onMouseDown={event => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Cerrar" onClick={() => setModal(null)}><X /></button>{modal === "video" ? <><h2>VIVE EL XII FULLDAY</h2><div className="video-preview"><Image src="/images/event/hero-stage-logo.png" alt="Auditorio del evento" fill sizes="(max-width: 600px) 90vw, 650px" /><Play size={46} fill="currentColor" /></div><p>Conecta con los profesionales que están transformando la tecnología.</p></> : modal === "faq" ? <><h2>PREGUNTAS FRECUENTES</h2><details open><summary>¿Dónde se realiza el evento?</summary><p>En el Centro de Convenciones Lima, Av. Arequipa 1234, Lima, Perú.</p></details><details><summary>¿La entrada incluye certificado?</summary><p>Sí, todos los tipos de entrada incluyen certificado de participación.</p></details><details><summary>¿A qué hora empieza?</summary><p>La primera sesión comienza a las 09:00.</p></details></> : <><h2>ENTRADA {selectedPlan}</h2><p>Completa tu inscripción para asegurar tu lugar en el XII FULLDAY.</p><form action="mailto:contacto@fullday.pe" method="post" encType="text/plain"><label>Nombre completo<input name="nombre" required placeholder="Tu nombre" /></label><label>Correo electrónico<input name="correo" type="email" required placeholder="tu@correo.com" /></label><input type="hidden" name="entrada" value={selectedPlan} /><button className="button button--gradient" type="submit">SOLICITAR ENTRADA <ArrowRight size={16} /></button></form></>}</div></div>}
  </main>
}
