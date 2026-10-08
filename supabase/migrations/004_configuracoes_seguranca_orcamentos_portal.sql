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
alter table public.quote_templates alter column company_id drop not null;
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
alter table public.catalog_items alter column company_id drop not null;

-- Flexibiliza as colunas tipo e type para text (caso alguma tenha sido criada como enum product_type)
do $$
begin
  -- 1. Se a coluna 'tipo' for enum product_type ou outro tipo não-text
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'catalog_items' and column_name = 'tipo' and udt_name <> 'text'
  ) then
    begin
      alter table public.catalog_items alter column tipo drop default;
    exception when others then null;
    end;
    alter table public.catalog_items alter column tipo type text using tipo::text;
    alter table public.catalog_items alter column tipo set default 'servico';
  end if;

  -- 2. Se a coluna 'type' for enum product_type ou outro tipo não-text
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'catalog_items' and column_name = 'type' and udt_name <> 'text'
  ) then
    begin
      alter table public.catalog_items alter column type drop default;
    exception when others then null;
    end;
    alter table public.catalog_items alter column type type text using type::text;
    alter table public.catalog_items alter column type set default 'servico';
  end if;
exception
  when others then null;
end $$;

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

-- Sincronizar registros existentes com type::text e tipo::text
update public.catalog_items
set 
  tipo = coalesce(tipo::text, type::text, 'servico'),
  type = coalesce(type::text, tipo::text, 'servico'),
  preco_venda = coalesce(preco_venda, preco, 0),
  custo_unitario = coalesce(custo_unitario, custo, 0)
where preco_venda is null or custo_unitario is null or tipo is null or type is null;

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

  if new.tipo is not null and (new.type is null or new.type::text <> new.tipo::text) then
    new.type := new.tipo::text;
  elsif new.type is not null and (new.tipo is null or new.tipo::text <> new.type::text) then
    new.tipo := new.type::text;
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
-- 3.1. INSERÇÃO DOS 21 PRODUTOS E MODELOS DE EXTINTORES DIGITADOS
-- ----------------------------------------------------------------------------
delete from public.catalog_items
where categoria = 'Extintor'
  and is_system = true
  and nome in (
    'Pó ABC - 4kg', 'Pó ABC - 6kg', 'Pó ABC - 8kg', 'Pó ABC - 12kg',
    'Pó BC - 4kg', 'Pó BC - 6kg', 'Pó BC - 8kg', 'Pó BC - 12kg',
    'CO2 - 4kg', 'CO2 - 6kg', 'Água Pressurizada - 10L', 'Espuma Mecânica - 10L',
    'CO2 (Dióxido de Carbono) - 6kg', 'CO2 - 10kg', 'Espuma Mecânica RODAS - 50kg',
    'Pó ABC - 20kg', 'Pó ABC Rodas - 30kg', 'Pó ABC Rodas - 50kg',
    'Pó BC Rodas - 20kg', 'Pó BC Rodas - 50kg', 'AP Rodas - 50L'
  )
  and id not in (
    'e0000000-0000-0000-0000-000000000001'::uuid,
    'e0000000-0000-0000-0000-000000000002'::uuid,
    'e0000000-0000-0000-0000-000000000003'::uuid,
    'e0000000-0000-0000-0000-000000000004'::uuid,
    'e0000000-0000-0000-0000-000000000005'::uuid,
    'e0000000-0000-0000-0000-000000000006'::uuid,
    'e0000000-0000-0000-0000-000000000007'::uuid,
    'e0000000-0000-0000-0000-000000000008'::uuid,
    'e0000000-0000-0000-0000-000000000009'::uuid,
    'e0000000-0000-0000-0000-000000000010'::uuid,
    'e0000000-0000-0000-0000-000000000011'::uuid,
    'e0000000-0000-0000-0000-000000000012'::uuid,
    'e0000000-0000-0000-0000-000000000013'::uuid,
    'e0000000-0000-0000-0000-000000000014'::uuid,
    'e0000000-0000-0000-0000-000000000015'::uuid,
    'e0000000-0000-0000-0000-000000000016'::uuid,
    'e0000000-0000-0000-0000-000000000017'::uuid,
    'e0000000-0000-0000-0000-000000000018'::uuid,
    'e0000000-0000-0000-0000-000000000019'::uuid,
    'e0000000-0000-0000-0000-000000000020'::uuid,
    'e0000000-0000-0000-0000-000000000021'::uuid
  );

