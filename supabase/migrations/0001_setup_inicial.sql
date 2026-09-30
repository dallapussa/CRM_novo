-- ============================================================
-- ExtinControl CRM — Migration V1: Setup inicial do banco
-- ============================================================
-- Como usar:
-- 1. Abra o Supabase Dashboard → SQL Editor
-- 2. Clique em "New query"
-- 3. Cole TODO este conteúdo e clique em "RUN" (Executar)
-- ============================================================

-- ============================================================
-- 0. EXTENSÕES
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. TABELA: profiles (estende auth.users)
-- ============================================================
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade not null,
    role text not null default 'cliente' check (role in ('admin','comercial','tecnico','financeiro','cliente','terceiro')),
    full_name text not null,
    phone text,
    document text,
    company_name text,
    address jsonb default '{}'::jsonb,
    avatar_url text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ============================================================
-- 2. TABELA: customers (clientes da empresa)
-- ============================================================
create table if not exists public.customers (
    id uuid primary key default gen_random_uuid() not null,
    type text not null check (type in ('pf','pj')),
    name text not null,
    document text not null,
    ie_rg text,
    phone1 text not null,
    phone2 text,
    email text,
    address jsonb default '{}'::jsonb,
    notes text,
    is_active boolean not null default true,
    created_by uuid not null references public.profiles(id),
    owner_id uuid references public.profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_customers_created_by on public.customers(created_by);
create index if not exists idx_customers_owner_id on public.customers(owner_id);
create index if not exists idx_customers_is_active on public.customers(is_active);

alter table public.customers enable row level security;

-- ============================================================
-- 3. TABELA: products
-- ============================================================
create table if not exists public.products (
    id uuid primary key default gen_random_uuid() not null,
    type text not null check (type in ('produto','servico')),
    category text not null,
    sku text unique,
    name text not null,
    description text,
    unit text not null default 'un',
    cost_price numeric(12,2) default 0,
    sale_price numeric(12,2) not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_products_type on public.products(type);
create index if not exists idx_products_is_active on public.products(is_active);

alter table public.products enable row level security;

-- ============================================================
-- 4. TABELA: extinguishers (extintores dos clientes)
-- ============================================================
create table if not exists public.extinguishers (
    id uuid primary key default gen_random_uuid() not null,
    customer_id uuid not null references public.customers(id) on delete cascade,
    type text not null,
    capacity text not null,
    serial_number text not null,
    manufacturer text,
    manufacturing_date date,
    last_recharge_date date,
    expiration_date date not null,
    next_inspection_date date,
    location text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_extinguishers_customer_id on public.extinguishers(customer_id);
create index if not exists idx_extinguishers_expiration on public.extinguishers(expiration_date);

alter table public.extinguishers enable row level security;

-- ============================================================
-- 5. TABELA: service_orders (ordens de serviço) — TABELA PRINCIPAL
-- ============================================================
create sequence if not exists public.service_order_number_seq;

create table if not exists public.service_orders (
    id uuid primary key default gen_random_uuid() not null,
    number integer not null default nextval('public.service_order_number_seq') unique,
    customer_id uuid not null references public.customers(id) on delete restrict,
    technician_id uuid references public.profiles(id) on delete set null,
    scheduled_date date not null,
    scheduled_period text check (scheduled_period in ('manha','tarde','integral')),
    priority text not null default 'media' check (priority in ('baixa','media','alta','urgente')),
    status text not null default 'pendente' check (status in ('pendente','andamento','atrasada','concluida','cancelada')),
    type text not null,
    description text not null,
    technical_report text,
    arrival_time timestamptz,
    departure_time timestamptz,
    signature_url text,
    signature_name text,
    subtotal numeric(12,2) not null default 0,
    discount numeric(12,2) not null default 0,
    total numeric(12,2) not null default 0,
    cancellation_reason text,
    created_by uuid not null references public.profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
);

create index if not exists idx_so_customer on public.service_orders(customer_id);
create index if not exists idx_so_technician on public.service_orders(technician_id);
create index if not exists idx_so_status on public.service_orders(status);
create index if not exists idx_so_scheduled on public.service_orders(scheduled_date);
create index if not exists idx_so_created on public.service_orders(created_at desc);

alter table public.service_orders enable row level security;

-- ============================================================
-- 6. TABELA: service_order_items (itens da OS)
-- ============================================================
create table if not exists public.service_order_items (
    id uuid primary key default gen_random_uuid() not null,
    service_order_id uuid not null references public.service_orders(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    description text not null,
    quantity numeric(10,2) not null default 1,
    unit_price numeric(12,2) not null default 0,
    total_price numeric(12,2) not null default 0,
    type text not null check (type in ('produto','servico','mao_obra')) default 'servico',
    created_at timestamptz not null default now()
);

create index if not exists idx_so_items_order on public.service_order_items(service_order_id);
alter table public.service_order_items enable row level security;

-- ============================================================
-- 7. TABELA: os_photos (fotos das OS)
-- ============================================================
create table if not exists public.os_photos (
    id uuid primary key default gen_random_uuid() not null,
    service_order_id uuid not null references public.service_orders(id) on delete cascade,
    storage_path text not null,
    url text not null,
    caption text,
    uploaded_by uuid not null references public.profiles(id),
    created_at timestamptz not null default now()
);

create index if not exists idx_os_photos_so on public.os_photos(service_order_id);
alter table public.os_photos enable row level security;

-- ============================================================
-- 8. TABELA: invoices (faturas / financeiro)
-- ============================================================
create sequence if not exists public.invoice_number_seq;

create table if not exists public.invoices (
    id uuid primary key default gen_random_uuid() not null,
    number integer not null default nextval('public.invoice_number_seq') unique,
    customer_id uuid not null references public.customers(id) on delete restrict,
    service_order_id uuid references public.service_orders(id) on delete set null,
    type text not null check (type in ('receber','pagar')),
    status text not null default 'aberta' check (status in ('aberta','parcial','paga','atrasada','cancelada')),
    description text not null,
    amount numeric(12,2) not null,
    amount_paid numeric(12,2) not null default 0,
    due_date date not null,
    issue_date date not null default current_date,
    payment_date date,
    payment_method text check (payment_method in ('boleto','pix','cartao','dinheiro','transferencia')),
    bank_slip_url text,
    notes text,
    created_by uuid not null references public.profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_inv_customer on public.invoices(customer_id);
create index if not exists idx_inv_status on public.invoices(status);
create index if not exists idx_inv_due_date on public.invoices(due_date);
create index if not exists idx_inv_type on public.invoices(type);

alter table public.invoices enable row level security;

-- ============================================================
-- 9. TABELA: customers_profiles (ligação N:N cliente × usuário portal)
-- ============================================================
create table if not exists public.customers_profiles (
    customer_id uuid not null references public.customers(id) on delete cascade,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (customer_id, profile_id)
);

alter table public.customers_profiles enable row level security;

-- ============================================================
-- 10. TRIGGER: auto updated_at em todas as tabelas
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
    for each row execute function public.handle_updated_at();

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers
    for each row execute function public.handle_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
    for each row execute function public.handle_updated_at();

drop trigger if exists extinguishers_updated_at on public.extinguishers;
create trigger extinguishers_updated_at before update on public.extinguishers
    for each row execute function public.handle_updated_at();

drop trigger if exists so_updated_at on public.service_orders;
create trigger so_updated_at before update on public.service_orders
    for each row execute function public.handle_updated_at();

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices
    for each row execute function public.handle_updated_at();

-- ============================================================
-- 11. TRIGGER: Cria profile automaticamente quando o usuário é criado no auth
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_role text;
    v_name text;
begin
    v_role := coalesce(new.raw_user_meta_data->>'role', 'cliente');
    v_name := coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Usuário');

    insert into public.profiles (id, role, full_name, phone, document, company_name)
    values (
        new.id,
        case when v_role in ('admin','comercial','tecnico','financeiro','cliente','terceiro') then v_role else 'cliente' end,
        v_name,
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'document',
        new.raw_user_meta_data->>'company_name'
    )
    on conflict (id) do nothing;

    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ============================================================
-- 12. POLÍTICAS RLS (Row Level Security)
-- ============================================================

-- Helper: helpers para saber o role do usuário logado
create or replace function public.get_my_role()
returns text as $$
begin
    return (
        select role from public.profiles where id = auth.uid() limit 1
    );
end;
$$ language plpgsql stable security definer;

-- ================ profiles =================
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
using (
    (public.get_my_role() in ('admin','comercial','financeiro','tecnico'))
    or (id = auth.uid())
);

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles for insert
with check (public.get_my_role() = 'admin' or id = auth.uid());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
using (public.get_my_role() = 'admin' or id = auth.uid())
with check (public.get_my_role() = 'admin' or id = auth.uid());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles for delete
using (public.get_my_role() = 'admin');

-- ================ customers =================
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers for select
using (
    public.get_my_role() in ('admin','comercial','financeiro','tecnico')
    or (
        public.get_my_role() in ('cliente','terceiro')
        and id in (select cp.customer_id from public.customers_profiles cp where cp.profile_id = auth.uid())
    )
);

drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert" on public.customers for insert
with check (public.get_my_role() in ('admin','comercial','financeiro'));

drop policy if exists "customers_update" on public.customers;
create policy "customers_update" on public.customers for update
using (public.get_my_role() in ('admin','comercial','financeiro'))
with check (public.get_my_role() in ('admin','comercial','financeiro'));

drop policy if exists "customers_delete_admin" on public.customers;
create policy "customers_delete_admin" on public.customers for delete
using (public.get_my_role() = 'admin');

-- ================ products =================
drop policy if exists "products_select_all" on public.products;
create policy "products_select_all" on public.products for select
using (auth.uid() is not null);

drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products for insert
with check (public.get_my_role() in ('admin','comercial'));

drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products for update
using (public.get_my_role() in ('admin','comercial'))
with check (public.get_my_role() in ('admin','comercial'));

drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin" on public.products for delete
using (public.get_my_role() = 'admin');

-- ================ extinguishers =================
drop policy if exists "extinguishers_select" on public.extinguishers;
create policy "extinguishers_select" on public.extinguishers for select
using (
    public.get_my_role() in ('admin','comercial','financeiro','tecnico')
    or (
        public.get_my_role() = 'cliente'
        and customer_id in (select cp.customer_id from public.customers_profiles cp where cp.profile_id = auth.uid())
    )
);

drop policy if exists "extinguishers_insert" on public.extinguishers;
create policy "extinguishers_insert" on public.extinguishers for insert
with check (public.get_my_role() in ('admin','tecnico'));

drop policy if exists "extinguishers_update" on public.extinguishers;
create policy "extinguishers_update" on public.extinguishers for update
using (public.get_my_role() in ('admin','tecnico'))
with check (public.get_my_role() in ('admin','tecnico'));

drop policy if exists "extinguishers_delete_admin" on public.extinguishers;
create policy "extinguishers_delete_admin" on public.extinguishers for delete
using (public.get_my_role() = 'admin');

-- ================ service_orders =================
drop policy if exists "so_select" on public.service_orders;
create policy "so_select" on public.service_orders for select
using (
    public.get_my_role() in ('admin','comercial','financeiro')
    or (public.get_my_role() = 'tecnico' and technician_id = auth.uid())
    or (
        public.get_my_role() in ('cliente','terceiro')
        and customer_id in (select cp.customer_id from public.customers_profiles cp where cp.profile_id = auth.uid())
    )
);

drop policy if exists "so_insert" on public.service_orders;
create policy "so_insert" on public.service_orders for insert
with check (public.get_my_role() in ('admin','comercial'));

drop policy if exists "so_update" on public.service_orders;
create policy "so_update" on public.service_orders for update
using (
    public.get_my_role() in ('admin','comercial')
    or (public.get_my_role() = 'tecnico' and technician_id = auth.uid())
);

drop policy if exists "so_delete_admin" on public.service_orders;
create policy "so_delete_admin" on public.service_orders for delete
using (public.get_my_role() = 'admin');

-- ================ service_order_items =================
drop policy if exists "so_items_select" on public.service_order_items;
create policy "so_items_select" on public.service_order_items for select
using (exists (
    select 1 from public.service_orders so
    where so.id = service_order_items.service_order_id
));

drop policy if exists "so_items_insert" on public.service_order_items;
create policy "so_items_insert" on public.service_order_items for insert
with check (
    public.get_my_role() in ('admin','comercial')
);

drop policy if exists "so_items_update" on public.service_order_items;
create policy "so_items_update" on public.service_order_items for update
using (public.get_my_role() in ('admin','comercial'))
with check (public.get_my_role() in ('admin','comercial'));

drop policy if exists "so_items_delete" on public.service_order_items;
create policy "so_items_delete" on public.service_order_items for delete
using (public.get_my_role() in ('admin','comercial'));

-- ================ os_photos =================
drop policy if exists "os_photos_select" on public.os_photos;
create policy "os_photos_select" on public.os_photos for select
using (exists (
    select 1 from public.service_orders so where so.id = os_photos.service_order_id
));

drop policy if exists "os_photos_insert" on public.os_photos;
create policy "os_photos_insert" on public.os_photos for insert
with check (
    public.get_my_role() in ('admin','tecnico')
);

drop policy if exists "os_photos_delete" on public.os_photos;
create policy "os_photos_delete" on public.os_photos for delete
using (public.get_my_role() in ('admin','tecnico'));

-- ================ invoices =================
drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices for select
using (
    public.get_my_role() in ('admin','financeiro','comercial')
    or (
        public.get_my_role() in ('cliente','terceiro')
        and customer_id in (select cp.customer_id from public.customers_profiles cp where cp.profile_id = auth.uid())
    )
);

drop policy if exists "invoices_insert" on public.invoices;
create policy "invoices_insert" on public.invoices for insert
with check (public.get_my_role() in ('admin','financeiro'));

drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update" on public.invoices for update
using (public.get_my_role() in ('admin','financeiro'))
with check (public.get_my_role() in ('admin','financeiro'));

drop policy if exists "invoices_delete_admin" on public.invoices;
create policy "invoices_delete_admin" on public.invoices for delete
using (public.get_my_role() = 'admin');

-- ================ customers_profiles =================
drop policy if exists "cp_select" on public.customers_profiles;
create policy "cp_select" on public.customers_profiles for select
using (true);

drop policy if exists "cp_insert" on public.customers_profiles;
create policy "cp_insert" on public.customers_profiles for insert
with check (public.get_my_role() = 'admin');

drop policy if exists "cp_delete" on public.customers_profiles;
create policy "cp_delete" on public.customers_profiles for delete
using (public.get_my_role() = 'admin');

-- ============================================================
-- 13. PRIMEIRO USUÁRIO ADMIN (opcional — crie o primeiro user manualmente depois!)
-- ============================================================
-- Depois de criar o primeiro usuário em: Authentication → Users → Add user
-- (usando o mesmo e-mail que você vai usar), se o role não for admin, rode:
-- update public.profiles set role = 'admin', full_name = 'Administrador' where id = auth.uid();
-- OU (direto pelo ID):
-- update public.profiles set role = 'admin' where id = '<UUID-DO-USUARIO>';
