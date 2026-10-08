import { createClient } from "@/lib/supabase/client";

export interface ExtinguisherModel {
  id: string;
  nome: string; // Ex: "Pó ABC - 4kg"
  agente: string; // Ex: "Pó ABC"
  capacidade: string; // Ex: "4kg"
  custo_normal: number; // Custo de recarga com troca de pó/carga completa
  custo_reaproveitamento: number; // Custo quando o pó é aprovado e reaproveitado
  preco_padrao: number; // Preço padrão sugerido de venda para o cliente
  ativo: boolean;
  company_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const AGENTES_PRESET = [
  "Pó ABC",
  "Pó BC",
  "CO2 (Dióxido de Carbono)",
  "Água Pressurizada (AP)",
  "Espuma Mecânica",
  "Pó Classe D (Metais)",
  "Pó Classe K (Cozinhas)",
  "Halotron / Gás Limpo",
];

export const CAPACIDADES_PRESET = [
  "1kg",
  "2kg",
  "4kg",
  "6kg",
  "8kg",
  "10kg",
  "12kg",
  "20kg",
  "50kg",
  "70kg",
  "10L",
  "75L",
];

export const DEFAULT_EXTINGUISHER_MODELS: ExtinguisherModel[] = [
  {
    id: "preset-abc-4kg",
    nome: "Pó ABC - 4kg",
    agente: "Pó ABC",
    capacidade: "4kg",
    custo_normal: 18.0,
    custo_reaproveitamento: 6.0,
    preco_padrao: 45.0,
    ativo: true,
  },
  {
    id: "preset-abc-6kg",
    nome: "Pó ABC - 6kg",
    agente: "Pó ABC",
    capacidade: "6kg",
    custo_normal: 24.0,
    custo_reaproveitamento: 7.5,
    preco_padrao: 55.0,
    ativo: true,
  },
  {
    id: "preset-abc-8kg",
    nome: "Pó ABC - 8kg",
    agente: "Pó ABC",
    capacidade: "8kg",
    custo_normal: 30.0,
    custo_reaproveitamento: 9.0,
    preco_padrao: 68.0,
    ativo: true,
  },
  {
    id: "preset-abc-12kg",
    nome: "Pó ABC - 12kg",
    agente: "Pó ABC",
    capacidade: "12kg",
    custo_normal: 42.0,
    custo_reaproveitamento: 12.0,
    preco_padrao: 95.0,
    ativo: true,
  },
  {
    id: "preset-bc-4kg",
    nome: "Pó BC - 4kg",
    agente: "Pó BC",
    capacidade: "4kg",
    custo_normal: 16.0,
    custo_reaproveitamento: 5.5,
    preco_padrao: 40.0,
    ativo: true,
  },
  {
    id: "preset-bc-6kg",
    nome: "Pó BC - 6kg",
    agente: "Pó BC",
    capacidade: "6kg",
    custo_normal: 22.0,
    custo_reaproveitamento: 7.0,
    preco_padrao: 50.0,
    ativo: true,
  },
  {
    id: "preset-bc-8kg",
    nome: "Pó BC - 8kg",
    agente: "Pó BC",
    capacidade: "8kg",
    custo_normal: 28.0,
    custo_reaproveitamento: 8.5,
    preco_padrao: 65.0,
    ativo: true,
  },
  {
    id: "preset-bc-12kg",
    nome: "Pó BC - 12kg",
    agente: "Pó BC",
    capacidade: "12kg",
    custo_normal: 38.0,
    custo_reaproveitamento: 11.0,
    preco_padrao: 88.0,
    ativo: true,
  },
  {
    id: "preset-co2-4kg",
    nome: "CO2 - 4kg",
    agente: "CO2",
    capacidade: "4kg",
    custo_normal: 25.0,
    custo_reaproveitamento: 8.0,
    preco_padrao: 65.0,
    ativo: true,
  },
  {
    id: "preset-co2-6kg",
    nome: "CO2 - 6kg",
    agente: "CO2",
    capacidade: "6kg",
    custo_normal: 35.0,
    custo_reaproveitamento: 10.0,
    preco_padrao: 85.0,
    ativo: true,
  },
  {
    id: "preset-agua-10l",
    nome: "Água Pressurizada - 10L",
    agente: "Água Pressurizada (AP)",
    capacidade: "10L",
    custo_normal: 12.0,
    custo_reaproveitamento: 5.0,
    preco_padrao: 38.0,
    ativo: true,
  },
  {
    id: "preset-espuma-10l",
    nome: "Espuma Mecânica - 10L",
    agente: "Espuma Mecânica",
    capacidade: "10L",
    custo_normal: 28.0,
    custo_reaproveitamento: 9.0,
    preco_padrao: 75.0,
    ativo: true,
  },
];

const LOCAL_STORAGE_KEY = "extincontrol_extinguisher_models";

function getLocalModels(): ExtinguisherModel[] {
  if (typeof window === "undefined") return DEFAULT_EXTINGUISHER_MODELS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_EXTINGUISHER_MODELS));
      return DEFAULT_EXTINGUISHER_MODELS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_EXTINGUISHER_MODELS;
  } catch {
    return DEFAULT_EXTINGUISHER_MODELS;
  }
}

