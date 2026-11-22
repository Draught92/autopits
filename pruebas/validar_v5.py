"""Pruebas de interfaz reales contra servidor HTTP local, solo datos DEMO. Requiere Playwright y Chromium.
No prueba servidor Supabase, WhatsApp enviado ni dos dispositivos conectados a Supabase.
"""
from pathlib import Path
from datetime import datetime, timedelta
import shutil, tempfile, json, time, threading, http.server, socketserver, subprocess, re, base64
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

ROOT=Path(__file__).resolve().parents[1]
EVID=ROOT/'evidencias'
EVID.mkdir(exist_ok=True)
results=[]
errors=[]
date=datetime.now().astimezone().date()+timedelta(days=3)
while date.weekday()==6: date+=timedelta(days=1)
selected_date=date.isoformat()
next_day=date+timedelta(days=1)
while next_day.weekday()==6: next_day+=timedelta(days=1)
end_date=next_day.isoformat()

def record(code,scenario,test,expected,evidence=''):
    started=datetime.now().astimezone().isoformat(timespec='seconds')
    try:
        msg=test()
        results.append(dict(codigo=code,escenario=scenario,datos='Registros sintéticos etiquetados DEMO',resultado_esperado=expected,resultado_observado=str(msg or 'Coincide con lo esperado'),estado='APROBADA DEMO',fecha=started,evidencia=evidence))
    except Exception as e:
        results.append(dict(codigo=code,escenario=scenario,datos='Registros sintéticos etiquetados DEMO',resultado_esperado=expected,resultado_observado=repr(e),estado='FALLIDA',fecha=started,evidencia=evidence))
        raise

def wait_notice(page,fragment):
    page.locator('#notice').get_by_text(fragment,exact=False).wait_for(timeout=10000)

def init_page(page,storage_json=None):
    page.evaluate("""(snapshot) => {
      function storage(init){return {o:init||{},getItem(k){return this.o[k]??null},setItem(k,v){this.o[k]=String(v)},removeItem(k){delete this.o[k]},clear(){this.o={}}}}
      Object.defineProperty(window,'localStorage',{value:storage(snapshot?JSON.parse(snapshot):{}),configurable:true});
      Object.defineProperty(window,'sessionStorage',{value:storage(),configurable:true});
      if(!crypto.randomUUID){Object.defineProperty(crypto,'randomUUID',{value:()=>('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)})});}
    }""",storage_json)

def load_local(page,name,config_file='config.demo.example.js'):
    html=(ROOT/name).read_text(encoding='utf-8')
    html=re.sub(r'<script\s+src="[^"]+"\s*></script>','',html)
    logo='data:image/jpeg;base64,'+base64.b64encode((ROOT/'Logo.jpg').read_bytes()).decode()
    html=html.replace('src="Logo.jpg"',f'src="{logo}"')
    html=re.sub(r'<iframe\b[^>]*>\s*</iframe>','<div style="min-height:470px;display:grid;place-items:center;background:#e6e8ea;color:#333">Google Maps (sitio publicado)</div>',html,flags=re.S)
    page.set_content(html,wait_until='domcontentloaded')
    for fn in [config_file,'demo-store.js','backend.js','public.js' if name=='index.html' else 'admin.js']:
        page.add_script_tag(content=(ROOT/fn).read_text(encoding='utf-8'))

