import Link from "next/link"
import { AlertTriangle, CheckCircle2, Download, Gift, History, ListChecks, Lock, Pencil, Plus, Search, Settings2, Shapes, Upload } from "lucide-react"
import { requireAdmin } from "@/lib/admin-auth"
import { getYambolyAdminData, parseQuestionFilters } from "@/lib/yamboly-admin"
import { DIFFICULTIES, DIFFICULTY_LABELS, IMPORT_TEMPLATE, MAX_ROUNDS, OPTION_IDS } from "@/lib/yamboly-rules"
import { DashboardTabs } from "../dashboard-ui"
import { ActionForm } from "../action-form"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>

const dateFormat = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Lima" })

const STATUS_LABELS: Record<string, string> = {
  WAITING_REGISTRATION: "Inscripción",
  ROULETTE: "Ruleta",
  QUESTION_READY: "Pregunta visible, lectura pendiente",
  QUESTION_READING: "Lectura de pregunta",
  QUESTION_ANSWERING: "Respuestas abiertas",
  QUESTION_REVEAL: "Respuesta revelada",
  ROUND_RANKING: "Clasificación",
  TIEBREAK: "Desempate",
  PODIUM: "Podio publicado",
}

type Question = {
  id: number
  category_id: number
  category_name: string
  category_color: string
  category_active: boolean
  text: string
  options: { id: string; text: string }[]
  correct_option_id: string
  difficulty: keyof typeof DIFFICULTY_LABELS
  active: boolean
  used: boolean
  is_tiebreaker: boolean
  updated_at: string | null
}

function QuestionFields({ question, categories }: { question?: Question; categories: { id: number; name: string }[] }) {
  return <>
    <div className="qa-grid qa-grid-3">
      <label>Categoría<select name="categoryId" defaultValue={question?.category_id ?? ""} required>
        <option value="" disabled>Elige una categoría</option>
        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select></label>
      <label>Dificultad<select name="difficulty" defaultValue={question?.difficulty ?? "INTERMEDIA"}>
        {DIFFICULTIES.map(difficulty => <option key={difficulty} value={difficulty}>{DIFFICULTY_LABELS[difficulty]}</option>)}
      </select></label>
      <label className="qa-check"><input type="checkbox" name="isTiebreaker" defaultChecked={question?.is_tiebreaker ?? false} /> Reservada para desempate<small>No sale en la ruleta; solo en preguntas adicionales.</small></label>
    </div>
    <label>Enunciado<textarea name="text" rows={2} maxLength={500} required defaultValue={question?.text ?? ""} placeholder="¿Cuál es…?" /></label>
    <div className="qa-grid qa-grid-2">
      {OPTION_IDS.map((option, index) => <label key={option}>Alternativa {option}{index > 1 ? " (opcional)" : ""}
        <input name={`option${option}`} maxLength={200} required={index < 2} defaultValue={question?.options?.[index]?.text ?? ""} />
      </label>)}
    </div>
    <fieldset className="qa-radios"><legend>Respuesta correcta</legend>
      {OPTION_IDS.map(option => <label key={option}><input type="radio" name="correct" value={option} required defaultChecked={question ? question.correct_option_id === option : option === "A"} /> {option}</label>)}
    </fieldset>
  </>
}

