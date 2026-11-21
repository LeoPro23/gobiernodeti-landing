# Estado y pendientes de Yámboly Quiz Challenge

Actualizado: 20 de noviembre de 2026. Consultar también [decisiones y guía de ensayo](./GUIA_YAMBOLY.md).

## Implementado

- Inscripción con nombres completos, correo y teléfono obligatorios, validación básica, correo normalizado y rechazo de duplicados por correo dentro de la sesión. La cookie conserva la participación en el mismo navegador. El correo no está verificado.
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

## Por confirmar y ensayar con la organización

- Aprobar un banco de al menos 20 preguntas, sus categorías, dificultades, alternativas y respuestas, además de preguntas de desempate.
- Configurar un único puesto premiado y confirmar premio, unidades, identidad visual, responsables, criterios de identidad y asistencia, plazo y procedimiento de entrega o reasignación. Validar la importación del Excel en la aplicación externa de ruleta y cómo registrar el ganador del sorteo.
- Verificar la base de datos y el despliegue reales, acceso al moderador, HTTPS, QR, proyector, conectividad y respaldo. La migración se ejecuta al inicializar las tablas; ensayarla con una copia de la base antes del evento.
- Ejecutar el ensayo descrito en la guía. No considerar listo el concurso hasta completar los puntos técnicos críticos y validar el ensayo.
