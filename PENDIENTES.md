# Bloqueos externos y validaciones obligatorias

## B01 · Activación real Supabase (crítico)
**Falta:** URL y clave pública del proyecto Supabase, instancia PostgreSQL y personal en `auth.users` y `ap_staff`. Ninguno de estos datos fue proporcionado. **Consecuencia:** no se puede ejecutar `schema.sql`, ni verificar RLS, autenticación ni datos centralizados desde aquí. No se deben inventar credenciales. **Resolver:** ejecutar README §2, realizar verificación de grants/RLS, usuario activo/inactivo y llamadas anónimas, y registrar evidencia real.

## B02 · P12 sincronización en dos dispositivos (crítico)
**Falta:** proyecto Supabase activado y acceso a dos sesiones independientes. **Resolver:** desde teléfono crear una solicitud que abra WhatsApp; desde PC con usuario autorizado buscar SOL; volver a leerla en segunda sesión. Confirmar que ninguna sesión usa localStorage como fuente real y registrar capturas fechadas.

## B03 · Protección para uso operativo (alto)
La solicitud pública acepta registros anónimos por RPC y no tiene mecanismo de rate limit/antibots/IP en el servidor. Definir protección contra spam, monitoreo, límites y tratamiento de datos. El aviso de privacidad en `privacidad.html` es provisional. Antes de desplegar con datos personales debe aprobarse por la persona responsable del taller.

## B04 · Piloto y aceptación del proyecto (académico)
Falta muestra de >=30 solicitudes **reales**, medición de minutos de aclaración de un periodo comparable, revisión de datos completos/incompletos y acta del Product Owner. HU10 no se puede cerrar ni afirmar mejoras hasta recopilar esa evidencia.

## B05 · Respaldo y crecimiento (operación)
Establecer respaldos PostgreSQL programados con restauración probada. JSON/CSV desde panel es exportación manual; snapshot limita 2,000 registros principales/tabla, agregar paginación si aumenta la operación. El registro de evidencia de diagnóstico es una **referencia textual**, no almacenamiento de fotografías.

## B06 · Autorización parcial (proceso)
La autorización parcial registra alcance permitido, pero el sistema aún no valida de manera automática **cada concepto de trabajo ejecutado** contra ese alcance. Requiere control humano documentado o un módulo de conceptos para una liberación posterior.

No se califican estos bloqueos como errores resueltos. El ZIP es un entregable técnico **preparado para verificación**, no un despliegue ya conectado.
