# Historias de usuario — Estado verificable de la v5.0

| HU | Alcance actual | Archivos relevantes | Verificación | Estado de aceptación |
|---|---|---|---|---|
| HU01 | Catálogo, teléfono, ubicación, horarios, responsive | `index.html`, `Logo.jpg` | Captura escritorio y móvil DEMO | Implementada; requiere visto bueno del PO |
| HU02 | Nombre obligatorio, vehículo/servicio/fecha, WhatsApp sin teléfono; registro central si Supabase activo | `index.html`, `public.js`, `backend.js`, RPC `ap_submit_request` | P01 DEMO, contrato HTTP simulado | Falta recepción real desde sitio publicado |
| HU03 | Solicitud manual, confirmar, reprogramar, cancelar; historial | `admin.html`, `admin.js`, `demo-store.js`, `schema.sql` | P02 DEMO | Falta prueba en DB central |
| HU04 | Clientes y vehículos vinculados, búsqueda, controles de duplicidad, conexión preparada | `admin.js`, `backend.js`, `schema.sql` | P03 DEMO; P12 no ejecutada | **Abierta** hasta dos dispositivos y permisos RLS |
| HU05 | Orden ORD única y exportación | `admin.js`, `backend.js`, `schema.sql` | P04 DEMO | Falta prueba en DB central |
| HU06 | Diagnóstico, evidencia referenciada, propuesta, costo y horas | `admin.js`, `demo-store.js`, `schema.sql` | P05 DEMO | Falta validación del PO |
| HU07 | Decisión autorizada/parcial/rechazo/cambios, fecha, medio, actor y bloqueo | `admin.js`, `schema.sql`, `demo-store.js` | P06/P14 DEMO | Falta verificación SQL real |
| HU08 | Estados y línea de tiempo; preparar, abrir y confirmar manualmente WhatsApp | `admin.js`, `schema.sql` | P07/P08 DEMO | Sin constancia automática de envío |
| HU09 | Entrega con fecha, trabajos, costo, historial y búsquedas | `admin.js`, `schema.sql` | P09/P10 DEMO | Falta validación productiva |
| HU10 | Indicadores solo piloto real, línea base, matriz y exportaciones | `admin.js`, `schema.sql`, `PRUEBAS.md` | P11 DEMO | **Abierta**: faltan 30 solicitudes reales y acta de aceptación |

No se declara ninguna HU aceptada oficialmente sin la aprobación verificable del Product Owner.
