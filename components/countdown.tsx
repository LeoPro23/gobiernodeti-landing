"use client"

import { useState, useEffect } from "react"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function Countdown() {
  const targetDate = new Date("2025-11-29T23:59:59").getTime()
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

  return (
    <div className="py-12 sm:py-16 md:py-20 bg-[var(--brand-navy)] relative overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">Próximo Evento</h2>
          <p className="text-white/80 text-sm sm:text-base md:text-lg px-4">
            Cuenta regresiva hasta el 29 de Noviembre, 2025
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-4xl mx-auto">
          {timeUnits.map((unit, index) => (
            <div
              key={unit.label}
              className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 text-center animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--brand-cyan)] mb-1 sm:mb-2 tabular-nums">
                {String(unit.value).padStart(2, "0")}
              </div>
              <div className="text-xs sm:text-sm md:text-base text-white/70 uppercase tracking-wider font-medium">
                {unit.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
