import { Target, Eye, CheckCircle, Star } from "lucide-react"
import benefitsData from "@/data/benefits.json"

const objectives = [
  "Promover la educación y ayudar a ampliar los conocimientos y habilidades de los miembros en los campos interrelacionados con el Gobierno de TI, auditoría a los sistemas de información, seguridad, control y aseguramiento.",
  "Fomentar en sus miembros el libre intercambio de gobierno de TI, técnicas de auditoría a los sistemas de información, seguridad, control y aseguramiento, enfoques y resolución de problemas.",
  "Promover las certificaciones profesionales de la Asociación y el gobierno de TI.",
]

export function StudentGroupSection() {
  return (
    <section id="student-group" className="py-16 sm:py-20 md:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">Student Group</h2>
          <div className="h-1 w-20 sm:w-24 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] mx-auto rounded-full" />
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
          <div className="bg-card rounded-xl p-6 sm:p-8 border border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="p-2 rounded-lg bg-[var(--brand-blue)]/10">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--brand-blue)]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">Misión</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Dar a conocer la temática desarrollada por ISACA a la Comunidad Universitaria mediante un canal de
              comunicación entre los estudiantes miembros y profesionales de la industria que trabajan en los ámbitos
              pertinentes, complementando el aprendizaje adquirido en el aula con un mayor conocimiento de la carrera.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 sm:p-8 border border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="p-2 rounded-lg bg-[var(--brand-cyan)]/10">
                <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--brand-cyan)]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">Visión</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Conformarnos como un ISACA Student Group competitivo a nivel mundial, así como también que los miembros
              apliquen los conocimientos y buenas prácticas adquiridos en su futura carrera profesional, siendo éstos
              los nuevos líderes de sus organizaciones y generen el cambio para el desarrollo nacional.
            </p>
          </div>
        </div>

        {/* Objectives */}
        <div className="mb-12 sm:mb-16">
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8 text-center">Objetivos</h3>
          <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
            {objectives.map((objective, index) => (
              <div
                key={index}
                className="flex gap-3 sm:gap-4 items-start bg-surface rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--brand-green)] flex-shrink-0 mt-0.5 sm:mt-1" />
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{objective}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4 text-center">
            ¿Por qué ser parte de UNT Isaca Student Group?
          </h3>
          <p className="text-muted-foreground text-center mb-8 sm:mb-12 text-base sm:text-lg px-4">
            Descubre los beneficios de unirte a nuestro grupo estudiantil
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {benefitsData.benefits.map((benefit, index) => (
              <div
                key={benefit.id}
                className="glass rounded-xl p-5 sm:p-6 hover:scale-105 transition-transform flex flex-col items-center text-center"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Star className="h-6 w-6 sm:h-8 sm:w-8 text-[var(--brand-cyan)] mb-3 sm:mb-4 mx-auto" />
                <h4 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">{benefit.title}</h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
