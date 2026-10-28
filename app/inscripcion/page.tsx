import type { Metadata } from "next"
import Image from "next/image"
import { BriefcaseBusiness, CalendarDays, MapPin, Network, UsersRound } from "lucide-react"
import { SiteHeader } from "../site-header"
import { RegistrationForm } from "./registration-form"
import "./inscripcion.css"

export const metadata: Metadata = {
  title: "Inscripción | XII FULLDAY",
  description: "Inscríbete al XII FULLDAY de Gestión de TI e Ingeniería de Sistemas.",
}

const benefits = [
  { icon: UsersRound, title: "Acceso a todas las ponencias", detail: "Con expertos de la industria" },
  { icon: Network, title: "Networking con profesionales", detail: "Conecta con empresas y talentos" },
  { icon: BriefcaseBusiness, title: "Casos reales de la industria", detail: "Experiencia y tendencias actuales" },
]

// Opciones: sustituir estas listas por los valores reales (o por valores obtenidos del backend) cuando estén definidos.
const institutions = ["Universidad Nacional de Trujillo", "Universidad Privada Antenor Orrego", "Universidad César Vallejo", "TECSUP Trujillo"]
const programs = ["Ingeniería de Sistemas", "Ingeniería de Software", "Ciencia de Datos", "Computación e Informática", "Tecnologías de la Información"]
const academicYears = ["I - II ciclo", "III - IV ciclo", "V - VI ciclo", "VII - VIII ciclo", "IX - X ciclo", "Egresado(a)"]
const cities = ["Trujillo", "Víctor Larco Herrera", "Huanchaco", "La Esperanza", "Chepén", "Otra ciudad"]

export default function InscripcionPage() {
  return <div className="registration-page">
    <SiteHeader page="registration" />
    <main className="registration-main">
      <Image className="registration-stage" src="/images/event/hero-stage-logo.png" alt="" width={1672} height={941} priority sizes="(max-width: 800px) 100vw, 34vw" />
      <div className="registration-shell">
        <section className="registration-overview" aria-labelledby="registration-title">
          <div className="registration-heading">
            <span className="registration-badge">INSCRIPCIÓN</span>
            <h1 id="registration-title">XII FULLDAY</h1>
            <p>GESTIÓN DE TI <i /> INGENIERÍA DE SISTEMAS</p>
          </div>
          <ul className="registration-benefits" aria-label="Beneficios del evento">
            {benefits.map(({ icon: Icon, title, detail }) => <li key={title}><span><Icon aria-hidden="true" /></span><div><strong>{title}</strong><small>{detail}</small></div></li>)}
          </ul>
          <div className="registration-details" aria-label="Información del evento">
            <div><CalendarDays aria-hidden="true" /><p><strong>Sábado</strong><span>21 de noviembre 2026</span></p></div>
            <div><MapPin aria-hidden="true" /><p><strong>Centro de convenciones</strong><span>Trujillo, Perú</span></p></div>
            <div><UsersRound aria-hidden="true" /><p><strong>+500</strong><span>asistentes</span></p></div>
          </div>
        </section>

        <section className="registration-form-card" aria-labelledby="form-title">
          <ol className="registration-steps" aria-label="Progreso de inscripción">
            <li className="is-current"><span>1</span>Datos personales</li>
            <li><span>2</span>Confirmación</li>
            <li><span>3</span>Listo</li>
          </ol>
          <div className="registration-form-intro">
            <h2 id="form-title">Datos personales</h2>
            <p>Completa la siguiente información para tu inscripción.</p>
          </div>
          <RegistrationForm institutions={institutions} programs={programs} academicYears={academicYears} cities={cities} />
        </section>
      </div>
    </main>
  </div>
}
