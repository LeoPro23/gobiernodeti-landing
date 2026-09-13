import { Shield, Users, Award } from "lucide-react"

const highlights = [
  {
    icon: Shield,
    title: "50+ años",
    description: "De experiencia global en gobierno de TI",
  },
  {
    icon: Users,
    title: "140,000+",
    description: "Miembros en todo el mundo",
  },
  {
    icon: Award,
    title: "200+",
    description: "Capítulos en diferentes países",
  },
]

export function AboutSection() {
  return (
    <section id="nosotros" className="py-16 sm:py-20 md:py-24 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">Sobre Nosotros</h2>
          <div className="h-1 w-20 sm:w-24 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] mx-auto rounded-full" />
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center mb-12 sm:mb-16">
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">ISACA Internacional</h3>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              ISACA es una asociación internacional que apoya y patrocina el desarrollo de metodologías y
              certificaciones para la realización de actividades auditoría y control en sistemas de información. Fundada
              en 1969, ISACA es una fuente confiable de conocimiento, estándares, comunidad, y desarrollo de carrera
              para los profesionales en gobierno, privacidad, riesgos, seguridad, aseguramiento y auditoría de sistemas.
            </p>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              ISACA ofrece el <span className="text-[var(--brand-cyan)] font-semibold">Cybersecurity Nexus</span>, un
              completo conjunto de recursos para los profesionales en ciberseguridad; y{" "}
              <span className="text-[var(--brand-cyan)] font-semibold">COBIT</span>, un marco de referencia de negocios
              que ayuda a las empresas a gobernar y gestionar su información y su tecnología.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="glass rounded-xl p-5 sm:p-6 flex items-center gap-3 sm:gap-4 hover:scale-105 transition-transform"
              >
                <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-cyan)] flex-shrink-0">
                  <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{item.title}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-card rounded-xl p-6 sm:p-8 border border-border">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">ISACA Lima Chapter</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              En el Perú, el Capítulo Local se sitúa en la ciudad de Lima. Fue fundado en el año 1997 y es el número
              146. La composición de la lista de asociados del Capítulo Lima de ISACA constituye una evidencia clara del
              creciente interés en el Perú, en los temas relacionados con la auditoría, el control y la seguridad de la
              tecnología de la información.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 sm:p-8 border border-border">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">UNT ISACA Student Group</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Somos un grupo estudiantil de ISACA de la UNT motivados por los temas de Auditoría y Seguridad de la
              Información interesados en promover la educación más allá del aula. El reconocimiento oficial como ISACA
              Student Group de la Universidad Nacional de Trujillo fue obtenido en Julio del 2014.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
