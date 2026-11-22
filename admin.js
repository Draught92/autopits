"use strict";
(()=>{
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=x=>x?new Date(x).toLocaleString('es-MX'):'—';
  const dt=x=>x?String(x).slice(0,10):'';
  const digits=x=>String(x||'').replace(/\D/g,'');
  const state=['Vehículo recibido','En diagnóstico','Pendiente de autorización','Autorizada','En reparación','Lista para entrega','Entregada','Cancelada'];
  const messages=['Confirmación de cita','Recepción','Diagnóstico disponible','Solicitud de autorización','Inicio de reparación','Avance del servicio','Vehículo listo','Entrega y cierre'];
  const showDemoDefault=AutoPitsAPI.mode==='demo';
  let db=null,selectedRequest=null,selectedOrder=null,active='requests',lastDraft=null,busy=false;
  $('includeDemo').checked=showDemoDefault;
  $('modeTag').textContent=AutoPitsAPI.mode==='demo'?'DEMO LOCAL':AutoPitsAPI.mode==='supabase'?'SUPABASE':'SIN CONFIGURAR';
  $('loginInfo').textContent=AutoPitsAPI.mode==='demo'? 'Modo de práctica sin servidor: usa solo datos ficticios. La clave no protege información real.':AutoPitsAPI.mode==='supabase'?'Conexión central activada. Inicia sesión con un usuario autorizado de Supabase Auth.':'Panel deshabilitado: configura Supabase. Para pruebas locales cambia config.js a modo demo.';
  $('cloudFields').hidden=AutoPitsAPI.mode!=='supabase';
  if(AutoPitsAPI.mode==='unconfigured') $('enter').disabled=true;
  if(AutoPitsAPI.mode!=='demo') $('m_actor').value='';
  $('loginHint').textContent=AutoPitsAPI.mode==='demo'?'Clave de prueba: DEMO2026':'El usuario debe existir en Supabase Auth y estar autorizado en ap_staff.';
  $('modeNotice').innerHTML=AutoPitsAPI.mode==='demo'?'<strong>DEMO LOCAL:</strong> Los datos de esta sesión solo están en este navegador. No uses clientes reales. Para HU04 aún es necesaria la conexión central.':'<strong>BASE CENTRAL:</strong> Los datos se leen de Supabase. Solo el personal autorizado puede acceder. Revisa las medidas de privacidad y los controles antispam antes de uso operativo.';
  const note=txt=>{$('notice').textContent=txt};
  const visible=arr=>($('includeDemo').checked?arr:arr.filter(x=>!x.is_demo));
  const reqs=()=>visible(db?.requests||[]);
  const ords=()=>visible(db?.orders||[]);
  const byClient=id=>(db?.clients||[]).find(x=>x.id===id);
  const byVehicle=id=>(db?.vehicles||[]).find(x=>x.id===id);
  const labelDemo=r=>r?.is_demo?' <span class="tag">DEMO</span>':'';
  const humanMinutes=mins=>mins==null?'Sin datos':Number(mins).toFixed(1)+' min';
  function download(name,data,type){const blob=new Blob([data],{type}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
  const option=(values,chosen)=>values.map(x=>`<option value="${esc(x)}"${x===chosen?' selected':''}>${esc(x)}</option>`).join('');
  const attrNum=x=>x===null||x===undefined?'':x;
  function timeLine(list){return !list.length?'<p class="muted">Sin movimientos todavía.</p>':'<ol class="history">'+[...list].sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(h=>`<li><strong>${esc(h.action)}</strong> · ${esc(fmtDate(h.created_at))} · ${esc(h.actor)}${h.old_status||h.new_status?`<br><small>${esc(h.old_status||'Inicio')} → ${esc(h.new_status||'—')}</small>`:''}<small>${esc(h.details||'')}</small></li>`).join('')+'</ol>'}
  function setTab(name){active=name;document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===name)));['requests','people','orders','metrics','acceptance'].forEach(id=>$(id).hidden=id!==name);render()}
  function showWorkspace(open){$('workspace').hidden=!open;$('login').hidden=open;$('logout').hidden=!open;$('refresh').hidden=!open}
  async function reload(){if(busy)return;db=await AutoPitsAPI.adminSnapshot();$('loadStatus').textContent='Actualizado '+new Date().toLocaleTimeString('es-MX');render()}
  async function run(fn,success='Cambios registrados correctamente.'){if(busy)return;busy=true;$('loadStatus').textContent='Guardando...';try{await fn();db=await AutoPitsAPI.adminSnapshot();render();note(success)}catch(e){note('Error: '+(e?.message||String(e)))}finally{busy=false;$('loadStatus').textContent='Actualizado '+new Date().toLocaleTimeString('es-MX')}}
  async function login(){const access=$('access').value;
    $('enter').disabled=true;
    try{await AutoPitsAPI.login($('email').value.trim(),access);showWorkspace(true);db=await AutoPitsAPI.adminSnapshot();render();note('Sesión iniciada. Datos cargados.')}
    catch(e){note('No se pudo entrar: '+e.message)}finally{$('enter').disabled=false}
  }
  $('enter').onclick=login;$('access').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
  $('logout').onclick=()=>{AutoPitsAPI.logout();db=null;selectedRequest=null;selectedOrder=null;showWorkspace(false);$('access').value='';note('Sesión cerrada.')};
  $('refresh').onclick=()=>run(async()=>{},'Datos actualizados desde la fuente.');
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  $('includeDemo').onchange=render;
  for(const id of ['searchReq','searchPeople','searchOrders','statusFilter','fromDate','toDate'])$(id).addEventListener('input',render);
  $('toggleManual').onclick=()=>{$('manualPanel').hidden=!$('manualPanel').hidden;if(!$('manualPanel').hidden){$('manualPanel').open=true;$('m_name').focus()}};
  $('seed').onclick=()=>run(()=>AutoPitsAPI.seedDemo(),'Ejemplo sintético marcado DEMO cargado.');
  $('removeDemo').onclick=()=>{if(confirm('¿Eliminar solo los registros DEMO? Esta acción no se puede deshacer.'))run(()=>AutoPitsAPI.removeDemo(),'Ejemplos DEMO eliminados.')};
  $('manualForm').addEventListener('submit',e=>{e.preventDefault();if(!e.currentTarget.reportValidity())return;
    const p={customer_name:$('m_name').value.trim(),customer_phone:digits($('m_phone').value)||null,
      vehicle_brand:$('m_brand').value.trim(),vehicle_model:$('m_model').value.trim(),vehicle_year:Number($('m_year').value),plate:$('m_plate').value.trim().toUpperCase(),
      service:$('m_service').value,preferred_date:$('m_date').value||null,preferred_time:$('m_time').value.trim()||null,
      description:$('m_issue').value.trim(),actor:$('m_actor').value.trim(),is_demo:AutoPitsAPI.mode==='demo'};
    if(!p.preferred_date&&!p.preferred_time){note('Indica fecha u horario preferido.');return}
    if(p.customer_phone && p.customer_phone.length!==10){note('El teléfono del remitente debe tener 10 dígitos.');return}
    run(async()=>{const r=await AutoPitsAPI.manualRequest(p);selectedRequest=r.id;$('manualForm').reset();$('manualPanel').hidden=true},'Solicitud manual registrada.');
  });
  document.body.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action,id=b.dataset.id;
    if(action==='request'){selectedRequest=id;render();document.getElementById('requestDetail').scrollIntoView({block:'nearest'})}
    if(action==='order'){selectedOrder=id;setTab('orders');document.getElementById('orderDetail').scrollIntoView({block:'nearest'})}
    if(action==='make-order'){const r=db.requests.find(x=>x.id===id);if(!r)return;
      if(!r.customer_phone||!r.plate){note('Registra y guarda teléfono del remitente y placas antes de crear la orden.');return}
      if(r.appointment_status!=='confirmada'){note('Confirma primero la cita.');return}
      const actor=($('r_actor')?.value||'').trim();if(!actor){note('Indica responsable.');return}
      run(async()=>{const o=await AutoPitsAPI.createOrder(id,actor,'Convertida desde cita confirmada');selectedOrder=o.id;active='orders';setTab('orders')},'Orden ORD creada y vinculada.');
    }
    if(action==='preview'){prepareDraft()}
    if(action==='prepare'){const o=db.orders.find(x=>x.id===id);const actor=($('msg_actor')?.value||'').trim(),type=$('msg_type').value,next_step=$('msg_next').value.trim(),message=$('msg_preview').value.trim();
      if(!actor||!next_step||message.length<5){note('Completa responsable, siguiente paso y mensaje antes de prepararlo.');return}
      run(async()=>{const m=await AutoPitsAPI.prepareMessage(id,{actor,type,next_step,message});lastDraft={message,id:m.id,phone:m.phone}},'Mensaje registrado como PREPARADO. Revisa la lista y abre WhatsApp para enviarlo.');
    }
    if(action==='confirm-message'){if(!confirm('¿Confirmas que enviaste este mensaje desde WhatsApp? Abrir WhatsApp por sí solo NO confirma el envío.'))return;
      const actor=prompt('Nombre de la persona que comprobó el envío:',AutoPitsAPI.mode==='demo'?'Operador DEMO':'')||'';
      if(!actor.trim()){note('Se requiere responsable para confirmar el envío.');return}
      run(()=>AutoPitsAPI.confirmMessage(id,actor.trim()),'Envío marcado como confirmado manualmente.');
    }
    if(action==='print'){window.print()}
    if(action==='export-order'){const o=db.orders.find(x=>x.id===id);if(o)download(o.folio+'.json',JSON.stringify({order:o,client:byClient(o.client_id),vehicle:byVehicle(o.vehicle_id),events:db.order_events.filter(x=>x.order_id===o.id),communications:db.communications.filter(x=>x.order_id===o.id)},null,2),'application/json')}
  });
  document.body.addEventListener('submit',e=>{
    if(e.target.id==='requestForm'){e.preventDefault();const id=selectedRequest;
      const p={appointment_status:$('r_status').value,preferred_date:$('r_date').value||null,preferred_time:$('r_time').value.trim()||null,
        customer_phone:digits($('r_phone').value)||null,plate:$('r_plate').value.trim().toUpperCase(),
        clarification_minutes:$('r_clar').value===''?null:Number($('r_clar').value),
        attention_minutes:$('r_att').value===''?null:Number($('r_att').value),is_pilot:$('r_pilot').checked,is_demo:$('r_demo').checked,
        actor:$('r_actor').value.trim(),reason:$('r_reason').value.trim()};
      if(p.customer_phone&&p.customer_phone.length!==10){note('El teléfono debe tener 10 dígitos.');return}
      if(!p.actor||!p.reason){note('Indica responsable y motivo.');return}
      if(['cancelada'].includes(p.appointment_status)&&!confirm('¿Confirmar cancelación de la cita?'))return;
      run(()=>AutoPitsAPI.updateRequest(id,p),'Cita actualizada y cambio registrado.');
    }
    if(e.target.id==='orderForm'){e.preventDefault();const id=selectedOrder;
      const patch={status:$('o_status').value,diagnosis:$('o_diagnosis').value.trim(),proposed_work:$('o_proposed_work').value.trim(),
        estimated_cost:$('o_estimated_cost').value===''?null:Number($('o_estimated_cost').value),
        estimated_hours:$('o_estimated_hours').value===''?null:Number($('o_estimated_hours').value), diagnostic_evidence:$('o_diagnostic_evidence').value.trim(),
        received_at:$('o_received_at').value||null, authorization_scope:$('o_authorization_scope').value.trim(),
        authorization_state:$('o_authorization_state').value,authorization_date:$('o_authorization_date').value||null,
        authorization_medium:$('o_authorization_medium').value,authorization_by:$('o_authorization_by').value.trim(),
        authorization_notes:$('o_authorization_notes').value.trim(),delivery_date:$('o_delivery_date').value||null,
        work_done:$('o_work_done').value.trim(),final_cost:$('o_final_cost').value===''?null:Number($('o_final_cost').value),
        closing_notes:$('o_closing_notes').value.trim(),notes:$('o_notes').value.trim()};
      const actor=$('o_actor').value.trim(),reason=$('o_reason').value.trim();
      if(!actor||!reason){note('Indica responsable y motivo del cambio.');return}
      if(patch.status==='Entregada'&&!confirm('¿Cerrar la orden como entregada? Después de guardar no podrá modificarse.'))return;
      if(patch.status==='Cancelada'&&!confirm('¿Cancelar la orden?'))return;
      run(()=>AutoPitsAPI.updateOrder(id,patch,actor,reason),'Orden actualizada y evento registrado.');
    }
    if(e.target.classList.contains('accept-form')){e.preventDefault();const code=e.target.dataset.code,status=e.target.querySelector('[name="status"]').value,notes=e.target.querySelector('[name="notes"]').value;
      run(()=>AutoPitsAPI.setAcceptance(code,status,notes),'Resultado de prueba registrado.');}
  });
  function render(){if(!db||$('workspace').hidden)return;renderRequests();renderPeople();renderOrders();renderMetrics();renderAcceptance()}
  function renderRequests(){const q=$('searchReq').value.toLowerCase();const rows=reqs().filter(r=>[r.folio,r.customer_name,r.service,r.vehicle_brand,r.vehicle_model,r.plate].join(' ').toLowerCase().includes(q));
    $('requestList').innerHTML='<table><thead><tr><th>Solicitud</th><th>Cliente / vehículo</th><th>Cita</th><th>Estado</th><th>Acción</th></tr></thead><tbody>'+rows.map(r=>`<tr><td>${esc(r.folio)}${labelDemo(r)}</td><td>${esc(r.customer_name)}<br><small>${esc(r.vehicle_brand)} ${esc(r.vehicle_model)} ${esc(r.vehicle_year)}</small></td><td>${esc(r.preferred_date||'Por acordar')} · ${esc(r.preferred_time||'—')}</td><td>${esc(r.appointment_status)}</td><td><button data-action="request" data-id="${esc(r.id)}">Gestionar</button></td></tr>`).join('')+'</tbody></table>';
    const r=db.requests.find(x=>x.id===selectedRequest);if(!r||!rows.some(x=>x.id===selectedRequest)){$('requestDetail').replaceChildren();return}
    const o=db.orders.find(x=>x.request_id===r.id),events=db.request_events.filter(e=>e.request_id===r.id);
    $('requestDetail').innerHTML=`<div class="panel"><h3>Solicitud ${esc(r.folio)} ${labelDemo(r)}</h3><p>${esc(r.description)} · <strong>${esc(r.service)}</strong><br><small>Recibida ${esc(fmtDate(r.created_at))} desde ${esc(r.source)}</small></p>
      <form id="requestForm"><div class="formgrid">
      <div><label for="r_status">Estado de cita</label><select id="r_status">${option(['recibida','confirmada','reprogramada','cancelada'],r.appointment_status)}</select></div>
      <div><label for="r_date">Fecha de cita</label><input id="r_date" type="date" value="${esc(dt(r.preferred_date))}"></div>
      <div><label for="r_time">Horario preferido</label><input id="r_time" value="${esc(r.preferred_time||'')}"></div>
      <div><label for="r_phone">Teléfono del remitente (10 dígitos)</label><input id="r_phone" inputmode="tel" placeholder="Identificado en WhatsApp" value="${esc(r.customer_phone||'')}"></div>
      <div><label for="r_plate">Placas del vehículo</label><input id="r_plate" value="${esc(r.plate||'')}"></div>
      <div><label for="r_clar">Minutos de aclaración</label><input id="r_clar" type="number" min="0" step="0.1" value="${esc(attrNum(r.clarification_minutes))}"></div>
      <div><label for="r_att">Minutos de recepción / atención</label><input id="r_att" type="number" min="0" step="0.1" value="${esc(attrNum(r.attention_minutes))}"></div>
      <div><label class="checkbox-line" for="r_pilot"><input id="r_pilot" type="checkbox" ${r.is_pilot?'checked':''}> Caso del piloto ${r.is_demo?'(DEMO, no cuenta como real)':''}</label></div><div><label class="checkbox-line" for="r_demo"><input id="r_demo" type="checkbox" ${r.is_demo?'checked':''}> Registro de prueba DEMO (no contabilizar)</label></div>
      <div><label for="r_actor">Responsable del cambio *</label><input id="r_actor" value="${AutoPitsAPI.mode==='demo'?'Operador DEMO':''}" required></div>
      <div class="wide"><label for="r_reason">Motivo del cambio *</label><input id="r_reason" placeholder="Ej. Confirmación recibida por WhatsApp" required></div>
      </div><div class="actionrow"><button type="submit">Guardar cita y datos</button><button type="button" ${r.appointment_status!=='confirmada'||!!o?'disabled':''} data-action="make-order" data-id="${esc(r.id)}">Crear orden ORD</button>${o?`<button type="button" class="secondary" data-action="order" data-id="${esc(o.id)}">Abrir ${esc(o.folio)}</button>`:''}</div></form>
      <h3>Bitácora de la cita</h3>${timeLine(events)}</div>`;
  }
  function renderPeople(){const q=$('searchPeople').value.trim().toLowerCase();const rows=(db.vehicles||[]).filter(v=>visible([v]).length).map(v=>({v,c:byClient(v.client_id)})).filter(({v,c})=>[v.brand,v.model,v.plate,c?.name,c?.phone].join(' ').toLowerCase().includes(q));
    $('peopleList').innerHTML='<table><thead><tr><th>Cliente</th><th>Teléfono interno</th><th>Vehículo / placas</th><th>Órdenes</th></tr></thead><tbody>'+rows.map(({v,c})=>`<tr><td>${esc(c?.name)}${labelDemo(v)}</td><td>${esc(c?.phone)}</td><td>${esc(v.brand)} ${esc(v.model)} ${esc(v.year)}<br>${esc(v.plate)}</td><td>${ords().filter(o=>o.vehicle_id===v.id).map(o=>`<button data-action="order" data-id="${esc(o.id)}">${esc(o.folio)}</button>`).join(' ')||'—'}</td></tr>`).join('')+'</tbody></table>';
    $('clientHistory').innerHTML=rows.map(({v,c})=>{const os=ords().filter(o=>o.vehicle_id===v.id);return `<details><summary>${esc(c?.name)} · ${esc(v.plate)} (${os.length} servicio${os.length===1?'':'s'})</summary>${os.length?os.map(o=>`<p>${esc(o.folio)} · ${esc(o.service)} · ${esc(o.status)} <button data-action="order" data-id="${esc(o.id)}">Ver orden e historial</button></p>`).join(''):'<p>Sin servicios todavía.</p>'}</details>`}).join('');
  }
  function renderOrders(){const q=$('searchOrders').value.trim().toLowerCase(),status=$('statusFilter').value,from=$('fromDate').value,to=$('toDate').value;
    const rows=ords().filter(o=>{const c=byClient(o.client_id),v=byVehicle(o.vehicle_id);return [o.folio,c?.name,v?.brand,v?.model,v?.plate,o.service].join(' ').toLowerCase().includes(q)&&(!status||o.status===status)&&(!from||dt(o.created_at)>=from)&&(!to||dt(o.created_at)<=to)});
    $('orderList').innerHTML='<table><thead><tr><th>Orden</th><th>Cliente / vehículo</th><th>Servicio</th><th>Estado</th><th>Acción</th></tr></thead><tbody>'+rows.map(o=>{const c=byClient(o.client_id),v=byVehicle(o.vehicle_id);return `<tr><td>${esc(o.folio)}${labelDemo(o)}</td><td>${esc(c?.name)}<br><small>${esc(v?.brand)} ${esc(v?.model)} · ${esc(v?.plate)}</small></td><td>${esc(o.service)}</td><td>${esc(o.status)}</td><td><button data-action="order" data-id="${esc(o.id)}">Abrir</button></td></tr>`}).join('')+'</tbody></table>';
    const o=db.orders.find(x=>x.id===selectedOrder);if(!o||!rows.some(x=>x.id===selectedOrder)){$('orderDetail').replaceChildren();return}
    const c=byClient(o.client_id),v=byVehicle(o.vehicle_id),locked=['Entregada','Cancelada'].includes(o.status);
    const fld=(label,key,type='text')=>`<div><label for="o_${key}">${esc(label)}</label><input id="o_${key}" type="${type}" ${type==='number'?'min="0" step="0.01"':''} value="${esc(type==='date'?dt(o[key]):attrNum(o[key]))}" ${locked?'disabled':''}></div>`;
    const orderEvents=db.order_events.filter(x=>x.order_id===o.id);
    const comms=db.communications.filter(x=>x.order_id===o.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
    $('orderDetail').innerHTML=`<div class="panel" id="printableOrder"><h2>Orden ${esc(o.folio)} ${labelDemo(o)}</h2><p><strong>Cliente:</strong> ${esc(c?.name)} · <strong>Teléfono interno:</strong> ${esc(c?.phone)}<br><strong>Vehículo:</strong> ${esc(v?.brand)} ${esc(v?.model)} ${esc(v?.year)} · ${esc(v?.plate)}<br><strong>Servicio:</strong> ${esc(o.service)} · <strong>Registrada:</strong> ${esc(fmtDate(o.created_at))} · <strong>Responsable:</strong> ${esc(o.responsible)}</p>
      <form id="orderForm"><h3>Diagnóstico, autorización, estados y cierre</h3><div class="formgrid">
      <div><label for="o_status">Estado de la orden *</label><select id="o_status" ${locked?'disabled':''}>${option(state,o.status)}</select></div>
      ${fld('Fecha de recepción','received_at','date')}${fld('Diagnóstico','diagnosis')}${fld('Evidencia disponible (folio o referencia)','diagnostic_evidence')}${fld('Trabajo propuesto','proposed_work')}${fld('Costo estimado (MXN)','estimated_cost','number')}${fld('Tiempo estimado (horas)','estimated_hours','number')}
      <div><label for="o_authorization_state">Decisión del cliente</label><select id="o_authorization_state" ${locked?'disabled':''}>${option(['pendiente','autorizada','parcial','rechazada','cambios solicitados'],o.authorization_state)}</select></div>
      ${fld('Fecha de la decisión','authorization_date','date')}
      <div><label for="o_authorization_medium">Medio de autorización</label><select id="o_authorization_medium" ${locked?'disabled':''}>${option(['','WhatsApp','Teléfono','Presencial','Otro'],o.authorization_medium)}</select></div>
      ${fld('Quién comunicó la decisión','authorization_by')}${fld('Alcance autorizado (obligatorio si es parcial)','authorization_scope')}${fld('Notas de autorización','authorization_notes')}
      ${fld('Fecha de entrega','delivery_date','date')}${fld('Trabajo realizado','work_done')}${fld('Costo final (MXN)','final_cost','number')}${fld('Observaciones de cierre','closing_notes')}${fld('Notas generales','notes')}
      <div><label for="o_actor">Responsable del cambio *</label><input id="o_actor" value="${AutoPitsAPI.mode==='demo'?'Operador DEMO':''}" ${locked?'disabled':''} required></div>
      <div class="wide"><label for="o_reason">Motivo del cambio *</label><input id="o_reason" placeholder="Ej. Autorización recibida por WhatsApp" ${locked?'disabled':''} required></div>
      </div><div class="actionrow"><button type="submit" ${locked?'disabled':''}>Guardar cambios y estado</button><button type="button" class="secondary" data-action="print">Imprimir orden</button><button type="button" class="secondary" data-action="export-order" data-id="${esc(o.id)}">Exportar orden JSON</button></div></form>
      <h3 class="no-print">Actualización por WhatsApp · HU08</h3><div class="no-print"><p class="muted">Prepara y revisa el mensaje. El envío no queda confirmado al abrir WhatsApp.</p>
      <div class="formgrid"><div><label for="msg_type">Tipo de comunicación</label><select id="msg_type">${option(messages,'Avance del servicio')}</select></div><div><label for="msg_actor">Responsable</label><input id="msg_actor" value="${AutoPitsAPI.mode==='demo'?'Operador DEMO':''}"></div><div class="wide"><label for="msg_next">Siguiente paso</label><input id="msg_next" placeholder="Ej. Esperar respuesta del cliente"></div><div class="wide"><label for="msg_preview">Mensaje editable para revisar</label><textarea id="msg_preview" rows="5" placeholder="Primero prepara el mensaje"></textarea></div></div>
      <div class="actionrow"><button type="button" class="secondary" data-action="preview">Crear texto sugerido</button><button type="button" data-action="prepare" data-id="${esc(o.id)}">Registrar como preparado</button></div>
      <h3>Comunicaciones registradas</h3><div class="scroll"><table><thead><tr><th>Fecha / responsable</th><th>Tipo y situación</th><th>Mensaje</th><th>Acciones</th></tr></thead><tbody>${comms.map(m=>`<tr><td>${esc(fmtDate(m.created_at))}<br><small>${esc(m.actor)}</small></td><td>${esc(m.type)}<br><span class="pill">${esc(m.send_status)}</span></td><td>${esc(m.message)}<br><small>Siguiente paso: ${esc(m.next_step)}</small></td><td>${/^\d{10}$/.test(digits(c?.phone))?`<a class="button secondary" target="_blank" rel="noopener" href="${esc(waUrl(c?.phone,m.message))}">Abrir WhatsApp</a>`:'<span class="muted">Sin número de cliente</span>'} ${m.send_status==='preparado'?`<button type="button" data-action="confirm-message" data-id="${esc(m.id)}">Confirmar envío</button>`:''}</td></tr>`).join('')}</tbody></table></div>
      </div><h3>Historial interno de la orden</h3>${timeLine(orderEvents)}</div>`;
  }
  function waUrl(phone,message){return /^\d{10}$/.test(digits(phone))?'https://wa.me/52'+digits(phone)+'?text='+encodeURIComponent(message):'https://wa.me/528189943114'}
  function prepareDraft(){const o=db.orders.find(x=>x.id===selectedOrder);if(!o){note('Selecciona una orden.');return}const c=byClient(o.client_id);const type=$('msg_type').value,next=$('msg_next').value.trim();if(!next){note('Escribe el siguiente paso para el cliente.');return}
    $('msg_preview').value=`Hola ${c?.name||'cliente'}, te escribimos de AutoPits.\nOrden: ${o.folio}\nActualización: ${type}.\nEstado actual: ${o.status}.\nSiguiente paso: ${next}.\nSi tienes alguna duda, puedes responder a este WhatsApp.`;
    note('Revisa y modifica el mensaje antes de registrarlo como preparado.');
  }
  function computeMetrics(){const rs=(db?.requests||[]).filter(r=>!r.is_demo&&r.is_pilot), os=(db?.orders||[]).filter(o=>!o.is_demo && rs.some(r=>r.id===o.request_id));const total=rs.length,incomplete=rs.filter(r=>![r.customer_name,r.vehicle_brand,r.vehicle_model,r.vehicle_year,r.service,r.description].every(Boolean)||(!r.preferred_date&&!r.preferred_time)).length;
    const clar=rs.map(r=>r.clarification_minutes).filter(x=>x!==null&&x!==undefined).map(Number),attention=rs.map(r=>r.attention_minutes).filter(x=>x!==null&&x!==undefined).map(Number);
    const sum=a=>a.reduce((t,x)=>t+x,0),avg=a=>a.length?sum(a)/a.length:null;
    const closed=os.filter(o=>o.status==='Entregada');const times=closed.map(o=>{const r=rs.find(r=>r.id===o.request_id);return r?(new Date(o.updated_at)-new Date(r.created_at))/3600000:null}).filter(x=>x!=null&&Number.isFinite(x)&&x>=0);
    const realPilot=rs.length, realAll=(db?.requests||[]).filter(r=>!r.is_demo).length,passed=db.acceptance_tests.filter(t=>t.status==='aprobada').length,executed=db.acceptance_tests.filter(t=>t.status!=='pendiente').length;
    return {total,totalReal:realAll,incomplete,incPct:total?100*incomplete/total:null,clarTotal:clar.length?sum(clar):null,clarN:clar.length,attention:avg(attention),attentionN:attention.length,confirmed:rs.filter(r=>r.appointment_status==='confirmada'||os.some(o=>o.request_id===r.id)).length,reprogrammed:rs.filter(r=>r.appointment_status==='reprogramada'||db.request_events.some(e=>e.request_id===r.id&&e.new_status==='reprogramada')).length,cancelled:rs.filter(r=>r.appointment_status==='cancelada').length,open:os.filter(o=>!['Entregada','Cancelada'].includes(o.status)).length,closed:closed.length,pending:os.filter(o=>o.status==='Pendiente de autorización').length,avgHours:avg(times),samples:times.length,pilot:realPilot,passed,executed};
  }
  function renderMetrics(){const m=computeMetrics(),num=x=>x==null?'Sin datos':Number(x).toFixed(1),items=[
    ['Solicitudes reales recibidas',m.totalReal],['Solicitudes reales del piloto',m.total],['Citas confirmadas',m.confirmed],['Citas reprogramadas',m.reprogrammed],['Citas canceladas',m.cancelled],
    ['Órdenes abiertas',m.open],['Órdenes entregadas',m.closed],['Pendientes autorización',m.pending],['Registros incompletos',m.incPct==null?'Sin datos':num(m.incPct)+' %'],
    ['Aclaraciones capturadas',m.clarTotal==null?'Sin datos':num(m.clarTotal)+' min'],['Solicitudes con minutos registrados',m.clarN],
    ['Recepción promedio',humanMinutes(m.attention)],['Tiempo solicitud → entrega',m.avgHours==null?'Sin datos':num(m.avgHours)+' h']];
    $('metricCards').innerHTML=items.map(([label,value])=>`<div class="panel"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('');
    $('pilotSummary').innerHTML=`<div class="note"><strong>Comparación con línea base</strong><p>${$('includeDemo').checked?'Los ejemplos DEMO solo se ven en las listas. Los indicadores siempre excluyen DEMO.':'Solo se consideran solicitudes reales marcadas para el piloto. Estos resultados son preliminares.'}</p><p>Registros incompletos: <b>59.3 %</b> (línea base) frente a <b>${esc(m.incPct==null?'sin datos':num(m.incPct)+' %')}</b> (muestra actual).<br>Aclaraciones: <b>390 min / 4 semanas</b> (línea base) frente a <b>${esc(m.clarTotal==null?'sin datos':num(m.clarTotal)+' min')}</b> capturados en la muestra actual (${m.clarN} solicitudes con medición). La comparación requiere cuatro semanas reales equivalentes y una muestra suficiente.</p><p>Casos reales marcados para piloto: <strong>${m.pilot} / 30 requeridos</strong>. ${m.pilot>=30?'Muestra mínima registrada; falta validar calidad y aceptación.':'Resultado preliminar, muestra insuficiente.'}</p><p>Criterios con prueba ejecutada: ${m.executed} de ${db.acceptance_tests.length}; aprobados: ${m.passed}. HU04 y HU10 siguen pendientes hasta prueba real entre dispositivos y revisión del Product Owner.</p></div>`;
  }
  function renderAcceptance(){$('acceptanceList').innerHTML='<table><thead><tr><th>Criterio</th><th>Resultado documentado</th></tr></thead><tbody>'+db.acceptance_tests.map(t=>`<tr><td><b>${esc(t.code)}</b> · ${esc(t.label)}<br><small>Última revisión: ${esc(fmtDate(t.updated_at))}</small></td><td><form class="accept-form" data-code="${esc(t.code)}"><label for="test_${esc(t.code)}">Resultado</label><select id="test_${esc(t.code)}" name="status">${option(['pendiente','aprobada','fallida'],t.status)}</select><label for="notes_${esc(t.code)}">Evidencia / observaciones</label><input id="notes_${esc(t.code)}" name="notes" value="${esc(t.notes||'')}" placeholder="Captura, fecha o incidencia"><button type="submit">Guardar evaluación</button></form></td></tr>`).join('')+'</tbody></table>'}
  $('exportJson').onclick=()=>{if(!db)return;download('autopits-conecta-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({exported_at:new Date().toISOString(),mode:AutoPitsAPI.mode,data:db,metrics:computeMetrics()},null,2),'application/json')};
  $('exportCsv').onclick=()=>{if(!db)return;const rows=[['tipo','folio','cliente','vehiculo','estado','fecha','servicio','es_demo'],...db.requests.map(r=>['solicitud',r.folio,r.customer_name,[r.vehicle_brand,r.vehicle_model,r.vehicle_year].join(' '),r.appointment_status,r.created_at,r.service,r.is_demo]),...db.orders.map(o=>['orden',o.folio,byClient(o.client_id)?.name,byVehicle(o.vehicle_id)?.plate,o.status,o.created_at,o.service,o.is_demo])];
    const cell=x=>'"'+String(x??'').replace(/^[=+@\-]/,"'$&").replace(/"/g,'""')+'"';download('autopits-conecta-'+new Date().toISOString().slice(0,10)+'.csv','\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');};
  if(AutoPitsAPI.isLoggedIn()){showWorkspace(true);reload().catch(e=>{showWorkspace(false);note('Sesión anterior vencida: '+e.message)})}
})();
