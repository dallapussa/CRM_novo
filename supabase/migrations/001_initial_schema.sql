create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('Admin', 'Comercial', 'Técnico', 'Financeiro', 'Cliente', 'Terceiro');
exception
  when duplicate_object then null;
end;
$$;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  email text,
  telefone text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip_code text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text not null,
  role public.user_role not null default 'Cliente',
  telefone text,
  ativo boolean not null default true,
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  type text not null default 'pj' check (type in ('pf','pj')),
  razao_social text not null,
  nome_fantasia text,
  cnpj text,
  document text,
  email text,
  telefone text,
  telefone2 text,
  ie_rg text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip_code text,
  ppci_number text,
  ppci_protocol text,
  ppci_issued_at date,
  ppci_expires_at date,
  ppci_status text,
  status text not null default 'Ativo',
  observacoes text,
  owner_id uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);
create index clients_company_id_idx on public.clients(company_id);
create index clients_cnpj_idx on public.clients(cnpj);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  type text not null default 'servico' check (type in ('produto','servico')),
  nome text not null,
  descricao text,
  categoria text,
  sku text,
  unidade text not null default 'un',
  preco numeric(12,2) not null default 0 check (preco >= 0),
  custo numeric(12,2) not null default 0 check (custo >= 0),
  ativo boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  check (is_system = false or company_id is null)
);
create index catalog_items_company_id_idx on public.catalog_items(company_id);

create table public.quote_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  nome text not null,
  descricao text,
  conteudo jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  check (is_system = false or company_id is null)
);
create index quote_templates_company_id_idx on public.quote_templates(company_id);

create table public.extinguishers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  patrimonio text,
  localizacao text,
  tipo text not null,
  capacidade text not null,
  fabricante text,
  manufactured_at date,
  last_recharge_at date,
  expires_at date,
  next_inspection_at date,
  status text not null default 'Ativo',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);
create index extinguishers_client_id_idx on public.extinguishers(client_id);
create index extinguishers_expires_at_idx on public.extinguishers(expires_at);

create table public.hoses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  tipo text not null,
  comprimento numeric(8,2) not null check (comprimento > 0),
  patrimonio text,
  localizacao text,
  last_test_at date,
  next_test_at date,
  status text not null default 'Ativo',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);
create index hoses_client_id_idx on public.hoses(client_id);
create index hoses_next_test_at_idx on public.hoses(next_test_at);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  nome text not null,
  categoria text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);
create index documents_client_id_idx on public.documents(client_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  nome text not null,
  empresa text,
  document text,
  email text,
  telefone text,
  origem text,
  status text not null default 'Novo',
  observacoes text,
  owner_id uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);
create index leads_company_id_idx on public.leads(company_id);
create index leads_status_idx on public.leads(status);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  template_id uuid references public.quote_templates(id) on delete set null,
  numero bigint generated by default as identity,
  status text not null default 'Rascunho',
  issued_at date not null default current_date,
  expires_at date,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  unique (company_id, numero)
);
create index quotes_company_id_idx on public.quotes(company_id);
create index quotes_client_id_idx on public.quotes(client_id);
create index quotes_status_idx on public.quotes(status);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  descricao text not null,
  quantidade numeric(12,2) not null default 1 check (quantidade > 0),
  unidade text not null default 'un',
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);
create index quote_items_quote_id_idx on public.quote_items(quote_id);

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  quote_id uuid references public.quotes(id) on delete set null,
  assigned_to uuid references public.user_profiles(id) on delete set null,
  numero bigint generated by default as identity,
  tipo text not null,
  descricao text,
  status text not null default 'Pendente',
  priority text not null default 'Normal',
  scheduled_at timestamptz,
  scheduled_period text check (scheduled_period in ('manha','tarde','integral')),
  started_at timestamptz,
  arrival_time timestamptz,
  departure_time timestamptz,
  completed_at timestamptz,
  technical_report text,
  signature_url text,
  signature_name text,
  cancellation_reason text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  unique (company_id, numero)
);
create index service_orders_company_id_idx on public.service_orders(company_id);
create index service_orders_client_id_idx on public.service_orders(client_id);
create index service_orders_assigned_to_idx on public.service_orders(assigned_to);
create index service_orders_status_idx on public.service_orders(status);

