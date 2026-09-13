"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"

const navigation = [
  { name: "Inicio", href: "#inicio" },
  { name: "Nosotros", href: "#nosotros" },
  { name: "Student Group", href: "#student-group" },
  { name: "Temario", href: "#temario" },
  { name: "Equipo", href: "#equipo" },
]

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isOverLightSection, setIsOverLightSection] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)

      const sections = document.querySelectorAll("section, footer")
      const headerHeight = 80 // Height of header
      const lightSections = ["equipo", "temario", "beneficios", "student-group", "nosotros", "contacto"]

      for (const section of sections) {
        const rect = section.getBoundingClientRect()
        if (rect.top <= headerHeight && rect.bottom >= 0) {
          const isFooter = section.tagName.toLowerCase() === "footer"
          const sectionId = section.id
          setIsOverLightSection(!isFooter && lightSections.includes(sectionId))
          break
        }
      }
    }

    handleScroll() // Initial check
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const textColor = isOverLightSection ? "text-[var(--brand-navy)]" : "text-white"
  const iconColor = isOverLightSection ? "text-[var(--brand-navy)]" : "text-white"

  const shouldApplyGlass = isScrolled || (isMobile && mobileMenuOpen)

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
        shouldApplyGlass
          ? "glass glass-bottom-border backdrop-blur-md bg-[var(--brand-navy)]/80 shadow-lg"
          : "bg-transparent backdrop-blur-none"
      }`}
      style={{
        transition: "background-color 0.5s ease-in-out, backdrop-filter 0.5s ease-in-out, box-shadow 0.5s ease-in-out",
      }}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <a href="#inicio" className="flex items-center gap-3">
              <Image
                src="/images/logo-isaca.png"
                alt="ISACA UNT Student Group"
                width={180}
                height={60}
                className={`h-12 w-auto transition-all duration-500 ${
                  isOverLightSection ? "brightness-100" : "brightness-0 invert"
                }`}
              />
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`text-sm font-medium ${textColor} hover:text-[var(--brand-cyan)] transition-colors duration-500`}
              >
                {item.name}
              </a>
            ))}
            <Button asChild className="bg-[var(--cta)] hover:bg-[var(--cta-hover)] text-white">
              <a href="#full-day">Únete</a>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? (
                <X className={`h-6 w-6 ${iconColor} transition-colors duration-500`} />
              ) : (
                <Menu className={`h-6 w-6 ${iconColor} transition-colors duration-500`} />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            <div className="flex flex-col gap-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-base font-medium ${textColor} hover:text-[var(--brand-cyan)] transition-colors duration-500 py-2`}
                >
                  {item.name}
                </a>
              ))}
              <Button asChild className="bg-[var(--cta)] hover:bg-[var(--cta-hover)] text-white mt-2">
                <a href="#full-day" onClick={() => setMobileMenuOpen(false)}>
                  Únete
                </a>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
