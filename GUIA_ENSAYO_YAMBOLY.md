# Decisiones y guía de ensayo: Yámboly Quiz Challenge

## Decisiones adoptadas

- Una sola partida y clasificación general. Inscripción antes del inicio y cierre automático al girar la primera ruleta; ingreso tardío desactivado por defecto.
- Registro obligatorio con nombres completos, correo y teléfono, por indicación posterior del responsable del proyecto. El nombre aparece en el ranking; correo y teléfono no se proyectan. Se utiliza el correo normalizado para rechazar inscripciones duplicadas, sin verificar su posesión.
- La cookie conserva la participación en el mismo navegador mientras permanezca disponible. Conservarla es necesario para reconectar; la organización debe establecer el procedimiento para atender una pérdida de acceso y comprobar la identidad al entregar premios.
- Cinco preguntas: una fácil, dos intermedias y dos difíciles; lectura de 8 segundos y respuesta de 20 segundos; cuatro puntos por acierto y cero por error u omisión.
- Orden de clasificación previsto: puntos, aciertos difíciles, aciertos intermedios y menor tiempo acumulado de respuestas correctas. Menos de un segundo supone empate técnico. La interpretación acordada para tres o más participantes es agrupar a quienes estén a menos de un segundo del mejor tiempo del grupo con iguales puntos y aciertos por dificultad.
- Si un empate técnico afecta puestos premiados, el podio se bloquea y se juegan preguntas adicionales exclusivas para los afectados: no suman puntos; gana quien acierta y, entre quienes aciertan, el más rápido. Se repite solo entre quienes siguen empatados hasta el máximo configurable (3 por defecto). Si persiste el empate por el primer puesto, se muestra la lista y el administrador descarga un Excel para el sorteo externo; el quiz no declara ganador.
- Tres puestos premiados inicialmente, configurables en `/dashboard/yamboly`. La organización debe aprobar los premios y sus condiciones.

## Información y trabajo de la organización

1. Designar moderador, responsable técnico y responsables de premios, y confirmar horario, proyector, acceso a internet y contingencia.
2. Preparar y aprobar al menos 20 preguntas, opciones, respuestas correctas, dificultades y preguntas de desempate; comprobar que coincidan con las ponencias. Cargarlas en `/dashboard/yamboly` (formulario o CSV con la plantilla) y revisar el indicador de preparación.
3. Confirmar con Yámboly los premios, cantidades, imágenes, autorización de marca, condiciones de conservación, entrega, plazo de reclamación y reasignación.
4. Comunicar la finalidad de los datos a los participantes y definir responsables de acceso, conservación y eliminación. Definir cómo validar identidad y asistencia sin exponer correo ni teléfono en la proyección.
5. Coordinar la preparación técnica, la carga del contenido y un ensayo completo. El contenido precargado es provisional y no implica aprobación de la organización.

## Guía de ensayo

1. Usar un entorno y datos de prueba; respaldar la base y verificar la actualización de esquema. No reiniciar una partida real: el reinicio elimina respuestas y puntajes.
2. Confirmar acceso del moderador, pantalla de auditorio, conexión y un QR accesible desde varios celulares.
3. Registrar varios participantes con nombres, correos y teléfonos de prueba. Verificar campos obligatorios, rechazo de correo duplicado y reconexión con la misma cookie. Comprobar que no se proyecten correos ni teléfonos.
4. Iniciar la partida y verificar el cierre de registro. En cada ronda, pulsar «Mostrar pregunta», «Iniciar lectura», esperar el fin de lectura, pulsar «Iniciar votación», esperar el cierre y pulsar «Revelar respuesta». Confirmar que ninguna etapa avanza sola y que una respuesta duplicada o tardía no cuenta. En desempate se muestra la pregunta y luego se inicia la lectura manualmente.
5. Pausar en lectura y respuesta, intentar responder durante la pausa y reanudar. Confirmar que los temporizadores conservan el tiempo restante y las respuestas confirmadas permanecen.
6. Comprobar puntajes y ranking con resultados conocidos. Ensayar empate por el primer puesto: el podio debe bloquearse, solo los empatados deben responder y la clasificación debe resolverse sin cambiar puntajes. Forzar también un empate tras el máximo de preguntas, comprobar la lista completa, descargar el Excel e importarlo en la ruleta externa. Antes del evento real, configurar un solo puesto premiado.
7. Simular recarga, pérdida temporal de conexión y caída de proyección; verificar el procedimiento de respaldo y la recuperación en el mismo navegador.
8. Repetir con el número esperado de asistentes y redes disponibles. Registrar incidencias, responsable y resultado; repetir el ensayo tras corregirlas. Solo aprobar el uso para premiación cuando los pendientes críticos estén resueltos y el ensayo sea satisfactorio.
