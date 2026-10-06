-- ============================================================================
-- EXTINCONTROL CRM — MIGRAÇÃO 002: MÓDULO CENTRAL DE PREVENÇÃO
-- Clientes (PPCI), Inventário de Extintores, Documentos e Ordens de Recolhimento
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSÃO E CAMPOS DO CLIENTE / PPCI
-- ----------------------------------------------------------------------------
alter table public.clients add column if not exists ppci_isento boolean not null default false;
alter table public.clients add column if not exists metragem numeric(10,2);
alter table public.clients add column if not exists cpf_responsavel varchar(20);
alter table public.clients add column if not exists contato_responsavel varchar(30);
alter table public.clients add column if not exists senha_gov varchar(100);

-- Tabela cliente_ppci (para gestão isolada ou integração)
create table if not exists public.cliente_ppci (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade unique,
  ppci_isento boolean not null default false,
  metragem numeric(10,2),
  cpf_responsavel varchar(20),
  contato_responsavel varchar(30),
  senha_gov varchar(100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cliente_ppci_client_id on public.cliente_ppci(client_id);

-- ----------------------------------------------------------------------------
-- 2. TABELA DE DOCUMENTOS DO CLIENTE
-- ----------------------------------------------------------------------------
create table if not exists public.documentos_cliente (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  tipo_documento text not null check (tipo_documento in ('PPCI', 'Recibo', 'Nota Fiscal', 'Foto', 'Anexo D', 'Outro')),
  file_url text not null,
  file_name text not null,
  storage_path text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_documentos_cliente_client_id on public.documentos_cliente(client_id);

-- ----------------------------------------------------------------------------
-- 3. TABELA DE EXTINTORES (INVENTÁRIO DO CLIENTE)
-- ----------------------------------------------------------------------------
create table if not exists public.extintores (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  identificacao text not null, -- ex: "ABC 4kg 01"
  tipo_capacidade text not null, -- ex: "PÓ ABC - 4kg"
  localizacao text,
  data_ultima_recarga date,
  data_vencimento date,
  valor_servico numeric(10,2) not null default 0,
  status text not null default 'no_cliente' check (status in ('no_cliente', 'em_bancada', 'testado', 'pronto')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_extintores_client_id on public.extintores(client_id);
create index if not exists idx_extintores_data_vencimento on public.extintores(data_vencimento);
create index if not exists idx_extintores_status on public.extintores(status);

-- ----------------------------------------------------------------------------
-- 4. TABELA DE ORDENS DE RECOLHIMENTO (OFICINA)
-- ----------------------------------------------------------------------------
create table if not exists public.ordens_recolhimento (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  numero_ordem serial,
  motivo text not null default 'Recarga Anual' check (motivo in ('Recarga Anual', 'Troca', 'Garantia')),
  deixou_reserva boolean not null default false,
  detalhes_reserva text,
  tecnico_responsavel text,
  data_recolhimento date not null default current_date,
  previsao_devolucao date,
  observacoes text,
  status text not null default 'recolhido' check (status in ('recolhido', 'em_manutencao', 'concluido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_ordens_recolhimento_client_id on public.ordens_recolhimento(client_id);
create index if not exists idx_ordens_recolhimento_status on public.ordens_recolhimento(status);

-- ----------------------------------------------------------------------------
-- 5. TABELA DE ITENS DA ORDEM DE RECOLHIMENTO
-- ----------------------------------------------------------------------------
create table if not exists public.itens_recolhimento (
  id uuid primary key default gen_random_uuid(),
  ordem_id uuid not null references public.ordens_recolhimento(id) on delete cascade,
  extintor_id uuid not null references public.extintores(id) on delete cascade,
  modalidade_recarga text not null default 'Normal' check (modalidade_recarga in ('Reaproveitamento', 'Normal')),
  valor_registrado numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_itens_recolhimento_ordem_id on public.itens_recolhimento(ordem_id);
create index if not exists idx_itens_recolhimento_extintor_id on public.itens_recolhimento(extintor_id);

-- ----------------------------------------------------------------------------
-- 6. POLÍTICAS DE RLS (ROW LEVEL SECURITY)
-- ----------------------------------------------------------------------------
alter table public.cliente_ppci enable row level security;
alter table public.documentos_cliente enable row level security;
alter table public.extintores enable row level security;
alter table public.ordens_recolhimento enable row level security;
alter table public.itens_recolhimento enable row level security;

-- cliente_ppci
drop policy if exists cliente_ppci_authenticated on public.cliente_ppci;
create policy cliente_ppci_authenticated on public.cliente_ppci
  for all to authenticated
  using (true)
  with check (true);

-- documentos_cliente
drop policy if exists documentos_cliente_authenticated on public.documentos_cliente;
create policy documentos_cliente_authenticated on public.documentos_cliente
  for all to authenticated
  using (true)
  with check (true);

-- extintores
drop policy if exists extintores_authenticated on public.extintores;
create policy extintores_authenticated on public.extintores
  for all to authenticated
  using (true)
  with check (true);

-- ordens_recolhimento
drop policy if exists ordens_recolhimento_authenticated on public.ordens_recolhimento;
create policy ordens_recolhimento_authenticated on public.ordens_recolhimento
  for all to authenticated
  using (true)
  with check (true);

-- itens_recolhimento
drop policy if exists itens_recolhimento_authenticated on public.itens_recolhimento;
create policy itens_recolhimento_authenticated on public.itens_recolhimento
  for all to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- 7. STORAGE BUCKET PARA DOCUMENTOS DO CLIENTE
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', true)
on conflict (id) do nothing;

drop policy if exists "client_documents_public_select" on storage.objects;
create policy "client_documents_public_select" on storage.objects
  for select to public
  using (bucket_id = 'client-documents');

drop policy if exists "client_documents_authenticated_insert" on storage.objects;
create policy "client_documents_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'client-documents');

drop policy if exists "client_documents_authenticated_delete" on storage.objects;
create policy "client_documents_authenticated_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'client-documents');