create table public.service_order_items (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  descricao text not null,
  quantidade numeric(12,2) not null default 1,
  unidade text not null default 'un',
  item_type text not null default 'servico' check (item_type in ('produto','servico','mao_obra')),
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create table public.os_photos (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  storage_path text not null,
  url text,
  caption text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  quote_id uuid references public.quotes(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  numero bigint generated by default as identity,
  status text not null default 'Aberto',
  total numeric(12,2) not null default 0 check (total >= 0),
  ordered_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  unique (company_id, numero)
);
create index orders_company_id_idx on public.orders(company_id);
create index orders_client_id_idx on public.orders(client_id);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  invoice_type text not null default 'receber' check (invoice_type in ('receber','pagar')),
  numero bigint generated by default as identity,
  status text not null default 'Pendente',
  amount numeric(12,2) not null check (amount >= 0),
  amount_paid numeric(12,2) not null default 0,
  due_at date,
  issued_at date,
  received_at timestamptz,
  payment_method text,
  description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  unique (company_id, numero)
);
create index receipts_company_id_idx on public.receipts(company_id);
create index receipts_client_id_idx on public.receipts(client_id);
create index receipts_status_idx on public.receipts(status);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  assigned_to uuid references public.user_profiles(id) on delete set null,
  titulo text not null,
  descricao text,
  status text not null default 'Pendente',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);
create index tasks_company_id_idx on public.tasks(company_id);
create index tasks_assigned_to_idx on public.tasks(assigned_to);

create table public.agenda_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  assigned_to uuid references public.user_profiles(id) on delete set null,
  titulo text not null,
  descricao text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  check (ends_at is null or ends_at >= starts_at)
);
create index agenda_events_company_id_idx on public.agenda_events(company_id);
create index agenda_events_assigned_to_idx on public.agenda_events(assigned_to);
create index agenda_events_starts_at_idx on public.agenda_events(starts_at);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.soft_delete_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format('update %I.%I set deleted_at = now() where id = $1', tg_table_schema, tg_table_name)
    using old.id;
  return null;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'companies', 'user_profiles', 'clients', 'extinguishers', 'hoses', 'documents',
    'leads', 'quotes', 'quote_items', 'service_orders', 'service_order_items', 'os_photos', 'orders', 'receipts',
    'tasks', 'agenda_events', 'catalog_items', 'quote_templates'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.handle_updated_at()', table_name || '_updated_at', table_name);
    execute format('create trigger %I before delete on public.%I for each row execute function public.soft_delete_row()', table_name || '_soft_delete', table_name);
  end loop;
end;
$$;

create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, auth
as $$
  select role from public.user_profiles where id = auth.uid() limit 1;
$$;

