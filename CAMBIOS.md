# Ajuste del sitio público — 22 de noviembre de 2026

- Se actualizó la experiencia verificada del taller de 20+ a **30 años** en metadatos SEO, portada, tarjeta y apartado «Nosotros».
- Se eliminó el flujo de ventana vacía `about:blank` que se abría al preparar WhatsApp: después de guardar la solicitud se navega a `wa.me` en la misma pestaña.
- La operación pública tiene un tiempo máximo de espera de **7.5 segundos**, con enlace directo de respaldo. Si no se confirma el guardado, se avisa sin afirmar que los datos están almacenados.
- Los reintentos sin cambio de datos conservan el identificador para reducir envíos duplicados.
- Se conservan el formulario sin teléfono, el horario de recepción, la privacidad, el panel y la conexión existente con Supabase.

## Verificaciones de esta corrección
- `node --check`: scripts de aplicación y conexión sin errores de sintaxis en la copia de pruebas.
- Chromium de escritorio y emulación móvil: el formulario genera un enlace `wa.me` válido con folio en respuesta simulada correcta.
- Chromium móvil con Supabase simulado en error 503: mantiene la posibilidad de enviar por WhatsApp y el aviso de registro no confirmado.
- Supabase simulado sin respuesta: el intento aborta a los 7.5 segundos y no queda cargando indefinidamente.
- Maquetación de 390 y 1365 px: sin desbordamiento horizontal en los tamaños evaluados.
- **Pendiente:** confirmar apertura real de la app WhatsApp en un teléfono físico y validar un registro real de punta a punta.

---

# Cambios de integración y validación — 22/11/2026

- Se conectó el proyecto Supabase real y se registró a su único usuario autorizado en `ap_staff`.
- Se incorporó `config.js` publicable (URL del proyecto y clave `sb_publishable_`; sin secretos).
- Se corrigió la función SQL `ap_admin_update_request`, donde un nombre de variable coincidía con una columna y bloqueaba la actualización de citas.
- Se corrigió el ejemplo sintético `ap_admin_seed_demo` para registrar fecha de recepción antes de cambiar a «En diagnóstico».
- Se verificó el recorrido completo sobre PostgreSQL con transacciones revertidas; el estudio académico permanece abierto.
- Se eliminaron códigos HU de las etiquetas visibles del panel y el texto académico de la cabecera.
- Se mantiene la página pública sin número telefónico, sin consulta de estados y sin botón flotante.
- No se modificaron DNS ni credenciales secretas.

---

# AutoPits Conecta v5.0 — Cambios sobre el paquete v4.1

## Conservado
Página pública original (colores, identidad y logo, servicios, ubicación, horarios, recepción matutina, sin botón flotante), medios de contacto, formulario sin número telefónico ni consulta pública de folio, módulo administrativo, folios SOL/ORD, citas, cliente/vehículo, diagnósticos, autorización, estados, mensajes WhatsApp, cierre, búsquedas, historial, exportaciones y tableros.

## Correcciones de implementación
- `config.js`: ahora **deshabilitado por defecto** para producción sin Supabase; DEMO solo con plantilla separada y contexto local.
- `backend.js`: impide que modo DEMO se habilite en `autopits.net`, exige base para acciones reales y mantiene sesiones y RPC con JWT.
- `public.js`: conserva WhatsApp incluso cuando falla Supabase, diferencia registro central/no guardado, bloquea dobles clics y no recicla el identificador de envío entre formularios distintos.
- `admin.js` / `admin.html`: formulario de solicitud manual se abre directamente; campos nuevos fecha de recepción, referencia de evidencia, tiempo estimado y alcance de autorización parcial. No muestra responsable «Operador DEMO» por defecto en producción. Permite etiquetar una solicitud de prueba en el panel; indicaciones de error y seguridad mejoradas.
- `demo-store.js`: valida recepción previa a diagnóstico, tiempo estimado positivo, autorización parcial documentada, transiciones autorizadas y cierre obligatorio.
- `supabase/schema.sql`: migración sin borrar tablas; columnas adicionales, índice por fechas/relaciones, RPC actualizada, autorización parcial, condición de recepción, RLS y revocación explícita del rol PUBLIC, `anon`, `authenticated`. Evita mezclar clientes reales y DEMO con el mismo teléfono o placa. No ensayado en servidor real.
- `admin.js`: indicadores diferenciados; los cálculos del piloto se toman de registros `is_pilot=true` y `is_demo=false` **aunque se muestren DEMO en las listas**.
- `pruebas/`: nuevas verificaciones P01–P14, contrato HTTP simulado, capturas V5; se retiraron informes e imágenes de versiones anteriores para no crear confusión.

## Limitaciones no eliminadas
Supabase requiere credenciales externas, SQL aplicado y pruebas de dos dispositivos. WhatsApp no dispone de API de confirmación automática. La autorización parcial no verifica conceptos individuales. No se ha realizado piloto real ni aceptación formal.
