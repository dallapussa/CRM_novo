-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  ⚠️  ARQUIVO LEGACY — NÃO UTILIZAR EM INSTALAÇÕES NOVAS!             ║
-- ║  🟢 PARA SETUP DE UM PROJETO NOVO, USE APENAS: 001_initial_schema.sql ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- Este arquivo foi mantido SOMENTE para referência histórica.

-- ==========================================================================
-- MIGRATION 001 — SCHEMA BASE COMPLETO DO ExtinControl CRM (LEGACY)
-- ==========================================================================
--        !!! APENAS PARA PRIMEIRA INSTALAÇÃO !!!
--    Este bloco apaga TUDO no schema public (tabelas, views, tipos).
--    Se já tiver dados reais, NÃO rode este arquivo.
-- ==========================================================================

do $$
declare
  rec record;
  v_types text[];
  tn text;
begin
  -- 1) Apaga TODAS as tabelas (em cascata, p/ ignorar FKs)
  for rec in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in ('pg_stat_statements','pg_buffercache_pages')
  loop
    execute format('drop table if exists public.%I cascade', rec.tablename);
  end loop;

  -- 2) Apaga views
  drop view if exists public.invoices cascade;

  -- 3) Apaga tipos enum (se existirem) — recria depois
  v_types := array['user_role','product_type','os_status','os_priority'];
  foreach tn in array v_types loop
    execute format('drop type if exists public.%I cascade', tn);
  end loop;
end;
$$;

-- ==========================================================================
-- Ordem: extensões → tipo user_role → companies → user_profiles → demais tabelas
-- ==========================================================================

-- 0. Extensões
create extension if not exists "pgcrypto";

-- 1. Tipo enum de cargo de usuário
do $$ begin
  create type public.user_role as enum ('Admin','Comercial','Tecnico','Financeiro','Cliente','Terceiro');
exception when duplicate_object then null; end $$;

-- ==========================================================================
-- 2. EMPRESAS (companies) — multi-tenant
-- ==========================================================================
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  email text,
  telefone text,
  logo_url text,
  endereco jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==========================================================================
-- 3. USER_PROFILES — perfil estendido do auth.users
-- ==========================================================================
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  nome text not null,
  email text,
  telefone text,
  documento text,
  role public.user_role not null default 'Cliente',
  avatar_url text,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==========================================================================
-- 4. CLIENTES
-- ==========================================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  tipo char(2) not null default 'pj' check (tipo in ('pf','pj')),
  razao_social text not null,
  nome_fantasia text,
  cpf_cnpj text,
  ie_rg text,
  telefone1 text,
  telefone2 text,
  email text,
  endereco jsonb,
  observacoes text,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  owner_id uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists clients_company_idx on public.clients(company_id);

-- ==========================================================================
-- 5. CATÁLOGO / PRODUTOS
-- ==========================================================================
do $$ begin
  create type public.product_type as enum ('produto','servico');
exception when duplicate_object then null; end $$;

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  tipo product_type not null default 'produto',
  categoria text,
  sku text,
  nome text not null,
  descricao text,
  unidade text not null default 'un',
  custo_unitario numeric(12,2) not null default 0,
  preco_venda numeric(12,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  tipo text not null default 'produto',
  categoria text,
  sku text,
  nome text not null,
  descricao text,
  unidade text not null default 'un',
  custo_unitario numeric(12,2) not null default 0,
  preco_venda numeric(12,2) not null default 0,
  estoque_atual integer not null default 0,
  estoque_minimo integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.product_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete cascade,
  tipo_movimento text not null check (tipo_movimento in ('entrada','saida','ajuste')),
  quantidade integer not null,
  motivo text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ==========================================================================
-- 6. EXTINTORES (por cliente)
-- ==========================================================================
create table if not exists public.extinguishers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete cascade,
  tipo text not null,
  capacidade text not null,
  numero_serie text,
  fabricante text,
  data_fabricacao date,
  ultima_recarga date,
  validade date not null,
  proxima_inspecao date,
  localizacao text,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists extinguishers_company_idx on public.extinguishers(company_id);
create index if not exists extinguishers_client_idx on public.extinguishers(client_id);

-- ==========================================================================
-- 7. MANGUEIRAS (Hoses)
-- ==========================================================================
create table if not exists public.hoses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete cascade,
  tipo text not null,
  comprimento numeric(6,2) not null default 0,
  numero_serie text,
  patrimonio text,
  localizacao text,
  last_test_at date,
  next_test_at date not null,
  status text not null default 'Ativo',
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists hoses_company_idx on public.hoses(company_id);

-- ==========================================================================
-- 8. ORDENS DE SERVIÇO
-- ==========================================================================
do $$ begin
  create type public.os_status as enum ('pendente','andamento','atrasada','concluida','cancelada');
  create type public.os_priority as enum ('baixa','media','alta','urgente');
exception when duplicate_object then null; end $$;

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  numero serial,
  client_id uuid not null references public.clients(id) on delete restrict,
  technician_id uuid references public.user_profiles(id) on delete set null,
  data_agendada date,
  periodo text,
  prioridade os_priority not null default 'media',
  status os_status not null default 'pendente',
  tipo_servico text,
  descricao text,
  relatorio_tecnico text,
  horario_chegada time,
  horario_saida time,
  assinatura_url text,
  assinatura_nome text,
  subtotal numeric(12,2) not null default 0,
  desconto numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  motivo_cancelamento text,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data_conclusao timestamptz,
  deleted_at timestamptz
);

