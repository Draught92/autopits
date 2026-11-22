/* Conexión a Supabase mediante REST sin dependencias externas.
   La clave PUBLISHABLE es pública; nunca use service_role / secret en el navegador. */
"use strict";
window.AutoPitsAPI = (()=>{
  const cfg=window.AUTOPITS_CONFIG||{};
  const cloud=cfg.mode==='supabase';
  const localHost=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const demo=cfg.mode==='demo' && (localHost || location.protocol==='about:');
  const mode=cloud?'supabase':demo?'demo':'unconfigured';
  const TOKEN_KEY='autopits_supabase_session';
  if(cloud && (!/^https:\/\/[-a-z0-9.]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl||'') || !/^sb_publishable_/.test(cfg.publishableKey||''))) {
    // Legacy anon JWTs are deliberately not encouraged for new deployments.
    throw new Error('Configuración inválida. Revisa config.js: URL HTTPS y clave sb_publishable_.');
  }
  const base=(cfg.supabaseUrl||'').replace(/\/$/,'');
  function session(){try{return JSON.parse(sessionStorage.getItem(TOKEN_KEY)||'null')}catch{return null}}
  function saveSession(x){if(x)sessionStorage.setItem(TOKEN_KEY,JSON.stringify(x));else sessionStorage.removeItem(TOKEN_KEY)}
  async function request(url,method='POST',body,token){
    const headers={'apikey':cfg.publishableKey,'Content-Type':'application/json'};
    if(token)headers.Authorization='Bearer '+token;
    let response;
    try{response=await fetch(base+url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'})}
    catch{throw Error('No hay conexión con Supabase. Comprueba internet y configuración. No se guardaron datos.');}
    let data;try{data=await response.json()}catch{data=null}
    if(!response.ok){
      const message=data?.message||data?.msg||data?.error_description||data?.details||data?.error||`Error ${response.status}`;
      const friendly=response.status===401?'Sesión vencida o acceso no autorizado. Inicia sesión de nuevo.':String(message);
      throw Error(friendly);
    }
    return data;
  }
  async function refresh(){let s=session();if(!s)return null;
    if(s.expires_at && Date.now()<s.expires_at-60000)return s.access_token;
    try{const t=await request('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:s.refresh_token});const next={access_token:t.access_token,refresh_token:t.refresh_token,expires_at:Date.now()+t.expires_in*1000};saveSession(next);return next.access_token}
    catch{saveSession(null);throw Error('Tu sesión venció. Vuelve a iniciar sesión.');}
  }
  async function rpc(name,payload={},isPublic=false){return request('/rest/v1/rpc/'+name,'POST',payload,isPublic?null:await refresh())}
  async function login(email,password){
    if(!cloud){if(!demo)throw Error('Configuración central pendiente. El panel no está disponible.');if(password!=='DEMO2026')throw Error('Clave DEMO incorrecta');return true}
    const s=await request('/auth/v1/token?grant_type=password','POST',{email,password});saveSession({access_token:s.access_token,refresh_token:s.refresh_token,expires_at:Date.now()+s.expires_in*1000});
    try{await rpc('ap_admin_snapshot');return true}catch(e){saveSession(null);throw Error('Usuario sin autorización de administración: '+e.message)}
  }
  function logout(){saveSession(null)}
  function isLoggedIn(){return cloud?!!session():false}
  async function adminSnapshot(){return cloud?rpc('ap_admin_snapshot'):demo?AutoPitsDemo.load():Promise.reject(Error('Configura Supabase para usar el panel.'))}
  async function submitPublic(data){return cloud?rpc('ap_submit_request',{p:data},true):demo?AutoPitsDemo.createPublicRequest(data):Promise.reject(Error('Sin base central configurada.'))}
  async function manualRequest(data){return cloud?rpc('ap_admin_create_request',{p:data}):demo?AutoPitsDemo.createManualRequest(data):Promise.reject(Error('Sin base central configurada.'))}
  async function updateRequest(id,p){return cloud?rpc('ap_admin_update_request',{p_id:id,p}):demo?AutoPitsDemo.updateRequest(id,p):Promise.reject(Error('Sin base central configurada.'))}
  async function createOrder(id,actor,notes){return cloud?rpc('ap_admin_create_order',{p_request_id:id,p_actor:actor,p_notes:notes}):demo?AutoPitsDemo.createOrder(id,actor,notes):Promise.reject(Error('Sin base central configurada.'))}
  async function updateOrder(id,patch,actor,reason){return cloud?rpc('ap_admin_update_order',{p_id:id,p:patch,p_actor:actor,p_reason:reason}):demo?AutoPitsDemo.updateOrder(id,patch,actor,reason):Promise.reject(Error('Sin base central configurada.'))}
  async function prepareMessage(id,p){return cloud?rpc('ap_admin_prepare_message',{p_order_id:id,p}):demo?AutoPitsDemo.prepareMessage(id,p):Promise.reject(Error('Sin base central configurada.'))}
  async function confirmMessage(id,actor){return cloud?rpc('ap_admin_confirm_message',{p_id:id,p_actor:actor}):demo?AutoPitsDemo.confirmMessage(id,actor):Promise.reject(Error('Sin base central configurada.'))}
  async function setAcceptance(code,status,notes){return cloud?rpc('ap_admin_set_acceptance',{p_code:code,p_status:status,p_notes:notes}):demo?AutoPitsDemo.setAcceptance(code,status,notes):Promise.reject(Error('Sin base central configurada.'))}
  async function seedDemo(){return cloud?rpc('ap_admin_seed_demo'):demo?AutoPitsDemo.seedDemo():Promise.reject(Error('Sin base central configurada.'))}
  async function removeDemo(){return cloud?rpc('ap_admin_remove_demo'):demo?AutoPitsDemo.removeDemo():Promise.reject(Error('Sin base central configurada.'))}
  return {mode,cloud,login,logout,isLoggedIn,adminSnapshot,submitPublic,manualRequest,updateRequest,createOrder,updateOrder,prepareMessage,confirmMessage,setAcceptance,seedDemo,removeDemo};
})();