export default async function YambolyAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin()
  const params = await searchParams
  const filters = parseQuestionFilters(params)
  const editId = typeof params.edit === "string" && /^\d{1,9}$/.test(params.edit) ? Number(params.edit) : null
  const { session, started, categories, questions, prizes, audit, readiness, editing: editingRow } = await getYambolyAdminData(filters, editId)
  const editing = editingRow as Question | null
  const filterQuery = new URLSearchParams(Object.entries({ categoria: filters.category, dificultad: filters.difficulty, tipo: filters.type, estado: filters.status, q: filters.q }).filter(([, value]) => value)).toString()
  const sequence = session.difficulty_sequence
  const activeFilters = Object.values(filters).some(Boolean)

  return (
    <main className="admin-container qa-page">
      <DashboardTabs yamboly />
      <section className="admin-heading">
        <div>
          <p className="admin-eyebrow">YÁMBOLY QUIZ CHALLENGE / CONFIGURACIÓN</p>
          <h1>Banco de preguntas, premios y reglas.</h1>
          <p className="admin-muted">Prepara la partida antes del evento. Los cambios quedan en el historial.</p>
        </div>
        <div className="admin-heading-actions">
          <Link href="/yamboly/moderador" className="admin-primary" target="_blank">Consola del moderador ↗</Link>
          <Link href="/yamboly/screen" className="admin-secondary" target="_blank">Pantalla del auditorio ↗</Link>
        </div>
      </section>

      <nav className="qa-jump" aria-label="Secciones del quiz">
        <a href="#estado">Estado</a><a href="#parametros">Parámetros</a><a href="#premios">Premios</a><a href="#categorias">Categorías</a><a href="#preguntas">Preguntas</a><a href="#importar">Importar</a><a href="#historial">Historial</a>
      </nav>

      <section id="estado" className="admin-panel qa-panel" aria-labelledby="estado-title">
        <div className="admin-panel-heading"><div><h2 id="estado-title">Estado de la partida</h2><p className="admin-muted">Etapa actual: <strong>{STATUS_LABELS[session.status] ?? session.status}</strong>{started ? ` · ronda ${session.current_round} de ${session.total_rounds}` : ""}{session.tiebreak_round ? ` · ${session.tiebreak_round} pregunta(s) de desempate` : ""}</p></div><ListChecks size={21} aria-hidden="true" /></div>
        {started && <p className="qa-lock"><Lock size={16} aria-hidden="true" /> {session.status === "PODIUM" ? "Partida terminada (podio publicado). Para preparar otra, reiníciala desde la consola del moderador. Mientras tanto," : "Partida en curso:"} los parámetros y los puestos premiados están bloqueados, y las preguntas ya jugadas no se pueden editar. Los demás cambios se permiten y quedan marcados en el historial como «durante la partida».</p>}
        <div className="qa-readiness">
          {DIFFICULTIES.map(difficulty => {
            const ok = readiness.available[difficulty] >= readiness.required[difficulty]
            // Con la partida iniciada, las preguntas jugadas ya no cuentan: no es una alerta.
            return <div key={difficulty} className={ok ? "qa-ready qa-ready-ok" : started ? "qa-ready" : "qa-ready qa-ready-bad"}>
              {ok ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
              <span><strong>{DIFFICULTY_LABELS[difficulty]}</strong> {readiness.available[difficulty]} sin jugar · se necesitan {readiness.required[difficulty]}</span>
            </div>
          })}
          <div className={readiness.bank >= readiness.suggestedBank ? "qa-ready qa-ready-ok" : "qa-ready qa-ready-warn"}>
            {readiness.bank >= readiness.suggestedBank ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
            <span><strong>Banco</strong> {readiness.bank} preguntas publicadas · se sugieren {readiness.suggestedBank}</span>
          </div>
          <div className={readiness.tiebreakAvailable >= session.max_tiebreak_questions ? "qa-ready qa-ready-ok" : "qa-ready qa-ready-warn"}>
            {readiness.tiebreakAvailable >= session.max_tiebreak_questions ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
            <span><strong>Desempate</strong> {readiness.tiebreakAvailable} {readiness.tiebreakAvailable === 1 ? "pregunta reservada" : "preguntas reservadas"} · máximo {session.max_tiebreak_questions}{readiness.tiebreakAvailable < session.max_tiebreak_questions ? " · si se agotan se usan preguntas del banco general" : ""}</span>
          </div>
          <div className={prizes.length ? "qa-ready qa-ready-ok" : "qa-ready qa-ready-warn"}>
            {prizes.length ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
            <span><strong>Premios</strong> {prizes.length} puesto{prizes.length === 1 ? "" : "s"} premiado{prizes.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        {!started && !readiness.canStart && <p className="qa-hint">La consola del moderador no podrá iniciar la partida hasta que haya preguntas publicadas suficientes para cada dificultad.</p>}
      </section>

      <section id="parametros" className="admin-panel qa-panel" aria-labelledby="parametros-title">
        <div className="admin-panel-heading"><div><h2 id="parametros-title">Parámetros de la partida</h2><p className="admin-muted">Se guardan antes del inicio; se bloquean al girar la primera ruleta.</p></div><Settings2 size={21} aria-hidden="true" /></div>
        <ActionForm className="qa-form" key={`settings-${session.updated_at}`}>
          <input type="hidden" name="intent" value="settings" />
          <fieldset disabled={started} className="qa-fieldset">
            <div className="qa-grid qa-grid-4">
              <label>Lectura bloqueada (s)<input type="number" name="readingDurationSec" min={3} max={60} required defaultValue={session.reading_duration_sec} /></label>
              <label>Tiempo para responder (s)<input type="number" name="answeringDurationSec" min={5} max={120} required defaultValue={session.answering_duration_sec} /></label>
              <label>Puntos por acierto<input type="number" name="pointsPerCorrect" min={1} max={100} required defaultValue={session.points_per_correct} /></label>
              <label>Umbral de empate técnico (ms)<input type="number" name="tieThresholdMs" min={0} max={10000} step={100} required defaultValue={session.tie_threshold_ms} /></label>
              <label>Máximo de preguntas de desempate<input type="number" name="maxTiebreakQuestions" min={1} max={20} required defaultValue={session.max_tiebreak_questions} /></label>
            </div>
            <fieldset className="qa-rounds"><legend>Rondas y dificultad (deja «—» para no usar la ronda)</legend>
              {Array.from({ length: MAX_ROUNDS }, (_, index) => <label key={index}>Ronda {index + 1}
                <select name={`round${index}`} defaultValue={sequence[index] ?? ""}>
                  <option value="">—</option>
                  {DIFFICULTIES.map(difficulty => <option key={difficulty} value={difficulty}>{DIFFICULTY_LABELS[difficulty]}</option>)}
                </select>
              </label>)}
            </fieldset>
            <label className="qa-check"><input type="checkbox" name="allowLateEntry" defaultChecked={session.allow_late_entry} /> Permitir ingreso tardío<small>Quien entre tarde solo responde las preguntas siguientes, sin puntaje retroactivo. Recomendado: desactivado.</small></label>
            <div className="qa-actions"><button className="admin-primary" type="submit">Guardar parámetros</button></div>
          </fieldset>
        </ActionForm>
      </section>

      <section id="premios" className="admin-panel qa-panel" aria-labelledby="premios-title">
        <div className="admin-panel-heading"><div><h2 id="premios-title">Premios por puesto</h2><p className="admin-muted">Cada premio corresponde a un puesto del ranking final. Un empate técnico en estos puestos obliga a desempatar.</p></div><Gift size={21} aria-hidden="true" /></div>
        <div className="qa-cards">
          {prizes.map(prize => <ActionForm key={`${prize.place}-${prize.title}-${prize.units}-${prize.description}-${prize.conditions}-${prize.image_url}`} className="qa-card">
            <input type="hidden" name="intent" value="prize-update" />
            <input type="hidden" name="place" value={prize.place} />
            <p className="qa-place">{prize.place}° puesto</p>
            <label>Premio<input name="title" required maxLength={150} defaultValue={prize.title} /></label>
            <label>Descripción<textarea name="description" rows={2} maxLength={500} defaultValue={prize.description ?? ""} /></label>
            <div className="qa-grid qa-grid-2">
              <label>Unidades<input type="number" name="units" min={1} max={1000} required defaultValue={prize.units} /></label>
              <label>Imagen (ruta o https)<input name="imageUrl" maxLength={300} defaultValue={prize.image_url ?? ""} placeholder="/images/..." /></label>
            </div>
            <label>Condiciones de entrega<textarea name="conditions" rows={2} maxLength={500} defaultValue={prize.conditions ?? ""} placeholder="Plazo para reclamar, conservación, reasignación…" /></label>
            <div className="qa-actions"><button className="admin-secondary" type="submit">Guardar premio</button></div>
          </ActionForm>)}
        </div>
        <div className="qa-split">
          <ActionForm className="qa-form" resetOnSuccess>
            <fieldset disabled={started} className="qa-fieldset">
              <input type="hidden" name="intent" value="prize-create" />
              <h3>Agregar el puesto {prizes.length + 1}</h3>
              <div className="qa-grid qa-grid-2">
                <label>Premio<input name="title" required maxLength={150} /></label>
                <label>Unidades<input type="number" name="units" min={1} max={1000} required defaultValue={1} /></label>
              </div>
              <label>Descripción<textarea name="description" rows={2} maxLength={500} /></label>
              <input type="hidden" name="imageUrl" value="" />
              <input type="hidden" name="conditions" value="" />
              <div className="qa-actions"><button className="admin-primary" type="submit"><Plus size={16} aria-hidden="true" /> Agregar premio</button></div>
            </fieldset>
          </ActionForm>
          {prizes.length > 0 && <ActionForm className="qa-form" confirmMessage={`¿Quitar el premio del puesto ${prizes.length}?`}>
            <fieldset disabled={started} className="qa-fieldset">
              <input type="hidden" name="intent" value="prize-delete-last" />
              <h3>Reducir puestos premiados</h3>
              <p className="admin-muted">Se quita el último puesto ({prizes.length}°) para mantener los puestos consecutivos.</p>
              <div className="qa-actions"><button className="admin-secondary qa-danger" type="submit">Quitar puesto {prizes.length}°</button></div>
            </fieldset>
          </ActionForm>}
        </div>
      </section>

      <section id="categorias" className="admin-panel qa-panel" aria-labelledby="categorias-title">
        <div className="admin-panel-heading"><div><h2 id="categorias-title">Categorías de la ruleta</h2><p className="admin-muted">Solo las categorías activas aparecen en la ruleta. «Disponibles» cuenta preguntas publicadas de ronda aún sin jugar.</p></div><Shapes size={21} aria-hidden="true" /></div>
        <div className="admin-table-scroll" role="region" aria-label="Categorías" tabIndex={0}>
          <table className="admin-table qa-table">
            <thead><tr><th scope="col">Categoría</th><th scope="col">Preguntas</th><th scope="col">Disponibles</th><th scope="col">Ruleta</th><th scope="col">Acciones</th></tr></thead>
            <tbody>{categories.map(category => <tr key={category.id}>
              <td><ActionForm className="qa-inline-form" key={`${category.id}-${category.name}-${category.color}`} inlineStatus>
                <input type="hidden" name="intent" value="category-update" /><input type="hidden" name="id" value={category.id} />
                <input type="color" name="color" defaultValue={category.color} aria-label={`Color de ${category.name}`} />
                <input name="name" defaultValue={category.name} maxLength={120} required aria-label="Nombre de la categoría" />
                <button className="admin-secondary qa-small" type="submit">Guardar</button>
              </ActionForm></td>
              <td>{category.total}</td>
              <td>{category.available}</td>
              <td><span className={category.active ? "admin-badge admin-badge-yes" : "admin-badge"}>{category.active ? "Activa" : "Inactiva"}</span></td>
              <td><div className="qa-row-actions">
                <ActionForm inlineStatus><input type="hidden" name="intent" value="category-toggle" /><input type="hidden" name="id" value={category.id} /><input type="hidden" name="active" value={String(!category.active)} /><button className="admin-secondary qa-small" type="submit">{category.active ? "Desactivar" : "Activar"}</button></ActionForm>
                {category.total === 0 && <ActionForm inlineStatus confirmMessage={`¿Eliminar la categoría «${category.name}»?`}><input type="hidden" name="intent" value="category-delete" /><input type="hidden" name="id" value={category.id} /><button className="admin-secondary qa-small qa-danger" type="submit">Eliminar</button></ActionForm>}
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <ActionForm className="qa-form qa-inline-create" resetOnSuccess>
          <input type="hidden" name="intent" value="category-create" />
          <label>Nueva categoría<input name="name" maxLength={120} required placeholder="Ej. Continuidad del negocio" /></label>
          <label>Color<input type="color" name="color" defaultValue="#006ff5" /></label>
          <button className="admin-primary" type="submit"><Plus size={16} aria-hidden="true" /> Crear categoría</button>
        </ActionForm>
      </section>

      <section id="preguntas" className="admin-panel qa-panel" aria-labelledby="preguntas-title">
        <div className="admin-panel-heading"><div><h2 id="preguntas-title">Preguntas <span className="admin-count">{questions.length}</span></h2><p className="admin-muted">Las preguntas ocultas no salen en la ruleta. Las ya jugadas no se pueden modificar hasta reiniciar la partida.</p></div><ListChecks size={21} aria-hidden="true" /></div>

        <div id="editor" className="qa-editor">
          {editing ? <ActionForm className="qa-form" key={`edit-${editing.id}-${editing.updated_at}`}>
            <input type="hidden" name="intent" value="question-update" /><input type="hidden" name="id" value={editing.id} />
            <h3><Pencil size={16} aria-hidden="true" /> Editar pregunta #{editing.id}</h3>
            {editing.used && <p className="qa-lock"><Lock size={16} aria-hidden="true" /> Ya se jugó en la partida actual: no se puede modificar.</p>}
            <fieldset disabled={editing.used} className="qa-fieldset"><QuestionFields question={editing} categories={categories} /></fieldset>
            <div className="qa-actions"><Link className="admin-secondary" href={`/dashboard/yamboly${filterQuery ? `?${filterQuery}` : ""}#preguntas`}>Cancelar</Link><button className="admin-primary" type="submit" disabled={editing.used}>Guardar cambios</button></div>
          </ActionForm> : <ActionForm className="qa-form" resetOnSuccess>
            <input type="hidden" name="intent" value="question-create" />
            <h3><Plus size={16} aria-hidden="true" /> Nueva pregunta</h3>
            <QuestionFields categories={categories} />
            <div className="qa-actions"><button className="admin-primary" type="submit">Agregar pregunta</button></div>
          </ActionForm>}
        </div>

        <form action="/dashboard/yamboly" method="get" className="admin-filters qa-filters">
          <div className="admin-filter-grid">
            <label className="admin-search">Buscar<div><Search size={17} aria-hidden="true" /><input name="q" defaultValue={filters.q} maxLength={120} placeholder="Texto de la pregunta" /></div></label>
            <label>Categoría<select name="categoria" defaultValue={filters.category}><option value="">Todas</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Dificultad<select name="dificultad" defaultValue={filters.difficulty}><option value="">Todas</option>{DIFFICULTIES.map(difficulty => <option key={difficulty} value={difficulty}>{DIFFICULTY_LABELS[difficulty]}</option>)}</select></label>
            <label>Tipo<select name="tipo" defaultValue={filters.type}><option value="">Todas</option><option value="ronda">De ronda</option><option value="desempate">De desempate</option></select></label>
            <label>Estado<select name="estado" defaultValue={filters.status}><option value="">Todos</option><option value="publicada">Publicadas sin jugar</option><option value="oculta">Ocultas</option><option value="jugada">Ya jugadas</option></select></label>
          </div>
          <div className="admin-filter-actions"><p>{activeFilters ? "Resultados filtrados." : "Todas las preguntas del banco."}</p><div>{activeFilters ? <Link href="/dashboard/yamboly#preguntas" className="admin-clear">Limpiar filtros</Link> : null}<button type="submit" className="admin-primary">Filtrar</button></div></div>
        </form>

        <div className="admin-table-scroll" role="region" aria-label="Preguntas del banco" tabIndex={0}>
          <table className="admin-table qa-table">
            <thead><tr><th scope="col">#</th><th scope="col">Pregunta</th><th scope="col">Categoría</th><th scope="col">Dificultad</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
            <tbody>{questions.length ? (questions as Question[]).map(question => <tr key={question.id} className={editing?.id === question.id ? "qa-row-editing" : undefined}>
              <td className="admin-id">#{question.id}</td>
              <td className="qa-question">
                <strong>{question.text}</strong>
                <ol>{question.options.map(option => <li key={option.id} className={option.id === question.correct_option_id ? "qa-correct" : undefined}>{option.id}. {option.text}</li>)}</ol>
              </td>
              <td><span className="qa-dot" style={{ background: question.category_color }} aria-hidden="true" />{question.category_name}{!question.category_active && <small className="qa-muted-tag"> (inactiva)</small>}</td>
              <td className="admin-nowrap">{DIFFICULTY_LABELS[question.difficulty] ?? question.difficulty}{question.is_tiebreaker && <><br /><span className="admin-badge admin-badge-pending">Desempate</span></>}</td>
              <td>{question.used ? <span className="admin-badge admin-badge-invalid">Jugada</span> : question.active ? <span className="admin-badge admin-badge-yes">Publicada</span> : <span className="admin-badge">Oculta</span>}</td>
              <td><div className="qa-row-actions">
                <Link className="admin-secondary qa-small" href={`/dashboard/yamboly?${new URLSearchParams([...new URLSearchParams(filterQuery), ["edit", String(question.id)]]).toString()}#editor`}>Editar</Link>
                {!question.used && <ActionForm inlineStatus><input type="hidden" name="intent" value="question-toggle" /><input type="hidden" name="id" value={question.id} /><input type="hidden" name="active" value={String(!question.active)} /><button className="admin-secondary qa-small" type="submit">{question.active ? "Ocultar" : "Publicar"}</button></ActionForm>}
                {!question.used && <ActionForm inlineStatus confirmMessage={`¿Eliminar la pregunta #${question.id}? Esta acción no se puede deshacer.`}><input type="hidden" name="intent" value="question-delete" /><input type="hidden" name="id" value={question.id} /><button className="admin-secondary qa-small qa-danger" type="submit">Eliminar</button></ActionForm>}
              </div></td>
            </tr>) : <tr><td colSpan={6}><div className="admin-empty"><h3>{activeFilters ? "Sin coincidencias" : "Todavía no hay preguntas"}</h3><p>{activeFilters ? "Prueba con otros filtros." : "Agrega preguntas con el formulario o impórtalas desde un CSV."}</p></div></td></tr>}</tbody>
          </table>
        </div>
      </section>

      <section id="importar" className="admin-panel qa-panel" aria-labelledby="importar-title">
        <div className="admin-panel-heading"><div><h2 id="importar-title">Importar preguntas (CSV)</h2><p className="admin-muted">Columnas: <code>categoria, dificultad, pregunta, a, b, c, d, correcta, desempate</code>. Acepta coma o punto y coma (Excel). Si una fila tiene errores no se importa nada; las preguntas repetidas se omiten y las categorías nuevas se crean solas.</p></div><Upload size={21} aria-hidden="true" /></div>
        <ActionForm className="qa-form" resetOnSuccess>
          <input type="hidden" name="intent" value="import" />
          <div className="qa-grid qa-grid-2">
            <label>Archivo CSV<input type="file" name="file" accept=".csv,text/csv,text/plain" /></label>
            <p className="qa-template"><a className="admin-secondary" download="plantilla-preguntas-yamboly.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${IMPORT_TEMPLATE}`)}`}><Download size={16} aria-hidden="true" /> Descargar plantilla</a></p>
          </div>
          <label>…o pega el contenido<textarea name="csv" rows={5} placeholder={IMPORT_TEMPLATE} /></label>
          <div className="qa-actions"><button className="admin-primary" type="submit"><Upload size={16} aria-hidden="true" /> Importar</button></div>
        </ActionForm>
      </section>

      <section id="historial" className="admin-panel qa-panel" aria-labelledby="historial-title">
        <div className="admin-panel-heading"><div><h2 id="historial-title">Historial de cambios</h2><p className="admin-muted">Últimos {audit.length} cambios de configuración y acciones del moderador, en horario de Perú.</p></div><History size={21} aria-hidden="true" /></div>
        <div className="admin-table-scroll" role="region" aria-label="Historial de cambios" tabIndex={0}>
          <table className="admin-table qa-table">
            <thead><tr><th scope="col">Fecha</th><th scope="col">Quién</th><th scope="col">Cambio</th><th scope="col">Detalle</th></tr></thead>
            <tbody>{audit.length ? audit.map(entry => <tr key={entry.id}>
              <td className="admin-nowrap">{dateFormat.format(new Date(entry.created_at))}</td>
              <td className="admin-nowrap">{entry.actor}</td>
              <td>{entry.summary}{entry.during_game && <> <span className="admin-badge admin-badge-pending">Durante la partida</span></>}</td>
              <td>{entry.details ? <details><summary>Ver</summary><pre className="qa-json">{JSON.stringify(entry.details, null, 2)}</pre></details> : "—"}</td>
            </tr>) : <tr><td colSpan={4}><div className="admin-empty"><h3>Sin cambios registrados</h3><p>Los cambios del banco, premios, parámetros y acciones del moderador aparecerán acá.</p></div></td></tr>}</tbody>
          </table>
        </div>
      </section>
      <p className="admin-footnote">XII FULLDAY · Yámboly Quiz Challenge <span>Configuración privada</span></p>
    </main>
  )
}
