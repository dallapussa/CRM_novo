-- ============================================================================
-- EXTINCONTROL / FIRE CRM — MIGRAÇÃO 005
-- Segurança RLS Multi-Tenancy Definitiva, Vínculo de Portal e Transações Atômicas
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. GARANTE COLUNA client_id EM user_profiles PARA O PORTAL DO CLIENTE
-- ----------------------------------------------------------------------------
alter table public.user_profiles add column if not exists client_id uuid references public.clients(id) on delete set null;
create index if not exists idx_user_profiles_client_id on public.user_profiles(client_id);

-- ----------------------------------------------------------------------------
-- 2. CAMPOS ESTRUTURADOS DE PAGAMENTO EM ordens_recolhimento E receipts
-- ----------------------------------------------------------------------------
alter table public.ordens_recolhimento add column if not exists forma_pagamento text default 'PIX';
alter table public.ordens_recolhimento add column if not exists status_pagamento text default 'PENDENTE';
alter table public.receipts add column if not exists lote_id uuid references public.lotes_recolhimento(id) on delete set null;
create index if not exists idx_receipts_lote_id on public.receipts(lote_id);

-- ----------------------------------------------------------------------------
-- 3. REVOGAÇÃO DAS POLÍTICAS DE RLS PERMISSIVAS (using true) DA MIGRAÇÃO 002 e 004
-- ----------------------------------------------------------------------------
drop policy if exists app_settings_authenticated on public.app_settings;
drop policy if exists cliente_ppci_authenticated on public.cliente_ppci;
drop policy if exists documentos_cliente_authenticated on public.documentos_cliente;
drop policy if exists extintores_authenticated on public.extintores;
drop policy if exists ordens_recolhimento_authenticated on public.ordens_recolhimento;
drop policy if exists itens_recolhimento_authenticated on public.itens_recolhimento;
drop policy if exists lotes_recolhimento_authenticated on public.lotes_recolhimento;

-- ----------------------------------------------------------------------------
-- 4. POLÍTICAS SEGURAS MULTI-TENANT PARA app_settings (Isolamento por Empresa)
-- ----------------------------------------------------------------------------
alter table public.app_settings enable row level security;

drop policy if exists app_settings_tenant_select on public.app_settings;
create policy app_settings_tenant_select on public.app_settings
  for select to authenticated
  using (
    company_id = public.get_my_company_id()
  );

drop policy if exists app_settings_admin_insert on public.app_settings;
create policy app_settings_admin_insert on public.app_settings
  for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    and public.get_my_role() = 'Admin'
  );

drop policy if exists app_settings_admin_update on public.app_settings;
create policy app_settings_admin_update on public.app_settings
  for update to authenticated
  using (
    company_id = public.get_my_company_id()
    and public.get_my_role() = 'Admin'
  )
  with check (
    company_id = public.get_my_company_id()
    and public.get_my_role() = 'Admin'
  );

drop policy if exists app_settings_admin_delete on public.app_settings;
create policy app_settings_admin_delete on public.app_settings
  for delete to authenticated
  using (
    company_id = public.get_my_company_id()
    and public.get_my_role() = 'Admin'
  );

-- ----------------------------------------------------------------------------
-- 5. POLÍTICAS SEGURAS PARA extintores (Isolamento por Empresa e Portal)
-- ----------------------------------------------------------------------------
alter table public.extintores enable row level security;

drop policy if exists extintores_tenant_select on public.extintores;
create policy extintores_tenant_select on public.extintores
  for select to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = extintores.client_id
        and c.company_id = public.get_my_company_id()
    )
    or client_id = public.get_my_client_id()
  );

drop policy if exists extintores_tenant_insert on public.extintores;
create policy extintores_tenant_insert on public.extintores
  for insert to authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = extintores.client_id
        and c.company_id = public.get_my_company_id()
    )
  );

drop policy if exists extintores_tenant_update on public.extintores;
create policy extintores_tenant_update on public.extintores
  for update to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = extintores.client_id
        and c.company_id = public.get_my_company_id()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = extintores.client_id
        and c.company_id = public.get_my_company_id()
    )
  );

drop policy if exists extintores_tenant_delete on public.extintores;
create policy extintores_tenant_delete on public.extintores
  for delete to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = extintores.client_id
        and c.company_id = public.get_my_company_id()
    )
  );

-- ----------------------------------------------------------------------------
-- 6. POLÍTICAS SEGURAS PARA ordens_recolhimento E itens_recolhimento
-- ----------------------------------------------------------------------------
alter table public.ordens_recolhimento enable row level security;

