-- ============================================================================
-- EXTINCONTROL / FIRE CRM — MIGRAÇÃO 004
-- Configurações Globais (PIN & Menus), Modelos de Orçamento, Catálogo Sincronizado,
-- Extensões de Orçamento & Vínculo do Portal do Cliente
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
-- 2. ADEQUAÇÃO DA TABELA DE MODELOS DE ORÇAMENTO (quote_templates)
-- ----------------------------------------------------------------------------
-- Flexibiliza id para tipo TEXT (suportando IDs amigáveis como 'tpl-simplificado' ou UUIDs)
alter table public.quotes drop constraint if exists quotes_template_id_fkey;
alter table public.quotes alter column template_id type text;
alter table public.quote_templates alter column id type text;
alter table public.quotes add constraint quotes_template_id_fkey foreign key (template_id) references public.quote_templates(id) on delete set null;

-- Adiciona campos estruturados para modelos de orçamento
alter table public.quote_templates add column if not exists tipo text default 'personalizado';
alter table public.quote_templates add column if not exists validade_dias integer default 15;
alter table public.quote_templates add column if not exists condicoes_pagamento text default 'À vista ou 30 dias no boleto.';
alter table public.quote_templates add column if not exists termos_garantia text;
alter table public.quote_templates add column if not exists clausula_ppci text;
alter table public.quote_templates add column if not exists itens_padrao jsonb not null default '[]'::jsonb;

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
-- 3. ADEQUAÇÃO DO CATÁLOGO DE PRODUTOS & SERVIÇOS (catalog_items)
-- ----------------------------------------------------------------------------
alter table public.catalog_items add column if not exists tipo text default 'servico';
alter table public.catalog_items add column if not exists preco_venda numeric(12,2);
alter table public.catalog_items add column if not exists custo_unitario numeric(12,2);
alter table public.catalog_items add column if not exists custo_reaproveitamento numeric(12,2) default 0;
alter table public.catalog_items add column if not exists agente text;
alter table public.catalog_items add column if not exists capacidade text;

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
-- 4. ADEQUAÇÃO DA TABELA DE ORÇAMENTOS (quotes)
-- ----------------------------------------------------------------------------
alter table public.quotes add column if not exists notes text;
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
-- 5. ADEQUAÇÃO DA TABELA DE EMPRESAS EMITENTES (companies)
-- ----------------------------------------------------------------------------
alter table public.companies add column if not exists logo_url text;
alter table public.companies add column if not exists endereco text;

-- ----------------------------------------------------------------------------
-- 6. VÍNCULO DE USUÁRIOS AO CLIENTE (PORTAL DO CLIENTE) & RLS
-- ----------------------------------------------------------------------------
alter table public.user_profiles add column if not exists client_id uuid references public.clients(id) on delete cascade;
create index if not exists idx_user_profiles_client_id on public.user_profiles(client_id);

-- Função auxiliar segura para obter o client_id do usuário logado
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
    id = public.get_my_client_id()
  );

-- B) Acesso ao inventário de extintores do cliente
drop policy if exists extintores_cliente_select on public.extintores;
create policy extintores_cliente_select on public.extintores
  for select to authenticated
  using (
    client_id = public.get_my_client_id()
  );

-- C) Acesso aos documentos do cliente (Anexo D, PPCI, fotos)
drop policy if exists documentos_cliente_cliente_select on public.documentos_cliente;
create policy documentos_cliente_cliente_select on public.documentos_cliente
  for select to authenticated
  using (
    client_id = public.get_my_client_id()
  );

-- D) Acesso aos dados de PPCI
drop policy if exists cliente_ppci_cliente_select on public.cliente_ppci;
create policy cliente_ppci_cliente_select on public.cliente_ppci
  for select to authenticated
  using (
    client_id = public.get_my_client_id()
  );

-- E) Acesso e aprovação de orçamentos
drop policy if exists quotes_cliente_select on public.quotes;
create policy quotes_cliente_select on public.quotes
  for select to authenticated
  using (
    client_id = public.get_my_client_id()
  );

drop policy if exists quotes_cliente_update on public.quotes;
create policy quotes_cliente_update on public.quotes
  for update to authenticated
  using (
    client_id = public.get_my_client_id()
  )
  with check (
    client_id = public.get_my_client_id() and
    status in ('Aprovado', 'Rejeitado')
  );

-- F) Acesso aos itens do orçamento
drop policy if exists quote_items_cliente_select on public.quote_items;
create policy quote_items_cliente_select on public.quote_items
  for select to authenticated
  using (
    quote_id in (select id from public.quotes where client_id = public.get_my_client_id())
  );

-- G) Acesso às ordens de recolhimento
drop policy if exists ordens_recolhimento_cliente_select on public.ordens_recolhimento;
create policy ordens_recolhimento_cliente_select on public.ordens_recolhimento
  for select to authenticated
  using (
    client_id = public.get_my_client_id()
  );

-- H) Acesso aos itens das ordens de recolhimento
drop policy if exists itens_recolhimento_cliente_select on public.itens_recolhimento;
create policy itens_recolhimento_cliente_select on public.itens_recolhimento
  for select to authenticated
  using (
    ordem_id in (select id from public.ordens_recolhimento where client_id = public.get_my_client_id())
  );
