import { createClient } from "@/lib/supabase/client";

export interface CompanySettings {
  id?: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  logo_url: string | null;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  nome: "JC Extintores",
  cnpj: "45.573.027/0001-01",
  telefone: "(55) 99965-7943",
  email: "jc.extintores.rs@gmail.com",
  endereco: "Cruz Alta, RS",
  logo_url: null,
};

const STORAGE_KEY = "fire_crm_company_settings";

/**
 * Carrega os dados da empresa emitente do Supabase e do localStorage.
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  let localData: Partial<CompanySettings> = {};
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        localData = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Aviso ao ler settings local:", e);
    }
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const enderecoComposto = [
        data.address_street,
        data.address_number,
        data.address_neighborhood,
        data.address_city,
        data.address_state,
      ]
        .filter(Boolean)
        .join(", ");

      const resolvedEndereco =
        data.endereco || enderecoComposto || localData.endereco || DEFAULT_COMPANY_SETTINGS.endereco;

      const merged: CompanySettings = {
        id: data.id,
        nome: data.nome || localData.nome || DEFAULT_COMPANY_SETTINGS.nome,
        cnpj: data.cnpj || localData.cnpj || DEFAULT_COMPANY_SETTINGS.cnpj,
        telefone: data.telefone || localData.telefone || DEFAULT_COMPANY_SETTINGS.telefone,
        email: data.email || localData.email || DEFAULT_COMPANY_SETTINGS.email,
        endereco: resolvedEndereco,
        logo_url: localData.logo_url || data.logo_url || null,
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {}
      }

      return merged;
    }
  } catch (err) {
    console.warn("Aviso ao buscar empresa no Supabase:", err);
  }

  return {
    ...DEFAULT_COMPANY_SETTINGS,
    ...localData,
  };
}

/**
 * Salva as alterações dos dados da empresa emitente no Supabase e no localStorage.
 */
export async function saveCompanySettings(
  settings: Partial<CompanySettings>
): Promise<CompanySettings> {
  const current = await getCompanySettings();
  const updated: CompanySettings = {
    ...current,
    ...settings,
  };

  // Salva no localStorage imediatamente
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Erro ao salvar localStorage:", e);
    }
  }

  // Tenta persistir no Supabase (tabela companies)
  try {
    const supabase = createClient();
    if (updated.id) {
      await supabase
        .from("companies")
        .update({
          nome: updated.nome,
          cnpj: updated.cnpj,
          email: updated.email,
          telefone: updated.telefone,
          endereco: updated.endereco,
          logo_url: updated.logo_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updated.id);
    } else {
      const { data } = await supabase
        .from("companies")
        .insert({
          nome: updated.nome,
          cnpj: updated.cnpj,
          email: updated.email,
          telefone: updated.telefone,
          endereco: updated.endereco,
          logo_url: updated.logo_url,
        })
        .select()
        .single();

      if (data?.id) {
        updated.id = data.id;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn("Aviso ao persistir empresa no Supabase:", err);
  }

  return updated;
}