drop policy if exists ordens_tenant_select on public.ordens_recolhimento;
create policy ordens_tenant_select on public.ordens_recolhimento
  for select to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = ordens_recolhimento.client_id
        and c.company_id = public.get_my_company_id()
    )
    or client_id = public.get_my_client_id()
  );

drop policy if exists ordens_tenant_all on public.ordens_recolhimento;
create policy ordens_tenant_all on public.ordens_recolhimento
  for all to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = ordens_recolhimento.client_id
        and c.company_id = public.get_my_company_id()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = ordens_recolhimento.client_id
        and c.company_id = public.get_my_company_id()
    )
  );

alter table public.itens_recolhimento enable row level security;

drop policy if exists itens_recolhimento_tenant on public.itens_recolhimento;
create policy itens_recolhimento_tenant on public.itens_recolhimento
  for all to authenticated
  using (
    exists (
      select 1 from public.ordens_recolhimento o
      join public.clients c on c.id = o.client_id
      where o.id = itens_recolhimento.ordem_id
        and c.company_id = public.get_my_company_id()
    )
    or exists (
      select 1 from public.ordens_recolhimento o
      where o.id = itens_recolhimento.ordem_id
        and o.client_id = public.get_my_client_id()
    )
  )
  with check (
    exists (
      select 1 from public.ordens_recolhimento o
      join public.clients c on c.id = o.client_id
      where o.id = itens_recolhimento.ordem_id
        and c.company_id = public.get_my_company_id()
    )
  );

-- ----------------------------------------------------------------------------
-- 7. POLÍTICAS SEGURAS PARA lotes_recolhimento
-- ----------------------------------------------------------------------------
alter table public.lotes_recolhimento enable row level security;

drop policy if exists lotes_tenant_policy on public.lotes_recolhimento;
create policy lotes_tenant_policy on public.lotes_recolhimento
  for all to authenticated
  using (
    company_id = public.get_my_company_id()
  )
  with check (
    company_id = public.get_my_company_id()
  );

-- ----------------------------------------------------------------------------
-- 8. POLÍTICAS SEGURAS PARA documentos_cliente E cliente_ppci
-- ----------------------------------------------------------------------------
alter table public.documentos_cliente enable row level security;

drop policy if exists documentos_cliente_tenant on public.documentos_cliente;
create policy documentos_cliente_tenant on public.documentos_cliente
  for all to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = documentos_cliente.client_id
        and c.company_id = public.get_my_company_id()
    )
    or client_id = public.get_my_client_id()
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = documentos_cliente.client_id
        and c.company_id = public.get_my_company_id()
    )
  );

alter table public.cliente_ppci enable row level security;

drop policy if exists cliente_ppci_tenant on public.cliente_ppci;
create policy cliente_ppci_tenant on public.cliente_ppci
  for all to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = cliente_ppci.client_id
        and c.company_id = public.get_my_company_id()
    )
    or client_id = public.get_my_client_id()
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = cliente_ppci.client_id
        and c.company_id = public.get_my_company_id()
    )
  );