insert into public.catalog_items (
  id,
  nome,
  tipo,
  categoria,
  unidade,
  preco,
  preco_venda,
  custo,
  custo_unitario,
  custo_reaproveitamento,
  agente,
  capacidade,
  descricao,
  ativo,
  is_system
) values
(
  'e0000000-0000-0000-0000-000000000001'::uuid,
  'Pó ABC - 4kg',
  'servico',
  'Extintor',
  'un',
  70.00,
  70.00,
  33.90,
  33.90,
  23.90,
  'Pó ABC',
  '4kg',
  '{"agente":"Pó ABC","capacidade":"4kg","custo_normal":33.9,"custo_reaproveitamento":23.9,"preco_padrao":70}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000002'::uuid,
  'Pó ABC - 6kg',
  'servico',
  'Extintor',
  'un',
  90.00,
  90.00,
  42.90,
  42.90,
  26.90,
  'Pó ABC',
  '6kg',
  '{"agente":"Pó ABC","capacidade":"6kg","custo_normal":42.9,"custo_reaproveitamento":26.9,"preco_padrao":90}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000003'::uuid,
  'Pó ABC - 8kg',
  'servico',
  'Extintor',
  'un',
  110.00,
  110.00,
  50.90,
  50.90,
  29.80,
  'Pó ABC',
  '8kg',
  '{"agente":"Pó ABC","capacidade":"8kg","custo_normal":50.9,"custo_reaproveitamento":29.8,"preco_padrao":110}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000004'::uuid,
  'Pó ABC - 12kg',
  'servico',
  'Extintor',
  'un',
  135.00,
  135.00,
  66.20,
  66.20,
  34.90,
  'Pó ABC',
  '12kg',
  '{"agente":"Pó ABC","capacidade":"12kg","custo_normal":66.2,"custo_reaproveitamento":34.9,"preco_padrao":135}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000005'::uuid,
  'Pó BC - 4kg',
  'servico',
  'Extintor',
  'un',
  70.00,
  70.00,
  26.50,
  26.50,
  18.90,
  'Pó BC',
  '4kg',
  '{"agente":"Pó BC","capacidade":"4kg","custo_normal":26.5,"custo_reaproveitamento":18.9,"preco_padrao":70}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000006'::uuid,
  'Pó BC - 6kg',
  'servico',
  'Extintor',
  'un',
  80.00,
  80.00,
  30.80,
  30.80,
  20.90,
  'Pó BC',
  '6kg',
  '{"agente":"Pó BC","capacidade":"6kg","custo_normal":30.8,"custo_reaproveitamento":20.9,"preco_padrao":80}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000007'::uuid,
  'Pó BC - 8kg',
  'servico',
  'Extintor',
  'un',
  90.00,
  90.00,
  34.60,
  34.60,
  24.40,
  'Pó BC',
  '8kg',
  '{"agente":"Pó BC","capacidade":"8kg","custo_normal":34.6,"custo_reaproveitamento":24.4,"preco_padrao":90}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000008'::uuid,
  'Pó BC - 12kg',
  'servico',
  'Extintor',
  'un',
  100.00,
  100.00,
  45.90,
  45.90,
  27.60,
  'Pó BC',
  '12kg',
  '{"agente":"Pó BC","capacidade":"12kg","custo_normal":45.9,"custo_reaproveitamento":27.6,"preco_padrao":100}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000009'::uuid,
  'CO2 - 4kg',
  'servico',
  'Extintor',
  'un',
  68.00,
  68.00,
  30.00,
  30.00,
  9.00,
  'CO2',
  '4kg',
  '{"agente":"CO2","capacidade":"4kg","custo_normal":30,"custo_reaproveitamento":9,"preco_padrao":68}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000010'::uuid,
  'CO2 - 6kg',
  'servico',
  'Extintor',
  'un',
  250.00,
  250.00,
  120.00,
  120.00,
  97.00,
  'CO2',
  '6kg',
  '{"agente":"CO2","capacidade":"6kg","custo_normal":120,"custo_reaproveitamento":97,"preco_padrao":250}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000011'::uuid,
  'Água Pressurizada - 10L',
  'servico',
  'Extintor',
  'un',
  50.00,
  50.00,
  19.90,
  19.90,
  18.90,
  'Água Pressurizada (AP)',
  '10L',
  '{"agente":"Água Pressurizada (AP)","capacidade":"10L","custo_normal":19.9,"custo_reaproveitamento":18.9,"preco_padrao":50}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000012'::uuid,
  'Espuma Mecânica - 10L',
  'servico',
  'Extintor',
  'un',
  135.00,
  135.00,
  65.00,
  65.00,
  50.00,
  'Espuma Mecânica',
  '10L',
  '{"agente":"Espuma Mecânica","capacidade":"10L","custo_normal":65,"custo_reaproveitamento":50,"preco_padrao":135}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000013'::uuid,
  'CO2 (Dióxido de Carbono) - 6kg',
  'servico',
  'Extintor',
  'un',
  68.00,
  68.00,
  30.00,
  30.00,
  9.00,
  'CO2 (Dióxido de Carbono)',
  '6kg',
  '{"agente":"CO2 (Dióxido de Carbono)","capacidade":"6kg","custo_normal":30,"custo_reaproveitamento":9,"preco_padrao":68}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000014'::uuid,
  'CO2 - 10kg',
  'servico',
  'Extintor',
  'un',
  290.00,
  290.00,
  189.00,
  189.00,
  135.00,
  'CO2',
  '10kg',
  '{"agente":"CO2","capacidade":"10kg","custo_normal":189,"custo_reaproveitamento":135,"preco_padrao":290}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000015'::uuid,
  'Espuma Mecânica RODAS - 50kg',
  'servico',
  'Extintor',
  'un',
  500.00,
  500.00,
  230.00,
  230.00,
  120.00,
  'Espuma Mecânica RODAS',
  '50kg',
  '{"agente":"Espuma Mecânica RODAS","capacidade":"50kg","custo_normal":230,"custo_reaproveitamento":120,"preco_padrao":500}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000016'::uuid,
  'Pó ABC - 20kg',
  'servico',
  'Extintor',
  'un',
  240.00,
  240.00,
  117.00,
  117.00,
  85.00,
  'Pó ABC',
  '20kg',
  '{"agente":"Pó ABC","capacidade":"20kg","custo_normal":117,"custo_reaproveitamento":85,"preco_padrao":240}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000017'::uuid,
  'Pó ABC Rodas - 30kg',
  'servico',
  'Extintor',
  'un',
  330.00,
  330.00,
  160.00,
  160.00,
  120.00,
  'Pó ABC Rodas',
  '30kg',
  '{"agente":"Pó ABC Rodas","capacidade":"30kg","custo_normal":160,"custo_reaproveitamento":120,"preco_padrao":330}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000018'::uuid,
  'Pó ABC Rodas - 50kg',
  'servico',
  'Extintor',
  'un',
  160.00,
  160.00,
  78.00,
  78.00,
  65.00,
  'Pó ABC Rodas',
  '50kg',
  '{"agente":"Pó ABC Rodas","capacidade":"50kg","custo_normal":78,"custo_reaproveitamento":65,"preco_padrao":160}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000019'::uuid,
  'Pó BC Rodas - 20kg',
  'servico',
  'Extintor',
  'un',
  68.00,
  68.00,
  135.00,
  135.00,
  98.00,
  'Pó BC Rodas',
  '20kg',
  '{"agente":"Pó BC Rodas","capacidade":"20kg","custo_normal":135,"custo_reaproveitamento":98,"preco_padrao":68}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000020'::uuid,
  'Pó BC Rodas - 50kg',
  'servico',
  'Extintor',
  'un',
  250.00,
  250.00,
  125.00,
  125.00,
  98.00,
  'Pó BC Rodas',
  '50kg',
  '{"agente":"Pó BC Rodas","capacidade":"50kg","custo_normal":125,"custo_reaproveitamento":98,"preco_padrao":250}',
  true,
  true
),
(
  'e0000000-0000-0000-0000-000000000021'::uuid,
  'AP Rodas - 50L',
  'servico',
  'Extintor',
  'un',
  250.00,
  250.00,
  125.00,
  125.00,
  98.00,
  'AP Rodas',
  '50L',
  '{"agente":"AP Rodas","capacidade":"50L","custo_normal":125,"custo_reaproveitamento":98,"preco_padrao":250}',
  true,
  true
)
on conflict (id) do update set
  nome = excluded.nome,
  tipo = excluded.tipo,
  categoria = excluded.categoria,
  unidade = excluded.unidade,
  preco = excluded.preco,
  preco_venda = excluded.preco_venda,
  custo = excluded.custo,
  custo_unitario = excluded.custo_unitario,
  custo_reaproveitamento = excluded.custo_reaproveitamento,
  agente = excluded.agente,
  capacidade = excluded.capacidade,
  descricao = excluded.descricao,
  ativo = excluded.ativo,
  is_system = excluded.is_system;

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
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role::text <> 'Cliente')
  );

