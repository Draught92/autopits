"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const nav = $('nav'), menuBtn = $('menuBtn');
  menuBtn.addEventListener('click',()=>{const open=nav.classList.toggle('open');document.body.classList.toggle('menu-open',open);menuBtn.setAttribute('aria-expanded',String(open));menuBtn.textContent=open?'✕':'☰'});
  document.querySelectorAll('#nav a').forEach(x=>x.addEventListener('click',()=>{nav.classList.remove('open');document.body.classList.remove('menu-open');menuBtn.setAttribute('aria-expanded','false');menuBtn.textContent='☰'}));
  $('year').textContent=new Date().getFullYear();
  const dateInput=$('date');
  const arrivalInfo=$('arrivalInfo');
  const today=new Date();dateInput.min=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const defaultArrivalText=arrivalInfo.textContent.trim();
  function arrivalHour(date){
    return new Date(date+'T12:00:00').getDay()===6?'9:30 a. m.':'9:00 a. m.';
  }
  function updateArrivalInfo(){
    const value=dateInput.value;
    dateInput.setCustomValidity('');
    if(!value){arrivalInfo.textContent=defaultArrivalText;return}
    const day=new Date(value+'T12:00:00').getDay();
    if(day===0){
      dateInput.setCustomValidity('AutoPits está cerrado los domingos. Selecciona otro día.');
      arrivalInfo.textContent='Los domingos permanecemos cerrados. Selecciona de lunes a sábado.';
      return;
    }
    arrivalInfo.textContent=`Para este día recomendamos traer el vehículo desde las ${arrivalHour(value)}. AutoPits confirmará la disponibilidad por WhatsApp.`;
  }
  dateInput.addEventListener('input',updateArrivalInfo);
  dateInput.addEventListener('change',updateArrivalInfo);
  const status=$('formStatus');
  if(AutoPitsAPI.mode==='demo') $('requestMode').textContent='MODO DEMO LOCAL: la solicitud solo aparece en este navegador. No usar datos reales.';
  else if(AutoPitsAPI.mode==='unconfigured') $('requestMode').textContent='El registro central todavía no está configurado. Puedes contactar por WhatsApp; tu solicitud no se guardará en el sistema.';
  const form=$('appointmentForm');
  let pendingAttemptToken=null;
  const makeToken=()=>{
    if(window.crypto?.randomUUID)return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
      const r=Math.floor(Math.random()*16);return (c==='x'?r:((r&3)|8)).toString(16);
    });
  };
  // Conservar el identificador si hay un error de conexión y el usuario reintenta sin modificar datos.
  form.addEventListener('input',()=>{pendingAttemptToken=null});
  form.addEventListener('change',()=>{pendingAttemptToken=null});
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.checkValidity()){form.reportValidity();return}
    const data={
      customer_name:$('name').value.trim(),vehicle_brand:$('brand').value.trim(),vehicle_model:$('model').value.trim(),
      vehicle_year:Number($('yearCar').value),service:$('service').value,
      preferred_date:dateInput.value||null,preferred_time:null,description:$('issue').value.trim()
    };
    if(!data.preferred_date){status.style.display='block';status.textContent='Selecciona el día en que prefieres venir.';return}
    if(data.preferred_date<dateInput.min){status.style.display='block';status.textContent='Elige una fecha actual o futura.';return}
    if(new Date(data.preferred_date+'T12:00:00').getDay()===0){
      updateArrivalInfo();dateInput.reportValidity();return;
    }
    const button=$('submitRequest');
    if(button.disabled)return;
    button.disabled=true;
    status.style.display='block';
    status.textContent='Registrando la solicitud... Después podrás abrir WhatsApp con un botón.';
    pendingAttemptToken ||= makeToken();
    let folio=null,registrationError=null;
    try{
      const result=await AutoPitsAPI.submitPublic({...data,submission_token:pendingAttemptToken});
      folio=result?.folio||null;
      if(folio){pendingAttemptToken=null;form.reset();updateArrivalInfo()}
    }catch(err){
      registrationError=err;
      console.warn('No se pudo confirmar registro de solicitud:',err?.message||'Error de conexión');
    }
    const message=[
      'Hola AutoPits, quiero solicitar atención.',
      folio?`Referencia ${AutoPitsAPI.mode==='demo'?'DEMO ':''}${folio}`:'Referencia: por registrar en el taller',
      `Nombre: ${data.customer_name}`,`Vehículo: ${data.vehicle_brand} ${data.vehicle_model} ${data.vehicle_year}`,
      `Servicio: ${data.service}`,`Fecha preferida: ${data.preferred_date||'Por acordar'}`,
      `Recepción recomendada: desde las ${arrivalHour(data.preferred_date)} (sujeta a confirmación)`,
      `Problema: ${data.description}`,
      'La cita requiere confirmación del taller.'
    ].join('\n');
    const url='https://wa.me/528189943114?text='+encodeURIComponent(message);
    status.replaceChildren();
    const title=document.createElement('p');
    title.textContent=registrationError?
      'No se pudo confirmar el guardado en la base central. Puedes enviar el mensaje por WhatsApp; el taller registrará la solicitud manualmente.':
      (AutoPitsAPI.mode==='demo'?
        'Solicitud DEMO '+folio+' guardada en este navegador.':
        'Solicitud '+(folio||'registrada')+' guardada en la base central.');
    const guide=document.createElement('p');
    guide.textContent='Paso final: toca el botón verde para abrir WhatsApp y pulsa Enviar dentro de la aplicación. La cita requiere confirmación del taller.';
    guide.style.margin='9px 0 13px';
    const link=document.createElement('a');
    link.href=url;
    link.target='_self';
    link.rel='noopener';
    link.className='btn btn-whatsapp';
    link.textContent='Abrir WhatsApp y enviar mensaje';
    link.style.cssText='display:inline-flex;text-align:center;max-width:100%;white-space:normal';
    // Solo un enlace tocado directamente por la persona puede abrir WhatsApp.
    // No se crean pestañas about:blank ni redirecciones tras esperar la red.
    status.append(title,guide,link);
    button.disabled=false;

  });
})();
