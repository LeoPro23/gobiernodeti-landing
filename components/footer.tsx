import Image from "next/image"
import { Facebook, Instagram, Linkedin, Mail } from "lucide-react"

const navigation = {
  main: [
    { name: "Inicio", href: "#inicio" },
    { name: "Nosotros", href: "#nosotros" },
    { name: "Student Group", href: "#student-group" },
    { name: "Temario", href: "#temario" },
    { name: "Equipo", href: "#equipo" },
  ],
  resources: [
    { name: "COBIT5 (Español)", href: "https://www.isaca.org/resources/cobit" },
    { name: "CSX", href: "https://www.isaca.org/credentialing/cybersecurity" },
  ],
  social: [
    { name: "Facebook", icon: Facebook, href: "https://www.facebook.com/ISACAUNT/" },
    { name: "Instagram", icon: Instagram, href: "https://www.instagram.com/isacaunt/" },
    { name: "LinkedIn", icon: Linkedin, href: "https://www.linkedin.com/in/isg-unt/" },
    { name: "Email", icon: Mail, href: "mailto:untstudentgroup.isaca@gmail.com" },
  ],
}

export function Footer() {
  return (
    <footer className="bg-[var(--brand-navy)] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="lg:col-span-2">
            <Image
              src="/images/logo-isaca.png"
              alt="ISACA UNT Student Group"
              width={200}
              height={67}
              className="h-16 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-white/80 leading-relaxed mb-4">
              Grupo estudiantil de ISACA de la Universidad Nacional de Trujillo. Promovemos la educación en auditoría,
              gobierno de TI, riesgo y ciberseguridad.
            </p>
            <div className="flex gap-4">
              {navigation.social.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label={item.name}
                >
                  <item.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Navegación</h3>
            <ul className="space-y-2">
              {navigation.main.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-white/80 hover:text-[var(--brand-cyan)] transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recursos</h3>
            <ul className="space-y-2">
              {navigation.resources.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-[var(--brand-cyan)] transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <p className="text-center text-white/60 text-sm">
            © {new Date().getFullYear()} ISACA UNT Student Group. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