create table if not exists public.service_order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  descricao text not null,
  quantidade numeric(10,2) not null default 0,
  unitario numeric(12,2) not null default 0,
  total_item numeric(12,2) not null default 0,
  tipo_item text not null default 'produto' check (tipo_item in ('produto','servico','mao_obra')),
  created_at timestamptz not null default now()
);

-- ==========================================================================
-- 9. PEDIDOS (Orders)
-- ==========================================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  numero serial,
  client_id uuid not null references public.clients(id) on delete restrict,
  service_order_id uuid references public.service_orders(id) on delete set null,
  quote_id uuid,
  status text not null default 'Aberto',
  total numeric(12,2) not null default 0,
  ordered_at timestamptz not null default now(),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists orders_company_idx on public.orders(company_id);

-- ==========================================================================
-- 10. CONTAS A RECEBER / PAGAR (receipts / invoices)
-- ==========================================================================
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  invoice_type text not null default 'receber' check (invoice_type in ('receber','pagar')),
  numero serial,
  status text not null default 'Pendente',
  amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  due_at timestamptz,
  issued_at timestamptz,
  received_at timestamptz,
  payment_method text,
  description text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists receipts_company_idx on public.receipts(company_id);

-- (alias de invoices mantido para compatibilidade)
drop view if exists public.invoices;
create view public.invoices as select * from public.receipts;

-- ==========================================================================
-- 11. LEADS
-- ==========================================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  company_name text,
  document text,
  email text,
  phone text,
  source text,
  status text not null default 'novo',
  notes text,
  owner_id uuid references public.user_profiles(id) on delete set null,
  converted_customer_id uuid references public.clients(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists leads_company_idx on public.leads(company_id);

-- ==========================================================================
-- 12. ORÇAMENTOS / COTAÇÕES (Quotes)
-- ==========================================================================
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  template_id uuid,
  numero serial,
  status text not null default 'Rascunho',
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  owner_id uuid references public.user_profiles(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists quotes_company_idx on public.quotes(company_id);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  descricao text not null,
  quantidade numeric(10,2) not null default 0,
  unidade text not null default 'un',
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ==========================================================================
-- 13. DOCUMENTOS (vinculados a cliente; upload no Storage)
-- ==========================================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  nome text not null,
  categoria text,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  url text,
  created_by uuid references auth.users(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists documents_client_idx on public.documents(client_id);

-- ==========================================================================
-- 14. TAREFAS (Tasks)
-- ==========================================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  assigned_to uuid references public.user_profiles(id) on delete set null,
  titulo text not null,
  descricao text,
  status text not null default 'Pendente',
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists tasks_company_idx on public.tasks(company_id);

-- ==========================================================================
-- 15. EVENTOS DA AGENDA
-- ==========================================================================
create table if not exists public.agenda_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  assigned_to uuid references public.user_profiles(id) on delete set null,
  titulo text not null,
  descricao text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists agenda_events_company_idx on public.agenda_events(company_id);

-- ==========================================================================
-- 16. WHATSAPP TEMPLATES (config do sistema — não dado de cliente)
-- ==========================================================================
create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  slug text not null,
  name text not null,
  description text,
  body text not null default '',
  placeholders jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, slug)
);

-- ==========================================================================
-- 17. BANCADA / KANBAN (bench_records)
-- ==========================================================================
create table if not exists public.bench_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  extinguisher_id uuid references public.extinguishers(id) on delete set null,
  hose_id uuid references public.hoses(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  stage text not null default 'recebido',
  technician_id uuid references public.user_profiles(id) on delete set null,
  arrived_at timestamptz not null default now(),
  moved_at timestamptz,
  due_at timestamptz,
  priority text default 'media',
  notes text,
  equip_type text,
  equip_capacity text,
  equip_serial text,
  customer_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists bench_records_company_idx on public.bench_records(company_id);
create index if not exists bench_records_stage_idx on public.bench_records(stage);