create or replace function public.convert_lead_to_client(lead_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  lead_row public.leads%rowtype;
  new_client_id uuid;
  client_type text;
begin
  select * into lead_row from public.leads
  where id = lead_id and deleted_at is null for update;
  if not found then raise exception 'Lead not found'; end if;
  if public.get_my_role() not in ('Admin', 'Comercial') then raise exception 'Insufficient permissions'; end if;
  if lead_row.client_id is not null then return lead_row.client_id; end if;
  if coalesce(lead_row.document, '') = '' or coalesce(lead_row.telefone, '') = '' then
    raise exception 'Lead needs document and phone before conversion';
  end if;

  client_type := case when lead_row.empresa is null then 'pf' else 'pj' end;
  insert into public.clients (company_id, type, razao_social, nome_fantasia, cnpj, document, email, telefone, status, observacoes, owner_id, created_by)
  values (
    lead_row.company_id, client_type, coalesce(lead_row.empresa, lead_row.nome),
    case when lead_row.empresa is null then null else lead_row.empresa end,
    case when client_type = 'pj' then regexp_replace(lead_row.document, '[^0-9]', '', 'g') else null end,
    regexp_replace(lead_row.document, '[^0-9]', '', 'g'), lead_row.email,
    regexp_replace(lead_row.telefone, '[^0-9]', '', 'g'), 'Ativo', lead_row.observacoes,
    lead_row.owner_id, auth.uid()
  ) returning id into new_client_id;

  update public.leads set client_id = new_client_id, status = 'Convertido' where id = lead_id;
  return new_client_id;
end;
$$;
grant execute on function public.convert_lead_to_client(uuid) to authenticated;

-- Create the first account in Supabase Dashboard, then promote it manually:
-- 1. Insert one row into public.companies and copy its UUID.
-- 2. Associate and promote the first auth user:
-- update public.user_profiles set role = 'Admin', company_id = '<COMPANY_UUID>' where email = 'admin@example.com';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.user_profiles (id, nome, email, role, ativo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    lower(new.email),
    'Cliente',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'companies', 'user_profiles', 'clients', 'extinguishers', 'hoses', 'documents',
    'leads', 'quotes', 'quote_items', 'service_orders', 'service_order_items', 'os_photos', 'orders', 'receipts',
    'tasks', 'agenda_events', 'catalog_items', 'quote_templates'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    if table_name = 'user_profiles' then
      execute 'create policy user_profiles_authenticated_select on public.user_profiles for select to authenticated using (auth.uid() is not null)';
      execute 'create policy user_profiles_authenticated_insert on public.user_profiles for insert to authenticated with check (public.get_my_role() = ''Admin'' or (id = auth.uid() and role = ''Cliente''))';
      execute 'create policy user_profiles_authenticated_update on public.user_profiles for update to authenticated using (public.get_my_role() = ''Admin'' or id = auth.uid()) with check (public.get_my_role() = ''Admin'' or (id = auth.uid() and role = public.get_my_role()))';
      execute 'create policy user_profiles_authenticated_delete on public.user_profiles for delete to authenticated using (public.get_my_role() = ''Admin'')';
    else
      execute format('create policy %I on public.%I for select to authenticated using (auth.uid() is not null)', table_name || '_authenticated_select', table_name);
      execute format('create policy %I on public.%I for insert to authenticated with check (auth.uid() is not null)', table_name || '_authenticated_insert', table_name);
      execute format('create policy %I on public.%I for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)', table_name || '_authenticated_update', table_name);
      execute format('create policy %I on public.%I for delete to authenticated using (auth.uid() is not null)', table_name || '_authenticated_delete', table_name);
    end if;
  end loop;
end;
$$;

revoke all on all sequences in schema public from anon;
grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do update set public = false;
insert into storage.buckets (id, name, public)
values ('os-photos', 'os-photos', false)
on conflict (id) do update set public = false;

drop policy if exists documentos_authenticated_select on storage.objects;
drop policy if exists documentos_authenticated_insert on storage.objects;
drop policy if exists documentos_authenticated_update on storage.objects;
drop policy if exists documentos_authenticated_delete on storage.objects;

create policy documentos_authenticated_select on storage.objects
  for select to authenticated using (bucket_id = 'documentos' and auth.uid() is not null);
create policy documentos_authenticated_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'documentos' and auth.uid() is not null);
create policy documentos_authenticated_update on storage.objects
  for update to authenticated using (bucket_id = 'documentos' and auth.uid() is not null)
  with check (bucket_id = 'documentos' and auth.uid() is not null);
create policy documentos_authenticated_delete on storage.objects
  for delete to authenticated using (bucket_id = 'documentos' and auth.uid() is not null);

drop policy if exists os_photos_authenticated_select on storage.objects;
drop policy if exists os_photos_authenticated_insert on storage.objects;
drop policy if exists os_photos_authenticated_update on storage.objects;
drop policy if exists os_photos_authenticated_delete on storage.objects;
create policy os_photos_authenticated_select on storage.objects for select to authenticated using (bucket_id = 'os-photos' and auth.uid() is not null);
create policy os_photos_authenticated_insert on storage.objects for insert to authenticated with check (bucket_id = 'os-photos' and auth.uid() is not null);
create policy os_photos_authenticated_update on storage.objects for update to authenticated using (bucket_id = 'os-photos' and auth.uid() is not null) with check (bucket_id = 'os-photos' and auth.uid() is not null);
create policy os_photos_authenticated_delete on storage.objects for delete to authenticated using (bucket_id = 'os-photos' and auth.uid() is not null);

grant usage on schema public to authenticated;

-- =============================================================================
-- 👤 PASSO-A-PASSO VISUAL: CRIAR O PRIMEIRO ADMINISTRADOR DO SISTEMA
-- =============================================================================
--  (SÓ É PRECISO FAZER ISSO UMA VEZ, logo após criar o projeto Supabase!)
--
-- ▶️ PASSO 1 — Criar o usuário no painel do Supabase:
--    1. Abra: https://app.supabase.com  →  entre no seu projeto
--    2. Menu ESQUERDO: clique no ícone 🔐 (Authentication)
--    3. Sub-menu: clique em "Users"
--    4. Botão VERDE no topo direito: "Add user"
--    5. Preencha:
--       • Email do admin:  admin@suaempresa.com.br   (troque pelo seu)
--       • Senha:           Crie uma SENHA FORTE e anote num lugar seguro!
--       • Auto Confirm User?:  ✅ MARQUE ESTA OPÇÃO (muito importante!)
--    6. Clique no botão: "Create user"
--
-- ▶️ PASSO 2 — Criar a PRIMEIRA EMPRESA e copiar 2 UUIDs:
--    1. Menu ESQUERDO: clique no ícone 📝 (SQL Editor)
--    2. Clique no botão azul: "New query"
--    3. Cole o SQL abaixo (edite os campos da empresa com seus dados):
--       ---------------------------------------------------------------
--         INSERT INTO public.companies (nome, cnpj, email, telefone, ativo)
--         VALUES (
--           'Nome da Sua Empresa LTDA',  -- ← TROQUE PELO NOME REAL
--           '00000000000100',             -- ← CNPJ SÓ NÚMEROS
--           'contato@suaempresa.com.br', -- ← EMAIL REAL
--           '1130001234',                 -- ← TELEFONE SÓ NÚMEROS (com DDD)
--           true
--         );
--       ---------------------------------------------------------------
--    4. Clique em "Run" (botão ► verde)
--    5. Agora, para VER o UUID da empresa, rode esta consulta:
--       SELECT id FROM public.companies LIMIT 1;
--    6. Copie o UUID que aparece (ex: fbb66b5c-880a-42b0-bcfd-45301d939309)
--       e guarde.
--    7. Agora veja o UUID do USUÁRIO ADMIN que você criou no Passo 1:
--       • Volte em 🔐 Authentication → Users
--       • Clique no email do admin para expandir
--       • Copie o campo UID (ex: 4fec4a85-d041-45cf-97da-4960fae142c4)
--         e guarde.
--
-- ▶️ PASSO 3 — Promover o usuário a ADMINISTRADOR:
--    1. Volte no SQL Editor → New query
--    2. Cole o SQL ABAIXO, TROCANDO os 2 UUIDs pelos que você copiou:
--       ---------------------------------------------------------------
--         UPDATE public.user_profiles
--         SET
--           role       = 'Admin',
--           company_id = 'COLE-AQUI-UUID-DA-EMPRESA',
--           ativo      = true
--         WHERE id = 'COLE-AQUI-UUID-DO-USUARIO-ADMIN';
--       ---------------------------------------------------------------
--    3. Clique em "Run" (► verde)
--    4. ✅ PRONTO! Agora você já pode logar no CRM com email+sua senha.
--
-- ▶️ PASSO 4 — Verificação opcional (confirmar que deu certo):
--    No SQL Editor, rode:
--       SELECT email, role, ativo, company_id FROM public.user_profiles;
--    Deve aparecer o seu email com role = 'Admin'.
-- =============================================================================
