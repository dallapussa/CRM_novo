-- ============================================================================
-- EXTINCONTROL / FIRE CRM — MIGRAÇÃO 004 COMPLETA E DEFINITIVA
-- Criação e Atualização de Tabelas: Orçamentos, Catálogo, Ordens de Serviço,
-- Configurações Globais / PIN de Segurança e Portal do Cliente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA DE CONFIGURAÇÕES GLOBAIS DO SISTEMA & SEGURANÇA (app_settings)
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade unique,
  pin_hash text not null default '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
  require_pin_for_price_change boolean not null default true,
  require_pin_for_delete boolean not null default true,
  pin_cache_minutes integer not null default 5,
  quote_terms jsonb not null default '{}'::jsonb,
  role_permissions jsonb not null default '{}'::jsonb,
  menu_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_settings_company_id on public.app_settings(company_id);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_authenticated on public.app_settings;
create policy app_settings_authenticated on public.app_settings
  for all to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- 2. TABELA DE MODELOS DE ORÇAMENTO (quote_templates)
-- ----------------------------------------------------------------------------
create table if not exists public.quote_templates (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade,
  nome text not null,
  descricao text,
  tipo text default 'personalizado',
  validade_dias integer default 15,
  condicoes_pagamento text default 'À vista ou 30 dias no boleto.',
  termos_garantia text,
  clausula_ppci text,
  itens_padrao jsonb not null default '[]'::jsonb,
  ativo boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quote_templates add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.quote_templates add column if not exists tipo text default 'personalizado';
alter table public.quote_templates add column if not exists validade_dias integer default 15;
alter table public.quote_templates add column if not exists condicoes_pagamento text default 'À vista ou 30 dias no boleto.';
alter table public.quote_templates add column if not exists termos_garantia text;
alter table public.quote_templates add column if not exists clausula_ppci text;
alter table public.quote_templates add column if not exists itens_padrao jsonb not null default '[]'::jsonb;
alter table public.quote_templates add column if not exists ativo boolean not null default true;
alter table public.quote_templates add column if not exists is_system boolean not null default false;

alter table public.quote_templates enable row level security;

drop policy if exists quote_templates_all on public.quote_templates;
create policy quote_templates_all on public.quote_templates
  for all to authenticated
  using (true)
  with check (true);

-- Popula os 3 modelos de orçamento padrão do sistema
insert into public.quote_templates (
  id, nome, descricao, tipo, validade_dias, condicoes_pagamento, termos_garantia, clausula_ppci, itens_padrao, ativo, is_system
) values
(
  'tpl-simplificado',
  'Orçamento Simplificado',
  'Modelo direto para recargas rápidas e trocas avulsas de extintores.',
  'simplificado',
  15,
  'À vista com 5% de desconto ou 30 dias no boleto.',
  'Garantia de 12 meses contra defeitos de pressurização e conformidade com a Portaria Inmetro.',
  'Serviço em conformidade com as normas do Corpo de Bombeiros Militar e NBR 12962.',
  '[{"tipo_origem":"extintor","descricao":"Recarga / Carga Completa Extintor Pó ABC 4kg","quantidade":1,"valor_unitario":45.0,"unidade":"un"},{"tipo_origem":"extintor","descricao":"Recarga / Carga Completa Extintor CO2 4kg","quantidade":1,"valor_unitario":65.0,"unidade":"un"}]'::jsonb,
  true,
  true
),
(
  'tpl-completo',
  'Completo (PPCI & Extintores)',
  'Modelo abrangente com vistoria técnica, recarga de lote, substituição de peças e laudo de conformidade.',
  'completo',
  20,
  'Entrada de 40% + 2 parcelas (30/60 dias) no boleto faturado.',
  'Garantia de 12 meses na recarga e testes hidrostáticos. Peças com garantia de fábrica de 90 dias.',
  'Emissão de Laudo Técnico e ART/RRT de conformidade com o Plano de Prevenção e Proteção Contra Incêndio (PPCI).',
  '[{"tipo_origem":"extintor","descricao":"Manutenção Nível 2 / Recarga Pó ABC 4kg com anel e lacre","quantidade":5,"valor_unitario":45.0,"unidade":"un"},{"tipo_origem":"extintor","descricao":"Manutenção Nível 2 / Recarga Água Pressurizada 10L","quantidade":3,"valor_unitario":38.0,"unidade":"un"},{"tipo_origem":"catalogo","descricao":"Vistoria Técnica e Elaboração de Relatório de Conformidade PPCI","quantidade":1,"valor_unitario":350.0,"unidade":"serviço"},{"tipo_origem":"catalogo","descricao":"Placa de Sinalização Fotoluminescente de Rota e Equipamento","quantidade":8,"valor_unitario":22.0,"unidade":"un"}]'::jsonb,
  true,
  true
),
(
  'tpl-hidrantes',
  'Hidrantes & Mangueiras',
  'Modelo especializado para teste hidrostático e manutenção do sistema de hidrantes.',
  'hidrantes',
  15,
  'À vista ou 30 dias após emissão da NF.',
  'Garantia de conformidade com a norma NBR 12779 e teste de estanqueidade.',
  'Laudo de teste hidrostático das mangueiras para renovação de alvará.',
  '[{"tipo_origem":"catalogo","descricao":"Ensaio Hidrostático em Mangueira de Incêndio (NBR 12779)","quantidade":4,"valor_unitario":65.0,"unidade":"lance"},{"tipo_origem":"catalogo","descricao":"Empatação de União Storz 1.1/2 ou 2.1/2","quantidade":2,"valor_unitario":40.0,"unidade":"un"}]'::jsonb,
  true,
  true
)
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  tipo = excluded.tipo,
  validade_dias = excluded.validade_dias,
  condicoes_pagamento = excluded.condicoes_pagamento,
  termos_garantia = excluded.termos_garantia,
  clausula_ppci = excluded.clausula_ppci,
  itens_padrao = excluded.itens_padrao;

-- ----------------------------------------------------------------------------
-- 3. TABELA DE CATÁLOGO DE PRODUTOS & SERVIÇOS (catalog_items)
-- ----------------------------------------------------------------------------
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  nome text not null,
  descricao text,
  categoria text default 'Outros',
  tipo text default 'servico',
  type text default 'servico',
  unidade text default 'un',
  preco_venda numeric(12,2) default 0,
  preco numeric(12,2) default 0,
  custo_unitario numeric(12,2) default 0,
  custo numeric(12,2) default 0,
  custo_reaproveitamento numeric(12,2) default 0,
  agente text,
  capacidade text,
  sku text,
  ativo boolean default true,
  is_system boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

alter table public.catalog_items add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.catalog_items add column if not exists tipo text default 'servico';
alter table public.catalog_items add column if not exists type text default 'servico';
alter table public.catalog_items add column if not exists preco_venda numeric(12,2) default 0;
alter table public.catalog_items add column if not exists preco numeric(12,2) default 0;
alter table public.catalog_items add column if not exists custo_unitario numeric(12,2) default 0;
alter table public.catalog_items add column if not exists custo numeric(12,2) default 0;
alter table public.catalog_items add column if not exists custo_reaproveitamento numeric(12,2) default 0;
alter table public.catalog_items add column if not exists agente text;
alter table public.catalog_items add column if not exists capacidade text;
alter table public.catalog_items add column if not exists is_system boolean default false;

-- Sincronizar registros existentes
update public.catalog_items
set 
  tipo = coalesce(tipo, type, 'servico'),
  preco_venda = coalesce(preco_venda, preco, 0),
  custo_unitario = coalesce(custo_unitario, custo, 0)
where preco_venda is null or custo_unitario is null or tipo is null;

-- Trigger para manter compatibilidade bidirecional (tipo/type, preco/preco_venda, custo/custo_unitario)
create or replace function public.sync_catalog_items_columns()
returns trigger as $$
begin
  if new.preco_venda is not null and (new.preco is null or new.preco <> new.preco_venda) then
    new.preco := new.preco_venda;
  elsif new.preco is not null and (new.preco_venda is null or new.preco_venda <> new.preco) then
    new.preco_venda := new.preco;
  end if;

  if new.custo_unitario is not null and (new.custo is null or new.custo <> new.custo_unitario) then
    new.custo := new.custo_unitario;
  elsif new.custo is not null and (new.custo_unitario is null or new.custo_unitario <> new.custo) then
    new.custo_unitario := new.custo;
  end if;

  if new.tipo is not null and new.tipo in ('produto', 'servico') then
    new.type := new.tipo;
  elsif new.type is not null then
    new.tipo := new.type;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_catalog_items on public.catalog_items;
create trigger trg_sync_catalog_items
before insert or update on public.catalog_items
for each row
execute function public.sync_catalog_items_columns();

-- ----------------------------------------------------------------------------
-- 4. TABELAS DE ORÇAMENTOS (quotes & quote_items)
-- ----------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  template_id text,
  numero bigint generated by default as identity,
  status text not null default 'Rascunho',
  issued_at date not null default current_date,
  expires_at date,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  notes text,
  observacoes text,
  validade_dias integer default 15,
  condicoes_pagamento text,
  termos_garantia text,
  clausula_ppci text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.quote_items (
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

-- Flexibiliza template_id para text caso tenha sido criado como uuid anteriormente
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'quotes' and column_name = 'template_id' and data_type = 'uuid'
  ) then
    alter table public.quotes drop constraint if exists quotes_template_id_fkey;
    alter table public.quotes alter column template_id type text;
  end if;
end $$;

alter table public.quotes add column if not exists notes text;
alter table public.quotes add column if not exists observacoes text;
alter table public.quotes add column if not exists validade_dias integer default 15;
alter table public.quotes add column if not exists condicoes_pagamento text;
alter table public.quotes add column if not exists termos_garantia text;
alter table public.quotes add column if not exists clausula_ppci text;

-- Trigger de sincronia entre notes e observacoes
create or replace function public.sync_quotes_notes()
returns trigger as $$
begin
  if new.notes is not null and (new.observacoes is null or new.observacoes <> new.notes) then
    new.observacoes := new.notes;
  elsif new.observacoes is not null and (new.notes is null or new.notes <> new.observacoes) then
    new.notes := new.observacoes;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_quotes_notes on public.quotes;
create trigger trg_sync_quotes_notes
before insert or update on public.quotes
for each row
execute function public.sync_quotes_notes();

update public.quotes set notes = observacoes where notes is null and observacoes is not null;

-- ----------------------------------------------------------------------------
-- 5. TABELA DE ORDENS DE SERVIÇO & VISTORIAS (service_orders & items)
-- ----------------------------------------------------------------------------
create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  assigned_to uuid references public.user_profiles(id) on delete set null,
  numero bigint generated by default as identity,
  tipo text not null default 'Vistoria Técnica',
  descricao text,
  status text not null default 'Pendente',
  priority text not null default 'Normal',
  scheduled_at timestamptz,
  scheduled_period text default 'manha',
  started_at timestamptz,
  arrival_time timestamptz,
  departure_time timestamptz,
  completed_at timestamptz,
  technical_report text,
  signature_url text,
  signature_name text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  cancellation_reason text,
  observacoes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

alter table public.service_orders add column if not exists quote_id uuid references public.quotes(id) on delete set null;
alter table public.service_orders add column if not exists assigned_to uuid references public.user_profiles(id) on delete set null;
alter table public.service_orders add column if not exists tipo text default 'Vistoria Técnica';
alter table public.service_orders add column if not exists priority text default 'Normal';
alter table public.service_orders add column if not exists scheduled_at timestamptz;
alter table public.service_orders add column if not exists scheduled_period text default 'manha';
alter table public.service_orders add column if not exists started_at timestamptz;
alter table public.service_orders add column if not exists arrival_time timestamptz;
alter table public.service_orders add column if not exists departure_time timestamptz;
alter table public.service_orders add column if not exists completed_at timestamptz;
alter table public.service_orders add column if not exists technical_report text;
alter table public.service_orders add column if not exists signature_url text;
alter table public.service_orders add column if not exists signature_name text;
alter table public.service_orders add column if not exists discount numeric(12,2) default 0;
alter table public.service_orders add column if not exists cancellation_reason text;
alter table public.service_orders add column if not exists observacoes text;
alter table public.service_orders add column if not exists notes text;

create table if not exists public.service_order_items (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  descricao text not null,
  quantidade numeric(12,2) not null default 1,
  unidade text not null default 'un',
  item_type text default 'servico',
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

alter table public.service_order_items add column if not exists catalog_item_id uuid references public.catalog_items(id) on delete set null;
alter table public.service_order_items add column if not exists unidade text default 'un';
alter table public.service_order_items add column if not exists item_type text default 'servico';
alter table public.service_order_items add column if not exists unit_price numeric(12,2) default 0;
alter table public.service_order_items add column if not exists total numeric(12,2) default 0;
alter table public.service_order_items add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.service_order_items add column if not exists deleted_at timestamptz;

-- ----------------------------------------------------------------------------
-- 6. CAMPOS AUXILIARES: CLIENTES & EMPRESAS EMITENTES
-- ----------------------------------------------------------------------------
alter table public.clients add column if not exists whatsapp text;
alter table public.clients add column if not exists ppci_isento boolean default false;
alter table public.clients add column if not exists metragem numeric(10,2);
alter table public.clients add column if not exists cpf_responsavel varchar(20);
alter table public.clients add column if not exists contato_responsavel varchar(30);
alter table public.clients add column if not exists senha_gov varchar(100);
alter table public.clients add column if not exists ppci_enquadramento text;
alter table public.clients add column if not exists ppci_expires_at date;
alter table public.clients add column if not exists ppci_number text;

alter table public.companies add column if not exists logo_url text;
alter table public.companies add column if not exists endereco text;

-- ----------------------------------------------------------------------------
-- 7. VÍNCULO DE USUÁRIOS AO CLIENTE (PORTAL DO CLIENTE) & POLÍTICAS RLS
-- ----------------------------------------------------------------------------
alter table public.user_profiles add column if not exists client_id uuid references public.clients(id) on delete set null;
create index if not exists idx_user_profiles_client_id on public.user_profiles(client_id);

-- Função auxiliar segura para obter o client_id do usuário autenticado
create or replace function public.get_my_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.user_profiles where id = auth.uid() limit 1;
$$;

-- Políticas de RLS para o Perfil 'Cliente' (Portal do Cliente)
-- A) Acesso ao registro do seu próprio Cliente
drop policy if exists clients_cliente_select on public.clients;
create policy clients_cliente_select on public.clients
  for select to authenticated
  using (
    id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role <> 'Cliente')
  );

