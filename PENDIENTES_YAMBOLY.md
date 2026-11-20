# Estado y pendientes de Yámboly Quiz Challenge

Actualizado: 19 de noviembre de 2026. Consultar también [decisiones y guía de ensayo](./GUIA_YAMBOLY.md).

## Implementado

- Inscripción con nombres completos, correo y teléfono obligatorios, validación básica, correo normalizado y rechazo de duplicados por correo dentro de la sesión. La cookie conserva la participación en el mismo navegador. El correo no está verificado.
- Registro, acciones del moderador y respuestas sincronizados mediante bloqueo de la sesión en PostgreSQL. Las respuestas y los puntos se guardan en una transacción.
- Pausa y reanudación persistentes: se bloquean respuestas mientras la partida está pausada y se ajusta el inicio del temporizador al reanudar.
- Cierre del registro al iniciar; cinco rondas con dificultades fácil, intermedia, intermedia, difícil y difícil; selección aleatoria de preguntas disponibles sin repetir; 8 segundos de lectura y 20 de respuesta por defecto.
- Cuatro puntos por acierto; el ranking prioriza aciertos difíciles e intermedios antes del tiempo. Se impide publicar el podio si se detecta un empate técnico que afecte los tres primeros puestos.

## Pendiente técnico antes de una premiación real

1. Implementar la pregunta adicional y el flujo completo de desempate para participantes afectados, incluida la regla de agrupación acordada. El bloqueo actual no resuelve el empate y compara participantes adyacentes.
2. Completar la administración de categorías, preguntas, premios y parámetros de partida, la importación, el historial de cambios y el bloqueo de configuración. Los valores y el banco inicial siguen en código o base de datos.
3. Trasladar el avance automático al servidor o proporcionar un proceso persistente equivalente: actualmente necesita que la consola del moderador permanezca abierta. Verificar la precisión de los relojes de los clientes; el servidor decide el plazo.
4. Implementar o acordar recuperación de sesión ante pérdida de cookie o cambio de dispositivo y verificación de propiedad del correo. Un correo duplicado no recupera una sesión. El registro por correo no demuestra que sea auténtico ni impide que alguien use varios correos.
5. Incorporar pruebas de integración con PostgreSQL para migración, pausa, concurrencia, límites de tiempo, clasificación y recuperación; probar carga y conexiones reales. Revisar límites de solicitudes, datos personales y configuración del despliegue. Los tokens antiguos siguen vigentes y requieren un procedimiento de invalidación antes de la partida real.
6. Mostrar solo categorías elegibles en la ruleta, generar un QR local o prever respaldo y revisar imágenes y textos de premios. Actualmente el QR depende de un proveedor externo y las imágenes iniciales deben confirmarse.

## Por confirmar y ensayar con la organización

- Aprobar un banco de al menos 20 preguntas, sus categorías, dificultades, alternativas y respuestas, además de preguntas de desempate.
- Confirmar premios, unidades, identidad visual, responsables, criterios de identidad y asistencia, plazo y procedimiento de entrega o reasignación.
- Verificar la base de datos y el despliegue reales, acceso al moderador, HTTPS, QR, proyector, conectividad y respaldo. La migración se ejecuta al inicializar las tablas; ensayarla con una copia de la base antes del evento.
- Ejecutar el ensayo descrito en la guía. No considerar listo el concurso hasta completar los puntos técnicos críticos y validar el ensayo.