function setLocalModels(models: ExtinguisherModel[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(models));
  } catch (e) {
    console.warn("Erro ao salvar modelos no localStorage:", e);
  }
}

/**
 * Lista todos os modelos de extintores ativos.
 * Tenta buscar de public.catalog_items (categoria = 'Extintor') do Supabase.
 * Usa fallback sincronizado com localStorage.
 */
export async function listExtinguisherModels(): Promise<ExtinguisherModel[]> {
  const local = getLocalModels();

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("categoria", "Extintor")
      .is("deleted_at", null)
      .order("nome");

    if (!error && data && data.length > 0) {
      const fromDb: ExtinguisherModel[] = data.map((row) => {
        let meta: any = {};
        try {
          if (row.descricao) meta = JSON.parse(row.descricao);
        } catch {}

        return {
          id: row.id,
          nome: row.nome,
          agente: meta.agente || row.nome.split("-")[0]?.trim() || "Pó ABC",
          capacidade: meta.capacidade || row.nome.split("-")[1]?.trim() || "4kg",
          custo_normal: Number(meta.custo_normal ?? row.custo_unitario ?? 18.0),
          custo_reaproveitamento: Number(meta.custo_reaproveitamento ?? 6.0),
          preco_padrao: Number(meta.preco_padrao ?? row.preco_venda ?? 45.0),
          ativo: row.ativo !== false,
          company_id: row.company_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      });

      // Mescla com locais garantindo unicidade por nome
      const map = new Map<string, ExtinguisherModel>();
      local.forEach((m) => map.set(m.nome.toLowerCase().trim(), m));
      fromDb.forEach((m) => map.set(m.nome.toLowerCase().trim(), m));

      const merged = Array.from(map.values());
      setLocalModels(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Aviso ao carregar modelos do Supabase, usando locais:", err);
  }

  return local;
}

/**
 * Salva (cria ou atualiza) um modelo de extintor.
 */
export async function saveExtinguisherModel(
  input: Partial<ExtinguisherModel>
): Promise<ExtinguisherModel> {
  const agente = input.agente?.trim() || "Pó ABC";
  const capacidade = input.capacidade?.trim() || "4kg";
  const nome = input.nome?.trim() || `${agente} - ${capacidade}`;
  const custo_normal = Number(input.custo_normal) >= 0 ? Number(input.custo_normal) : 18.0;
  const custo_reaproveitamento =
    Number(input.custo_reaproveitamento) >= 0 ? Number(input.custo_reaproveitamento) : 6.0;
  const preco_padrao = Number(input.preco_padrao) >= 0 ? Number(input.preco_padrao) : 45.0;

  const id = input.id || crypto.randomUUID();

  const model: ExtinguisherModel = {
    id,
    nome,
    agente,
    capacidade,
    custo_normal,
    custo_reaproveitamento,
    preco_padrao,
    ativo: input.ativo !== false,
    updated_at: new Date().toISOString(),
    created_at: input.created_at || new Date().toISOString(),
  };

  // 1. Atualiza no localStorage imediatamente
  const local = getLocalModels();
  const existingIdx = local.findIndex((m) => m.id === id || m.nome.toLowerCase() === nome.toLowerCase());
  if (existingIdx >= 0) {
    local[existingIdx] = { ...local[existingIdx], ...model };
  } else {
    local.push(model);
  }
  setLocalModels(local);

  // 2. Persiste em public.catalog_items no Supabase
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Obtém company_id
    let companyId: string | null = null;
    if (user?.id) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();
      companyId = profile?.company_id || null;
    }
    if (!companyId) {
      const { data: comp } = await supabase.from("companies").select("id").limit(1).maybeSingle();
      companyId = comp?.id || null;
    }

    const descricao = JSON.stringify({
      agente,
      capacidade,
      custo_normal,
      custo_reaproveitamento,
      preco_padrao,
    });

    const payload = {
      id,
      company_id: companyId,
      nome,
      tipo: "servico",
      categoria: "Extintor",
      unidade: "un",
      custo_unitario: custo_normal,
      preco_venda: preco_padrao,
      descricao,
      ativo: model.ativo,
      updated_at: new Date().toISOString(),
    };

    if (input.id && !input.id.startsWith("preset-")) {
      await supabase.from("catalog_items").upsert(payload);
    } else if (companyId) {
      await supabase.from("catalog_items").insert(payload);
    }
  } catch (err) {
    console.warn("Erro ao sincronizar modelo no Supabase catalog_items:", err);
  }

  return model;
}

