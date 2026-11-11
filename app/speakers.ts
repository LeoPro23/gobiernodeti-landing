export type Speaker = {
  name: string
  initials: string
  /** Primera línea bajo el nombre: cargo o credenciales. */
  headline: string
  /** Segunda línea opcional: institución o especialidad. */
  detail?: string
  /** Título de la ponencia; mientras no esté confirmado se muestra el horario. */
  talk?: string
  time: string
  linkedin: string
  /** Foto real del ponente; sin foto se muestran sus iniciales. */
  image?: string
  /** Encuadre vertical de la foto (object-position) cuando el rostro no queda bien con el valor por defecto. */
  focus?: string
}

// Ordenados según el horario de exposición del XII FULLDAY.
export const speakers: Speaker[] = [
  {
    name: "Carlos Morales",
    initials: "CM",
    headline: "Director de Ingeniería",
    time: "9:00 – 10:00 a. m.",
    linkedin: "https://www.linkedin.com/in/moralescf/",
    image: "/images/speakers/carlos-morales.jpg",
  },
  {
    name: "Jorge Salazar",
    initials: "JS",
    headline: "Jefe de Auditoría de Tecnologías de Información",
    time: "10:00 – 11:00 a. m.",
    linkedin: "https://www.linkedin.com/in/jorge-salazar-heredia-mba-cgeit-cisa-cia-cobit-implementator-5b41b935/",
    image: "/images/speakers/jorge-salazar.jpg",
    focus: "center 38%",
  },
  {
    name: "Alberto Mendoza",
    initials: "AM",
    headline: "Docente e investigador",
    time: "11:30 a. m. – 12:30 p. m.",
    linkedin: "https://www.linkedin.com/in/alberto-mendoza-de-los-santos-9a391728/",
    image: "/images/speakers/alberto.webp",
  },
  {
    name: "Marcos Uriel Pinto",
    initials: "MP",
    headline: "Subgerente de Gobierno Tecnológico y Seguridad de la Información",
    time: "3:00 – 4:00 p. m.",
    linkedin: "https://www.linkedin.com/in/marcosurielpinto/",
    image: "/images/speakers/marcos-pinto.jpg",
  },
  {
    name: "Angel Achahuanco",
    initials: "AA",
    headline: "Jefe de TI",
    time: "4:00 – 5:00 p. m.",
    linkedin: "https://www.linkedin.com/in/angel-achahuanco-mujica/",
    image: "/images/speakers/angel-achahuanco.jpg",
  },
  {
    name: "Ronald Melgarejo",
    initials: "RM",
    headline: "Jefe de Seguridad TI",
    time: "5:00 – 6:00 p. m.",
    linkedin: "https://www.linkedin.com/in/ronald-rodrigo-melgarejo-l%C3%B3pez-a3483a32/",
    image: "/images/speakers/ronald-melgarejo.jpg",
    focus: "center 28%",
  },
]

const speaker = (name: string) => {
  const found = speakers.find(item => item.name === name)
  if (!found) throw new Error(`Ponente no encontrado en el programa: ${name}`)
  return found
}

export type ProgramItem =
  | { kind: "talk"; time: string; speaker: Speaker }
  | { kind: "welcome" | "break" | "lunch" | "closing"; time: string; title: string; detail?: string }

export const program: { label: string; range: string; items: ProgramItem[] }[] = [
  {
    label: "Mañana",
    range: "8:30 a. m. – 12:30 p. m.",
    items: [
      { kind: "welcome", time: "8:30 – 9:00", title: "Palabras de bienvenida", detail: "Inauguración y agradecimientos" },
      { kind: "talk", time: "9:00 – 10:00", speaker: speaker("Carlos Morales") },
      { kind: "talk", time: "10:00 – 11:00", speaker: speaker("Jorge Salazar") },
      { kind: "break", time: "11:00 – 11:30", title: "Coffee break", detail: "Networking entre asistentes" },
      { kind: "talk", time: "11:30 – 12:30", speaker: speaker("Alberto Mendoza") },
    ],
  },
  {
    label: "Tarde",
    range: "12:30 – 6:00 p. m.",
    items: [
      { kind: "lunch", time: "12:30 – 3:00", title: "Almuerzo", detail: "Receso del mediodía" },
      { kind: "talk", time: "3:00 – 4:00", speaker: speaker("Marcos Uriel Pinto") },
      { kind: "talk", time: "4:00 – 5:00", speaker: speaker("Angel Achahuanco") },
      { kind: "talk", time: "5:00 – 6:00", speaker: speaker("Ronald Melgarejo") },
      { kind: "closing", time: "6:00", title: "Cierre con banda en vivo", detail: "Palabras de cierre y agradecimientos" },
    ],
  },
]
