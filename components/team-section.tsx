import Image from "next/image"
import teamData from "@/data/team.json"

export function TeamSection() {
  return (
    <section id="equipo" className="py-16 sm:py-20 md:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">Nuestro Equipo</h2>
          <div className="h-1 w-20 sm:w-24 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] mx-auto rounded-full mb-4 sm:mb-6" />
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4">
            Conoce a los miembros que hacen posible nuestra misión
          </p>
        </div>

        {/* Academic Advocate & Presidente */}
        <div className="mb-12 sm:mb-16 px-4">
          <div className="mx-auto flex flex-col md:flex-row gap-6 md:gap-8 max-w-4xl justify-center">
            <div className="flex-1 max-w-md mx-auto">
              <div className="bg-card rounded-xl p-6 sm:p-8 border-2 border-[var(--brand-cyan)] shadow-lg text-center h-full">
                <div className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto mb-4">
                  <Image
                    src={teamData.academicAdvocate.image || "/placeholder.svg"}
                    alt={teamData.academicAdvocate.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">{teamData.academicAdvocate.name}</h3>
                <p className="text-[var(--brand-cyan)] font-semibold uppercase text-xs sm:text-sm tracking-wide">
                  {teamData.academicAdvocate.role}
                </p>
              </div>
            </div>

            <div className="flex-1 max-w-md mx-auto">
              <div className="bg-card rounded-xl p-6 sm:p-8 border-2 border-[var(--brand-blue)] shadow-lg text-center h-full">
                <div className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto mb-4">
                  <Image
                    src={teamData.directivaGeneral[0]?.image || "/placeholder.svg"}
                    alt={teamData.directivaGeneral[0]?.name ?? "Presidente"}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                  {teamData.directivaGeneral[0]?.name}
                </h3>
                <p className="text-[var(--brand-blue)] font-semibold uppercase text-xs sm:text-sm tracking-wide mb-1">
                  {teamData.directivaGeneral[0]?.role}
                </p>
                <p className="text-muted-foreground text-sm">Ciclo {teamData.directivaGeneral[0]?.cycle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Directiva General */}
        <div className="mb-12 sm:mb-16">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-8 text-center">Directiva General</h3>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {teamData.directivaGeneral.slice(1).map((member, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-5 sm:p-6 border border-border hover:shadow-lg transition-shadow text-center w-full max-w-[260px]"
              >
                <div className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto mb-3 sm:mb-4">
                  <Image
                    src={member.image || "/placeholder.svg"}
                    alt={member.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <h4 className="font-semibold text-foreground mb-1 text-base leading-tight">{member.name}</h4>
                <p className="text-[var(--brand-blue)] font-medium text-sm mb-1">{member.role}</p>
                <p className="text-muted-foreground text-sm">Ciclo {member.cycle}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Comité de Marketing */}
        <div className="mb-12 sm:mb-16">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-8 text-center">
            Comité de Marketing
          </h3>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {teamData.marketing.map((member, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-5 sm:p-6 border border-border hover:shadow-lg transition-shadow text-center w-full max-w-[260px]"
              >
                <div className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto mb-2 sm:mb-3">
                  <Image
                    src={member.image || "/placeholder.svg"}
                    alt={member.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <h4 className="font-semibold text-foreground mb-1 text-sm sm:text-base leading-tight">{member.name}</h4>
                <p className="text-muted-foreground text-sm">Ciclo {member.cycle}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Comité de Relaciones Sociales */}
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-8 text-center">
            Comité de Relaciones Sociales
          </h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 justify-items-center">
            {teamData.relacionesSociales.map((member, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-5 sm:p-6 border border-border hover:shadow-lg transition-shadow text-center w-full max-w-[260px]"
              >
                <div className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto mb-2 sm:mb-3">
                  <Image
                    src={member.image || "/placeholder.svg"}
                    alt={member.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <h4 className="font-semibold text-foreground mb-1 text-xs sm:text-sm leading-tight">{member.name}</h4>
                <p className="text-muted-foreground text-xs">Ciclo {member.cycle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