-- B) Acesso ao inventário de extintores do cliente
drop policy if exists extintores_cliente_select on public.extintores;
create policy extintores_cliente_select on public.extintores
  for select to authenticated
  using (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role::text <> 'Cliente')
  );

-- C) Acesso aos documentos do cliente (Anexo D, PPCI, laudos)
drop policy if exists documentos_cliente_cliente_select on public.documentos_cliente;
create policy documentos_cliente_cliente_select on public.documentos_cliente
  for select to authenticated
  using (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role::text <> 'Cliente')
  );

-- D) Acesso e aprovação de orçamentos
drop policy if exists quotes_cliente_select on public.quotes;
create policy quotes_cliente_select on public.quotes
  for select to authenticated
  using (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role::text <> 'Cliente')
  );

drop policy if exists quotes_cliente_update on public.quotes;
create policy quotes_cliente_update on public.quotes
  for update to authenticated
  using (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role::text <> 'Cliente')
  )
  with check (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role::text <> 'Cliente')
  );

-- E) Acesso aos itens do orçamento
drop policy if exists quote_items_cliente_select on public.quote_items;
create policy quote_items_cliente_select on public.quote_items
  for select to authenticated
  using (
    quote_id in (select id from public.quotes where client_id = public.get_my_client_id()) or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role::text <> 'Cliente')
  );

