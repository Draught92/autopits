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
    const button=$('submitRequest');if(button.disabled)return;button.disabled=true;status.style.display='block';status.textContent='Registrando solicitud y preparando WhatsApp...';
    // Abrir la ventana dentro del gesto del usuario evita bloqueos de ventanas emergentes.
    const popup=window.open('about:blank','_blank');
    // Un token nuevo por intento; no se recicla para un formulario modificado.
    // El botón bloqueado impide el doble clic en este intento.
    const token=crypto.randomUUID();
    let folio=null,hasError=false;
    try{
      const result=await AutoPitsAPI.submitPublic({...data,submission_token:token});folio=result.folio;

      form.reset();
      updateArrivalInfo();
    }catch(err){hasError=true;console.warn('Solicitud no registrada: ', err?.message||'Error de conexión');}
    const message=[
      'Hola AutoPits, quiero solicitar atención.',
      folio?`Referencia ${AutoPitsAPI.mode==='demo'?'DEMO ':''}${folio}`:'Referencia: pendiente de registro',
      `Nombre: ${data.customer_name}`,`Vehículo: ${data.vehicle_brand} ${data.vehicle_model} ${data.vehicle_year}`,
      `Servicio: ${data.service}`,`Fecha preferida: ${data.preferred_date||'Por acordar'}`,
      `Recepción recomendada: desde las ${arrivalHour(data.preferred_date)} (sujeta a confirmación)`,
      `Problema: ${data.description}`,
      'La cita requiere confirmación del taller.'
    ].join('\n');
    const url='https://wa.me/528189943114?text='+encodeURIComponent(message);
    let opened=false;
    if(popup && !popup.closed){try{popup.location.href=url;opened=true}catch{popup.close()}}
    status.replaceChildren();
    const title=document.createElement('p');title.textContent=hasError?
      'El mensaje de WhatsApp se preparó, pero la solicitud NO se guardó en la base central. Envía el mensaje y el taller deberá registrar la solicitud manualmente.':
      (AutoPitsAPI.mode==='demo'?`Solicitud DEMO ${folio} guardada únicamente en este navegador.`:`Solicitud ${folio} registrada centralmente. ${opened?'Se intentó abrir WhatsApp.':'Abre WhatsApp con el enlace siguiente.'} Comprueba que el mensaje se envíe; la cita aún no está confirmada.`);
    const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener';link.textContent='Abrir WhatsApp (si no abrió automáticamente)';link.style.cssText='display:inline-block;margin-top:10px;font-weight:800;text-decoration:underline;color:#14532d';
    status.append(title,link);
    button.disabled=false;
  });
})();