/**
 * Exclui um modelo de extintor.
 */
export async function deleteExtinguisherModel(id: string): Promise<void> {
  const local = getLocalModels();
  const filtered = local.filter((m) => m.id !== id);
  setLocalModels(filtered);

  try {
    const supabase = createClient();
    await supabase
      .from("catalog_items")
      .update({ deleted_at: new Date().toISOString(), ativo: false })
      .eq("id", id);
  } catch (err) {
    console.warn("Erro ao excluir modelo no Supabase:", err);
  }
}

/**
 * Salva múltiplos modelos de extintores em lote.
 */
export async function saveExtinguisherModelsBatch(
  modelsToUpdate: Partial<ExtinguisherModel>[]
): Promise<ExtinguisherModel[]> {
  const local = getLocalModels();
  const updatedLocal = [...local];
  const savedModels: ExtinguisherModel[] = [];

  for (const input of modelsToUpdate) {
    const agente = input.agente?.trim() || "Pó ABC";
    const capacidade = input.capacidade?.trim() || "4kg";
    const nome = input.nome?.trim() || `${agente} - ${capacidade}`;
    const custo_normal = Number(input.custo_normal) >= 0 ? Number(input.custo_normal) : 18.0;
    const custo_reaproveitamento =
      Number(input.custo_reaproveitamento) >= 0 ? Number(input.custo_reaproveitamento) : 6.0;
    const preco_padrao = Number(input.preco_padrao) >= 0 ? Number(input.preco_padrao) : 45.0;

    const id = input.id || crypto.randomUUID();

    const model: ExtinguisherModel = {
      id,
      nome,
      agente,
      capacidade,
      custo_normal,
      custo_reaproveitamento,
      preco_padrao,
      ativo: input.ativo !== false,
      updated_at: new Date().toISOString(),
      created_at: input.created_at || new Date().toISOString(),
    };

    savedModels.push(model);

    const existingIdx = updatedLocal.findIndex(
      (m) => m.id === id || m.nome.toLowerCase() === nome.toLowerCase()
    );
    if (existingIdx >= 0) {
      updatedLocal[existingIdx] = { ...updatedLocal[existingIdx], ...model };
    } else {
      updatedLocal.push(model);
    }
  }

  setLocalModels(updatedLocal);

  // Sincroniza em lote com Supabase
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let companyId: string | null = null;
    if (user?.id) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();
      companyId = profile?.company_id || null;
    }
    if (!companyId) {
      const { data: comp } = await supabase.from("companies").select("id").limit(1).maybeSingle();
      companyId = comp?.id || null;
    }

    const payloads = savedModels.map((model) => {
      const descricao = JSON.stringify({
        agente: model.agente,
        capacidade: model.capacidade,
        custo_normal: model.custo_normal,
        custo_reaproveitamento: model.custo_reaproveitamento,
        preco_padrao: model.preco_padrao,
      });

      return {
        id: model.id,
        company_id: companyId,
        nome: model.nome,
        tipo: "servico",
        categoria: "Extintor",
        unidade: "un",
        custo_unitario: model.custo_normal,
        preco_venda: model.preco_padrao,
        descricao,
        ativo: model.ativo,
        updated_at: new Date().toISOString(),
      };
    });

    for (const p of payloads) {
      if (p.id && !p.id.startsWith("preset-")) {
        await supabase.from("catalog_items").upsert(p);
      } else if (companyId) {
        await supabase.from("catalog_items").insert(p);
      }
    }
  } catch (err) {
    console.warn("Erro ao sincronizar modelos em lote no Supabase:", err);
  }

  return savedModels;
}

/**
 * Exclui múltiplos modelos de extintores em lote.
 */
