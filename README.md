# AutoPits Conecta · Versión 5.0 (19 de noviembre de 2026)

## Estado y alcance
Continuación **directa de v4.1**: diseño negro/amarillo, identidad, horario, información del taller, contacto, WhatsApp, recepción matutina, formulario sin teléfono y **sin consulta pública por folio**. Página pública, panel interno y flujo de servicio integrado.

**Importante**: el código de conexión Supabase está preparado, pero **no se ha probado contra una instancia real** por falta de URL, clave pública y usuario autorizado. **HU04, P12 y HU10 no están aceptadas**. No usar esta entrega con clientes reales hasta completar `PENDIENTES.md`, revisar seguridad y privacidad y aprobar piloto.

## 1. Ejecución segura (sin credenciales)
En la carpeta del proyecto ejecuta:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000/index.html` y `http://localhost:8000/admin.html`.

La configuración que se entrega (`config.js`) es **unconfigured**: la página pública conserva WhatsApp y advierte si no se pudo guardar la solicitud; **el panel administrativo está desactivado**. Esto impide publicar por error un panel de prueba en el dominio.

**Para probar únicamente con datos sintéticos, en tu computadora:** copia `config.demo.example.js` sobre `config.js`, recarga `http://localhost:8000` y entra a `admin.html` con `DEMO2026`. El modo DEMO solo funciona en localhost o en páginas aisladas de pruebas. **Nunca subas ese config.js DEMO a GitHub Pages.** La contraseña DEMO **no protege datos reales**. Las capturas adjuntas son sintéticas.

## 2. Configurar Supabase con base central
Se requiere una instancia del proveedor; este paquete **no la ha activado**.

