import Image from "next/image"
import type { Speaker } from "./speakers"

// Foto real del ponente o, si aún no la tenemos, sus iniciales sobre el degradado del evento.
export function SpeakerPhoto({ speaker, sizes }: { speaker: Speaker; sizes: string }) {
  if (speaker.image) return <Image src={speaker.image} alt={`Retrato de ${speaker.name}`} fill sizes={sizes} style={speaker.focus ? { objectPosition: speaker.focus } : undefined} />
  return <div className="speaker-initials" aria-hidden="true"><span>{speaker.initials}</span></div>
}
