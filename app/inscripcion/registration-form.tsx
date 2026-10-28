"use client"

import { useRef, useState, type FormEvent } from "react"
import { ArrowRight, AtSign, Building2, GraduationCap, IdCard, Layers3, LockKeyhole, MapPinned, Phone, UserRound } from "lucide-react"

type RegistrationFormProps = {
  institutions: string[]
  programs: string[]
  academicYears: string[]
  cities: string[]
}

export function RegistrationForm({ institutions, programs, academicYears, cities }: RegistrationFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [invalidFields, setInvalidFields] = useState<string[]>([])
  const [showToast, setShowToast] = useState(false)
  const controlClass = (name: string) => invalidFields.includes(name) ? "registration-control is-invalid" : "registration-control"

  const clearFieldError = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target as HTMLInputElement
    if (target.name) setInvalidFields(current => current.filter(name => name !== target.name))
  }

  const validate = () => {
    const form = formRef.current
    if (!form) return
    const requiredFields = Array.from(form.querySelectorAll<HTMLInputElement>("[required]"))
    const incomplete = requiredFields.filter(field => field.type === "checkbox" ? !field.checked : !field.value.trim())

    if (incomplete.length === 0) return
    setInvalidFields(incomplete.map(field => field.name))
    setShowToast(true)
    window.setTimeout(() => setShowToast(false), 4200)
    incomplete[0].focus()
  }

  return <form className="registration-form" ref={formRef} noValidate onInput={clearFieldError} onChange={clearFieldError}>
    <div className="registration-fields">
      <label><span className="registration-label">Nombres <b aria-hidden="true">*</b></span><div className={controlClass("nombres")}><UserRound aria-hidden="true" /><input name="nombres" autoComplete="given-name" required placeholder="Ingresa tus nombres" /></div></label>
      <label><span className="registration-label">Apellidos <b aria-hidden="true">*</b></span><div className={controlClass("apellidos")}><UserRound aria-hidden="true" /><input name="apellidos" autoComplete="family-name" required placeholder="Ingresa tus apellidos" /></div></label>
      <label><span className="registration-label">Correo electrónico <b aria-hidden="true">*</b></span><div className={controlClass("correo")}><AtSign aria-hidden="true" /><input name="correo" type="email" autoComplete="email" required placeholder="ejemplo@correo.com" /></div></label>
      <label><span className="registration-label">DNI <b aria-hidden="true">*</b></span><div className={controlClass("dni")}><IdCard aria-hidden="true" /><input name="dni" inputMode="numeric" pattern="[0-9]{8}" required placeholder="12345678" /></div></label>
      <label className="registration-field-wide"><span className="registration-label">Teléfono <em>(opcional)</em></span><div className={controlClass("telefono")}><Phone aria-hidden="true" /><input name="telefono" type="tel" autoComplete="tel" placeholder="987 654 321" /></div></label>
      <label className="registration-field-wide"><span className="registration-label">Universidad / Institución <em>(opcional)</em></span><div className={controlClass("institucion")}><Building2 aria-hidden="true" /><select name="institucion" defaultValue=""><option value="" disabled>Selecciona tu universidad o institución</option>{institutions.map(institution => <option key={institution}>{institution}</option>)}</select></div></label>
      <label><span className="registration-label">Carrera / Programa <em>(opcional)</em></span><div className={controlClass("carrera")}><GraduationCap aria-hidden="true" /><select name="carrera" defaultValue=""><option value="" disabled>Selecciona tu carrera</option>{programs.map(program => <option key={program}>{program}</option>)}</select></div></label>
      <label><span className="registration-label">Ciclo / Año <em>(opcional)</em></span><div className={controlClass("ciclo")}><Layers3 aria-hidden="true" /><select name="ciclo" defaultValue=""><option value="" disabled>Selecciona tu ciclo</option>{academicYears.map(year => <option key={year}>{year}</option>)}</select></div></label>
      <label className="registration-field-wide"><span className="registration-label">Ciudad de procedencia <em>(opcional)</em></span><div className={controlClass("ciudad")}><MapPinned aria-hidden="true" /><select name="ciudad" defaultValue=""><option value="" disabled>Selecciona tu ciudad</option>{cities.map(city => <option key={city}>{city}</option>)}</select></div></label>
    </div>
    <label className={invalidFields.includes("autorizacion") ? "registration-consent is-invalid" : "registration-consent"}><input name="autorizacion" type="checkbox" required /><span>Autorizo el uso de mis datos para el envío de información sobre el evento.</span></label>
    <button className="registration-submit" type="button" onClick={validate}>CONTINUAR <ArrowRight size={18} aria-hidden="true" /></button>
    <p className="registration-privacy"><LockKeyhole aria-hidden="true" /> Tus datos están protegidos y serán utilizados únicamente para fines del evento.</p>
    {showToast && <div className="registration-toast" role="alert">Completa los campos obligatorios para continuar.</div>}
  </form>
}