-- ----------------------------------------------------------------------------
-- 9. FUNÇÃO RPC TRANSACIONAL: BAIXA DE ORDENS, RENOVAÇÃO E LANÇAMENTO EM RECEIPTS
-- ----------------------------------------------------------------------------
create or replace function public.confirmar_devolucao_e_gerar_recibo(
  p_order_ids uuid[],
  p_client_id uuid,
  p_company_id uuid,
  p_amount numeric,
  p_amount_paid numeric,
  p_payment_method text,
  p_is_paid boolean,
  p_notes text,
  p_due_date date,
  p_lote_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_extintor_ids uuid[];
  v_client_name text;
  v_numeros_os text;
  v_receipt_id uuid;
  v_receipt_numero bigint;
  v_today date := current_date;
  v_next_year date := current_date + interval '1 year';
  v_pendentes_lote integer;
begin
  -- 1. Validação básica
  if p_order_ids is null or array_length(p_order_ids, 1) = 0 then
    raise exception 'Nenhuma ordem de recolhimento informada.';
  end if;

  -- 2. Busca nome do cliente
  select coalesce(razao_social, nome_fantasia, name, 'Cliente')
  into v_client_name
  from public.clients
  where id = p_client_id;

  -- 3. Identifica extintores vinculados a essas ordens
  select array_agg(distinct ir.extintor_id)
  into v_extintor_ids
  from public.itens_recolhimento ir
  where ir.ordem_id = any(p_order_ids);

  -- 4. Atualiza os extintores: status 'no_cliente' e renova validade em +1 ano
  if v_extintor_ids is not null and array_length(v_extintor_ids, 1) > 0 then
    update public.extintores
    set
      status = 'no_cliente',
      data_ultima_recarga = v_today,
      data_vencimento = v_next_year,
      updated_at = now()
    where id = any(v_extintor_ids);
  end if;

  -- 5. Atualiza ordens de recolhimento para 'concluido' com forma de pagamento
  update public.ordens_recolhimento
  set
    status = 'concluido',
    forma_pagamento = p_payment_method,
    status_pagamento = case when p_is_paid then 'QUITADO' else 'PENDENTE' end,
    updated_at = now()
  where id = any(p_order_ids);

  -- 6. Obtém concatenação dos números de OS
  select string_agg(numero_ordem::text, ', #')
  into v_numeros_os
  from public.ordens_recolhimento
  where id = any(p_order_ids);

  -- 7. Lança transação atômica em public.receipts
  insert into public.receipts (
    company_id,
    client_id,
    lote_id,
    invoice_type,
    status,
    amount,
    amount_paid,
    due_at,
    issued_at,
    received_at,
    payment_method,
    description,
    notes,
    created_by
  ) values (
    p_company_id,
    p_client_id,
    p_lote_id,
    'receber',
    case when p_is_paid then 'Recebido' else 'Pendente' end,
    p_amount,
    case when p_is_paid then p_amount_paid else 0 end,
    coalesce(p_due_date, v_today),
    v_today,
    case when p_is_paid then now() else null end,
    p_payment_method,
    'Recarga / Devolução OS #' || coalesce(v_numeros_os, '1') || ' - ' || coalesce(v_client_name, 'Cliente'),
    p_notes,
    auth.uid()
  )
  returning id, numero into v_receipt_id, v_receipt_numero;

  -- 8. Se pertencer a lote, verifica se todas as outras ordens do lote foram concluídas
  if p_lote_id is not null then
    select count(*)
    into v_pendentes_lote
    from public.ordens_recolhimento
    where lote_id = p_lote_id
      and status <> 'concluido';

    if v_pendentes_lote = 0 then
      update public.lotes_recolhimento
      set
        status = 'concluido',
        updated_at = now()
      where id = p_lote_id;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'receipt_id', v_receipt_id,
    'receipt_numero', v_receipt_numero,
    'extintores_count', coalesce(array_length(v_extintor_ids, 1), 0),
    'numeros_os', v_numeros_os
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. VINCULAÇÃO AUTOMÁTICA DE client_id E company_id NA TRIGGER handle_new_user
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_telefone text;
  v_nome text;
  v_role public.user_role;
  v_client_id uuid;
  v_company_id uuid;
begin
  v_nome     := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1));
  v_telefone := case when length(coalesce(new.raw_user_meta_data->>'telefone', '')) > 0
                     then regexp_replace(new.raw_user_meta_data->>'telefone', '[^0-9]', '', 'g')
                     else null end;
  v_role     := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'Cliente');

  v_client_id := case when length(coalesce(new.raw_user_meta_data->>'client_id', '')) > 0
                      then (new.raw_user_meta_data->>'client_id')::uuid
                      else null end;

  v_company_id := case when length(coalesce(new.raw_user_meta_data->>'company_id', '')) > 0
                       then (new.raw_user_meta_data->>'company_id')::uuid
                       else null end;

  insert into public.user_profiles (id, nome, email, role, telefone, ativo, client_id, company_id, created_by)
  values (
    new.id,
    v_nome,
    lower(new.email),
    v_role,
    v_telefone,
    true,
    v_client_id,
    v_company_id,
    case when current_setting('request.jwt.claim.sub', true) is not null
         then current_setting('request.jwt.claim.sub', true)::uuid
         else null
    end
  )
  on conflict (id) do update set
    nome = coalesce(excluded.nome, public.user_profiles.nome),
    email = coalesce(excluded.email, public.user_profiles.email),
    role = coalesce(excluded.role, public.user_profiles.role),
    client_id = coalesce(excluded.client_id, public.user_profiles.client_id),
    company_id = coalesce(excluded.company_id, public.user_profiles.company_id),
    telefone = coalesce(excluded.telefone, public.user_profiles.telefone);

  return new;
end;
$$;

