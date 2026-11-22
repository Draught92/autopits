// Prueba del contrato HTTP con respuestas simuladas; NO conecta con Supabase real.
import fs from 'fs';import vm from 'vm';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const store=new Map(),calls=[];
const sess={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const ctx={location:{hostname:'autopits.net',protocol:'https:'},window:{AUTOPITS_CONFIG:{mode:'supabase',supabaseUrl:'https://proyecto.supabase.co',publishableKey:'sb_publishable_CLAVE_DE_PRUEBA'}},sessionStorage:sess,Date,Error,JSON};
ctx.fetch=async (url,opt)=>{
 calls.push({url,opt});
 let value={id:'UUID-TEST',folio:'SOL-DEMO'};
 if(url.includes('grant_type=password'))value={access_token:'jwt-de-prueba',refresh_token:'refresh-de-prueba',expires_in:3600};
 if(url.includes('ap_admin_snapshot'))value={requests:[],orders:[],clients:[],vehicles:[],request_events:[],order_events:[],communications:[],acceptance_tests:[]};
 if(url.includes('ap_admin_update_order'))value={id:'UUID-TEST',status:'En diagnóstico'};
 return {ok:true,status:200,async json(){return value}};
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../backend.js',import.meta.url),'utf8'),ctx);
const api=ctx.window.AutoPitsAPI;
assert.equal(api.mode,'supabase');
await api.submitPublic({customer_name:'Cliente DEMO',submission_token:'uuid-de-prueba'});
assert(calls[0].url.endsWith('/rest/v1/rpc/ap_submit_request'));
assert(!('Authorization' in calls[0].opt.headers),'RPC pública no debe enviar JWT ficticio');
assert.equal(calls[0].opt.headers.apikey,'sb_publishable_CLAVE_DE_PRUEBA');
await api.login('prueba@ejemplo.com','contraseña-sintética');
assert(calls.find(c=>c.url.includes('ap_admin_snapshot')).opt.headers.Authorization==='Bearer jwt-de-prueba');
await api.updateOrder('UUID-TEST',{status:'En diagnóstico'},'Operador DEMO','Acción DEMO');
assert(calls.some(c=>c.url.includes('ap_admin_update_order')));
api.logout();assert.equal(store.size,0);
// Una configuración DEMO desplegada en un dominio público DEBE fallar cerrada.
const remote={location:{hostname:'autopits.net',protocol:'https:'},window:{AUTOPITS_CONFIG:{mode:'demo'}},sessionStorage:sess,Date,Error,JSON};
vm.createContext(remote);
vm.runInContext(fs.readFileSync(new URL('../backend.js',import.meta.url),'utf8'),remote);
assert.equal(remote.window.AutoPitsAPI.mode,'unconfigured');
await assert.rejects(remote.window.AutoPitsAPI.submitPublic({customer_name:'DEMO'}));
await assert.rejects(remote.window.AutoPitsAPI.login('','DEMO2026'));
console.log(JSON.stringify({result:'APROBADA',scope:'Contrato HTTP simulado: solicitud pública, autenticación, RPC con JWT y cierre de sesión',live_supabase:'NO PROBADO'},null,2));
