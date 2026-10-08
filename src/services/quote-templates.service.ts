import { createClient } from "@/lib/supabase/client";

export interface QuoteTemplateItem {
  id?: string;
  tipo_origem: "catalogo" | "extintor" | "avulso";
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  unidade: string;
  detalhes?: string;
}

export interface QuoteTemplate {
  id: string;
  nome: string;
  descricao: string;
  tipo: "simplificado" | "completo" | "hidrantes" | "personalizado";
  validade_dias: number;
  condicoes_pagamento: string;
  termos_garantia?: string;
  clausula_ppci?: string;
  itens_padrao: QuoteTemplateItem[];
  ativo: boolean;
  company_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    id: "tpl-simplificado",
    nome: "Orçamento Simplificado",
    descricao: "Modelo direto para recargas rápidas e trocas avulsas de extintores.",
    tipo: "simplificado",
    validade_dias: 15,
    condicoes_pagamento: "À vista com 5% de desconto ou 30 dias no boleto.",
    termos_garantia: "Garantia de 12 meses contra defeitos de pressurização e conformidade com a Portaria Inmetro.",
    clausula_ppci: "Serviço em conformidade com as normas do Corpo de Bombeiros Militar e NBR 12962.",
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    itens_padrao: [
      {
        tipo_origem: "extintor",
        descricao: "Recarga / Carga Completa Extintor Pó ABC 4kg",
        quantidade: 1,
        valor_unitario: 45.0,
        unidade: "un",
      },
      {
        tipo_origem: "extintor",
        descricao: "Recarga / Carga Completa Extintor CO2 4kg",
        quantidade: 1,
        valor_unitario: 65.0,
        unidade: "un",
      },
    ],
  },
  {
    id: "tpl-completo",
    nome: "Completo (PPCI & Extintores)",
    descricao: "Modelo abrangente com vistoria técnica, recarga de lote, substituição de peças e laudo de conformidade.",
    tipo: "completo",
    validade_dias: 20,
    condicoes_pagamento: "Entrada de 40% + 2 parcelas (30/60 dias) no boleto faturado.",
    termos_garantia: "Garantia de 12 meses na recarga e testes hidrostáticos. Peças com garantia de fábrica de 90 dias.",
    clausula_ppci: "Emissão de Laudo Técnico e ART/RRT de conformidade com o Plano de Prevenção e Proteção Contra Incêndio (PPCI).",
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    itens_padrao: [
      {
        tipo_origem: "extintor",
        descricao: "Manutenção Nível 2 / Recarga Pó ABC 4kg com anel e lacre",
        quantidade: 5,
        valor_unitario: 45.0,
        unidade: "un",
      },
      {
        tipo_origem: "extintor",
        descricao: "Manutenção Nível 2 / Recarga Água Pressurizada 10L",
        quantidade: 3,
        valor_unitario: 38.0,
        unidade: "un",
      },
      {
        tipo_origem: "catalogo",
        descricao: "Vistoria Técnica e Elaboração de Relatório de Conformidade PPCI",
        quantidade: 1,
        valor_unitario: 350.0,
        unidade: "serviço",
      },
      {
        tipo_origem: "catalogo",
        descricao: "Placa de Sinalização Fotoluminescente de Rota e Equipamento",
        quantidade: 8,
        valor_unitario: 22.0,
        unidade: "un",
      },
    ],
  },
  {
    id: "tpl-hidrantes",
    nome: "Hidrantes & Mangueiras",
    descricao: "Especializado para ensaio hidrostático de mangueiras tipo 1/2, troca de juntas e manutenção de abrigo/válvula.",
    tipo: "hidrantes",
    validade_dias: 15,
    condicoes_pagamento: "Faturamento em até 28 dias após a emissão da NF.",
    termos_garantia: "Teste hidrostático certificado conforme norma ABNT NBR 12779. Garantia de 12 meses no teste.",
    clausula_ppci: "Certificado de ensaio hidrostático individual por mangueira para apresentação ao CBM.",
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    itens_padrao: [
      {
        tipo_origem: "catalogo",
        descricao: "Teste Hidrostático de Mangueira de Incêndio (15 metros)",
        quantidade: 4,
        valor_unitario: 65.0,
        unidade: "un",
      },
      {
        tipo_origem: "catalogo",
        descricao: "Secagem e Enrolamento de Mangueira em espiral",
        quantidade: 4,
        valor_unitario: 15.0,
        unidade: "un",
      },
      {
        tipo_origem: "catalogo",
        descricao: "Anel de Vedação em borracha Storz 1.1/2",
        quantidade: 8,
        valor_unitario: 8.5,
        unidade: "un",
      },
    ],
  },
];

