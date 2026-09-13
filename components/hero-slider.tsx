"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import slidesData from "@/data/slides.json"

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const { slides } = slidesData

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [slides.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  return (
    <section id="inicio" className="relative h-screen w-full overflow-hidden">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentSlide ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={index !== currentSlide}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={slide.image || "/placeholder.svg"}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-navy)]/95 via-[var(--brand-navy)]/85 to-[var(--brand-navy)]/60" />
          </div>

          {/* Content */}
          <div className="relative h-full flex items-center">
            <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 w-full">
              <div className="max-w-3xl">
                <h2 className="text-xs sm:text-sm font-semibold text-[var(--brand-cyan)] mb-3 sm:mb-4 tracking-wider uppercase animate-fade-in">
                  {slide.subtitle}
                </h2>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight text-balance animate-fade-in-up">
                  {slide.title}
                </h1>
                <p
                  className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 leading-relaxed text-pretty animate-fade-in-up"
                  style={{ animationDelay: "100ms" }}
                >
                  {slide.description}
                </p>
                <Button
                  asChild
                  size="lg"
                  className="bg-[var(--cta)] hover:bg-[var(--cta-hover)] text-white text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6 animate-fade-in-up w-full sm:w-auto"
                  style={{ animationDelay: "200ms" }}
                >
                  <a href={slide.cta.link}>{slide.cta.text}</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="hidden sm:flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-3 rounded-full glass hover:bg-white/20 transition-all group"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-white group-hover:scale-110 transition-transform" />
      </button>
      <button
        onClick={nextSlide}
        className="hidden sm:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-3 rounded-full glass hover:bg-white/20 transition-all group"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-white group-hover:scale-110 transition-transform" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2 sm:gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-1.5 sm:h-2 rounded-full transition-all ${
              index === currentSlide
                ? "w-8 sm:w-12 bg-[var(--brand-cyan)]"
                : "w-1.5 sm:w-2 bg-white/50 hover:bg-white/80"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