1. Haz copia de seguridad de una base existente. En una instalación nueva crea proyecto en [Supabase](https://supabase.com/). Para actualizar v4.1, utiliza el proyecto correspondiente y revisa antes el SQL; la migración añade columnas sin recrear las tablas. No ejecutes sobre otra aplicación.
2. Supabase → **SQL Editor** → revisa y ejecuta el archivo `supabase/schema.sql` íntegro. No declares la migración exitosa sin examinar los mensajes. El archivo contiene tablas, índices, restricciones, RPC y revocación de privilegios directos.
3. **Authentication → Users**: crea usuario de personal con contraseña robusta y correo verificado. Deshabilita el registro abierto si no se requiere. Recomendado activar MFA. Copia el UUID del usuario.
4. Solo desde SQL Editor (NO desde el frontend), autoriza al usuario:

   ```sql
   insert into public.ap_staff(user_id,display_name,active)
   values ('UUID-AUTH-REAL-DEL-PERSONAL','Responsable AutoPits',true)
   on conflict (user_id) do update set display_name=excluded.display_name,active=true;
   ```

5. Copia el archivo `config.example.js` al nombre `config.js`. Configura solo `supabaseUrl` (`https://...supabase.co`) y **publishableKey** (`sb_publishable_...`). **No pegues la contraseña del personal, claves `sb_secret_`, `service_role` ni cadenas de conexión en el navegador, GitHub o código.**
6. Recarga sitio y panel. El panel debe mostrar **SUPABASE** y solicitar correo/contraseña. Comprueba que un usuario sin registro activo en `ap_staff` es rechazado y que no puede llamar `ap_admin_snapshot`.
7. Envía una solicitud de prueba desde página pública y verifica que aparezca en **otro navegador o dispositivo** autenticado. Si fue de prueba, márquela **DEMO** en la ficha antes de crear una orden, o usa un caso sintético generado por la función de prueba, para excluirla de métricas reales.
8. Repite los 14 casos `PRUEBAS.md` y registra observaciones en un informe local o en el módulo de aceptación después de la verificación real.
9. Programa exportaciones y copias de seguridad recurrentes. El JSON/CSV manual **no equivale a respaldo automático**, y la consulta actual tiene un límite de 2,000 registros principales por tabla.

**Permisos:** la autenticación usa Supabase Auth y las operaciones del panel se validan en `ap_staff` con RPC `SECURITY DEFINER` y sin permisos directos de lectura/escritura para `anon` y `authenticated`. No modifica ni el DNS ni el dominio. Los permisos **deben probarse** contra el proyecto verdadero antes de operar.

## 3. Flujo de operación

Formulario público (nombre, vehículo, servicio, fecha y descripción; sin teléfono) → apertura WhatsApp → personal registra número del remitente y confirma/reprograma cita → registra placas → crea ORD vinculada → anota **fecha de recepción** → diagnóstico, referencia de evidencia, propuesta, costo y horas estimadas → decisión del cliente (pendiente, autorizada, **parcial con alcance**, rechazada o cambios solicitados) → avance permitido únicamente tras autorización válida → preparar y revisar mensaje → **confirmar envío manualmente** si realmente se envió → entregar con fecha, trabajos realizados y costo final → consultar historial y exportar.

La autorización parcial **no comprueba automáticamente** que los trabajos realizados se limiten al alcance documentado. El responsable debe revisar las tareas autorizadas antes de iniciar y al cerrar.

## 4. Publicación con GitHub Pages

- Haz respaldo del repositorio `Draught92/autopits`.
- Configura y verifica Supabase **antes de publicar** este paquete como sistema operativo.
- Conserva `CNAME` con `autopits.net` y `main` → `/ (root)`. No modifiques DNS de GoDaddy.
- Sube a la raíz solo estos archivos del sitio: `index.html`, `admin.html`, `public.js`, `admin.js`, `backend.js`, `demo-store.js`, **tu `config.js` con solo datos públicos**, `Logo.jpg`, `privacidad.html`, `CNAME`, `robots.txt`, `sitemap.xml`. Los demás archivos (SQL, README, capturas, scripts de pruebas) son de desarrollo.
- Comprueba en `https://autopits.net` el formulario y WhatsApp, en móvil y escritorio, y en `/admin.html` la autenticación y sincronización real.
- Si Supabase no está activado, conserva la página pública anterior para atención real. La configuración inicial incluida es *segura por defecto*, no un reemplazo listo para operar.

## 5. Pruebas y evidencia de esta entrega

- `pruebas/validar_v5.py`: ejecución automatizada en Chromium con HTML/JS locales y datos DEMO. El navegador muestra el diseño real y scripts; se simulan almacenamiento local y mapa debido a restricciones de navegación del entorno. **No equivale a prueba del sitio publicado o a un servidor Supabase real.**
- `pruebas/v5_resultados.json`: las 14 pruebas con código, datos, fecha, resultado esperado, observado, estado y ruta de evidencia: **13 aprobadas DEMO; P12 bloqueada**.
- `pruebas/test_cloud_contract.mjs`: contrato HTTP simulado y verificación de modo DEMO bloqueado en un dominio público. Ejecutar `node pruebas/test_cloud_contract.mjs`.
- `evidencias/V5_*.png`: capturas con información completamente sintética.
- `PRUEBAS.md`, `HISTORIAS.md`, `CAMBIOS.md` y `PENDIENTES.md` describen resultados, cobertura y barreras externas.

## 6. Indicadores y línea base

Línea base académica: 54 registros, 32 incompletos = 59.3%, 390 minutos de aclaraciones en cuatro semanas (19.5 min/día en 20 días). Los indicadores actuales **siempre excluyen datos DEMO**; los comparativos de incompletos, aclaraciones, atención y cierre se calculan usando solicitudes reales **marcadas para piloto**. Solicitudes reales recibidas también se muestran por separado. Si no hay observaciones, aparecen «Sin datos» o 0, nunca cifras sintéticas. Se requieren **30 solicitudes reales** y comparación de 4 semanas para evaluar la meta.

## 7. Seguridad y privacidad

- La página es estática; las claves públicas de Supabase **no sustituyen** la autenticación ni los permisos RPC/RLS. Toda la seguridad debe estar del lado de Supabase.
- Es posible automatizar solicitudes anónimas: el sistema **no tiene CAPTCHA ni limitación efectiva por IP** sin servicio externo. Activar controles antispam/monitorización para operación pública.
- `privacidad.html` es un aviso **provisional**, pendiente de aprobación por el responsable del taller y revisión jurídica si es necesaria.
- No subir exportaciones de datos personales, credenciales ni capturas de clientes reales al repositorio.
- La apertura de WhatsApp **no verifica entrega o lectura**. La bitácora distingue `preparado` y `envío confirmado` por acción manual.

## 8. Documentos del paquete

`CAMBIOS.md`: deltas vs v4.1. `HISTORIAS.md`: cobertura HU01–HU10. `PRUEBAS.md`: P01–P14. `PENDIENTES.md`: validaciones externas obligatorias. `supabase/schema.sql`: base. `config.example.js`: plantilla sin datos reales. `config.demo.example.js`: DEMO para usar **solo en local**.
