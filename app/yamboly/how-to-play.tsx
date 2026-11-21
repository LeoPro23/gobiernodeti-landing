import type { ReactNode } from "react";
import { ListChecks, MousePointerClick, UserPlus } from "lucide-react";

type Settings = { readingSec: number; answeringSec: number; points: number };

const REGISTER_STEPS: ReactNode[] = [
  <>Escanea el <strong>código QR</strong> de la pantalla del auditorio o abre esta página en tu celular.</>,
  <>Escribe tu <strong>DNI</strong> y toca <strong>«Continuar»</strong>.</>,
  <>Si te inscribiste en el Fullday, verás tu nombre: toca <strong>«Sí, soy yo · Entrar»</strong>. Si no, escribe tus nombres y tu correo.</>,
  <>Si ya participas en el quiz, puedes volver a ingresar con tu <strong>DNI</strong> y continuar desde la etapa actual.</>,
];

function answerSteps({ readingSec, answeringSec, points }: Settings): ReactNode[] {
  return [
    <>Mira la <strong>pantalla del auditorio</strong>: la ruleta elige la categoría de cada ronda.</>,
    <>La pregunta aparece en tu celular con los botones bloqueados para que la leas (<strong>{readingSec}{" "}s</strong>).</>,
    <>Cuando el moderador abra la votación, <strong>toca tu alternativa</strong> antes de que acabe el tiempo (<strong>{answeringSec}{" "}s</strong>). Solo cuenta tu primera respuesta: no se puede cambiar.</>,
    <>Al revelarse la respuesta verás si acertaste. Cada acierto suma <strong>{points}{" "}puntos</strong>; si hay empate, pesan los aciertos en preguntas difíciles y la rapidez.</>,
  ];
}

function Steps({ icon, title, steps }: { icon: ReactNode; title: string; steps: ReactNode[] }) {
  return (
    <div>
      <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.05rem", fontWeight: 900, color: "var(--yb-primary)", marginBottom: "0.85rem" }}>
        {icon} {title}
      </h3>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        {steps.map((step, index) => (
          <li key={index} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", fontSize: "0.92rem", lineHeight: 1.45, color: "var(--yb-text-body)" }}>
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: "0.85rem",
                fontWeight: 900,
                color: "#fff",
                background: "linear-gradient(135deg, var(--yb-primary) 0%, var(--yb-cyan) 100%)",
              }}
            >
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Paso a paso del quiz para el celular. Antes de inscribirse se muestran las dos partes;
// ya inscrito, solo cómo responder.
export function HowToPlay({ settings, registered = false }: { settings: Settings; registered?: boolean }) {
  return (
    <section className="yb-hud-panel" aria-labelledby="yb-how-title" style={{ padding: "1.75rem 1.4rem", marginTop: "1.25rem", textAlign: "left" }}>
      <h2 id="yb-how-title" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.3rem", fontWeight: 900, marginBottom: "1.25rem", color: "var(--yb-text-title)" }}>
        <ListChecks size={22} color="var(--yb-gold)" aria-hidden="true" /> {registered ? "¿Cómo responder?" : "Paso a paso"}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {!registered && <Steps icon={<UserPlus size={18} aria-hidden="true" />} title="1. Regístrate" steps={REGISTER_STEPS} />}
        <Steps
          icon={<MousePointerClick size={18} aria-hidden="true" />}
          title={registered ? "Durante cada ronda" : "2. Responde las preguntas"}
          steps={answerSteps(settings)}
        />
      </div>
      <p style={{ marginTop: "1.25rem", fontSize: "0.82rem", color: "var(--yb-text-muted)", lineHeight: 1.4 }}>
        Mantén la pantalla encendida y buena conexión. Si la página se queda congelada, recárgala: tu inscripción y tus puntos no se pierden.
      </p>
    </section>
  );
}
