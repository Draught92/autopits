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