-- F) Acesso às vistorias e ordens de serviço
drop policy if exists service_orders_cliente_select on public.service_orders;
create policy service_orders_cliente_select on public.service_orders
  for select to authenticated
  using (
    client_id = public.get_my_client_id() or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role::text <> 'Cliente')
  );

drop policy if exists service_order_items_cliente_select on public.service_order_items;
create policy service_order_items_cliente_select on public.service_order_items
  for select to authenticated
  using (
    service_order_id in (select id from public.service_orders where client_id = public.get_my_client_id()) or
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role::text <> 'Cliente')
  );

-- Habilita RLS nas tabelas centrais
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_order_items enable row level security;
alter table public.catalog_items enable row level security;

-- Políticas de RLS para Catálogo de Produtos e Serviços (permitindo itens globais do sistema)
drop policy if exists catalog_items_authenticated_select on public.catalog_items;
create policy catalog_items_authenticated_select on public.catalog_items
  for select to authenticated
  using (
    company_id = public.get_my_company_id()
    or company_id is null
    or is_system = true
  );

drop policy if exists catalog_items_authenticated_insert on public.catalog_items;
create policy catalog_items_authenticated_insert on public.catalog_items
  for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    or company_id is null
  );

drop policy if exists catalog_items_authenticated_update on public.catalog_items;
create policy catalog_items_authenticated_update on public.catalog_items
  for update to authenticated
  using (
    company_id = public.get_my_company_id()
    or is_system = true
  )
  with check (
    company_id = public.get_my_company_id()
    or is_system = true
  );

drop policy if exists catalog_items_authenticated_delete on public.catalog_items;
create policy catalog_items_authenticated_delete on public.catalog_items
  for delete to authenticated
  using (
    company_id = public.get_my_company_id()
  );

