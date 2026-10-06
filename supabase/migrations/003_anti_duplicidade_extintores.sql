-- ============================================================================
-- 003_anti_duplicidade_extintores.sql
-- Trava definitiva no nível do banco de dados (PostgreSQL) para impedir
-- recolhimento em duplicidade do mesmo extintor para a bancada / oficina.
-- ============================================================================

-- 1. FUNÇÃO DE VALIDAÇÃO ANTI-DUPLICIDADE
CREATE OR REPLACE FUNCTION public.check_extintor_duplicidade_recolhimento()
RETURNS trigger AS $$
DECLARE
  v_status text;
  v_identificacao text;
  v_ordem_num integer;
BEGIN
  -- A. Busca dados e status atual do extintor
  SELECT status, identificacao INTO v_status, v_identificacao
  FROM public.extintores
  WHERE id = NEW.extintor_id;

  -- Se o extintor já estiver marcado como 'em_bancada', impede novo recolhimento
  IF v_status = 'em_bancada' THEN
    RAISE EXCEPTION 'BLOQUEIO DE DUPLICIDADE: O extintor "%" já se encontra na bancada da oficina (status: em_bancada). Conclua a devolução antes de recolher novamente.',
      COALESCE(v_identificacao, NEW.extintor_id::text);
  END IF;

  -- B. Busca se já existe outra ordem de recolhimento ativa/aberta para este extintor
  SELECT o.numero_ordem INTO v_ordem_num
  FROM public.itens_recolhimento ir
  JOIN public.ordens_recolhimento o ON o.id = ir.ordem_id
  WHERE ir.extintor_id = NEW.extintor_id
    AND o.status <> 'concluido'
    AND o.id <> NEW.ordem_id
  LIMIT 1;

  IF v_ordem_num IS NOT NULL THEN
    RAISE EXCEPTION 'BLOQUEIO DE DUPLICIDADE: O extintor "%" já está vinculado à Ordem de Serviço #% que ainda não foi concluída/entregue.',
      COALESCE(v_identificacao, NEW.extintor_id::text), v_ordem_num;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER NO ITENS_RECOLHIMENTO (Executa antes da inserção)
DROP TRIGGER IF EXISTS trg_check_extintor_duplicidade ON public.itens_recolhimento;
CREATE TRIGGER trg_check_extintor_duplicidade
BEFORE INSERT ON public.itens_recolhimento
FOR EACH ROW
EXECUTE FUNCTION public.check_extintor_duplicidade_recolhimento();

-- 3. ÍNDICE CONDICIONAL PARA ALTA PERFORMANCE NA BUSCA DE EXTINTORES EM ABERTO
CREATE INDEX IF NOT EXISTS idx_itens_recolhimento_anti_duplicidade
ON public.itens_recolhimento (extintor_id, ordem_id);