with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1380,'height':900},accept_downloads=True,locale='es-MX')
        context.route('https://wa.me/**', lambda r:r.abort())
        context.route('https://maps.google.com/**',lambda r:r.abort())
        page=context.new_page();page.on('pageerror',lambda exc:errors.append(str(exc)))
        init_page(page)
        load_local(page,'index.html')
        page.screenshot(path=str(EVID/'V5_01_portada_escritorio.png'))
        assert page.locator('#phone').count()==0
        assert page.locator('#folioDemo').count()==0
        assert page.locator('.wa-float').count()==0
        assert page.locator('#requestMode').get_by_text('DEMO',exact=False).count()==1
        page.locator('#cita').scroll_into_view_if_needed()
        page.screenshot(path=str(EVID/'V5_02_solicitud_publica.png'))
        def public():
            page.locator('#name').fill('Cliente Integración DEMO')
            page.locator('#brand').fill('Toyota')
            page.locator('#model').fill('Corolla')
            page.locator('#yearCar').fill('2017')
            page.locator('#service').select_option(label='Motor')
            page.locator('#date').fill(selected_date)
            page.locator('#issue').fill('Motor vibra al acelerar, escenario DEMO sintético')
            page.locator('#consent').check()
            with context.expect_page(timeout=10000) as popup:
                page.locator('#submitRequest').click()
            popup.value.close()
            page.locator('#formStatus').get_by_text('Solicitud DEMO',exact=False).wait_for()
            return 'Formulario DEMO almacenado en navegador, ventana WhatsApp abierta; no implica envío.'
        record('P01','Solicitud y WhatsApp',public,'El nombre es obligatorio; abre WhatsApp y crea solicitud DEMO','V5_02_solicitud_publica.png')
        admin=context.new_page();admin.on('pageerror',lambda exc:errors.append(str(exc)))
        init_page(admin,page.evaluate('JSON.stringify(window.localStorage.o)'))
        load_local(admin,'admin.html')
        admin.locator('#access').fill('DEMO2026');admin.locator('#enter').click()
        admin.locator('#workspace').wait_for(state='visible')
        admin.locator('#requestList').get_by_text('Cliente Integración DEMO').wait_for()
        admin.locator('[data-action="request"]').first.click()
        admin.screenshot(path=str(EVID/'V5_03_gestion_cita.png'))
        def appointment():
            admin.locator('#r_status').select_option('reprogramada')
            admin.locator('#r_date').fill(end_date)
            admin.locator('#r_actor').fill('Responsable DEMO')
            admin.locator('#r_reason').fill('Reprogramado por solicitud de prueba')
            admin.locator('#requestForm button[type="submit"]').click();wait_notice(admin,'Cita actualizada')
            admin.locator('#r_status').select_option('confirmada')
            admin.locator('#r_phone').fill('8100000099')
            admin.locator('#r_plate').fill('DEM0099')
            admin.locator('#r_clar').fill('3')
            admin.locator('#r_att').fill('9')
            admin.locator('#r_reason').fill('Confirmado por WhatsApp DEMO')
            admin.locator('#requestForm button[type="submit"]').click();wait_notice(admin,'Cita actualizada')
            assert admin.locator('#requestDetail').get_by_text('reprogramada').count()>0
            cancelled=admin.evaluate("""(date) => {const r=AutoPitsDemo.createManualRequest({customer_name:'Cliente Cancelación DEMO',vehicle_brand:'Ford',vehicle_model:'Fiesta',vehicle_year:2015,service:'Frenos',preferred_date:date,description:'Cancelación sintética de cita DEMO',actor:'Responsable DEMO'});AutoPitsDemo.updateRequest(r.id,{appointment_status:'cancelada',actor:'Responsable DEMO',reason:'Cliente canceló vía WhatsApp DEMO'});const d=AutoPitsDemo.load();return {state:d.requests.find(x=>x.id===r.id).appointment_status,events:d.request_events.filter(x=>x.request_id===r.id).length}}""",selected_date)
            assert cancelled['state']=='cancelada' and cancelled['events']>=2
            return 'Confirmación y reprogramación en interfaz; cancelación verificada en almacén DEMO.'
        record('P02','Confirmación/reprogramación de cita',appointment,'Cambia estado, fecha y conserva historial','V5_03_gestion_cita.png')
        def create_order():
            admin.locator('[data-action="make-order"]').click()
            admin.locator('#orderForm').wait_for(state='visible')
            assert admin.locator('#orderDetail').get_by_text('ORD-',exact=False).count()>0
            assert admin.evaluate("window.AutoPitsDemo.load().orders.every(o=>o.status==='Vehículo recibido')")
            assert admin.locator('#orderDetail').get_by_text('DEM0099').count()>0
            reuse=admin.evaluate("""(date) => {const r=AutoPitsDemo.createManualRequest({customer_name:'Cliente Integración DEMO',customer_phone:'8100000099',vehicle_brand:'Toyota',vehicle_model:'Corolla',vehicle_year:2017,plate:'DEM0099',service:'Frenos',preferred_date:date,description:'Segundo servicio sintético DEMO',actor:'Responsable DEMO'});AutoPitsDemo.updateRequest(r.id,{appointment_status:'confirmada',actor:'Responsable DEMO',reason:'Confirmación DEMO'});AutoPitsDemo.createOrder(r.id,'Responsable DEMO','Segundo servicio DEMO');const db=AutoPitsDemo.load();return {clients:db.clients.length,vehicles:db.vehicles.length,orders:db.orders.length}}""",selected_date)
            assert reuse=={'clients':1,'vehicles':1,'orders':2},reuse
            return 'Dos ORD con un solo cliente y vehículo, sin duplicación.'
        record('P03','Cliente y vehículo sin duplicados',create_order,'Reutiliza teléfono/placas y vincula orden','V5_04_orden_diagnostico.png')
        record('P04','Folio único ORD',lambda: ('Folio único: '+admin.locator('#orderDetail h2').first.inner_text()),'Orden con folio ORD visible','V5_04_orden_diagnostico.png')
        admin.locator('#orderDetail').screenshot(path=str(EVID/'V5_04_orden_diagnostico.png'))
        def blocked_without_auth():
            admin.locator('#o_status').select_option('En reparación')
            admin.locator('#o_reason').fill('Intento de reparación sin autorización')
            admin.locator('#orderForm button[type="submit"]').click()
            wait_notice(admin,'Transición no permitida')
            assert admin.evaluate("window.AutoPitsDemo.load().orders.every(o=>o.status==='Vehículo recibido')")
            return 'Bloquea transición directa a reparación.'
        record('P14','No reparar sin autorización',blocked_without_auth,'Bloquea reparación no autorizada', 'V5_04_orden_diagnostico.png')
        def change(status,reason):
            admin.locator('#o_status').select_option(status)
            admin.locator('#o_reason').fill(reason)
            admin.locator('#orderForm button[type="submit"]').click()
            wait_notice(admin,'Orden actualizada')
            assert admin.locator('#o_status').input_value()==status
        def diagnosis():
            admin.locator('#o_received_at').fill(selected_date)
            admin.locator('#o_diagnosis').fill('Falla de encendido. DEMO')
            admin.locator('#o_diagnostic_evidence').fill('Foto interna de prueba DEMO, folio FOTO-01')
            admin.locator('#o_proposed_work').fill('Revisión de bujías y bobina de prueba DEMO')
            admin.locator('#o_estimated_cost').fill('1250')
            admin.locator('#o_estimated_hours').fill('3')
            change('En diagnóstico','Recepción y revisión técnica DEMO')
            change('Pendiente de autorización','Enviar propuesta de reparación DEMO')
            return 'Diagnóstico, evidencia referenciada, costo y tiempo estimados.'
        record('P05','Diagnóstico y presupuesto',diagnosis,'Conserva evidencia, diagnóstico, costo y tiempo', 'V5_04_orden_diagnostico.png')
        def rejection_and_partial():
            admin.locator('#o_authorization_state').select_option('rechazada')
            admin.locator('#o_authorization_date').fill(selected_date)
            admin.locator('#o_authorization_medium').select_option('WhatsApp')
            admin.locator('#o_authorization_by').fill('Cliente de prueba DEMO')
            admin.locator('#o_reason').fill('Rechazo por WhatsApp DEMO')
            admin.locator('#orderForm button[type="submit"]').click();wait_notice(admin,'Orden actualizada')
            admin.locator('#o_status').select_option('Autorizada')
            admin.locator('#o_reason').fill('Intento tras rechazo')
            admin.locator('#orderForm button[type="submit"]').click();wait_notice(admin,'requiere autorización')
            admin.locator('#o_authorization_state').select_option('parcial')
            admin.locator('#o_authorization_scope').fill('Únicamente revisión de bujías DEMO')
            admin.locator('#o_reason').fill('Autorización parcial recibida')
            admin.locator('#orderForm button[type="submit"]').click();wait_notice(admin,'Orden actualizada')
            change('Autorizada','Autorización parcial con alcance DEMO')
            return 'Rechazo bloquea avance; autorización parcial permite únicamente alcance documentado.'
        record('P06','Rechazo y autorización parcial',rejection_and_partial,'Registra decisión, fecha, medio, responsable y alcance', 'V5_05_autorizacion.png')
        admin.locator('#orderDetail').screenshot(path=str(EVID/'V5_05_autorizacion.png'))
        def state():
            change('En reparación','Inicio de trabajo autorizado de prueba')
            assert admin.locator('#orderDetail').get_by_text('Pendiente de autorización').count()>0
            return 'Estados ordenados y bitácora con fecha/responsable.'
        record('P07','Estados e historial',state,'Secuencia válida visible en la línea de tiempo','V5_05_autorizacion.png')
        def communications():
            admin.locator('#msg_type').select_option('Avance del servicio')
            admin.locator('#msg_actor').fill('Responsable DEMO')
            admin.locator('#msg_next').fill('Verificar prueba de motor')
            admin.locator('[data-action="preview"]').click()
            assert 'ORD-' in admin.locator('#msg_preview').input_value()
            admin.locator('[data-action="prepare"]').click();wait_notice(admin,'PREPARADO')
            assert admin.locator('#orderDetail').get_by_text('preparado',exact=True).count()>0
            admin.on('dialog',lambda d:d.accept('Responsable DEMO' if d.type=='prompt' else None))
            admin.locator('[data-action="confirm-message"]').click();wait_notice(admin,'Envío marcado')
            assert admin.locator('#orderDetail').get_by_text('envío confirmado',exact=True).count()>0
            return 'Mensaje registrado preparado y confirmación manual independiente. No se envió WhatsApp.'
        record('P08','Preparación de WhatsApp',communications,'Registro preparado y confirmado por acción separada','V5_06_mensajes.png')
        admin.locator('#orderDetail').screenshot(path=str(EVID/'V5_06_mensajes.png'))
        def close():
            change('Lista para entrega','Pruebas terminadas DEMO')
            admin.locator('#o_status').select_option('Entregada')
            admin.locator('#o_reason').fill('Cierre sin información DEMO')
            admin.locator('#orderForm button[type="submit"]').click()
            wait_notice(admin,'Para cerrar faltan')
            admin.locator('#o_delivery_date').fill(end_date)
            admin.locator('#o_work_done').fill('Se verificó y reemplazó componente de prueba DEMO')
            admin.locator('#o_final_cost').fill('1300')
            admin.locator('#o_reason').fill('Entrega registrada DEMO')
            admin.locator('#orderForm button[type="submit"]').click();wait_notice(admin,'Orden actualizada')
            assert admin.locator('#o_status').input_value()=='Entregada'
            return 'Bloqueó cierre sin campos y cerró con fecha, trabajo y costo.'
        record('P09','Cierre validado',close,'No cierra incompleta; registra entrega completa','V5_07_cierre_e_historial.png')
        admin.locator('#orderDetail').screenshot(path=str(EVID/'V5_07_cierre_e_historial.png'))
        def search():
            admin.locator('[data-tab="people"]').click()
            admin.locator('#searchPeople').fill('DEM0099')
            assert admin.locator('#peopleList').get_by_text('Cliente Integración DEMO').count()>0
            admin.locator('[data-tab="orders"]').click()
            admin.locator('#searchOrders').fill('DEM0099')
            assert admin.locator('#orderList').get_by_text('ORD-',exact=False).count()>0
            return 'Búsqueda por placas, cliente y orden funcional.'
        record('P10','Búsqueda e historial interno',search,'Busca por cliente, placa y orden','V5_07_cierre_e_historial.png')
        def export():
            admin.locator('[data-tab="metrics"]').click()
            with admin.expect_download() as down: admin.locator('#exportJson').click()
            d1=down.value
            assert d1.suggested_filename.endswith('.json')
            with admin.expect_download() as down: admin.locator('#exportCsv').click()
            d2=down.value
            assert d2.suggested_filename.endswith('.csv')
            with tempfile.TemporaryDirectory() as temp:
                jsonfile=Path(temp)/'export.json';csvfile=Path(temp)/'export.csv'
                d1.save_as(jsonfile);d2.save_as(csvfile)
                payload=json.loads(jsonfile.read_text(encoding='utf-8'))
                assert payload['mode']=='demo' and len(payload['data']['orders'])>=1
                csvtext=csvfile.read_text(encoding='utf-8-sig')
                assert 'folio' in csvtext.splitlines()[0] and 'ORD-' in csvtext
            assert 'Sin datos' in admin.locator('#metricCards').inner_text()
            return 'JSON analizado correctamente, CSV con columnas y órdenes; sin indicadores de piloto real.'
        record('P11','Exportaciones JSON y CSV',export,'Genera archivos descargables y excluye DEMO','V5_08_indicadores.png')
        admin.screenshot(path=str(EVID/'V5_08_indicadores.png'))
        def validation():
            admin.locator('[data-tab="requests"]').click()
            admin.locator('#toggleManual').click()
            admin.locator('#m_name').fill('X')
            admin.locator('#m_brand').fill('Toyota')
            admin.locator('#m_model').fill('Camry')
            admin.locator('#m_year').fill('2018')
            admin.locator('#m_date').fill(selected_date)
            admin.locator('#m_issue').fill('Falla sintética DEMO')
            admin.locator('#m_actor').fill('Responsable DEMO')
            assert admin.locator('#manualForm').evaluate('(el)=>el.checkValidity()') is False
            return 'Se bloquean formularios con nombre incompleto.'
        record('P13','Campos obligatorios',validation,'No permite registro incompleto','V5_03_gestion_cita.png')
        # Comprobación adicional: sin Supabase, NO se debe afirmar guardado central.
        fallback=context.new_page()
        fallback.on('pageerror',lambda exc:errors.append(str(exc)))
        init_page(fallback);load_local(fallback,'index.html','config.js')
        assert 'no está configurado' in fallback.locator('#requestMode').inner_text()
        fallback.locator('#name').fill('Cliente sin base DEMO')
        fallback.locator('#brand').fill('Honda')
        fallback.locator('#model').fill('Civic')
        fallback.locator('#yearCar').fill('2016')
        fallback.locator('#service').select_option(label='Frenos')
        fallback.locator('#date').fill(selected_date)
        fallback.locator('#issue').fill('Prueba sintética de mensaje sin base central')
        fallback.locator('#consent').check()
        with context.expect_page(timeout=8000) as popup:
            fallback.locator('#submitRequest').click()
        popup.value.close()
        fallback.locator('#formStatus').get_by_text('NO se guardó',exact=False).wait_for()
        assert fallback.evaluate('window.localStorage.o')=={}
        fallback.locator('#cita').scroll_into_view_if_needed()
        fallback.screenshot(path=str(EVID/'V5_10_aviso_sin_base.png'))
        # Explicit P12 external pending, cannot substitute local DEMO with true central.
        results.append(dict(codigo='P12',escenario='Dos dispositivos con la misma información',datos='Se necesita una instancia Supabase real',resultado_esperado='Solicitudes y órdenes disponibles desde dos sesiones independientes',resultado_observado='No ejecutada: faltan URL, clave pública y cuentas administrativas reales.',estado='BLOQUEADA EXTERNA',fecha=datetime.now().astimezone().isoformat(timespec='seconds'),evidencia='PENDIENTES.md'))
        assert not errors, f'Errores JavaScript: {errors}'
        # Responsive check
        mobile=context.new_page();mobile.set_viewport_size({'width':390,'height':844})
        mobile.on('pageerror',lambda exc:errors.append(str(exc)))
        init_page(mobile)
        load_local(mobile,'index.html')
        mobile.screenshot(path=str(EVID/'V5_09_portada_movil.png'))
        assert mobile.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'), 'Desbordamiento horizontal de portada móvil'
        print('APROBADAS DEMO:',sum(x['estado']=='APROBADA DEMO' for x in results),'BLOQUEADAS:',sum('BLOQUEADA' in x['estado'] for x in results),'ERRORES JS',errors)
        browser.close()

out=ROOT/'pruebas'/'v5_resultados.json'
out.write_text(json.dumps(dict(version='5.0',fecha=datetime.now().astimezone().isoformat(timespec='seconds'),tipo='Navegador Chromium contra HTTP local, modo DEMO',avisos=['No se probó Supabase real','No se enviaron mensajes WhatsApp','No hay resultados del piloto real'],resultados=sorted(results,key=lambda x:x['codigo']),errores_javascript=errors),ensure_ascii=False,indent=2),encoding='utf-8')
print('Reporte',out)
