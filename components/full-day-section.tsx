"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Check,
  Phone,
  Building2,
  CalendarDays,
  Clock8,
  MapPin,
  ArrowUpRight,
  Linkedin,
} from "lucide-react"
import eventData from "@/data/full-day-event.json"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function FullDaySection() {
  const targetDate = new Date(eventData.date).getTime()
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const difference = targetDate - now

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  const timeUnits = [
    { label: "Días", value: timeLeft.days },
    { label: "Horas", value: timeLeft.hours },
    { label: "Minutos", value: timeLeft.minutes },
    { label: "Segundos", value: timeLeft.seconds },
  ]

  const eventDetails = [
    { label: "Fecha", value: eventData.details?.date, icon: CalendarDays },
    { label: "Hora", value: eventData.details?.time, icon: Clock8 },
    { label: "Lugar", value: eventData.details?.location, icon: MapPin },
  ].filter((detail) => detail.value)

  return (
    <section id="full-day" className="py-16 md:py-24 bg-[var(--brand-navy)] relative overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-navy)]/90 via-[var(--brand-slate)]/50 to-[var(--brand-navy)]/90" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16 animate-fade-in-up">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4 text-balance">
            {eventData.title}
          </h2>
          <p className="text-[var(--brand-cyan)] text-lg sm:text-xl md:text-2xl font-semibold tracking-wide">
            {eventData.subtitle}
          </p>
        </div>

        {/* Overview */}
        <div className="mb-12 md:mb-16 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] items-stretch">
            <div className="space-y-6">
              {eventData.description?.map((paragraph, index) => (
                <p key={index} className="text-white/80 text-base sm:text-lg leading-relaxed">
                  {paragraph}
                </p>
              ))}

              {eventData.highlights && eventData.highlights.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {eventData.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-[var(--brand-green)] mt-1 flex-shrink-0" />
                      <p className="text-white/70 text-sm sm:text-base leading-relaxed">{highlight}</p>
                    </div>
                  ))}
                </div>
              )}

              {eventData.registration?.link && (
                <div className="pt-4 flex justify-center">
                  <a
                    href={eventData.registration.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] px-8 py-3 text-base sm:text-lg font-semibold text-white shadow-lg shadow-[var(--brand-cyan)]/20 transition-transform duration-300 hover:translate-y-[-2px] hover:shadow-xl"
                  >
                    ¡Inscríbete Ahora!
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>

            {eventDetails.length > 0 && (
              <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-6 sm:p-8 backdrop-blur-xl shadow-[0_25px_70px_rgba(10,15,55,0.35)] self-stretch flex flex-col">
                <div className="absolute inset-0 opacity-70">
                  <span className="absolute -top-24 right-0 h-48 w-48 rounded-full bg-[var(--brand-cyan)]/25 blur-3xl" />
                  <span className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[var(--brand-blue)]/25 blur-2xl" />
                </div>

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex flex-col items-center text-center pb-6">
                    <h3 className="text-white text-xl font-semibold mt-4">Datos del evento</h3>
                    <div className="mt-3 h-px w-20 bg-gradient-to-r from-transparent via-[var(--brand-cyan)]/60 to-transparent" />
                  </div>

                  <div className="relative flex-1 mt-6">
                    <div className="space-y-6">
                      {eventDetails.map((detail, index) => {
                        const Icon = detail.icon
                        const isLast = index === eventDetails.length - 1

                        return (
                          <div key={detail.label}>
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--brand-cyan)]/30 bg-[var(--brand-cyan)]/12 text-[var(--brand-cyan)] shadow-[0_10px_35px_rgba(20,180,255,0.25)]">
                                <Icon className="h-5 w-5 shrink-0" />
                              </div>
                              <div className="flex flex-col">
                                <p className="text-white/50 text-xs uppercase tracking-[0.35em]">{detail.label}</p>
                                <p className="text-white text-lg font-semibold leading-tight">{detail.value}</p>
                              </div>
                            </div>
                            {!isLast && (
                              <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-[var(--brand-cyan)]/60 to-transparent" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Countdown */}
        <div className="mb-12 md:mb-16 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-4xl mx-auto">
            {timeUnits.map((unit, index) => (
              <div
                key={unit.label}
                className="glass rounded-xl p-4 sm:p-6 text-center backdrop-blur-md"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--brand-cyan)] mb-2 tabular-nums">
                  {String(unit.value).padStart(2, "0")}
                </div>
                <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider font-medium">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Speakers */}
        {eventData.speakers && eventData.speakers.length > 0 && (
          <div className="mb-12 md:mb-16 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <div className="text-center mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ponentes confirmados</h3>
              <p className="text-white/70 text-sm sm:text-base max-w-2xl mx-auto">
                Conoce a los especialistas que compartirán experiencias sobre auditoría, gobierno de TI, seguridad y
                transformación digital.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 sm:gap-6 max-w-6xl mx-auto">
              {eventData.speakers.map((speaker) => (
                <div
                  key={speaker.name}
                  className="glass rounded-2xl p-6 backdrop-blur-md text-center flex flex-col items-center h-full"
                >
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-4">
                    <div className="absolute inset-0 rounded-full bg-[var(--brand-cyan)]/20 blur-xl" />
                    <Image
                      src={speaker.image || "/placeholder.svg"}
                      alt={speaker.name}
                      fill
                      sizes="(min-width: 640px) 112px, 96px"
                      className="rounded-full object-cover border-2 border-[var(--brand-cyan)]/30"
                    />
                  </div>
                  <h4 className="text-white font-semibold text-base sm:text-lg mb-1">{speaker.name}</h4>
                  <p className="text-white/60 text-sm uppercase tracking-wide mb-3">{speaker.role}</p>
                  {speaker.linkedin && (
                    <a
                      href={speaker.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-cyan)] hover:text-white transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      Ver perfil
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Plans */}
        <div className="mb-12 md:mb-16 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            {eventData.plans.map((plan, index) => (
              <div
                key={plan.id}
                className="glass rounded-2xl p-6 backdrop-blur-md hover:scale-105 transition-transform duration-300"
                style={{ animationDelay: `${300 + index * 100}ms` }}
              >
                {/* Plan Header */}
                <div
                  className="rounded-t-xl -mx-6 -mt-6 px-6 py-4 mb-6"
                  style={{
                    background: `linear-gradient(135deg, ${plan.color}dd, ${plan.color}99)`,
                  }}
                >
                  <h3 className="text-white font-bold text-center uppercase text-sm">{plan.type}</h3>
                  <p className="text-white/90 font-semibold text-center text-xs mt-1">{plan.category}</p>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--brand-green)] mt-0.5 flex-shrink-0" />
                      <span className="text-white/80 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Price */}
                <div className="text-center pt-4 border-t border-white/10">
                  {plan.promoPrice ? (
                    <div>
                      <div className="text-white/50 text-sm line-through mb-1">S/ {plan.price}</div>
                      <div className="text-3xl font-bold text-[var(--brand-cyan)]">S/ {plan.promoPrice}</div>
                      <div className="text-[var(--brand-green)] text-xs font-semibold mt-1 uppercase">Precio Promo</div>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-white">S/ {plan.price}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Promo Banner */}
          <div className="mt-8 max-w-2xl mx-auto glass rounded-xl p-6 backdrop-blur-md animate-pulse-slow">
            <div className="text-center">
              <p className="text-[var(--brand-cyan)] font-bold text-lg sm:text-xl mb-3">🎉 APROVECHA NUESTRA PROMO</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <div className="glass rounded-lg px-6 py-3 backdrop-blur-sm">
                  <p className="text-white/70 text-xs uppercase mb-1">Estudiante Básico</p>
                  <p className="text-[var(--brand-green)] font-bold text-xl">S/. 20.00</p>
                </div>
                <div className="glass rounded-lg px-6 py-3 backdrop-blur-sm">
                  <p className="text-white/70 text-xs uppercase mb-1">Estudiante Completo</p>
                  <p className="text-[var(--brand-green)] font-bold text-xl">S/. 30.00</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="animate-fade-in-up" style={{ animationDelay: "600ms" }}>
          <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8">Métodos de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {eventData.paymentMethods.map((method, index) => (
              <div
                key={index}
                className="glass rounded-xl p-6 backdrop-blur-md hover:border-[var(--brand-cyan)]/30 border border-transparent transition-colors duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  {method.icon === "phone" ? (
                    <Phone className="w-6 h-6 text-[var(--brand-cyan)]" />
                  ) : (
                    <Building2 className="w-6 h-6 text-[var(--brand-cyan)]" />
                  )}
                  <h4 className="text-white font-bold text-lg">{method.name}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-white/70">{method.contact}</p>
                  {method.number && <p className="text-[var(--brand-cyan)] font-mono font-semibold">{method.number}</p>}
                  {method.account && (
                    <div>
                      <p className="text-white/50 text-xs">Cuenta:</p>
                      <p className="text-white/80 font-mono">{method.account}</p>
                    </div>
                  )}
                  {method.cci && (
                    <div>
                      <p className="text-white/50 text-xs">CCI:</p>
                      <p className="text-white/80 font-mono text-xs break-all">{method.cci}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
