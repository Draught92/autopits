/* Modo de demostración: conserva únicamente datos sintéticos en este navegador. */
"use strict";
window.AutoPitsDemo = (() => {
  const KEY = 'autopits_conecta_demo_v4';
  const now = () => new Date().toISOString();
  const uid = () => crypto.randomUUID();
  const folio = prefix => prefix + '-' + crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const blank = () => ({ requests:[], request_events:[], clients:[], vehicles:[], orders:[], order_events:[], communications:[], acceptance_tests:TESTS.map(t=>({code:t.code,label:t.label,status:'pendiente',notes:'',updated_at:null})) });
  const TESTS = [
    ['P01','Solicitud pública y WhatsApp'],['P02','Confirmación de cita'],['P03','Registro cliente/vehículo'],['P04','Crear orden'],
    ['P05','Diagnóstico y costo'],['P06','Autorización'],['P07','Estados y auditoría'],['P08','Preparar WhatsApp'],
    ['P09','Cierre validado'],['P10','Historial y búsquedas'],['P11','Exportación'],['P12','Mismo dato en otro dispositivo'],
    ['P13','Campos incompletos bloqueados'],['P14','Sin reparación no autorizada']
  ].map(([code,label])=>({code,label}));
  function load(){ try{const v=JSON.parse(localStorage.getItem(KEY));return v&&Array.isArray(v.requests)&&Array.isArray(v.orders)?v:blank()}catch{return blank()} }
  function save(db){localStorage.setItem(KEY,JSON.stringify(db));return db}
  function must(x,msg){if(!x)throw Error(msg)}
  function event(db,kind,id,actor,action,oldStatus,newStatus,details=''){
    db[kind].push({id:uid(),request_id:kind==='request_events'?id:null,order_id:kind==='order_events'?id:null,actor,action,old_status:oldStatus||null,new_status:newStatus||null,details,created_at:now()});
  }
  function fields(d){
    const req=['customer_name','vehicle_brand','vehicle_model','vehicle_year','service','description'];
    req.forEach(k=>must(String(d[k]??'').trim(),'Falta: '+k));
    must(d.preferred_date||d.preferred_time,'Indica fecha u horario preferido');
    const year=Number(d.vehicle_year);must(year>=1950&&year<=2100,'El año del vehículo no es válido');
  }
  function createPublicRequest(data){fields(data);const db=load();const r={id:uid(),folio:folio('SOL'),...data,source:'web',appointment_status:'recibida',customer_phone:null,plate:null,clarification_minutes:null,attention_minutes:null,is_pilot:false,is_demo:true,created_at:now(),updated_at:now()};db.requests.unshift(r);event(db,'request_events',r.id,'Cliente DEMO','Solicitud recibida',null,'recibida','Formulario público local');save(db);return {folio:r.folio,id:r.id,mode:'demo'} }
  function createManualRequest(data){fields(data);const db=load();const r={id:uid(),folio:folio('SOL'),...data,source:'manual',appointment_status:'recibida',customer_phone:data.customer_phone||null,plate:data.plate||null,clarification_minutes:null,attention_minutes:null,is_pilot:false,is_demo:true,created_at:now(),updated_at:now()};db.requests.unshift(r);event(db,'request_events',r.id,data.actor||'Operador DEMO','Solicitud manual registrada',null,'recibida','DEMO');save(db);return {id:r.id,folio:r.folio} }
  function updateRequest(id,p){const db=load(),r=db.requests.find(x=>x.id===id);must(r,'Solicitud no encontrada');must(p.actor&&p.reason,'Indica responsable y motivo');
    const old=r.appointment_status;
    if(p.appointment_status){must(['recibida','confirmada','reprogramada','cancelada'].includes(p.appointment_status),'Estado de cita inválido');if(old==='cancelada'&&p.appointment_status!=='cancelada')throw Error('Una cita cancelada no puede reactivarse');if(p.appointment_status==='confirmada')must(p.preferred_date||r.preferred_date,'Para confirmar indica una fecha');if(p.preferred_date)must(new Date(p.preferred_date+'T12:00:00').getDay()!==0,'El taller permanece cerrado los domingos');if(p.appointment_status==='reprogramada')must(p.preferred_date,'Para reprogramar indica una fecha nueva');r.appointment_status=p.appointment_status}
    for(const k of ['preferred_date','preferred_time','customer_phone','plate','clarification_minutes','attention_minutes','is_pilot','is_demo'])if(Object.hasOwn(p,k))r[k]=p[k];
    if(r.customer_phone){const s=String(r.customer_phone).replace(/\D/g,'');must(s.length===10,'El teléfono debe tener 10 dígitos');r.customer_phone=s}
    if(r.plate)r.plate=String(r.plate).toUpperCase().replace(/\s/g,'');
    for(const k of ['clarification_minutes','attention_minutes']){if(r[k]==='')r[k]=null;if(r[k]!=null)must(Number(r[k])>=0&&Number.isFinite(Number(r[k])),'Minutos inválidos')}
    r.updated_at=now();event(db,'request_events',id,p.actor,'Cita '+r.appointment_status,old,r.appointment_status,p.reason);save(db);return r;
  }
  function createOrder(id,actor,notes){const db=load(),r=db.requests.find(x=>x.id===id);must(r,'Solicitud no encontrada');must(r.appointment_status==='confirmada','Primero confirma la cita');must(!db.orders.some(x=>x.request_id===id),'Esta cita ya tiene una orden');must(actor,'Indica responsable');must(r.customer_phone&&r.plate,'Registra teléfono del remitente y placas antes de crear orden');
    const phone=r.customer_phone.replace(/\D/g,''),plate=r.plate.toUpperCase().replace(/\s/g,'');must(phone.length===10&&plate.length>=4,'Teléfono o placas inválidos');
    let c=db.clients.find(x=>x.phone===phone);if(!c){c={id:uid(),name:r.customer_name,phone,created_at:now(),updated_at:now(),is_demo:true};db.clients.push(c)}
    let v=db.vehicles.find(x=>x.plate===plate);if(v&&v.client_id!==c.id)throw Error('Placas vinculadas a otra persona');if(!v){v={id:uid(),client_id:c.id,plate,brand:r.vehicle_brand,model:r.vehicle_model,year:r.vehicle_year,created_at:now(),updated_at:now(),is_demo:true};db.vehicles.push(v)}
    const o={id:uid(),folio:folio('ORD'),request_id:r.id,client_id:c.id,vehicle_id:v.id,service:r.service,responsible:actor,notes:notes||'',status:'Vehículo recibido',diagnosis:'',proposed_work:'',estimated_cost:null,estimated_hours:null,diagnostic_evidence:'',received_at:null,authorization_scope:'',authorization_state:'pendiente',authorization_date:null,authorization_medium:'',authorization_by:'',authorization_notes:'',delivery_date:null,work_done:'',final_cost:null,closing_notes:'',created_at:now(),updated_at:now(),is_demo:true};db.orders.unshift(o);event(db,'order_events',o.id,actor,'Orden creada',null,o.status,notes);save(db);return o;
  }
  const transitions={
    'Vehículo recibido':['En diagnóstico','Cancelada'],
    'En diagnóstico':['Pendiente de autorización','Cancelada'],
    'Pendiente de autorización':['Autorizada','Cancelada'],
    'Autorizada':['En reparación','Cancelada'],
    'En reparación':['Lista para entrega','Cancelada'],
    'Lista para entrega':['Entregada'],
    'Entregada':[], 'Cancelada':[]
  };
  function updateOrder(id,patch,actor,reason){const db=load(),o=db.orders.find(x=>x.id===id);must(o,'Orden no encontrada');must(actor&&reason,'Indica responsable y motivo');must(!['Entregada','Cancelada'].includes(o.status),'La orden ya terminó');
    const keys=['status','received_at','diagnosis','diagnostic_evidence','proposed_work','estimated_cost','estimated_hours','authorization_scope','authorization_state','authorization_date','authorization_medium','authorization_by','authorization_notes','delivery_date','work_done','final_cost','closing_notes','notes'];
    const next={...o};keys.forEach(k=>{if(Object.hasOwn(patch,k))next[k]=patch[k]});
    if(next.status!==o.status)must((transitions[o.status]||[]).includes(next.status),'Transición no permitida: '+o.status+' → '+next.status);
    if(next.estimated_cost!==null&&next.estimated_cost!=='')must(Number(next.estimated_cost)>=0,'Costo estimado inválido');
    must(['pendiente','autorizada','parcial','rechazada','cambios solicitados'].includes(next.authorization_state),'Decisión no válida');
    if(next.authorization_state!=='pendiente')must(next.authorization_date&&next.authorization_medium&&next.authorization_by,'Registrar fecha, medio y responsable de autorización');if(next.authorization_state==='parcial')must((next.authorization_scope||'').trim().length>=5,'Detalla el trabajo autorizado parcialmente');
    if(['Pendiente de autorización','Autorizada','En reparación','Lista para entrega','Entregada'].includes(next.status))must(next.diagnosis?.trim()&&next.proposed_work?.trim()&&next.estimated_cost!==null&&next.estimated_cost!=='','Para avanzar faltan diagnóstico, trabajo propuesto o presupuesto');
    if(['Autorizada','En reparación','Lista para entrega','Entregada'].includes(next.status))must(['autorizada','parcial'].includes(next.authorization_state),'La reparación requiere autorización documentada');
    if(['En diagnóstico','Pendiente de autorización','Autorizada','En reparación','Lista para entrega','Entregada'].includes(next.status))must(next.received_at,'Registra la fecha de recepción del vehículo');
    if(next.status==='Entregada')must(next.delivery_date&&next.work_done?.trim()&&next.final_cost!==null&&next.final_cost!==''&&Number(next.final_cost)>=0,'Para cerrar faltan fecha, trabajo realizado o costo final');
    if(next.estimated_hours!=null&&next.estimated_hours!=='')must(Number(next.estimated_hours)>0&&Number.isFinite(Number(next.estimated_hours)),'Tiempo estimado inválido');
    if(next.final_cost!==null&&next.final_cost!=='')must(Number(next.final_cost)>=0,'Costo final inválido');
    const oldStatus=o.status,oldDecision=o.authorization_state;Object.assign(o,next,{updated_at:now()});event(db,'order_events',id,actor,'Actualización de orden',oldStatus,next.status,reason+' · Decisión: '+oldDecision+' → '+next.authorization_state+'; '+(next.authorization_medium||'sin medio')+'; '+(next.authorization_date||'sin fecha')+'; '+(next.authorization_by||'sin responsable de decisión'));save(db);return o;
  }
  function prepareMessage(id,p){const db=load(),o=db.orders.find(x=>x.id===id);must(o,'Orden no encontrada');must(p.actor&&p.message&&p.type&&p.next_step,'Completa tipo, responsable, mensaje y siguiente paso');const c=db.clients.find(x=>x.id===o.client_id);must(c?.phone,'El cliente no tiene teléfono');const m={id:uid(),order_id:id,type:p.type,next_step:p.next_step,message:p.message,actor:p.actor,send_status:'preparado',created_at:now(),confirmed_at:null,confirmed_by:null,is_demo:true};db.communications.unshift(m);event(db,'order_events',id,p.actor,'WhatsApp preparado',o.status,o.status,p.type);save(db);return {...m,phone:c.phone} }
  function confirmMessage(id,actor){const db=load(),m=db.communications.find(x=>x.id===id);must(m,'Mensaje no encontrado');must(actor,'Indica quién verificó el envío');must(m.send_status==='preparado','Este mensaje ya está confirmado');m.send_status='envío confirmado';m.confirmed_at=now();m.confirmed_by=actor;const o=db.orders.find(x=>x.id===m.order_id);event(db,'order_events',o.id,actor,'WhatsApp marcado enviado',o.status,o.status,m.type+' (confirmación manual)');save(db);return m}
  function setAcceptance(code,status,notes){const db=load(),t=db.acceptance_tests.find(x=>x.code===code);must(t,'Prueba inexistente');must(['pendiente','aprobada','fallida'].includes(status),'Estado inválido');if(status==='aprobada')must((notes||'').trim().length>=10,'Documenta la evidencia para aprobar');t.status=status;t.notes=notes||'';t.updated_at=now();save(db);return t}
  function seedDemo(){const db=load();if(db.requests.some(x=>x.source==='demo_seed'))throw Error('Los ejemplos DEMO ya están cargados');const a=createManualRequest({customer_name:'Cliente DEMO 01',vehicle_brand:'Nissan DEMO',vehicle_model:'Versa prueba',vehicle_year:2018,service:'Frenos',preferred_date:'2026-11-10',preferred_time:'11:00 – 13:00',description:'Ruido al frenar. Caso sintético',customer_phone:'8100000001',plate:'DEM-0001',actor:'Operador DEMO'});const d=load();d.requests.find(x=>x.id===a.id).source='demo_seed';save(d);updateRequest(a.id,{appointment_status:'confirmada',preferred_date:'2026-11-10',actor:'Operador DEMO',reason:'Escenario sintético'});const o=createOrder(a.id,'Operador DEMO','Caso para evidencias');updateOrder(o.id,{status:'En diagnóstico',diagnosis:'Balatas desgastadas (DEMO)',proposed_work:'Inspección y reemplazo de balatas (DEMO)',estimated_cost:1200},'Operador DEMO','Diagnóstico sintético');return {request_id:a.id,order_id:o.id} }
  function removeDemo(){const db=blank();save(db);return true}
  return {mode:'demo',load,createPublicRequest,createManualRequest,updateRequest,createOrder,updateOrder,prepareMessage,confirmMessage,setAcceptance,seedDemo,removeDemo};
})();