-- B) Acesso ao inventário de extintores do cliente
drop policy if exists extintores_cliente_select on public.extintores;
create policy extintores_cliente_select on public.extintores
  for select to authenticated
  using (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role <> 'Cliente')
  );

-- C) Acesso aos documentos do cliente (Anexo D, PPCI, laudos)
drop policy if exists documentos_cliente_cliente_select on public.documentos_cliente;
create policy documentos_cliente_cliente_select on public.documentos_cliente
  for select to authenticated
  using (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role <> 'Cliente')
  );

-- D) Acesso e aprovação de orçamentos
drop policy if exists quotes_cliente_select on public.quotes;
create policy quotes_cliente_select on public.quotes
  for select to authenticated
  using (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role <> 'Cliente')
  );

drop policy if exists quotes_cliente_update on public.quotes;
create policy quotes_cliente_update on public.quotes
  for update to authenticated
  using (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role <> 'Cliente')
  )
  with check (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role <> 'Cliente')
  );

-- E) Acesso aos itens do orçamento
drop policy if exists quote_items_cliente_select on public.quote_items;
create policy quote_items_cliente_select on public.quote_items
  for select to authenticated
  using (
    quote_id in (select id from public.quotes where client_id = public.get_my_client_id()) or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role <> 'Cliente')
  );

-- F) Acesso às vistorias e ordens de serviço
drop policy if exists service_orders_cliente_select on public.service_orders;
create policy service_orders_cliente_select on public.service_orders
  for select to authenticated
  using (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role <> 'Cliente')
  );

drop policy if exists service_order_items_cliente_select on public.service_order_items;
create policy service_order_items_cliente_select on public.service_order_items
  for select to authenticated
  using (
    service_order_id in (select id from public.service_orders where client_id = public.get_my_client_id()) or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role <> 'Cliente')
  );

-- Habilita RLS nas tabelas centrais
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_order_items enable row level security;
alter table public.catalog_items enable row level security;
