-- ==========================================================================
-- MIGRATION 002 — FUNCTIONS, TRIGGERS GLOBAIS e RLS BÁSICO
-- ==========================================================================
-- Cria:
--   • handle_updated_at   → atualiza updated_at em qualquer UPDATE
--   • soft_delete_row     → NÃO apaga fisicamente, só marca deleted_at=now()
--   • handle_new_user     → (Auth trigger) cria user_profiles automaticamente
--   • get_my_company_id() → retorna company_id do usuário logado
--   • get_my_role()       → retorna role do usuário logado
--   • companies_manage()  → função trigger para vincular 1ª empresa ao admin
--   • Políticas básicas de RLS em TODAS as tabelas
-- ==========================================================================

-- ==========================================================
-- 1. Funções globais
-- ==========================================================

-- 1.1 updated_at automático
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- 1.2 Soft-delete (troca DELETE por UPDATE deleted_at)
create or replace function public.soft_delete_row()
returns trigger language plpgsql as $$
begin
  if old.deleted_at is null then
    execute format(
      'update %I.%I set deleted_at = now() where id = $1',
      tg_table_schema, tg_table_name
    ) using old.id;
  end if;
  return null;
end; $$;

-- 1.3 Trigger: quando auth.users criado → cria public.user_profiles
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
begin
  v_nome     := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1));
  v_telefone := case when length(coalesce(new.raw_user_meta_data->>'telefone', '')) > 0
                     then regexp_replace(new.raw_user_meta_data->>'telefone', '[^0-9]', '', 'g')
                     else null end;
  v_role     := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'Cliente');

  insert into public.user_profiles (id, nome, email, role, telefone, ativo, created_by)
  values (
    new.id,
    v_nome,
    lower(new.email),
    v_role,
    v_telefone,
    true,
    case when current_setting('request.jwt.claim.sub', true) is not null
         then current_setting('request.jwt.claim.sub', true)::uuid
         else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Atrela handle_new_user ao auth.users (SÓ SE AINDA NÃO EXISTIR)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================================
-- 2. Helpers: empresa e cargo do usuário logado
--    (dropa ANTES para evitar erro 42P13: cannot change return type)
-- ==========================================================

drop function if exists public.get_my_company_id();
drop function if exists public.get_my_role();

create or replace function public.get_my_company_id()
returns uuid language sql stable as $$
  select company_id
  from public.user_profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.get_my_role()
returns public.user_role language sql stable as $$
  select role
  from public.user_profiles
  where id = auth.uid()
  limit 1;
$$;

-- ==========================================================
-- 3. Trigger: primeiro usuário Admin recebe nova empresa automaticamente
--    (caso a tabela companies esteja vazia quando o profile for atualizado p/ Admin)
-- ==========================================================
create or replace function public.companies_manage()
returns trigger language plpgsql as $$
declare
  v_count integer;
  v_company_id uuid;
begin
  if new.role = 'Admin' and new.company_id is null then
    select count(*) into v_count from public.companies;
    if v_count = 0 then
      insert into public.companies (nome, ativo)
      values (coalesce(new.nome, 'Minha Empresa'), true)
      returning id into v_company_id;
      new.company_id := v_company_id;
    else
      new.company_id := (select id from public.companies order by created_at limit 1);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_manage on public.user_profiles;
create trigger user_profiles_manage
  before insert or update on public.user_profiles
  for each row execute procedure public.companies_manage();

-- ==========================================================
-- 3B. SEGURANÇA EXTRA: NÃO-ADMIN NÃO PODE ALTERAR ROLE/COMPANY_ID/ATIVO
--     (Regra implementada via TRIGGER, pois RLS "with check" não tem acesso
--      a pseudocoluna OLD para comparar valores antigos vs novos)
-- ==========================================================
create or replace function public.user_profiles_guard_role()
returns trigger language plpgsql as $$
begin
  -- Quem está logado e NÃO é Admin?
  if public.get_my_role() is distinct from 'Admin' then
    -- Não pode mudar role/cargo, NÃO pode mudar empresa, NÃO pode mudar ativo
    if new.role is distinct from old.role then
      raise exception 'Usuário não autorizado não pode alterar o cargo do perfil (role). Fale com um Administrador.';
    end if;
    if new.company_id is distinct from old.company_id then
      raise exception 'Usuário não autorizado não pode alterar a empresa do perfil (company_id).';
    end if;
    if new.ativo is distinct from old.ativo then
      raise exception 'Usuário não autorizado não pode ativar/desativar perfis.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_guard_role on public.user_profiles;
create trigger user_profiles_guard_role
  before update on public.user_profiles
  for each row execute procedure public.user_profiles_guard_role();

-- ==========================================================
-- 4. Triggers de updated_at e soft_delete — aplica em todas
-- ==========================================================
do $$
declare
  tn text;
begin
  foreach tn in array array[
    'companies','user_profiles','clients','catalog_items','products','product_movements',
    'extinguishers','hoses','service_orders','service_order_items','orders','receipts',
    'leads','quotes','quote_items','documents','tasks','agenda_events',
    'whatsapp_templates','bench_records'
  ] loop
    execute format('drop trigger if exists %I on public.%I', tn || '_updated_at', tn);
    execute format('create trigger %I before update on public.%I for each row execute function public.handle_updated_at()', tn || '_updated_at', tn);

    -- Soft-delete: só em tabelas que TEM a coluna deleted_at
    if tn <> 'service_order_items' and tn <> 'product_movements' and tn <> 'quote_items' then
      execute format('drop trigger if exists %I on public.%I', tn || '_soft_delete', tn);
      execute format('create trigger %I before delete on public.%I for each row execute function public.soft_delete_row()', tn || '_soft_delete', tn);
    end if;
  end loop;
end;
$$;

-- ==========================================================
-- 5. RLS — Row Level Security
--    Habilita + revoga do anon + permite ao authenticated
-- ==========================================================
do $$
declare
  tn text;
  cols text[];
  has_company boolean;
  colnames text[];
begin
  foreach tn in array array[
    'companies','user_profiles','clients','catalog_items','products','product_movements',
    'extinguishers','hoses','service_orders','service_order_items','orders','receipts',
    'leads','quotes','quote_items','documents','tasks','agenda_events',
    'whatsapp_templates','bench_records'
  ] loop
    -- 5.1 Habilita
    execute format('alter table public.%I enable row level security', tn);

    -- 5.2 Revoka anon
    execute format('revoke all on public.%I from anon', tn);

    -- 5.3 Permite authenticated (padrão — refinado depois por política)
    execute format('grant select, insert, update, delete on public.%I to authenticated', tn);

    -- 5.4 Detecta se a tabela tem coluna company_id
    select array_agg(column_name::text) into colnames
    from information_schema.columns
    where table_schema = 'public' and table_name = tn;
    has_company := 'company_id' = any(colnames);

    --------------------
    -- POLÍTICAS
    --------------------
    -- SELECT
    execute format('drop policy if exists %I on public.%I', tn || '_authenticated_select', tn);
    if tn = 'companies' then
      execute format('create policy %I on public.%I for select to authenticated using (true)', tn || '_authenticated_select', tn);
    elsif tn = 'user_profiles' then
      execute format('create policy %I on public.%I for select to authenticated using (auth.uid() is not null)', tn || '_authenticated_select', tn);
    elsif tn = 'documents' then
      execute format($p$create policy %I on public.%I for select to authenticated using (auth.uid() is not null and exists (select 1 from public.clients c where c.id = client_id and c.company_id = public.get_my_company_id()))$p$, tn || '_authenticated_select', tn);
    elsif has_company then
      execute format('create policy %I on public.%I for select to authenticated using (company_id = public.get_my_company_id())', tn || '_authenticated_select', tn);
    else
      execute format('create policy %I on public.%I for select to authenticated using (auth.uid() is not null)', tn || '_authenticated_select', tn);
    end if;

    -- INSERT
    execute format('drop policy if exists %I on public.%I', tn || '_authenticated_insert', tn);
    if tn = 'companies' then
      execute format('create policy %I on public.%I for insert to authenticated with check (public.get_my_role() = ''Admin'')', tn || '_authenticated_insert', tn);
    elsif tn = 'user_profiles' then
      execute format($p$create policy %I on public.%I for insert to authenticated with check (public.get_my_role() = 'Admin' or (id = auth.uid() and role = 'Cliente' and company_id is null))$p$, tn || '_authenticated_insert', tn);
    elsif tn = 'documents' then
      execute format($p$create policy %I on public.%I for insert to authenticated with check (exists (select 1 from public.clients c where c.id = client_id and c.company_id = public.get_my_company_id()))$p$, tn || '_authenticated_insert', tn);
    elsif has_company then
      execute format('create policy %I on public.%I for insert to authenticated with check (company_id = public.get_my_company_id())', tn || '_authenticated_insert', tn);
    else
      execute format('create policy %I on public.%I for insert to authenticated with check (auth.uid() is not null)', tn || '_authenticated_insert', tn);
    end if;

    -- UPDATE
    execute format('drop policy if exists %I on public.%I', tn || '_authenticated_update', tn);
    if tn = 'companies' then
      execute format('create policy %I on public.%I for update to authenticated using (public.get_my_role() = ''Admin'') with check (public.get_my_role() = ''Admin'')', tn || '_authenticated_update', tn);
    elsif tn = 'user_profiles' then
      execute format($p$create policy %I on public.%I for update to authenticated using (public.get_my_role() = 'Admin' or id = auth.uid()) with check (public.get_my_role() = 'Admin' or id = auth.uid())$p$, tn || '_authenticated_update', tn);
    elsif tn = 'documents' then
      execute format($p$create policy %I on public.%I for update to authenticated using (exists (select 1 from public.clients c where c.id = client_id and c.company_id = public.get_my_company_id())) with check (exists (select 1 from public.clients c where c.id = client_id and c.company_id = public.get_my_company_id()))$p$, tn || '_authenticated_update', tn);
    elsif has_company then
      execute format('create policy %I on public.%I for update to authenticated using (company_id = public.get_my_company_id()) with check (company_id = public.get_my_company_id())', tn || '_authenticated_update', tn);
    else
      execute format('create policy %I on public.%I for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)', tn || '_authenticated_update', tn);
    end if;

    -- DELETE (soft-delete via trigger, mas a policy controla quem pode chamá-lo)
    execute format('drop policy if exists %I on public.%I', tn || '_authenticated_delete', tn);
    if tn = 'companies' then
      execute format('create policy %I on public.%I for delete to authenticated using (public.get_my_role() = ''Admin'')', tn || '_authenticated_delete', tn);
    elsif tn = 'user_profiles' then
      execute format('create policy %I on public.%I for delete to authenticated using (public.get_my_role() = ''Admin'')', tn || '_authenticated_delete', tn);
    elsif tn = 'documents' then
      execute format($p$create policy %I on public.%I for delete to authenticated using (exists (select 1 from public.clients c where c.id = client_id and c.company_id = public.get_my_company_id()))$p$, tn || '_authenticated_delete', tn);
    elsif has_company then
      execute format('create policy %I on public.%I for delete to authenticated using (company_id = public.get_my_company_id())', tn || '_authenticated_delete', tn);
    else
      execute format('create policy %I on public.%I for delete to authenticated using (auth.uid() is not null)', tn || '_authenticated_delete', tn);
    end if;

  end loop;
end;
$$;