const LOCAL_STORAGE_TEMPLATES_KEY = "extincontrol_quote_templates";

export function getLocalQuoteTemplates(): QuoteTemplate[] {
  if (typeof window === "undefined") return DEFAULT_QUOTE_TEMPLATES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TEMPLATES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_TEMPLATES_KEY, JSON.stringify(DEFAULT_QUOTE_TEMPLATES));
      return DEFAULT_QUOTE_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_QUOTE_TEMPLATES;
  } catch {
    return DEFAULT_QUOTE_TEMPLATES;
  }
}

export function saveLocalQuoteTemplates(templates: QuoteTemplate[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.warn("Erro ao salvar modelos de orçamento:", e);
  }
}

export async function listQuoteTemplates(): Promise<QuoteTemplate[]> {
  const local = getLocalQuoteTemplates();
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quote_templates")
      .select("*")
      .eq("ativo", true)
      .order("nome");

    if (!error && data && data.length > 0) {
      const merged = new Map<string, QuoteTemplate>();
      local.forEach((t) => merged.set(t.id, t));
      data.forEach((t: any) => {
        merged.set(t.id, {
          id: t.id,
          nome: t.nome,
          descricao: t.descricao || "",
          tipo: t.tipo || "personalizado",
          validade_dias: t.validade_dias || 15,
          condicoes_pagamento: t.condicoes_pagamento || "",
          termos_garantia: t.termos_garantia || "",
          clausula_ppci: t.clausula_ppci || "",
          itens_padrao: Array.isArray(t.itens_padrao) ? t.itens_padrao : [],
          ativo: t.ativo !== false,
          company_id: t.company_id,
          created_at: t.created_at || new Date().toISOString(),
          updated_at: t.updated_at || new Date().toISOString(),
        });
      });
      const list = Array.from(merged.values());
      saveLocalQuoteTemplates(list);
      return list;
    }
  } catch {
    // Tabela pode não existir ainda no Supabase, fallback transparente para local
  }
  return local;
}

export async function saveQuoteTemplate(template: Partial<QuoteTemplate>): Promise<QuoteTemplate> {
  const local = getLocalQuoteTemplates();
  const id = template.id || `tpl-${Date.now()}`;
  const completeTemplate: QuoteTemplate = {
    id,
    nome: template.nome || "Novo Modelo de Orçamento",
    descricao: template.descricao || "",
    tipo: template.tipo || "personalizado",
    validade_dias: template.validade_dias || 15,
    condicoes_pagamento: template.condicoes_pagamento || "À vista ou 30 dias.",
    termos_garantia: template.termos_garantia || "Garantia legal de 12 meses para serviços e recargas.",
    clausula_ppci: template.clausula_ppci || "Normas técnicas de segurança contra incêndio vigentes.",
    itens_padrao: template.itens_padrao || [],
    ativo: template.ativo !== false,
    company_id: template.company_id || null,
    created_at: template.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const idx = local.findIndex((t) => t.id === id);
  if (idx >= 0) {
    local[idx] = completeTemplate;
  } else {
    local.push(completeTemplate);
  }
  saveLocalQuoteTemplates(local);

  try {
    const supabase = createClient();
    await supabase.from("quote_templates").upsert(completeTemplate);
  } catch {
    // Ignore fallback
  }

  return completeTemplate;
}

export async function deleteQuoteTemplate(id: string): Promise<void> {
  const local = getLocalQuoteTemplates();
  const filtered = local.filter((t) => t.id !== id);
  saveLocalQuoteTemplates(filtered);

  try {
    const supabase = createClient();
    await supabase.from("quote_templates").delete().eq("id", id);
  } catch {
    // Ignore fallback
  }
}
