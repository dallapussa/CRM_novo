-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║  ⚠️  ARQUIVO LEGACY — SÓ USAR SE VOCÊ TIVER DADOS VINDOS DE VERSÃO    ║
-- ║     ANTIGA DO CRM (antes de 01/10/2026).                              ║
-- ║  🟢 INSTALAÇÕES NOVAS (banco vazio): USE APENAS 001_initial_schema.sql  ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- Incremental upgrade for projects initialized with the previous CRM schema.
-- Apply manually in Supabase SQL Editor when the old migration was run there.
-- Existing tables are retained; incompatible tables are renamed with legacy_ prefix.

create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('Admin', 'Comercial', 'Técnico', 'Financeiro', 'Cliente', 'Terceiro');
exception when duplicate_object then null;
end;
$$;

create table if not exists public.companies (
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

-- Legacy installations were single-company; existing entities are assigned to this company.
do $$
begin
  if not exists (select 1 from public.companies where deleted_at is null) then
    insert into public.companies (nome) values ('Empresa principal');
  end if;
end;
$$;

create table if not exists public.user_profiles (
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

create table if not exists public.clients (
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
create index if not exists clients_company_id_idx on public.clients(company_id);

create table if not exists public.catalog_items (
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
create index if not exists catalog_items_company_id_idx on public.catalog_items(company_id);

create table if not exists public.quote_templates (
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

-- Preserve old extintores and OS under legacy_ names so their required old columns do not block new writes.
do $$
begin
  if to_regclass('public.extinguishers') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='extinguishers' and column_name='customer_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='extinguishers' and column_name='client_id')
     and to_regclass('public.legacy_extinguishers') is null then
    alter table public.extinguishers rename to legacy_extinguishers;
  end if;
  if to_regclass('public.service_orders') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='service_orders' and column_name='customer_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='service_orders' and column_name='client_id')
     and to_regclass('public.legacy_service_orders') is null then
    alter table public.service_orders rename to legacy_service_orders;
  end if;
  if to_regclass('public.extinguishers') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='extinguishers' and column_name='customer_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='extinguishers' and column_name='client_id')
     and to_regclass('public.legacy_extinguishers') is null then
    alter table public.extinguishers rename to legacy_extinguishers;
  end if;
  if to_regclass('public.service_order_items') is not null
      and to_regclass('public.legacy_service_orders') is not null
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='service_order_items' and column_name='product_id')
     and to_regclass('public.legacy_service_order_items') is null then
    alter table public.service_order_items rename to legacy_service_order_items;
  end if;
  if to_regclass('public.os_photos') is not null
      and to_regclass('public.legacy_service_orders') is not null
     and to_regclass('public.legacy_os_photos') is null then
    alter table public.os_photos rename to legacy_os_photos;
  end if;
end;
$$;

create table if not exists public.extinguishers (
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

create table if not exists public.hoses (
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

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  nome text not null,
  categoria text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.leads (
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

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  template_id uuid references public.quote_templates(id) on delete set null,
  numero bigint generated by default as identity,
  status text not null default 'Rascunho',
  issued_at date not null default current_date,
  expires_at date,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  unique (company_id, numero)
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  descricao text not null,
  quantidade numeric(12,2) not null default 1,
  unidade text not null default 'un',
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create sequence if not exists public.service_order_number_seq;
create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  quote_id uuid references public.quotes(id) on delete set null,
  assigned_to uuid references public.user_profiles(id) on delete set null,
  numero bigint not null default nextval('public.service_order_number_seq'),
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
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  unique (company_id, numero)
);

create table if not exists public.service_order_items (
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

create table if not exists public.os_photos (
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

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  quote_id uuid references public.quotes(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  numero bigint generated by default as identity,
  status text not null default 'Aberto',
  total numeric(12,2) not null default 0,
  ordered_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  unique (company_id, numero)
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  invoice_type text not null default 'receber' check (invoice_type in ('receber','pagar')),
  numero bigint generated by default as identity,
  status text not null default 'Pendente',
  amount numeric(12,2) not null default 0,
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

create table if not exists public.tasks (
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

create table if not exists public.agenda_events (
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
  created_by uuid references auth.users(id) on delete set null
);

-- Backfill into the single-company model while preserving the source rows and IDs.
do $$
declare
  company_uuid uuid;
begin
  select id into company_uuid from public.companies where deleted_at is null order by created_at limit 1;
  if company_uuid is null then
    insert into public.companies (nome) values ('Empresa principal') returning id into company_uuid;
  end if;

  if to_regclass('public.profiles') is not null then
    insert into public.user_profiles (id, email, nome, role, telefone, ativo, company_id, created_at, updated_at, created_by)
    select p.id, lower(u.email), coalesce(nullif(p.full_name, ''), split_part(u.email, '@', 1)),
      case lower(p.role)
        when 'admin' then 'Admin'::public.user_role
        when 'comercial' then 'Comercial'::public.user_role
        when 'tecnico' then 'Técnico'::public.user_role
        when 'financeiro' then 'Financeiro'::public.user_role
        when 'terceiro' then 'Terceiro'::public.user_role
        else 'Cliente'::public.user_role
      end,
      p.phone, coalesce(p.is_active, true), company_uuid, coalesce(p.created_at, now()), coalesce(p.updated_at, now()), p.id

      do $$
      declare
        sequence_name text;
        maximum_number bigint;
        table_name text;
    from public.profiles p
        foreach table_name in array array['service_orders', 'receipts'] loop
          sequence_name := pg_get_serial_sequence(format('public.%I', table_name), 'numero');
          if sequence_name is not null then
            execute format('select coalesce(max(numero), 0) from public.%I', table_name) into maximum_number;
            perform setval(sequence_name::regclass, greatest(maximum_number, 1), maximum_number > 0);
          end if;
        end loop;
      end;
      $$;
    join auth.users u on u.id = p.id
    where u.email is not null
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.customers') is not null then
    insert into public.clients (
      id, company_id, type, razao_social, nome_fantasia, cnpj, document, email, telefone, telefone2,
      ie_rg, address_street, address_number, address_complement, address_neighborhood,
      address_city, address_state, address_zip_code, status, observacoes, owner_id,
      created_at, updated_at, created_by
    )
    select c.id, company_uuid, coalesce(c.type, 'pj'), c.name, null, case when c.type = 'pj' then c.document end,
      c.document, c.email, c.phone1, c.phone2, c.ie_rg,
      c.address->>'street', c.address->>'number', c.address->>'complement', c.address->>'neighborhood',
      c.address->>'city', c.address->>'state', c.address->>'cep',
      case when c.is_active then 'Ativo' else 'Inativo' end, c.notes, c.owner_id,
      coalesce(c.created_at, now()), coalesce(c.updated_at, now()), c.created_by
    from public.customers c
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.products') is not null then
    insert into public.catalog_items (id, company_id, type, nome, descricao, categoria, sku, unidade, preco, custo, ativo, created_at, updated_at)
    select p.id, company_uuid, p.type, p.name, p.description, p.category, p.sku, p.unit, p.sale_price, coalesce(p.cost_price, 0), p.is_active,
      coalesce(p.created_at, now()), coalesce(p.updated_at, now())
    from public.products p
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.legacy_extinguishers') is not null then
    insert into public.extinguishers (id, client_id, patrimonio, localizacao, tipo, capacidade, fabricante, manufactured_at, last_recharge_at, expires_at, next_inspection_at, status, observacoes, created_at, updated_at, created_by)
    select e.id, e.customer_id, e.serial_number, e.location, e.type, e.capacity, e.manufacturer, e.manufacturing_date, e.last_recharge_date,
      e.expiration_date, e.next_inspection_date, case when e.expiration_date < current_date then 'Vencido' else 'Ativo' end,
      e.notes, coalesce(e.created_at, now()), coalesce(e.updated_at, now()), null
    from public.legacy_extinguishers e
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.legacy_service_orders') is not null then
    insert into public.service_orders (id, company_id, client_id, assigned_to, numero, tipo, descricao, status, priority, scheduled_at, scheduled_period, started_at, arrival_time, departure_time, completed_at, technical_report, signature_url, signature_name, cancellation_reason, subtotal, discount, total, created_at, updated_at, created_by)
    select so.id, company_uuid, so.customer_id, so.technician_id, so.number, so.type, so.description,
      case so.status when 'pendente' then 'Pendente' when 'andamento' then 'Em andamento' when 'atrasada' then 'Atrasada' when 'concluida' then 'Concluída' when 'cancelada' then 'Cancelada' else so.status end,
      case so.priority when 'baixa' then 'Baixa' when 'media' then 'Normal' when 'alta' then 'Alta' when 'urgente' then 'Urgente' else so.priority end,
      so.scheduled_date::timestamptz, so.scheduled_period, so.arrival_time, so.arrival_time, so.departure_time,
      coalesce(so.completed_at, so.departure_time), so.technical_report, so.signature_url, so.signature_name,
      so.cancellation_reason, so.subtotal, so.discount, so.total,
      coalesce(so.created_at, now()), coalesce(so.updated_at, now()), so.created_by
    from public.legacy_service_orders so
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.legacy_service_order_items') is not null then
    insert into public.service_order_items (id, service_order_id, catalog_item_id, descricao, quantidade, unidade, item_type, unit_price, total, created_at, created_by)
    select old_item.id, old_item.service_order_id, old_item.product_id, old_item.description,
      old_item.quantity, coalesce(product.unit, 'un'), old_item.type, old_item.unit_price, old_item.total_price,
      coalesce(old_item.created_at, now()), null
    from public.legacy_service_order_items old_item
    left join public.products product on product.id = old_item.product_id
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.legacy_os_photos') is not null then
    insert into public.os_photos (id, service_order_id, storage_path, url, caption, uploaded_by, created_at, created_by)
    select photo.id, photo.service_order_id, photo.storage_path, photo.url, photo.caption, photo.uploaded_by,
      coalesce(photo.created_at, now()), photo.uploaded_by
    from public.legacy_os_photos photo
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.invoices') is not null then
    insert into public.receipts (id, company_id, client_id, service_order_id, invoice_type, numero, status, amount, amount_paid, due_at, issued_at, received_at, payment_method, description, notes, created_at, updated_at, created_by)
    select i.id, company_uuid, i.customer_id, i.service_order_id, i.type, i.number,
      case i.status when 'aberta' then 'Pendente' when 'parcial' then 'Parcial' when 'paga' then 'Recebido' when 'atrasada' then 'Atrasado' when 'cancelada' then 'Cancelado' else i.status end,
      i.amount, i.amount_paid, i.due_date, i.issue_date, i.payment_date::timestamptz, i.payment_method, i.description, i.notes,
      coalesce(i.created_at, now()), coalesce(i.updated_at, now()), i.created_by
    from public.invoices i
    on conflict (id) do nothing;
  end if;
end;
$$;

create or replace function public.handle_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  safe_name text;
begin
  safe_name := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1), 'Usuário');
  insert into public.profiles (id, role, full_name, phone)
  values (new.id, 'cliente', safe_name, new.raw_user_meta_data->>'telefone')
  on conflict (id) do nothing;
  if new.email is not null then
    insert into public.user_profiles (id, email, nome, role, telefone, ativo, company_id)
    values (new.id, lower(new.email), safe_name, 'Cliente', new.raw_user_meta_data->>'telefone', true,
      (select id from public.companies where deleted_at is null order by created_at limit 1))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.get_my_user_role()
returns public.user_role language sql stable security definer set search_path = public, auth as $$
  select role from public.user_profiles where id = auth.uid() limit 1;
$$;

create or replace function public.convert_lead_to_client(lead_id uuid)
returns uuid language plpgsql security invoker set search_path = public, auth as $$
declare
  lead_row public.leads%rowtype;
  new_client_id uuid;
  client_type text;
begin
  select * into lead_row from public.leads where id = lead_id and deleted_at is null for update;
  if not found then raise exception 'Lead not found'; end if;
  if public.get_my_user_role() not in ('Admin', 'Comercial') then raise exception 'Insufficient permissions'; end if;
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

create or replace function public.soft_delete_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  execute format('update %I.%I set deleted_at = now() where id = $1', tg_table_schema, tg_table_name) using old.id;
  return null;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
  if to_regclass('public.profiles') is not null then
    execute 'insert into public.profiles (id, role, full_name, phone) values ($1, ''cliente'', $2, $3) on conflict (id) do nothing'
    using new.id, safe_name, new.raw_user_meta_data->>'telefone';
  end if;
    execute format('drop trigger if exists %I on public.%I', table_name || '_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.handle_updated_at()', table_name || '_updated_at', table_name);
    execute format('drop trigger if exists %I on public.%I', table_name || '_soft_delete', table_name);
    execute format('create trigger %I before delete on public.%I for each row execute function public.soft_delete_row()', table_name || '_soft_delete', table_name);
  end loop;
end;
$$;

-- Add common audit columns to pre-existing tables that remain in place.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['customers','products','invoices','service_order_items','os_photos','customers_profiles'] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I add column if not exists deleted_at timestamptz', table_name);
      execute format('alter table public.%I add column if not exists created_by uuid references auth.users(id) on delete set null', table_name);
    end if;
  end loop;
end;
$$;

-- RLS: authenticated CRUD; anon receives no table privileges. Admin-only role changes are enforced separately.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'companies','user_profiles','clients','extinguishers','hoses','documents','leads','quotes','quote_items',
    'service_orders','service_order_items','os_photos','orders','receipts','tasks','agenda_events','catalog_items','quote_templates'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_update', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_authenticated_delete', table_name);
    if table_name = 'user_profiles' then
      execute 'create policy user_profiles_authenticated_select on public.user_profiles for select to authenticated using (auth.uid() is not null)';
      execute 'create policy user_profiles_authenticated_insert on public.user_profiles for insert to authenticated with check (public.get_my_user_role() = ''Admin'' or (id = auth.uid() and role = ''Cliente''))';
      execute 'create policy user_profiles_authenticated_update on public.user_profiles for update to authenticated using (public.get_my_user_role() = ''Admin'' or id = auth.uid()) with check (public.get_my_user_role() = ''Admin'' or (id = auth.uid() and role = public.get_my_user_role()))';
      execute 'create policy user_profiles_authenticated_delete on public.user_profiles for delete to authenticated using (public.get_my_user_role() = ''Admin'')';
    else
      execute format('create policy %I on public.%I for select to authenticated using (auth.uid() is not null)', table_name || '_authenticated_select', table_name);
      execute format('create policy %I on public.%I for insert to authenticated with check (auth.uid() is not null)', table_name || '_authenticated_insert', table_name);
      execute format('create policy %I on public.%I for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)', table_name || '_authenticated_update', table_name);
      execute format('create policy %I on public.%I for delete to authenticated using (auth.uid() is not null)', table_name || '_authenticated_delete', table_name);
    end if;
  end loop;
end;
$$;

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
create policy documentos_authenticated_select on storage.objects for select to authenticated using (bucket_id = 'documentos' and auth.uid() is not null);
create policy documentos_authenticated_insert on storage.objects for insert to authenticated with check (bucket_id = 'documentos' and auth.uid() is not null);
create policy documentos_authenticated_update on storage.objects for update to authenticated using (bucket_id = 'documentos' and auth.uid() is not null) with check (bucket_id = 'documentos' and auth.uid() is not null);
create policy documentos_authenticated_delete on storage.objects for delete to authenticated using (bucket_id = 'documentos' and auth.uid() is not null);
drop policy if exists os_photos_authenticated_select on storage.objects;
drop policy if exists os_photos_authenticated_insert on storage.objects;
drop policy if exists os_photos_authenticated_update on storage.objects;
drop policy if exists os_photos_authenticated_delete on storage.objects;
create policy os_photos_authenticated_select on storage.objects for select to authenticated using (bucket_id = 'os-photos' and auth.uid() is not null);
create policy os_photos_authenticated_insert on storage.objects for insert to authenticated with check (bucket_id = 'os-photos' and auth.uid() is not null);
create policy os_photos_authenticated_update on storage.objects for update to authenticated using (bucket_id = 'os-photos' and auth.uid() is not null) with check (bucket_id = 'os-photos' and auth.uid() is not null);
create policy os_photos_authenticated_delete on storage.objects for delete to authenticated using (bucket_id = 'os-photos' and auth.uid() is not null);

grant usage on schema public to authenticated;
