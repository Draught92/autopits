-- AutoPits Conecta · base de datos v5, actualiza el esquema v4.1 sin borrar registros
-- Ejecutar en SQL Editor tras respaldo. Diseñado para una instalación nueva o v4.1.
-- Todos los registros internos se administran mediante RPC con validación del rol.
-- Revisar antes de reutilizar en una base con otras aplicaciones.

create extension if not exists pgcrypto;

create table if not exists public.ap_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.ap_requests (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique default ('SOL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  submission_token uuid unique,
  source text not null default 'web' check (source in ('web','manual','demo_seed')),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 120),
  vehicle_brand text not null,
  vehicle_model text not null,
  vehicle_year integer not null check (vehicle_year between 1950 and 2100),
  service text not null,
  preferred_date date,
  preferred_time text,
  description text not null,
  customer_phone text check (customer_phone is null or customer_phone ~ '^[0-9]{10}$'),
  plate text,
  appointment_status text not null default 'recibida' check (appointment_status in ('recibida','confirmada','reprogramada','cancelada')),
  clarification_minutes numeric(10,2) check (clarification_minutes is null or clarification_minutes>=0),
  attention_minutes numeric(10,2) check (attention_minutes is null or attention_minutes>=0),
  is_pilot boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ap_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique check (phone ~ '^[0-9]{10}$'),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ap_vehicles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.ap_clients(id),
  plate text not null unique check (char_length(plate) between 4 and 12),
  brand text not null,
  model text not null,
  year integer not null check(year between 1950 and 2100),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ap_orders (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique default ('ORD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  request_id uuid not null unique references public.ap_requests(id),
  client_id uuid not null references public.ap_clients(id),
  vehicle_id uuid not null references public.ap_vehicles(id),
  responsible text not null,
  service text not null,
  notes text not null default '',
  status text not null default 'Vehículo recibido' check (status in ('Vehículo recibido','En diagnóstico','Pendiente de autorización','Autorizada','En reparación','Lista para entrega','Entregada','Cancelada')),
  diagnosis text not null default '',
  proposed_work text not null default '',
  estimated_cost numeric(12,2) check(estimated_cost is null or estimated_cost>=0),
  authorization_state text not null default 'pendiente' check (authorization_state in ('pendiente','autorizada','rechazada','cambios solicitados')),
  authorization_date date,
  authorization_medium text not null default '',
  authorization_by text not null default '',
  authorization_notes text not null default '',
  delivery_date date,
  work_done text not null default '',
  final_cost numeric(12,2) check(final_cost is null or final_cost>=0),
  closing_notes text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Evolución compatible con la v4.1 (no elimina ni recrea registros).
alter table public.ap_orders add column if not exists received_at date;
alter table public.ap_orders add column if not exists diagnostic_evidence text not null default '';
alter table public.ap_orders add column if not exists estimated_hours numeric(8,2);
alter table public.ap_orders add column if not exists authorization_scope text not null default '';
alter table public.ap_orders drop constraint if exists ap_orders_authorization_state_check;
alter table public.ap_orders add constraint ap_orders_authorization_state_check
  check(authorization_state in ('pendiente','autorizada','parcial','rechazada','cambios solicitados'));
-- El estado de cierre conserva fecha de entrega y el registro de eventos conserva auditoría.

create table if not exists public.ap_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ap_requests(id) on delete cascade,
  actor text not null,
  actor_user_id uuid,
  action text not null,
  old_status text,
  new_status text,
  details text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.ap_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ap_orders(id) on delete cascade,
  actor text not null,
  actor_user_id uuid,
  action text not null,
  old_status text,
  new_status text,
  details text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.ap_communications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ap_orders(id) on delete cascade,
  type text not null,
  message text not null,
  next_step text not null,
  actor text not null,
  actor_user_id uuid,
  send_status text not null default 'preparado' check(send_status in ('preparado','envío confirmado')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by text
);
create table if not exists public.ap_acceptance_tests (
  code text primary key,
  label text not null,
  status text not null default 'pendiente' check(status in ('pendiente','aprobada','fallida')),
  notes text not null default '',
  updated_at timestamptz
);
alter table public.ap_acceptance_tests add column if not exists actor_user_id uuid;

create index if not exists ap_requests_created_idx on public.ap_requests(created_at desc);
create index if not exists ap_requests_status_idx on public.ap_requests(appointment_status,preferred_date);
create index if not exists ap_requests_pilot_idx on public.ap_requests(is_pilot,is_demo,created_at desc);
create index if not exists ap_vehicles_client_idx on public.ap_vehicles(client_id);
create index if not exists ap_orders_request_idx on public.ap_orders(request_id);
create index if not exists ap_orders_vehicle_idx on public.ap_orders(vehicle_id);
create index if not exists ap_orders_status_idx on public.ap_orders(status);
create index if not exists ap_requests_phone_idx on public.ap_requests(customer_phone);
create index if not exists ap_order_events_order_idx on public.ap_order_events(order_id,created_at);
create index if not exists ap_comms_order_idx on public.ap_communications(order_id,created_at);

insert into public.ap_acceptance_tests(code,label) values
('P01','Solicitud pública y WhatsApp'),('P02','Confirmación de cita'),('P03','Registro cliente/vehículo'),
('P04','Crear orden'),('P05','Diagnóstico y costo'),('P06','Autorización'),
('P07','Estados y auditoría'),('P08','Preparar WhatsApp'),('P09','Cierre validado'),
('P10','Historial y búsquedas'),('P11','Exportación'),('P12','Mismo dato en otro dispositivo'),
('P13','Campos incompletos bloqueados'),('P14','Sin reparación no autorizada')
on conflict (code) do nothing;

-- Acceso directo denegado. Solo funciones RPC específicas realizan operaciones.
revoke all on public.ap_staff, public.ap_requests, public.ap_clients, public.ap_vehicles,
 public.ap_orders, public.ap_request_events, public.ap_order_events,
 public.ap_communications, public.ap_acceptance_tests from public, anon, authenticated;
alter table public.ap_staff enable row level security;
alter table public.ap_requests enable row level security;
alter table public.ap_clients enable row level security;
alter table public.ap_vehicles enable row level security;
alter table public.ap_orders enable row level security;
alter table public.ap_request_events enable row level security;
alter table public.ap_order_events enable row level security;
alter table public.ap_communications enable row level security;
alter table public.ap_acceptance_tests enable row level security;
-- No se crean políticas de acceso directo: la base solo se consulta por RPC autorizadas.
-- No dar GRANT SELECT/INSERT/UPDATE/DELETE a anon o authenticated sobre estas tablas.
-- Las funciones SECURITY DEFINER validan ap_staff y su search_path vacío;
-- verifique sus privilegios EXECUTE después de cada cambio de esquema.

create or replace function public.ap_require_staff()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.ap_staff where user_id=auth.uid() and active=true
  ) then
    raise exception 'Acceso administrativo no autorizado';
  end if;
end $$;

-- Anónimo: solo puede registrar datos de una solicitud; nunca leerlos ni definir permisos.
create or replace function public.ap_submit_request(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.ap_requests%rowtype;
        d date; yr integer; tok uuid;
begin
  if char_length(trim(coalesce(p->>'customer_name',''))) not between 2 and 120 then raise exception 'Indica tu nombre completo'; end if;
  if char_length(trim(coalesce(p->>'vehicle_brand',''))) not between 2 and 65 then raise exception 'Indica la marca del vehículo'; end if;
  if char_length(trim(coalesce(p->>'vehicle_model',''))) not between 1 and 65 then raise exception 'Indica el modelo'; end if;
  yr:=nullif(p->>'vehicle_year','')::integer;
  if yr is null or yr not between 1950 and 2100 then raise exception 'El año del vehículo no es válido'; end if;
  if char_length(trim(coalesce(p->>'service',''))) not between 2 and 100 then raise exception 'Indica el servicio'; end if;
  if char_length(trim(coalesce(p->>'description',''))) not between 5 and 1500 then raise exception 'Describe brevemente el problema'; end if;
  if char_length(coalesce(p->>'preferred_time',''))>80 then raise exception 'Horario demasiado largo'; end if;
  if nullif(p->>'preferred_date','') is not null then
    d:=(p->>'preferred_date')::date;
    if d < (now() at time zone 'America/Monterrey')::date then raise exception 'Elige una fecha actual o futura'; end if;
    if extract(dow from d)=0 then raise exception 'El taller permanece cerrado los domingos'; end if;
    if extract(dow from d)=6 and (p->>'preferred_time' like '15:00%' or p->>'preferred_time' like '17:00%') then raise exception 'El sábado cerramos a las 15:00'; end if;
  end if;
  if d is null and nullif(trim(coalesce(p->>'preferred_time','')),'') is null then raise exception 'Indica fecha u horario preferido'; end if;
  if nullif(p->>'submission_token','') is null then raise exception 'Falta identificador del envío'; end if;
  tok:=(p->>'submission_token')::uuid;
  insert into public.ap_requests(submission_token,customer_name,vehicle_brand,vehicle_model,vehicle_year,service,preferred_date,preferred_time,description,source,is_demo)
  values(tok,trim(p->>'customer_name'),trim(p->>'vehicle_brand'),trim(p->>'vehicle_model'),yr,trim(p->>'service'),d,
    nullif(trim(coalesce(p->>'preferred_time','')),''),trim(p->>'description'),'web',false)
  on conflict(submission_token) do nothing returning * into r;
  if r.id is null then select * into r from public.ap_requests where submission_token=tok; end if;
  -- Nunca devuelve nombre, teléfono, placa, estado ni datos internos.
  return jsonb_build_object('id',r.id,'folio',r.folio);
end $$;

create or replace function public.ap_admin_snapshot()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.ap_require_staff();
  return jsonb_build_object(
    'requests',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select * from public.ap_requests order by created_at desc limit 2000)x),
    'request_events',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select * from public.ap_request_events order by created_at desc limit 10000)x),
    'clients',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select * from public.ap_clients order by created_at desc limit 2000)x),
    'vehicles',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select * from public.ap_vehicles order by created_at desc limit 2000)x),
    'orders',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select * from public.ap_orders order by created_at desc limit 2000)x),
    'order_events',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select * from public.ap_order_events order by created_at desc limit 10000)x),
    'communications',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select * from public.ap_communications order by created_at desc limit 5000)x),
    'acceptance_tests',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select * from public.ap_acceptance_tests order by code)x),
    'generated_at',now()
  );