export async function deleteExtinguisherModelsBatch(ids: string[]): Promise<void> {
  const local = getLocalModels();
  const idSet = new Set(ids);
  const filtered = local.filter((m) => !idSet.has(m.id));
  setLocalModels(filtered);

  try {
    const supabase = createClient();
    const validDbIds = ids.filter((id) => !id.startsWith("preset-"));
    if (validDbIds.length > 0) {
      await supabase
        .from("catalog_items")
        .update({ deleted_at: new Date().toISOString(), ativo: false })
        .in("id", validDbIds);
    }
  } catch (err) {
    console.warn("Erro ao excluir modelos em lote no Supabase:", err);
  }
}


/**
 * Encontra o modelo de extintor mais próximo correspondente à string de tipo_capacidade.
 * Ex: "PÓ ABC - 4kg" -> acha o modelo com agente ABC e capacidade 4kg.
 */
export function findModelByTipoCapacidade(
  tipoCapacidade?: string | null,
  models: ExtinguisherModel[] = DEFAULT_EXTINGUISHER_MODELS
): ExtinguisherModel | null {
  if (!tipoCapacidade) return null;
  const clean = tipoCapacidade.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Match exato
  const exact = models.find((m) => m.nome.toLowerCase().replace(/[^a-z0-9]/g, "") === clean);
  if (exact) return exact;

  // Match por agente + peso
  const bySubstrings = models.find((m) => {
    const mClean = m.nome.toLowerCase().replace(/[^a-z0-9]/g, "");
    return clean.includes(mClean) || mClean.includes(clean);
  });
  if (bySubstrings) return bySubstrings;

  // Extrai número do peso (ex: 4, 6, 8, 12, 10)
  const weightMatch = tipoCapacidade.match(/(\d+)\s*(kg|l|litros?)/i);
  if (weightMatch) {
    const num = weightMatch[1];
    const isCo2 = clean.includes("co2") || clean.includes("carbon");
    const isAgua = clean.includes("agua") || clean.includes("ap");
    const isEspuma = clean.includes("espuma");
    const isBc = !clean.includes("abc") && clean.includes("bc");

    const candidate = models.find((m) => {
      const mWeight = m.capacidade.match(/\d+/)?.[0];
      if (mWeight !== num) return false;
      if (isCo2) return m.agente.toLowerCase().includes("co2");
      if (isAgua) return m.agente.toLowerCase().includes("agua") || m.agente.toLowerCase().includes("ap");
      if (isEspuma) return m.agente.toLowerCase().includes("espuma");
      if (isBc) return m.agente.toLowerCase().includes("bc") && !m.agente.toLowerCase().includes("abc");
      return m.agente.toLowerCase().includes("abc");
    });
    if (candidate) return candidate;
  }

  return null;
}

/**
 * Calcula o custo unitário e lucro para um extintor específico.
 */
export function calculateItemCostAndProfit(
  tipoCapacidade: string | undefined | null,
  modalidade: "Normal" | "Reaproveitamento" | string | undefined | null,
  valorCobrado: number,
  models: ExtinguisherModel[] = DEFAULT_EXTINGUISHER_MODELS
): {
  custo: number;
  lucro: number;
  margemPercentual: number;
  modeloUtilizado: string;
} {
  const model = findModelByTipoCapacidade(tipoCapacidade, models);
  const isReaproveitamento =
    (modalidade || "").toLowerCase().includes("reaproveita") ||
    modalidade === "Reaproveitamento";

  let custo = 18.0;
  if (model) {
    custo = isReaproveitamento ? model.custo_reaproveitamento : model.custo_normal;
  } else {
    // Estimativa segura baseada em peso
    const num = parseInt(tipoCapacidade?.match(/\d+/)?.[0] || "4", 10);
    if (num <= 4) custo = isReaproveitamento ? 6.0 : 18.0;
    else if (num <= 8) custo = isReaproveitamento ? 8.5 : 28.0;
    else custo = isReaproveitamento ? 11.0 : 40.0;
  }

  const preco = Number(valorCobrado) || (model ? model.preco_padrao : 45.0);
  const lucro = Math.round((preco - custo) * 100) / 100;
  const margemPercentual = preco > 0 ? Math.round((lucro / preco) * 1000) / 10 : 0;

  return {
    custo,
    lucro,
    margemPercentual,
    modeloUtilizado: model ? model.nome : tipoCapacidade || "Extintor Padrão",
  };
}
