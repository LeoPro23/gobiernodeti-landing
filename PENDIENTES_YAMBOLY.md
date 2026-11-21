# Estado y pendientes de Yámboly Quiz Challenge

Actualizado: 21 de noviembre de 2026. Consultar también [decisiones y guía de ensayo](./GUIA_YAMBOLY.md).

## Implementado

- **Inscripción con DNI** (punto 15 de abajo). El celular pide el DNI. Si está inscrito en el Fullday, muestra solo el nombre de esa inscripción para que la persona lo confirme y la inscribe con él, sin correo. Si no lo está, pide nombres y correo. El teléfono ya no se pide. Se rechazan DNI y correos repetidos dentro de la partida. La consulta del DNI solo funciona con el registro abierto y tiene un límite de 100 consultas por minuto por IP. La cookie conserva la participación en el mismo navegador. El correo no está verificado.
- **Inscritos al quiz en la consola del moderador** (punto 12 de abajo). Lista con búsqueda por nombre, DNI o correo, origen (inscrito en el Fullday o no), hora de registro y puntos, y corrección de nombres. El nombre corregido se ve en el proyector y en el celular en un segundo, y el historial del quiz guarda el anterior y el nuevo.
- **Registro de participantes del Fullday en `/dashboard`** (punto 13 de abajo, que aplica al Fullday y no al quiz). Casilla de asistencia por fila y contador de asistencia marcada; inscripción desde el panel con las mismas reglas del formulario web (con asistencia marcada por defecto y origen «Panel»); opción para quitar una inscripción errónea, salvo si ya envió comprobantes de certificado; y selector de columnas visibles, con atajos «Solo nombre y DNI» y «Control de asistencia», que se recuerda en cada navegador. Estos cambios no quedan en un historial.
- Registro, acciones del moderador y respuestas sincronizados mediante bloqueo de la sesión en PostgreSQL. Las respuestas y los puntos se guardan en una transacción.
- Pausa y reanudación persistentes: se bloquean respuestas mientras la partida está pausada y se ajusta el inicio del temporizador al reanudar.
- Cierre del registro al iniciar; cinco rondas con dificultades fácil, intermedia, intermedia, difícil y difícil; selección aleatoria de preguntas disponibles sin repetir; 8 segundos de lectura y 20 de respuesta por defecto.
- Cuatro puntos por acierto; el ranking prioriza aciertos difíciles e intermedios antes del tiempo.
- **Desempate con límite.** Empate técnico: mismos puntos y aciertos por dificultad, y menos del umbral configurable (1 s por defecto) respecto del mejor tiempo del grupo, sin encadenar diferencias. Si un grupo empatado alcanza un puesto premiado, el podio se bloquea y solo los afectados responden preguntas adicionales sin sumar puntos. Se permiten hasta 3 preguntas por defecto, configurables. Si persiste el empate por el primer puesto, se muestra la lista y se habilita una descarga administrativa en Excel para el sorteo externo. El quiz no registra el resultado de esa ruleta ni publica un ganador automáticamente. Si se agotan las preguntas reservadas se usa el banco general.
- **Administración en `/dashboard/yamboly`.** Parámetros (lectura, respuesta, puntos, umbral de empate, rondas y su dificultad, ingreso tardío), premios por puesto (nombre, descripción, imagen, unidades, condiciones), categorías (crear, editar, activar/desactivar en la ruleta, eliminar vacías), preguntas (crear, editar, publicar/ocultar, eliminar las no usadas, marcar como de desempate, filtros), importación CSV atómica con plantilla y un indicador de preparación de la partida.
- **Bloqueo de configuración e historial.** Al girar la primera ruleta se bloquean parámetros, puestos premiados y preguntas ya jugadas hasta reiniciar. Los demás cambios se permiten y quedan marcados «durante la partida». Todo cambio de configuración y toda acción del moderador queda en `yamboly_audit_log`, visible en el panel.

## Pendiente técnico antes de una premiación real

1. ~~Pregunta adicional y flujo completo de desempate~~: implementado (ver arriba).
2. ~~Administración de categorías, preguntas, premios y parámetros, importación, historial y bloqueo~~: implementado (ver arriba). El banco inicial solo se carga si no hay categorías.
3. Verificar con dispositivos y redes reales los tiempos y la sincronización del control manual. El servidor valida el plazo y el moderador inicia cada etapa; no hay avance automático.
4. Implementar o acordar recuperación de sesión ante pérdida de cookie o cambio de dispositivo y verificación de propiedad del correo. Un correo duplicado no recupera una sesión. El registro por correo no demuestra que sea auténtico ni impide que alguien use varios correos.
5. Ampliar las pruebas de integración con PostgreSQL (`tests/yamboly-integration.test.ts` cubre migración, partida, desempate, bloqueos e historial; se activa con `YAMBOLY_TEST_DATABASE_URL` apuntando a una base local) a pausa, concurrencia, límites de tiempo y recuperación; probar carga y conexiones reales. Revisar límites de solicitudes, datos personales y configuración del despliegue. Los tokens antiguos siguen vigentes y requieren un procedimiento de invalidación antes de la partida real.
6. Mostrar solo categorías elegibles en la ruleta, generar un QR local o prever respaldo y revisar imágenes y textos de premios. Actualmente el QR depende de un proveedor externo y las imágenes iniciales deben confirmarse.