end $$;

create or replace function public.ap_admin_create_request(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.ap_requests%rowtype; d date; phone text; plate text; yr int;
begin
  perform public.ap_require_staff();
  if length(trim(coalesce(p->>'customer_name',''))) < 2 then raise exception 'Falta nombre'; end if;
  if length(trim(coalesce(p->>'vehicle_brand',''))) < 2 or length(trim(coalesce(p->>'vehicle_model',''))) < 1 then raise exception 'Completa marca y modelo'; end if;
  yr:=nullif(p->>'vehicle_year','')::int;
  if yr is null or yr not between 1950 and 2100 then raise exception 'Año inválido'; end if;
  if length(trim(coalesce(p->>'service',''))) < 2 or length(trim(coalesce(p->>'description',''))) < 5 then raise exception 'Completa servicio y descripción'; end if;
  if nullif(p->>'preferred_date','') is not null then d:=(p->>'preferred_date')::date; end if;
  if d is null and nullif(p->>'preferred_time','') is null then raise exception 'Indica fecha u horario'; end if;
  phone:=regexp_replace(coalesce(p->>'customer_phone',''),'[^0-9]','','g');
  if phone<>'' and phone !~ '^[0-9]{10}$' then raise exception 'El teléfono debe tener 10 dígitos'; end if;
  plate:=upper(regexp_replace(trim(coalesce(p->>'plate','')),'\s','','g'));
  if plate<>'' and length(plate) not between 4 and 12 then raise exception 'Placas inválidas'; end if;
  insert into public.ap_requests(customer_name,vehicle_brand,vehicle_model,vehicle_year,service,preferred_date,preferred_time,description,source,customer_phone,plate,is_demo)
  values(trim(p->>'customer_name'),trim(p->>'vehicle_brand'),trim(p->>'vehicle_model'),yr,trim(p->>'service'),d,
    nullif(trim(coalesce(p->>'preferred_time','')),''),trim(p->>'description'),case when coalesce((p->>'is_demo')::boolean,false) then 'demo_seed' else 'manual' end,
    nullif(phone,''),nullif(plate,''),coalesce((p->>'is_demo')::boolean,false)) returning * into r;
  insert into public.ap_request_events(request_id,actor,actor_user_id,action,new_status,details)
    values(r.id,coalesce(nullif(p->>'actor',''),'Operador'),auth.uid(),'Solicitud manual registrada','recibida',case when r.is_demo then 'DEMO' else 'Desde WhatsApp' end);
  return jsonb_build_object('id',r.id,'folio',r.folio);
end $$;

create or replace function public.ap_admin_update_request(p_id uuid,p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.ap_requests%rowtype; old_status text; phone text; plate text; next_status text; next_date date;
begin
  perform public.ap_require_staff();
  if length(trim(coalesce(p->>'actor','')))<2 or length(trim(coalesce(p->>'reason','')))<2 then raise exception 'Indica responsable y motivo'; end if;
  select * into r from public.ap_requests where id=p_id for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  old_status:=r.appointment_status; next_status:=coalesce(nullif(p->>'appointment_status',''),old_status);
  if next_status not in ('recibida','confirmada','reprogramada','cancelada') then raise exception 'Estado de cita inválido'; end if;
  if old_status='cancelada' and next_status<>'cancelada' then raise exception 'No se puede reactivar una cita cancelada'; end if;
  if p ? 'is_demo' and (p->>'is_demo')::boolean is distinct from r.is_demo and exists(select 1 from public.ap_orders where request_id=p_id) then raise exception 'No cambies la clasificación DEMO de una solicitud con orden: consulta a soporte'; end if;
  next_date:=case when p ? 'preferred_date' then nullif(p->>'preferred_date','')::date else r.preferred_date end;
  if next_status='confirmada' and next_date is null then raise exception 'Indica la fecha de cita'; end if;
  if next_date is not null and extract(dow from next_date)=0 then raise exception 'El taller permanece cerrado el domingo'; end if;
  if next_status='reprogramada' and (not (p ? 'preferred_date') or next_date is null) then raise exception 'Indica una fecha nueva'; end if;
  phone:=case when p ? 'customer_phone' then regexp_replace(coalesce(p->>'customer_phone',''),'[^0-9]','','g') else coalesce(r.customer_phone,'') end;
  if phone<>'' and phone !~ '^[0-9]{10}$' then raise exception 'Teléfono inválido: usa 10 dígitos'; end if;
  plate:=case when p ? 'plate' then upper(regexp_replace(coalesce(p->>'plate',''),'\s','','g')) else coalesce(r.plate,'') end;
  if plate<>'' and char_length(plate) not between 4 and 12 then raise exception 'Placas inválidas'; end if;
  update public.ap_requests set appointment_status=next_status,preferred_date=next_date,
    preferred_time=case when p ? 'preferred_time' then nullif(p->>'preferred_time','') else preferred_time end,
    customer_phone=nullif(phone,''),plate=nullif(plate,''),
    clarification_minutes=case when p ? 'clarification_minutes' then nullif(p->>'clarification_minutes','')::numeric else clarification_minutes end,
    attention_minutes=case when p ? 'attention_minutes' then nullif(p->>'attention_minutes','')::numeric else attention_minutes end,
    is_pilot=case when p ? 'is_pilot' then (p->>'is_pilot')::boolean else is_pilot end,
    is_demo=case when p ? 'is_demo' then (p->>'is_demo')::boolean else is_demo end,
    updated_at=now()
  where id=p_id returning * into r;
  insert into public.ap_request_events(request_id,actor,actor_user_id,action,old_status,new_status,details)
    values(p_id,p->>'actor',auth.uid(),'Cita y registro actualizados',old_status,r.appointment_status,p->>'reason');
  return jsonb_build_object('id',r.id,'folio',r.folio,'status',r.appointment_status);
end $$;

create or replace function public.ap_admin_create_order(p_request_id uuid,p_actor text,p_notes text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.ap_requests%rowtype; c public.ap_clients%rowtype; v public.ap_vehicles%rowtype; o public.ap_orders%rowtype;
begin
  perform public.ap_require_staff();
  if char_length(trim(coalesce(p_actor,'')))<2 then raise exception 'Falta responsable'; end if;
  select * into r from public.ap_requests where id=p_request_id for update;
  if not found then raise exception 'Solicitud inexistente'; end if;
  if r.appointment_status<>'confirmada' then raise exception 'Primero confirma la cita'; end if;
  if r.customer_phone is null or r.plate is null then raise exception 'Registra teléfono del remitente y placas antes de crear orden'; end if;
  if exists(select 1 from public.ap_orders where request_id=p_request_id) then raise exception 'La solicitud ya tiene una orden'; end if;
  insert into public.ap_clients(name,phone,is_demo) values(r.customer_name,r.customer_phone,r.is_demo)
    on conflict(phone) do update set name=excluded.name,updated_at=now()
      where public.ap_clients.is_demo=excluded.is_demo returning * into c;
  if c.id is null then raise exception 'Teléfono asociado a registros de otra clasificación (DEMO/real)'; end if;
  select * into v from public.ap_vehicles where plate=r.plate for update;
  if found and (v.client_id<>c.id or v.is_demo<>r.is_demo) then raise exception 'Placas vinculadas a otra persona o a registros de otra clasificación (DEMO/real)'; end if;
  if v.id is null then
    insert into public.ap_vehicles(client_id,plate,brand,model,year,is_demo)
      values(c.id,r.plate,r.vehicle_brand,r.vehicle_model,r.vehicle_year,r.is_demo) returning * into v;
  end if;
  insert into public.ap_orders(request_id,client_id,vehicle_id,responsible,service,notes,is_demo)
    values(r.id,c.id,v.id,trim(p_actor),r.service,coalesce(p_notes,''),r.is_demo) returning * into o;
  insert into public.ap_order_events(order_id,actor,actor_user_id,action,new_status,details)
    values(o.id,trim(p_actor),auth.uid(),'Orden creada','Vehículo recibido',coalesce(p_notes,''));
  return jsonb_build_object('id',o.id,'folio',o.folio);
end $$;

create or replace function public.ap_admin_update_order(p_id uuid,p jsonb,p_actor text,p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.ap_orders%rowtype; target public.ap_orders%rowtype; s text; allowed text[];
begin
  perform public.ap_require_staff();
  if char_length(trim(coalesce(p_actor,'')))<2 or char_length(trim(coalesce(p_reason,'')))<2 then raise exception 'Indica responsable y motivo'; end if;
  select * into o from public.ap_orders where id=p_id for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  if o.status in ('Entregada','Cancelada') then raise exception 'No se puede modificar una orden finalizada'; end if;
  target:=o;
  if p ? 'status' then target.status:=p->>'status'; end if;
  if p ? 'received_at' then target.received_at:=nullif(p->>'received_at','')::date; end if;
  if p ? 'diagnosis' then target.diagnosis:=coalesce(p->>'diagnosis',''); end if;
  if p ? 'diagnostic_evidence' then target.diagnostic_evidence:=left(coalesce(p->>'diagnostic_evidence',''),2000); end if;
  if p ? 'proposed_work' then target.proposed_work:=coalesce(p->>'proposed_work',''); end if;
  if p ? 'estimated_cost' then target.estimated_cost:=nullif(p->>'estimated_cost','')::numeric; end if;
  if p ? 'estimated_hours' then target.estimated_hours:=nullif(p->>'estimated_hours','')::numeric; end if;
  if p ? 'authorization_scope' then target.authorization_scope:=left(coalesce(p->>'authorization_scope',''),3000); end if;
  if p ? 'authorization_state' then target.authorization_state:=p->>'authorization_state'; end if;
  if p ? 'authorization_date' then target.authorization_date:=nullif(p->>'authorization_date','')::date; end if;
  if p ? 'authorization_medium' then target.authorization_medium:=coalesce(p->>'authorization_medium',''); end if;
  if p ? 'authorization_by' then target.authorization_by:=coalesce(p->>'authorization_by',''); end if;
  if p ? 'authorization_notes' then target.authorization_notes:=coalesce(p->>'authorization_notes',''); end if;
  if p ? 'delivery_date' then target.delivery_date:=nullif(p->>'delivery_date','')::date; end if;
  if p ? 'work_done' then target.work_done:=coalesce(p->>'work_done',''); end if;
  if p ? 'final_cost' then target.final_cost:=nullif(p->>'final_cost','')::numeric; end if;
  if p ? 'closing_notes' then target.closing_notes:=coalesce(p->>'closing_notes',''); end if;
  if p ? 'notes' then target.notes:=coalesce(p->>'notes',''); end if;
  if target.status<>o.status then
    allowed:=case o.status
      when 'Vehículo recibido' then array['En diagnóstico','Cancelada']
      when 'En diagnóstico' then array['Pendiente de autorización','Cancelada']
      when 'Pendiente de autorización' then array['Autorizada','Cancelada']
      when 'Autorizada' then array['En reparación','Cancelada']
      when 'En reparación' then array['Lista para entrega','Cancelada']
      when 'Lista para entrega' then array['Entregada']
      else array[]::text[] end;
    if not(target.status=any(allowed)) then raise exception 'Transición no permitida: % → %',o.status,target.status; end if;
  end if;
  if target.estimated_cost < 0 or target.final_cost < 0 then raise exception 'El costo no puede ser negativo'; end if;
  if target.estimated_hours is not null and target.estimated_hours <= 0 then raise exception 'El tiempo estimado debe ser mayor que cero'; end if;
  if target.authorization_state not in ('pendiente','autorizada','parcial','rechazada','cambios solicitados') then raise exception 'Decisión de cliente no válida'; end if;
  if target.authorization_state<>'pendiente' and (target.authorization_date is null or target.authorization_medium='' or target.authorization_by='') then
    raise exception 'Registra fecha, medio y responsable de la decisión'; end if;
  if target.authorization_state='parcial' and char_length(trim(target.authorization_scope)) < 5 then raise exception 'Describe el alcance de la autorización parcial'; end if;
  if target.status in ('En diagnóstico','Pendiente de autorización','Autorizada','En reparación','Lista para entrega','Entregada') and target.received_at is null then raise exception 'Registra fecha de recepción'; end if;
  if target.status in ('Pendiente de autorización','Autorizada','En reparación','Lista para entrega','Entregada') and
    (trim(target.diagnosis)='' or trim(target.proposed_work)='' or target.estimated_cost is null) then
    raise exception 'Falta diagnóstico, trabajo propuesto o costo estimado'; end if;
  if target.status in ('Autorizada','En reparación','Lista para entrega','Entregada') and target.authorization_state not in ('autorizada','parcial') then
    raise exception 'No se puede avanzar sin autorización documentada'; end if;
  if target.status='Entregada' and (target.delivery_date is null or trim(target.work_done)='' or target.final_cost is null) then
    raise exception 'Para cerrar faltan fecha, trabajo realizado o costo final'; end if;
  update public.ap_orders set status=target.status,received_at=target.received_at,diagnosis=target.diagnosis,diagnostic_evidence=target.diagnostic_evidence,
    proposed_work=target.proposed_work,
    estimated_cost=target.estimated_cost,estimated_hours=target.estimated_hours,authorization_scope=target.authorization_scope,authorization_state=target.authorization_state,
    authorization_date=target.authorization_date,authorization_medium=target.authorization_medium,
    authorization_by=target.authorization_by,authorization_notes=target.authorization_notes,
    delivery_date=target.delivery_date,work_done=target.work_done,final_cost=target.final_cost,
    closing_notes=target.closing_notes,notes=target.notes,updated_at=now()
  where id=p_id returning * into target;
  insert into public.ap_order_events(order_id,actor,actor_user_id,action,old_status,new_status,details)
    values(p_id,trim(p_actor),auth.uid(),
      case when target.status<>o.status then 'Estado: '||target.status else 'Orden actualizada' end,
      o.status,target.status,trim(p_reason)||' · Decisión: '||o.authorization_state||' → '||target.authorization_state||
        ' · Medio: '||target.authorization_medium||' · Fecha: '||coalesce(target.authorization_date::text,'sin fecha')||
        ' · Registró decisión: '||target.authorization_by||' · Alcance parcial: '||target.authorization_scope);
  return jsonb_build_object('id',target.id,'folio',target.folio,'status',target.status);
end $$;

create or replace function public.ap_admin_prepare_message(p_order_id uuid,p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.ap_orders%rowtype; m public.ap_communications%rowtype; phone text;
begin
  perform public.ap_require_staff();
  select * into o from public.ap_orders where id=p_order_id;
  if not found then raise exception 'Orden no encontrada'; end if;
  select c.phone into phone from public.ap_clients c where c.id=o.client_id;
  if phone is null then raise exception 'No hay teléfono registrado para WhatsApp'; end if;
  if length(trim(coalesce(p->>'actor','')))<2 or length(trim(coalesce(p->>'message','')))<5 or
     length(trim(coalesce(p->>'next_step','')))<2 then raise exception 'Completa responsable, mensaje y siguiente paso'; end if;
  if coalesce(p->>'type','') not in ('Confirmación de cita','Recepción','Diagnóstico disponible','Solicitud de autorización',
    'Inicio de reparación','Avance del servicio','Vehículo listo','Entrega y cierre') then raise exception 'Tipo de mensaje inválido'; end if;
  insert into public.ap_communications(order_id,type,message,next_step,actor,actor_user_id)
    values(o.id,p->>'type',p->>'message',p->>'next_step',p->>'actor',auth.uid()) returning * into m;
  insert into public.ap_order_events(order_id,actor,actor_user_id,action,old_status,new_status,details)
    values(o.id,p->>'actor',auth.uid(),'Mensaje WhatsApp preparado',o.status,o.status,p->>'type');
  return jsonb_build_object('id',m.id,'phone',phone,'status',m.send_status);
end $$;

create or replace function public.ap_admin_confirm_message(p_id uuid,p_actor text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.ap_communications%rowtype; o public.ap_orders%rowtype;
begin
  perform public.ap_require_staff();
  if length(trim(coalesce(p_actor,'')))<2 then raise exception 'Indica responsable'; end if;
  select * into m from public.ap_communications where id=p_id for update;
  if not found then raise exception 'Mensaje no encontrado'; end if;
  if m.send_status='envío confirmado' then raise exception 'Ya estaba confirmado'; end if;
  update public.ap_communications set send_status='envío confirmado',confirmed_at=now(),confirmed_by=trim(p_actor) where id=p_id returning * into m;
  select * into o from public.ap_orders where id=m.order_id;
  insert into public.ap_order_events(order_id,actor,actor_user_id,action,old_status,new_status,details)
    values(o.id,p_actor,auth.uid(),'WhatsApp marcado como enviado',o.status,o.status,'Confirmación manual: '||m.type);
  return jsonb_build_object('id',m.id,'status',m.send_status);
end $$;

create or replace function public.ap_admin_set_acceptance(p_code text,p_status text,p_notes text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.ap_acceptance_tests%rowtype;
begin
  perform public.ap_require_staff();
  if p_status not in ('pendiente','aprobada','fallida') then raise exception 'Resultado inválido'; end if;
  if p_status='aprobada' and length(trim(coalesce(p_notes,'')))<10 then raise exception 'Para aprobar, documenta la evidencia verificable'; end if;
  update public.ap_acceptance_tests set status=p_status,notes=left(coalesce(p_notes,''),1000),updated_at=now(),actor_user_id=auth.uid() where code=p_code returning * into t;
  if not found then raise exception 'Criterio inexistente'; end if;
  return to_jsonb(t);
end $$;

-- Solo para demostración: datos claramente marcados. No aportan evidencia real al piloto.
create or replace function public.ap_admin_seed_demo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb; o jsonb; idreq uuid; idord uuid; suffix text;
begin
  perform public.ap_require_staff();
  if exists(select 1 from public.ap_requests where source='demo_seed') then raise exception 'Ya hay datos DEMO. Elimínalos antes de repetir'; end if;
  suffix:=substr(replace(gen_random_uuid()::text,'-',''),1,6);
  r:=public.ap_admin_create_request(jsonb_build_object('customer_name','Cliente DEMO 01','vehicle_brand','Nissan DEMO',
    'vehicle_model','Versa prueba','vehicle_year',2018,'service','Frenos','preferred_date','2026-11-10',
    'preferred_time','11:00 – 13:00','description','Ruido sintético al frenar (DEMO)',
    'customer_phone','999'||lpad((floor(random()*10000000))::int::text,7,'0'),'plate','D'||upper(suffix),'is_demo',true,'actor','Operador DEMO'));
  idreq:=(r->>'id')::uuid;
  perform public.ap_admin_update_request(idreq,jsonb_build_object('appointment_status','confirmada','actor','Operador DEMO','reason','Cita de prueba'));
  o:=public.ap_admin_create_order(idreq,'Operador DEMO','Orden sintética para evidencias');
  idord:=(o->>'id')::uuid;
  perform public.ap_admin_update_order(idord,jsonb_build_object('status','En diagnóstico','diagnosis','Desgaste simulado (DEMO)',
    'proposed_work','Inspección y cambio de balatas (DEMO)','estimated_cost',1200), 'Operador DEMO','Diagnóstico de prueba');
  return jsonb_build_object('folio',o->>'folio','request_folio',r->>'folio');
end $$;

create or replace function public.ap_admin_remove_demo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  perform public.ap_require_staff();
  delete from public.ap_orders where is_demo=true;
  delete from public.ap_requests where is_demo=true;
  delete from public.ap_vehicles where is_demo=true and not exists(select 1 from public.ap_orders o where o.vehicle_id=ap_vehicles.id);
  delete from public.ap_clients where is_demo=true and not exists(select 1 from public.ap_vehicles v where v.client_id=ap_clients.id);
  get diagnostics removed=row_count;
  return jsonb_build_object('completed',true,'last_deleted_clients',removed);
end $$;

-- Evitar exposición accidental por permisos EXECUTE implícitos.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname like 'ap_%'
  loop execute format('revoke execute on function %s from public, anon, authenticated',f.signature); end loop;
end $$;
grant execute on function public.ap_submit_request(jsonb) to anon,authenticated;
grant execute on function public.ap_admin_snapshot() to authenticated;
grant execute on function public.ap_admin_create_request(jsonb) to authenticated;
grant execute on function public.ap_admin_update_request(uuid,jsonb) to authenticated;
grant execute on function public.ap_admin_create_order(uuid,text,text) to authenticated;
grant execute on function public.ap_admin_update_order(uuid,jsonb,text,text) to authenticated;
grant execute on function public.ap_admin_prepare_message(uuid,jsonb) to authenticated;
grant execute on function public.ap_admin_confirm_message(uuid,text) to authenticated;
grant execute on function public.ap_admin_set_acceptance(text,text,text) to authenticated;
grant execute on function public.ap_admin_seed_demo() to authenticated;
grant execute on function public.ap_admin_remove_demo() to authenticated;

-- ÚLTIMO PASO MANUAL, después de crear un usuario en Authentication > Users:
-- insert into public.ap_staff(user_id,display_name)
-- values ('UUID-DEL-USUARIO-DE-AUTH','Responsable de AutoPits');

-- Bloquear ejecución directa de la función del disparador RLS.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
