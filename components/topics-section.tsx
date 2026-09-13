import { Shield, Lock, Building, AlertTriangle, Server, Code, RefreshCw, FileCheck } from "lucide-react"
import topicsData from "@/data/topics.json"

const iconMap = {
  "shield-check": Shield,
  lock: Lock,
  building: Building,
  "alert-triangle": AlertTriangle,
  server: Server,
  code: Code,
  "refresh-cw": RefreshCw,
  "file-check": FileCheck,
}

export function TopicsSection() {
  return (
    <section id="temario" className="py-16 sm:py-20 md:py-24 bg-surface relative overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">Temario</h2>
          <div className="h-1 w-20 sm:w-24 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] mx-auto rounded-full mb-4 sm:mb-6" />
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Explora las áreas de conocimiento que abordamos en nuestro grupo estudiantil
          </p>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {topicsData.topics.map((topic) => {
            const Icon = iconMap[topic.icon as keyof typeof iconMap]
            return (
              <div
                key={topic.id}
                className="bg-card rounded-xl p-5 sm:p-6 border border-border hover:shadow-lg hover:-translate-y-2 transition-all group flex flex-col items-center text-center"
              >
                <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-cyan)] w-fit mb-3 sm:mb-4 group-hover:scale-110 transition-transform mx-auto">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2 sm:mb-3 leading-tight">
                  {topic.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{topic.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
