"use client"

import type React from "react"

import { useState } from "react"
import { MapPin, Mail, Phone, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const contactInfo = [
  {
    icon: MapPin,
    title: "Dirección",
    content: "Campus Universidad Nacional de Trujillo\nAv. Juan Pablo II S/N San Andrés\nTrujillo, Perú",
  },
  {
    icon: Mail,
    title: "Correo",
    content: "untstudentgroup.isaca@gmail.com",
  },
  {
    icon: Phone,
    title: "Celular",
    content: "(+51) 966875583",
  },
]

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Form submitted:", formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <section id="contacto" className="py-16 sm:py-20 md:py-24 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">Contáctanos</h2>
          <div className="h-1 w-20 sm:w-24 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] mx-auto rounded-full mb-4 sm:mb-6" />
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4">
            Estamos aquí para responder tus preguntas
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12">
          {/* Contact Info */}
          <div className="space-y-4 sm:space-y-6">
            <div className="mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">Información de Contacto</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Puedes calificar nuestro trabajo o ponerte en contacto con nosotros enviándonos un mensaje. También
                puedes escribirnos a nuestro correo electrónico.
              </p>
            </div>

            {contactInfo.map((item, index) => (
              <div
                key={index}
                className="flex gap-3 sm:gap-4 items-start bg-card rounded-xl p-5 sm:p-6 border border-border hover:shadow-md transition-shadow"
              >
                <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-cyan)] flex-shrink-0">
                  <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1 sm:mb-2 text-sm sm:text-base">{item.title}</h4>
                  <p className="text-muted-foreground whitespace-pre-line text-xs sm:text-sm">{item.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="bg-card rounded-xl p-6 sm:p-8 border border-border">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Tu nombre
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ingresa tu nombre completo"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Tu e-mail
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                  Asunto
                </label>
                <Input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Asunto del mensaje"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  Tu mensaje
                </label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Escribe tu mensaje aquí..."
                  rows={6}
                  className="w-full resize-none"
                />
              </div>

              <Button type="submit" size="lg" className="w-full bg-[var(--cta)] hover:bg-[var(--cta-hover)] text-white">
                <Send className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Enviar Mensaje
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
