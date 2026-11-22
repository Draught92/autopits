# Resultados de pruebas — AutoPits Conecta v5.0

**Fecha de ejecución:** 2026-11-20

**Contexto real de prueba:** Chromium con HTML y JavaScript del paquete, cargados en página de prueba aislada por restricción de acceso a localhost; datos `DEMO`, sin servidor central, sin mensajes WhatsApp reales. En el test HTTP del módulo Supabase se simularon respuestas, cabeceras y sesión. **No se realizó prueba de Supabase de producción ni de un segundo dispositivo conectado.**

**Resultado:** 13 de 14 verificaciones **aprobadas en DEMO** y **P12 bloqueada externamente**. 0 errores JS registrados durante el recorrido del navegador. No equivale a aceptar el producto ni a aprobar RLS en Supabase.

| Prueba | Escenario | Datos | Esperado | Observado | Estado | Fecha | Evidencia |
|---|---|---|---|---|---|---|---|
| P01 | Solicitud y WhatsApp | Registros sintéticos etiquetados DEMO | El nombre es obligatorio; abre WhatsApp y crea solicitud DEMO | Formulario DEMO almacenado en navegador, ventana WhatsApp abierta; no implica envío. | APROBADA DEMO | 2026-11-20T05:08:36+00:00 | `evidencias/V5_02_solicitud_publica.png` |
| P02 | Confirmación/reprogramación de cita | Registros sintéticos etiquetados DEMO | Cambia estado, fecha y conserva historial | Confirmación y reprogramación en interfaz; cancelación verificada en almacén DEMO. | APROBADA DEMO | 2026-11-20T05:08:36+00:00 | `evidencias/V5_03_gestion_cita.png` |
| P03 | Cliente y vehículo sin duplicados | Registros sintéticos etiquetados DEMO | Reutiliza teléfono/placas y vincula orden | Dos ORD con un solo cliente y vehículo, sin duplicación. | APROBADA DEMO | 2026-11-20T05:08:37+00:00 | `evidencias/V5_04_orden_diagnostico.png` |
| P04 | Folio único ORD | Registros sintéticos etiquetados DEMO | Orden con folio ORD visible | Folio único: Orden ORD-6C4FCD3A3D72 DEMO | APROBADA DEMO | 2026-11-20T05:08:37+00:00 | `evidencias/V5_04_orden_diagnostico.png` |
| P05 | Diagnóstico y presupuesto | Registros sintéticos etiquetados DEMO | Conserva evidencia, diagnóstico, costo y tiempo | Diagnóstico, evidencia referenciada, costo y tiempo estimados. | APROBADA DEMO | 2026-11-20T05:08:37+00:00 | `evidencias/V5_04_orden_diagnostico.png` |
| P06 | Rechazo y autorización parcial | Registros sintéticos etiquetados DEMO | Registra decisión, fecha, medio, responsable y alcance | Rechazo bloquea avance; autorización parcial permite únicamente alcance documentado. | APROBADA DEMO | 2026-11-20T05:08:37+00:00 | `evidencias/V5_05_autorizacion.png` |
| P07 | Estados e historial | Registros sintéticos etiquetados DEMO | Secuencia válida visible en la línea de tiempo | Estados ordenados y bitácora con fecha/responsable. | APROBADA DEMO | 2026-11-20T05:08:38+00:00 | `evidencias/V5_05_autorizacion.png` |
| P08 | Preparación de WhatsApp | Registros sintéticos etiquetados DEMO | Registro preparado y confirmado por acción separada | Mensaje registrado preparado y confirmación manual independiente. No se envió WhatsApp. | APROBADA DEMO | 2026-11-20T05:08:38+00:00 | `evidencias/V5_06_mensajes.png` |
| P09 | Cierre validado | Registros sintéticos etiquetados DEMO | No cierra incompleta; registra entrega completa | Bloqueó cierre sin campos y cerró con fecha, trabajo y costo. | APROBADA DEMO | 2026-11-20T05:08:38+00:00 | `evidencias/V5_07_cierre_e_historial.png` |
| P10 | Búsqueda e historial interno | Registros sintéticos etiquetados DEMO | Busca por cliente, placa y orden | Búsqueda por placas, cliente y orden funcional. | APROBADA DEMO | 2026-11-20T05:08:38+00:00 | `evidencias/V5_07_cierre_e_historial.png` |
| P11 | Exportaciones JSON y CSV | Registros sintéticos etiquetados DEMO | Genera archivos descargables y excluye DEMO | JSON analizado correctamente, CSV con columnas y órdenes; sin indicadores de piloto real. | APROBADA DEMO | 2026-11-20T05:08:39+00:00 | `evidencias/V5_08_indicadores.png` |
| P12 | Dos dispositivos con la misma información | Se necesita una instancia Supabase real | Solicitudes y órdenes disponibles desde dos sesiones independientes | No ejecutada: faltan URL, clave pública y cuentas administrativas reales. | BLOQUEADA EXTERNA | 2026-11-20T05:08:39+00:00 | `PENDIENTES.md` |
| P13 | Campos obligatorios | Registros sintéticos etiquetados DEMO | No permite registro incompleto | Se bloquean formularios con nombre incompleto. | APROBADA DEMO | 2026-11-20T05:08:39+00:00 | `evidencias/V5_03_gestion_cita.png` |
| P14 | No reparar sin autorización | Registros sintéticos etiquetados DEMO | Bloquea reparación no autorizada | Bloquea transición directa a reparación. | APROBADA DEMO | 2026-11-20T05:08:37+00:00 | `evidencias/V5_04_orden_diagnostico.png` |

## Pruebas adicionales
- `node pruebas/test_cloud_contract.mjs`: aprobado; simulación de clave publishable, JWT, RPC, cierre de sesión y DEMO bloqueado en dominio público. **No** valida permisos reales de PostgreSQL.
- Se comprobó ausencia de elementos públicos de consulta de órdenes y ausencia de botón flotante WhatsApp.
- Se comprobó sintaxis JavaScript con `node --check` y se revisaron rutas de archivos referenciados localmente.
- Captura móvil de 390 px sin desbordamiento horizontal del documento público en el navegador de prueba.
- Se comprobó que, sin configurar Supabase, el formulario abre WhatsApp, advierte expresamente **NO se guardó en la base** y no escribe datos locales. Captura `evidencias/V5_10_aviso_sin_base.png`.
- El SQL está revisado por inspección de código, pero **no compilado ni ejecutado** en PostgreSQL real. Las RPC y RLS se deben comprobar tras instalarlo.

## Aceptación pendiente
P12 requiere URL real de Supabase, usuario en `ap_staff`, segunda sesión, creación y recuperación de una misma solicitud y verificación de permisos. Las otras 13 pruebas también deben repetirse contra PostgreSQL después de activar las credenciales. El piloto académico exige 30 solicitudes reales y acta del PO.
