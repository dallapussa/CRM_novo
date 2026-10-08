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
  "CO2",
  "CO2 (Dióxido de Carbono)",
  "Água Pressurizada (AP)",
  "Espuma Mecânica",
  "Espuma Mecânica RODAS",
  "Pó ABC Rodas",
  "Pó BC Rodas",
  "AP Rodas",
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
  "30kg",
  "50kg",
  "70kg",
  "10L",
  "50L",
  "75L",
];

export const DEFAULT_EXTINGUISHER_MODELS: ExtinguisherModel[] = [
  {
    id: "e0000000-0000-0000-0000-000000000001",
    nome: "Pó ABC - 4kg",
    agente: "Pó ABC",
    capacidade: "4kg",
    custo_normal: 33.90,
    custo_reaproveitamento: 23.90,
    preco_padrao: 70.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000002",
    nome: "Pó ABC - 6kg",
    agente: "Pó ABC",
    capacidade: "6kg",
    custo_normal: 42.90,
    custo_reaproveitamento: 26.90,
    preco_padrao: 90.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000003",
    nome: "Pó ABC - 8kg",
    agente: "Pó ABC",
    capacidade: "8kg",
    custo_normal: 50.90,
    custo_reaproveitamento: 29.80,
    preco_padrao: 110.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000004",
    nome: "Pó ABC - 12kg",
    agente: "Pó ABC",
    capacidade: "12kg",
    custo_normal: 66.20,
    custo_reaproveitamento: 34.90,
    preco_padrao: 135.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000005",
    nome: "Pó BC - 4kg",
    agente: "Pó BC",
    capacidade: "4kg",
    custo_normal: 26.50,
    custo_reaproveitamento: 18.90,
    preco_padrao: 70.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000006",
    nome: "Pó BC - 6kg",
    agente: "Pó BC",
    capacidade: "6kg",
    custo_normal: 30.80,
    custo_reaproveitamento: 20.90,
    preco_padrao: 80.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000007",
    nome: "Pó BC - 8kg",
    agente: "Pó BC",
    capacidade: "8kg",
    custo_normal: 34.60,
    custo_reaproveitamento: 24.40,
    preco_padrao: 90.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000008",
    nome: "Pó BC - 12kg",
    agente: "Pó BC",
    capacidade: "12kg",
    custo_normal: 45.90,
    custo_reaproveitamento: 27.60,
    preco_padrao: 100.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000009",
    nome: "CO2 - 4kg",
    agente: "CO2",
    capacidade: "4kg",
    custo_normal: 30.00,
    custo_reaproveitamento: 9.00,
    preco_padrao: 68.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000010",
    nome: "CO2 - 6kg",
    agente: "CO2",
    capacidade: "6kg",
    custo_normal: 120.00,
    custo_reaproveitamento: 97.00,
    preco_padrao: 250.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000011",
    nome: "Água Pressurizada - 10L",
    agente: "Água Pressurizada (AP)",
    capacidade: "10L",
    custo_normal: 19.90,
    custo_reaproveitamento: 18.90,
    preco_padrao: 50.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000012",
    nome: "Espuma Mecânica - 10L",
    agente: "Espuma Mecânica",
    capacidade: "10L",
    custo_normal: 65.00,
    custo_reaproveitamento: 50.00,
    preco_padrao: 135.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000013",
    nome: "CO2 (Dióxido de Carbono) - 6kg",
    agente: "CO2 (Dióxido de Carbono)",
    capacidade: "6kg",
    custo_normal: 30.00,
    custo_reaproveitamento: 9.00,
    preco_padrao: 68.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000014",
    nome: "CO2 - 10kg",
    agente: "CO2",
    capacidade: "10kg",
    custo_normal: 189.00,
    custo_reaproveitamento: 135.00,
    preco_padrao: 290.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000015",
    nome: "Espuma Mecânica RODAS - 50kg",
    agente: "Espuma Mecânica RODAS",
    capacidade: "50kg",
    custo_normal: 230.00,
    custo_reaproveitamento: 120.00,
    preco_padrao: 500.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000016",
    nome: "Pó ABC - 20kg",
    agente: "Pó ABC",
    capacidade: "20kg",
    custo_normal: 117.00,
    custo_reaproveitamento: 85.00,
    preco_padrao: 240.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000017",
    nome: "Pó ABC Rodas - 30kg",
    agente: "Pó ABC Rodas",
    capacidade: "30kg",
    custo_normal: 160.00,
    custo_reaproveitamento: 120.00,
    preco_padrao: 330.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000018",
    nome: "Pó ABC Rodas - 50kg",
    agente: "Pó ABC Rodas",
    capacidade: "50kg",
    custo_normal: 78.00,
    custo_reaproveitamento: 65.00,
    preco_padrao: 160.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000019",
    nome: "Pó BC Rodas - 20kg",
    agente: "Pó BC Rodas",
    capacidade: "20kg",
    custo_normal: 135.00,
    custo_reaproveitamento: 98.00,
    preco_padrao: 68.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000020",
    nome: "Pó BC Rodas - 50kg",
    agente: "Pó BC Rodas",
    capacidade: "50kg",
    custo_normal: 125.00,
    custo_reaproveitamento: 98.00,
    preco_padrao: 250.00,
    ativo: true,
  },
  {
    id: "e0000000-0000-0000-0000-000000000021",
    nome: "AP Rodas - 50L",
    agente: "AP Rodas",
    capacidade: "50L",
    custo_normal: 125.00,
    custo_reaproveitamento: 98.00,
    preco_padrao: 250.00,
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
    if (Array.isArray(parsed) && parsed.length >= DEFAULT_EXTINGUISHER_MODELS.length) {
      return parsed;
    }
    // Mescla garantindo que todos os 21 modelos novos estejam presentes
    const map = new Map<string, ExtinguisherModel>();
    DEFAULT_EXTINGUISHER_MODELS.forEach((m) => map.set(m.nome.toLowerCase(), m));
    if (Array.isArray(parsed)) {
      parsed.forEach((m: ExtinguisherModel) =>
        map.set(m.nome.toLowerCase(), { ...map.get(m.nome.toLowerCase()), ...m })
      );
    }
    const merged = Array.from(map.values());
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    return merged;
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