## Nuevos requerimientos (21 de noviembre de 2026)

### Reglas

7. **Desempate con límite de 3 preguntas y ruleta final.** Si después de 3 preguntas de desempate el grupo sigue empatado, el moderador lanza una ruleta entre los empatados y la ruleta define el orden de los puestos. El proyector muestra la ruleta con los nombres, y el ranking marca a quienes quedaron «definidos por ruleta». El límite de 3 preguntas se configura en Parámetros y se bloquea al iniciar la partida, como las demás reglas.

### Diseño y marca

8. **Identidad Yámboly en modo claro.** Pasar todo lo relacionado con el quiz (proyector, celular del participante, consola del moderador y panel de administración del quiz) a modo claro, con la paleta y la tipografía de Yámboly. Sobre fondos claros, los textos y botones deben seguir leyéndose bien, tanto en el proyector como en un celular al sol.
9. **Podio final más vistoso.** Dar al podio una presentación de cierre: entrada animada por puesto (del 3.º al 1.º), confeti o elementos gráficos de la marca, logo de Yámboly y el premio de cada puesto con su imagen. Debe leerse bien desde el fondo del auditorio.
10. **Pantalla de puesto final en el celular, sobre todo para los ganadores.** Al publicarse el podio, el celular de cada participante muestra en grande su puesto final, con los colores y elementos de Yámboly. Quien gana un puesto premiado ve una celebración (animación, confeti, medalla del puesto y el premio con su imagen) y las indicaciones para recogerlo. Las demás pantallas del celular no cambian.
11. **Marca de agua en el proyector.** Poner el logo de Yámboly grande y semitransparente como fondo en todas las etapas de la pantalla del auditorio, sin que tape preguntas, alternativas ni ranking.

### Gestión de inscritos (12 en la consola del moderador; 13 en el registro del Fullday)

12. ~~**Lista de inscritos y moderación de nombres.**~~ Implementado (ver arriba). Ver la lista de inscritos al quiz con nombre, correo, teléfono, hora de registro, puntaje y estado, y buscar por nombre o correo. El administrador puede corregir un nombre fuera de lugar (ofensivo, de broma o mal escrito). El cambio se ve al instante en el proyector y en el celular, y queda en el historial con el nombre anterior y el nuevo.
13. ~~**Asistencia y registro manual.**~~ Implementado (ver arriba). Marcar o desmarcar la asistencia de cada inscrito desde el panel, con una columna de casillas en la lista de inscritos, e inscribir desde ahí a personas nuevas (por ejemplo, alguien sin celular o con problemas de conexión), con las mismas validaciones del registro normal. Ambas acciones quedan en el historial.

### Control del moderador

14. **Inicio manual de la pregunta y de la votación.** Ahora la consola pasa sola de la ruleta a la lectura y de la lectura a la votación. Lo pedido es que el moderador controle ambos pasos:
    - Después de la ruleta, la partida espera con la categoría elegida en pantalla, y la pregunta aparece cuando el moderador presiona «Lanzar pregunta».
    - Al terminar la lectura, la pregunta sigue en pantalla con los celulares bloqueados, y la votación se abre cuando el moderador presiona «Abrir votación». Desde ese momento corre el tiempo de votación.
    - También aplica a la pregunta de desempate.

### Registro al quiz

15. ~~**Registro con DNI para inscritos del Fullday.**~~ Implementado (ver arriba). El formulario del quiz pide primero el DNI:
    - Si el DNI está inscrito en el Fullday, se muestra solo el nombre de esa inscripción y la persona confirma que es ella para entrar. No se muestran el correo, el teléfono ni otros datos.
    - Si no está inscrito, se le pide solo nombre y correo. El teléfono deja de ser obligatorio.
    - Cada DNI y cada correo se inscriben una sola vez por partida.

### Por definir antes de desarrollar

- Si quienes están inscritos en el Fullday pueden corregir su nombre al confirmar.
- Si la revelación de la respuesta sigue siendo automática al acabar el tiempo de votación o también pasa a ser manual.

- Logo de Yámboly (SVG o PNG con fondo transparente), paleta de colores y tipografía oficiales. El repositorio no tiene esos archivos.
- Si la asistencia es requisito para recibir premio. En ese caso, el podio pasaría al siguiente puesto cuando el ganador no tenga la asistencia marcada.
- Si se permite registrar personas nuevas al quiz después de iniciada la partida. Hoy solo se puede con el registro abierto o con «ingreso tardío» activado.

## Por confirmar y ensayar con la organización

- Aprobar un banco de al menos 20 preguntas, sus categorías, dificultades, alternativas y respuestas, además de preguntas de desempate.
- Configurar un único puesto premiado y confirmar premio, unidades, identidad visual, responsables, criterios de identidad y asistencia, plazo y procedimiento de entrega o reasignación. Validar la importación del Excel en la aplicación externa de ruleta y cómo registrar el ganador del sorteo.
- Verificar la base de datos y el despliegue reales, acceso al moderador, HTTPS, QR, proyector, conectividad y respaldo. La migración se ejecuta al inicializar las tablas; ensayarla con una copia de la base antes del evento.
- Ejecutar el ensayo descrito en la guía. No considerar listo el concurso hasta completar los puntos técnicos críticos y validar el ensayo.
