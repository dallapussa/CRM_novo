-- ==========================================================================
-- SCRIPT DE CRIAÇÃO DO PRIMEIRO ADMINISTRADOR (Seed / First Admin Setup)
-- ==========================================================================
-- COMO USAR (passo a passo visual):
--
-- PASSO 1 — Criar usuário no painel:
--   • Abra https://app.supabase.com → seu projeto
--   • Menu esquerdo: 🔐 Authentication → Users → botão verde "Add user"
--   • Email: admin@suaempresa.com.br
--   • Senha: crie uma SENHA FORTE e guarde
--   • Marque "Auto Confirm User?" → SIM (✓)
--   • Clique em "Create user"
--
-- PASSO 2 — Copiar 2 UUIDs importantes:
--   a) UUID DO USUÁRIO: na mesma tela Users, clique para expandir o admin
--      → copie o valor do campo UID.
--   b) UUID DA EMPRESA: abra SQL Editor, execute:
--        select id, nome from public.companies limit 1;
--      (se não aparecer nenhuma, crie uma empresa primeiro usando o bloco
--       comentado abaixo)
--
-- PASSO 3 — Edite as 2 linhas NO FINAL deste arquivo e EXECUTE no SQL Editor
-- ==========================================================================

-- Descomente ESTE BLOCO abaixo SÓ SE você ainda NÃO TEM empresa cadastrada:
/*
insert into public.companies (id, nome, cnpj, email, telefone, ativo)
values (
  gen_random_uuid(),
  'Nome da Sua Empresa LTDA',
  '00000000000100',
  'contato@suaempresa.com.br',
  '1130001234',
  true
);
-- Depois rode novamente: select id from public.companies limit 1;
*/

-- ==========================================================================
-- EDITE ABAIXO antes de executar!
-- Substitua TUDO que está entre aspas simples, mantendo as aspas:
-- ==========================================================================

update public.user_profiles
set
  role       = 'Admin',
  company_id = 'COLE_UUID_DA_EMPRESA_AQUI',
  ativo      = true
where id = 'COLE_UUID_DO_USUARIO_ADMIN_AQUI';

-- Verificação (rode após o update para confirmar):
-- select id, nome, email, role, ativo, company_id from public.user_profiles;
