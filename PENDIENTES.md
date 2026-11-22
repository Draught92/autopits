# Pendientes de cierre — AutoPits Conecta (22/11/2026)

## Validaciones externas aún abiertas
1. **P12 real:** iniciar sesión en el panel desde otro dispositivo con la cuenta autorizada y comprobar que las solicitudes/órdenes coinciden. Se probó el almacenamiento PostgreSQL y el rol administrativo por consultas SQL, pero no la sesión en dos navegadores reales.
2. **Datos y piloto:** reunir al menos 30 solicitudes auténticas (no DEMO) y registrar tiempos y aclaraciones por cuatro semanas comparables. No inventar resultados.
3. **Aceptación formal:** documentar la revisión y aceptación del responsable del taller; no se considera cerrada la evidencia académica antes de ese paso.
4. **Privacidad:** aprobar y, en su caso, ajustar el aviso provisional al tratamiento real de datos de clientes.
5. **Antispam y respaldos:** implementar controles frente a envíos automatizados del formulario público; configurar respaldo periódico además de exportaciones manuales.
6. **Dispositivos y visual:** revisar con teléfono y computadora reales la navegación, impresión de orden, apertura y entrega de mensajes WhatsApp. Abrir WhatsApp no confirma el envío.

## Ya verificado (no reabrir sin una regresión)
- Instancia Supabase y proyecto Autopits disponibles.
- Nueve tablas, RLS activo, autorización en ap_staff.
- SQL corregido para actualización de cita (conflicto de nombres de columna).
- Solicitud pública en rol anon; el rol anon no puede leer el RPC administrativo.
- Flujo de orden íntegro y tres bloqueos de negocio mediante transacción con rollback.
- Contrato HTTP JavaScript y trece verificaciones DEMO de navegador.

**Estado:** Piloto técnico preparado; cierre académico pendiente.
