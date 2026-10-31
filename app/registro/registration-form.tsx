"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  GraduationCap,
  Layers,
  Lock,
  MapPin,
  Pencil,
  Phone,
  Sparkles,
  Ticket,
  User,
  Users,
  AlertCircle,
  Loader2,
  Share2,
} from "lucide-react"
import { SiteHeader } from "../site-header"
import { submitRegistration } from "./actions"
import { TurnstileWidget } from "./turnstile-widget"

const UNIVERSIDADES = [
  "Universidad Nacional de Trujillo (UNT)",
  "Universidad Privada Antenor Orrego (UPAO)",
  "Universidad César Vallejo (UCV)",
  "Universidad Privada del Norte (UPN)",
  "Universidad Nacional Mayor de San Marcos (UNMSM)",
  "Universidad Nacional de Ingeniería (UNI)",
  "Pontificia Universidad Católica del Perú (PUCP)",
  "Universidad Peruana de Ciencias Aplicadas (UPC)",
  "Universidad Tecnológica del Perú (UTP)",
  "Universidad de Lima (ULima)",
  "Otra institución / Empresa",
]

const CARRERAS = [
  "Ingeniería de Sistemas",
  "Ingeniería Informática",
  "Ingeniería de Software",
  "Ciencia de la Computación",
  "Tecnologías de la Información",
  "Ingeniería Industrial",
  "Administración y Gestión TI",
  "Otra especialidad",
]

const CICLOS = [
  "1.° ciclo",
  "2.° ciclo",
  "3.° ciclo",
  "4.° ciclo",
  "5.° ciclo",
  "6.° ciclo",
  "7.° ciclo",
  "8.° ciclo",
  "9.° ciclo",
  "10.° ciclo",
  "Egresado / Graduado",
  "Profesional / Docente",
]

const CIUDADES = [
  "Trujillo, La Libertad",
  "Lima, Lima",
  "Arequipa, Arequipa",
  "Chiclayo, Lambayeque",
  "Piura, Piura",
  "Cajamarca, Cajamarca",
  "Chimbote, Áncash",
  "Cusco, Cusco",
  "Huancayo, Junín",
  "Otra ciudad",
]

interface CustomSelectProps {
  id: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  options: string[]
  value: string
  placeholder: string
  onChange: (value: string) => void
}

function CustomSelect({ icon: Icon, options, value, placeholder, onChange }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className={`custom-select ${isOpen ? "is-open" : ""}`} ref={containerRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Icon size={16} className="reg-input-icon" />
        <span className={`custom-select-text ${!value ? "is-placeholder" : ""}`}>
          {value || placeholder}
        </span>
        <ChevronDown size={15} className="custom-select-arrow" />
      </button>

      {isOpen && (
        <ul className="custom-select-dropdown" role="listbox">
          {options.map(option => {
            const isSelected = value === option
            return (
              <li
                key={option}
                role="option"
                aria-selected={isSelected}
                className={`custom-select-option ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
              >
                <span>{option}</span>
                {isSelected && <Check size={14} className="custom-select-check" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

interface FormData {
  nombres: string
  apellidos: string
  dni: string
  universidad: string
  carrera: string
  ciclo: string
  telefono: string
  ciudad: string
  aceptaTerminos: boolean
  autorizaDatos: boolean
}

export default function RegistrationForm({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileVersion, setTurnstileVersion] = useState(0)
  const submittingRef = useRef(false)

  const [form, setForm] = useState<FormData>({
    nombres: "",
    apellidos: "",
    dni: "",
    universidad: "",
    carrera: "",
    ciclo: "",
    telefono: "",
    ciudad: "Trujillo, La Libertad",
    aceptaTerminos: true,
    autorizaDatos: true,
  })

  const [confirmedTerms, setConfirmedTerms] = useState(true)
  const [registeredData, setRegisteredData] = useState<{ id: number; dni: string; nombres: string } | null>(null)
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false)

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errorMessage) setErrorMessage(null)
  }

  // Paso 1 -> Paso 2
  const handleNextToConfirmation = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.nombres.trim() || !form.apellidos.trim() || !form.dni.trim() || !form.universidad || !form.carrera || !form.ciclo) {
      setErrorMessage("Por favor completa todos los campos requeridos con (*).")
      return
    }

    if (!/^\d{8,12}$/.test(form.dni.trim())) {
      setErrorMessage("El DNI debe contener solo números (mínimo 8 dígitos).")
      return
    }

    if (!form.aceptaTerminos) {
      setErrorMessage("Debes aceptar los términos y condiciones del evento para continuar.")
      return
    }

    setErrorMessage(null)
    setStep(2)
  }

  // Paso 2 -> Envío a DB
  const handleConfirmRegistration = async () => {
    if (submittingRef.current) return

    if (!confirmedTerms) {
      setErrorMessage("Debes confirmar que la información proporcionada es correcta.")
      return
    }

    if (!turnstileSiteKey || !turnstileToken) {
      setErrorMessage("Completa la verificación de seguridad antes de confirmar tu inscripción.")
      return
    }

    submittingRef.current = true
    setLoading(true)
    setErrorMessage(null)

    try {
      const response = await submitRegistration({
        nombres: form.nombres,
        apellidos: form.apellidos,
        dni: form.dni,
        universidad: form.universidad,
        carrera: form.carrera,
        ciclo: form.ciclo,
        telefono: form.telefono,
        ciudad: form.ciudad,
        aceptaTerminos: form.aceptaTerminos,
        autorizaDatos: form.autorizaDatos,
      }, turnstileToken)

      if (!response.success || !response.data) {
        setErrorMessage(response.error || "Ocurrió un error al procesar tu inscripción.")
        return
      }

      setRegisteredData({
        id: response.data.id,
        dni: response.data.dni,
        nombres: `${response.data.nombres} ${response.data.apellidos}`,
      })
      setStep(3)
    } catch {
      setErrorMessage("Error de red al intentar registrar los datos. Por favor intenta de nuevo.")
    } finally {
      // A token may already have been consumed even when registration fails.
      setTurnstileToken(null)
      setTurnstileVersion(version => version + 1)
      submittingRef.current = false
      setLoading(false)
    }
  }

  const handleBackToForm = () => {
    if (submittingRef.current) return
    setTurnstileToken(null)
    setErrorMessage(null)
    setStep(1)
  }

  // Abrir Google Calendar directamente en la web
  const openGoogleCalendar = () => {
    const title = encodeURIComponent("XII FULLDAY - Gestión de TI e Ingeniería de Sistemas")
    const details = encodeURIComponent("¡Tu inscripción al XII FULLDAY está confirmada! Acompáñanos a una jornada llena de innovación, tecnología y networking.\n\nLugar: Centro de Convenciones, Lima, Perú.")
    const location = encodeURIComponent("Centro de Convenciones, Lima, Perú")
    const dates = "20261121T140000Z/20261121T230000Z" // 9:00 AM a 6:00 PM Lima (-5) = 14:00 a 23:00 UTC
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`
    window.open(url, "_blank")
    setCalendarMenuOpen(false)
  }

  // Generador de archivo .ics estándar RFC 5545 para Outlook, Apple y calendarios locales
  const downloadIcsFile = () => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ISACA UNT//XII FULLDAY//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:XII FULLDAY",
      "BEGIN:VEVENT",
      "UID:xii-fullday-2026@isaca-unt.org",
      "SEQUENCE:0",
      "STATUS:CONFIRMED",
      "DTSTAMP:20261028T000000Z",
      "DTSTART:20261121T140000Z",
      "DTEND:20261121T230000Z",
      "SUMMARY:XII FULLDAY - Gestión de TI e Ingeniería de Sistemas",
      "DESCRIPTION:El evento académico y profesional más importante de Gestión de TI e Ingeniería de Sistemas.",
      "LOCATION:Centro de Convenciones, Lima, Perú",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n")

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "XII-FULLDAY-2026.ics")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setCalendarMenuOpen(false)
  }

  return (
    <>
      <SiteHeader page="register" />

      <main className="reg-page">
        <div className="page-width reg-layout">
          {/* Columna Izquierda: Información del Evento */}
          <section className="reg-info" aria-label="Información del evento">
            <span className="reg-badge">
              <Sparkles size={13} /> INSCRIPCIÓN
            </span>

            <h1 className="reg-title">XII FULLDAY</h1>
            <p className="reg-subtitle">GESTIÓN DE TI | INGENIERÍA DE SISTEMAS</p>

            <p className="reg-desc">
              Completa tus datos para asegurar tu participación en el evento académico y profesional más importante
              de Gestión de TI e Ingeniería de Sistemas.
            </p>

            <div className="reg-highlights">
              <div className="reg-highlight-item">
                <div className="reg-highlight-icon">
                  <Users size={22} />
                </div>
                <div className="reg-highlight-text">
                  <strong>Acceso a todas las ponencias</strong>
                  <span>Con expertos de primer nivel de la industria</span>
                </div>
              </div>

              <div className="reg-highlight-item">
                <div className="reg-highlight-icon">
                  <Share2 size={22} />
                </div>
                <div className="reg-highlight-text">
                  <strong>Networking con profesionales</strong>
                  <span>Conecta con líderes de empresas y talentos</span>
                </div>
              </div>

              <div className="reg-highlight-item">
                <div className="reg-highlight-icon">
                  <Ticket size={22} />
                </div>
                <div className="reg-highlight-text">
                  <strong>Casos reales de la industria</strong>
                  <span>Experiencias, buenas prácticas y tendencias actuales</span>
                </div>
              </div>
            </div>

            <div className="reg-meta">
              <div className="reg-meta-item">
                <CalendarDays size={18} />
                <span>
                  Sábado<br />
                  <strong>21 de noviembre 2026</strong>
                </span>
              </div>
              <div className="reg-meta-item">
                <MapPin size={18} />
                <span>
                  Centro de Convenciones<br />
                  <strong>Lima, Perú</strong>
                </span>
              </div>
              <div className="reg-meta-item">
                <Users size={18} />
                <span>
                  <strong>+500</strong><br />
                  Asistentes
                </span>
              </div>
            </div>

            <div className="reg-stage-card">
              <Image
                src="/images/event/hero-stage-logo.png"
                alt="Escenario XII FULLDAY"
                width={600}
                height={338}
                className="reg-stage-img"
              />
            </div>
          </section>

          {/* Columna Derecha: Tarjeta con Formulario Multistep */}
          <section className="reg-card" aria-label="Formulario de inscripción">
            {/* Stepper */}
            <div className="reg-stepper" aria-label="Pasos de inscripción">
              <div className="reg-step-line">
                <div
                  className="reg-step-line-fill"
                  style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
                />
              </div>

              <div className={`reg-step ${step === 1 ? "is-active" : step > 1 ? "is-completed" : ""}`}>
                <div className="reg-step-circle">
                  {step > 1 ? <Check size={18} strokeWidth={3} /> : "1"}
                </div>
                <span className="reg-step-label">Datos personales</span>
              </div>

              <div className={`reg-step ${step === 2 ? "is-active" : step > 2 ? "is-completed" : ""}`}>
                <div className="reg-step-circle">
                  {step > 2 ? <Check size={18} strokeWidth={3} /> : "2"}
                </div>
                <span className="reg-step-label">Confirmación</span>
              </div>

              <div className={`reg-step ${step === 3 ? "is-active" : ""}`}>
                <div className="reg-step-circle">
                  {step === 3 ? <Check size={18} strokeWidth={3} /> : "3"}
                </div>
                <span className="reg-step-label">Listo</span>
              </div>
            </div>

            {/* PASO 1: DATOS PERSONALES */}
            {step === 1 && (
              <>
                <div className="reg-card-head">
                  <h2>Datos personales</h2>
                  <p>Completa la siguiente información para tu inscripción.</p>
                </div>

                <form className="reg-form" onSubmit={handleNextToConfirmation}>
                  {errorMessage && (
                    <div className="reg-alert reg-alert--error" role="alert">
                      <AlertCircle size={18} className="flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="reg-form-grid">
                    <div className="reg-field">
                      <label className="reg-label" htmlFor="nombres">
                        Nombres <span>*</span>
                      </label>
                      <div className="reg-input-wrap">
                        <User size={16} className="reg-input-icon" />
                        <input
                          id="nombres"
                          className="reg-input"
                          placeholder="Ingresa tus nombres"
                          required
                          value={form.nombres}
                          onChange={e => updateField("nombres", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="reg-field">
                      <label className="reg-label" htmlFor="apellidos">
                        Apellidos <span>*</span>
                      </label>
                      <div className="reg-input-wrap">
                        <User size={16} className="reg-input-icon" />
                        <input
                          id="apellidos"
                          className="reg-input"
                          placeholder="Ingresa tus apellidos"
                          required
                          value={form.apellidos}
                          onChange={e => updateField("apellidos", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="reg-field">
                      <label className="reg-label" htmlFor="dni">
                        DNI <span>*</span>
                      </label>
                      <div className="reg-input-wrap">
                        <Ticket size={16} className="reg-input-icon" />
                        <input
                          id="dni"
                          className="reg-input"
                          placeholder="12345678"
                          maxLength={12}
                          required
                          value={form.dni}
                          onChange={e => updateField("dni", e.target.value.replace(/\D/g, ""))}
                        />
                      </div>
                    </div>

                    <div className="reg-field">
                      <label className="reg-label" htmlFor="telefono">
                        Teléfono (opcional)
                      </label>
                      <div className="reg-input-wrap">
                        <Phone size={16} className="reg-input-icon" />
                        <input
                          id="telefono"
                          className="reg-input"
                          placeholder="987 654 321"
                          value={form.telefono}
                          onChange={e => updateField("telefono", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="reg-field reg-field--full">
                      <label className="reg-label" htmlFor="universidad">
                        Universidad / Institución <span>*</span>
                      </label>
                      <CustomSelect
                        id="universidad"
                        icon={Building2}
                        options={UNIVERSIDADES}
                        value={form.universidad}
                        placeholder="Selecciona tu universidad o institución"
                        onChange={val => updateField("universidad", val)}
                      />
                    </div>

                    <div className="reg-field">
                      <label className="reg-label" htmlFor="carrera">
                        Carrera / Programa <span>*</span>
                      </label>
                      <CustomSelect
                        id="carrera"
                        icon={GraduationCap}
                        options={CARRERAS}
                        value={form.carrera}
                        placeholder="Selecciona tu carrera"
                        onChange={val => updateField("carrera", val)}
                      />
                    </div>

                    <div className="reg-field">
                      <label className="reg-label" htmlFor="ciclo">
                        Ciclo / Año <span>*</span>
                      </label>
                      <CustomSelect
                        id="ciclo"
                        icon={Layers}
                        options={CICLOS}
                        value={form.ciclo}
                        placeholder="Selecciona tu ciclo"
                        onChange={val => updateField("ciclo", val)}
                      />
                    </div>

                    <div className="reg-field reg-field--full">
                      <label className="reg-label" htmlFor="ciudad">
                        Ciudad de procedencia
                      </label>
                      <CustomSelect
                        id="ciudad"
                        icon={MapPin}
                        options={CIUDADES}
                        value={form.ciudad}
                        placeholder="Selecciona tu ciudad"
                        onChange={val => updateField("ciudad", val)}
                      />
                    </div>
                  </div>

                  <div className="reg-checkboxes">
                    <label className="reg-checkbox-item">
                      <input
                        type="checkbox"
                        checked={form.aceptaTerminos}
                        onChange={e => updateField("aceptaTerminos", e.target.checked)}
                      />
                      <span>Acepto los términos y condiciones del evento.</span>
                    </label>

                    <label className="reg-checkbox-item">
                      <input
                        type="checkbox"
                        checked={form.autorizaDatos}
                        onChange={e => updateField("autorizaDatos", e.target.checked)}
                      />
                      <span>Autorizo el uso de mis datos para el envío de información sobre el evento.</span>
                    </label>
                  </div>

                  <div className="reg-actions">
                    <button type="submit" className="reg-btn reg-btn--primary">
                      CONTINUAR <ArrowRight size={16} />
                    </button>
                  </div>

                  <div className="reg-footer-note">
                    <Lock size={13} />
                    <span>Tus datos están protegidos y serán utilizados únicamente para fines del evento.</span>
                  </div>
                </form>
              </>
            )}

            {/* PASO 2: CONFIRMACIÓN */}
            {step === 2 && (
              <>
                <div className="reg-card-head">
                  <h2>Confirma tu inscripción</h2>
                  <p>Revisa que toda la información sea correcta antes de finalizar.</p>
                </div>

                {errorMessage && (
                  <div className="reg-alert reg-alert--error mb-4" role="alert">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="reg-summary-card">
                  <div className="reg-summary-head">
                    <h3>
                      <User size={16} /> Datos personales
                    </h3>
                    <button type="button" className="reg-edit-btn" onClick={handleBackToForm} disabled={loading}>
                      <Pencil size={12} /> Editar
                    </button>
                  </div>

                  <div className="reg-summary-grid">
                    <div className="reg-summary-item">
                      <User size={15} className="reg-summary-icon" />
                      <div>
                        <span>Nombres</span>
                        <strong>{form.nombres}</strong>
                      </div>
                    </div>

                    <div className="reg-summary-item">
                      <User size={15} className="reg-summary-icon" />
                      <div>
                        <span>Apellidos</span>
                        <strong>{form.apellidos}</strong>
                      </div>
                    </div>

                    <div className="reg-summary-item">
                      <Ticket size={15} className="reg-summary-icon" />
                      <div>
                        <span>DNI</span>
                        <strong>{form.dni}</strong>
                      </div>
                    </div>

                    <div className="reg-summary-item">
                      <Phone size={15} className="reg-summary-icon" />
                      <div>
                        <span>Teléfono</span>
                        <strong>{form.telefono || "No especificado"}</strong>
                      </div>
                    </div>

                    <div className="reg-summary-item" style={{ gridColumn: "1 / -1" }}>
                      <Building2 size={15} className="reg-summary-icon" />
                      <div>
                        <span>Universidad / Institución</span>
                        <strong>{form.universidad}</strong>
                      </div>
                    </div>

                    <div className="reg-summary-item">
                      <GraduationCap size={15} className="reg-summary-icon" />
                      <div>
                        <span>Carrera / Programa</span>
                        <strong>{form.carrera}</strong>
                      </div>
                    </div>

                    <div className="reg-summary-item">
                      <Layers size={15} className="reg-summary-icon" />
                      <div>
                        <span>Ciclo / Año</span>
                        <strong>{form.ciclo}</strong>
                      </div>
                    </div>

                    <div className="reg-summary-item" style={{ gridColumn: "1 / -1" }}>
                      <MapPin size={15} className="reg-summary-icon" />
                      <div>
                        <span>Ciudad de procedencia</span>
                        <strong>{form.ciudad}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="reg-checkboxes mb-4">
                  <label className="reg-checkbox-item">
                    <input
                      type="checkbox"
                      checked={confirmedTerms}
                      onChange={e => setConfirmedTerms(e.target.checked)}
                      disabled={loading}
                    />
                    <span>
                      Confirmo que la información proporcionada es correcta y acepto los términos y condiciones del evento.
                    </span>
                  </label>
                </div>

                {turnstileSiteKey ? (
                  <TurnstileWidget
                    key={turnstileVersion}
                    siteKey={turnstileSiteKey}
                    onTokenChange={setTurnstileToken}
                  />
                ) : (
                  <div className="reg-alert reg-alert--error mb-4" role="alert">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>La verificación de seguridad no está disponible. Por favor, intenta inscribirte más tarde.</span>
                  </div>
                )}

                <div className="reg-actions">
                  <button
                    type="button"
                    className="reg-btn reg-btn--outline"
                    onClick={handleBackToForm}
                    disabled={loading}
                  >
                    <ArrowLeft size={16} /> VOLVER
                  </button>

                  <button
                    type="button"
                    className="reg-btn reg-btn--primary"
                    onClick={handleConfirmRegistration}
                    disabled={loading || !confirmedTerms || !turnstileSiteKey || !turnstileToken}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> PROCESANDO...
                      </>
                    ) : (
                      <>
                        CONFIRMAR INSCRIPCIÓN <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* PASO 3: ÉXITO */}
            {step === 3 && (
              <div className="reg-success">
                <div className="reg-success-icon-wrap">
                  <CheckCircle2 size={44} strokeWidth={2.5} />
                </div>

                <h2>¡Inscripción realizada con éxito!</h2>
                <p className="reg-success-p">
                  Gracias por registrarte al <strong>XII FULLDAY</strong>. Tu lugar para el evento académico más importante del año ha sido reservado.
                </p>

                <div className="reg-ticket-box">
                  <div className="reg-ticket-icon">
                    <Ticket size={24} />
                  </div>
                  <div className="reg-ticket-info">
                    <h4>Registro confirmado</h4>
                    <p>
                      Asistente: <strong>{registeredData?.nombres || `${form.nombres} ${form.apellidos}`}</strong>
                      <br />
                      DNI de acreditación: <strong>{registeredData?.dni || form.dni}</strong>
                    </p>
                  </div>
                </div>

                <div className="reg-next-steps">
                  <h3>¿Qué sigue?</h3>
                  <div className="reg-steps-grid">
                    <div className="reg-step-card">
                      <Ticket size={22} />
                      <strong>1. Guarda tu DNI</strong>
                      <p>Presenta tu documento de identidad para ingresar al evento.</p>
                    </div>

                    <div className="reg-step-card">
                      <Share2 size={22} />
                      <strong>2. Mantente informado</strong>
                      <p>Sigue las redes oficiales de ISACA para conocer los horarios.</p>
                    </div>

                    <div className="reg-step-card">
                      <Users size={22} />
                      <strong>3. Nos vemos allí</strong>
                      <p>Sábado 21 de noviembre de 2026 en Lima, Perú.</p>
                    </div>
                  </div>
                </div>

                <div className="reg-success-actions">
                  <div className="reg-cal-wrap">
                    <button
                      type="button"
                      className="reg-btn reg-btn--outline"
                      onClick={() => setCalendarMenuOpen(!calendarMenuOpen)}
                    >
                      <Calendar size={16} /> AGREGAR AL CALENDARIO <ChevronDown size={14} />
                    </button>

                    {calendarMenuOpen && (
                      <div className="reg-cal-dropdown">
                        <button
                          type="button"
                          className="reg-cal-option"
                          onClick={openGoogleCalendar}
                        >
                          <Calendar size={15} />
                          <span>Google Calendar (Abrir directo)</span>
                        </button>
                        <button
                          type="button"
                          className="reg-cal-option"
                          onClick={downloadIcsFile}
                        >
                          <Download size={15} />
                          <span>Outlook / Apple (.ics)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <Link href="/" className="reg-btn reg-btn--primary">
                    IR AL INICIO <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
