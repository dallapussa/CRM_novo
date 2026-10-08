"use client";

import { createClient } from "@/lib/supabase/client";
import { type RolePermission, type UserRole } from "@/types";

export interface QuoteTermsConfig {
  validadeDias: number;
  garantiaTexto: string;
  clausulaPpciTexto: string;
  condicoesPagamento: string[];
  validade_dias_padrao?: number;
  condicoes_padrao?: string;
  termos_garantia?: string;
  clausula_ppci?: string;
}

export interface SecurityConfig {
  pinHash: string; // SHA-256 do PIN de 4 dígitos
  requirePinForPriceChange: boolean;
  requirePinForDelete: boolean;
  pinCacheMinutes: number; // minutos que o PIN fica memorizado antes de pedir de novo
}

export interface RolePermissionsConfig {
  [role: string]: RolePermission[];
}

export interface MenuItemConfig {
  id: string;
  href: string;
  title: string;
  permission: RolePermission;
  visibleRoles: UserRole[];
  order: number;
}

export interface AppSettings {
  quoteTerms: QuoteTermsConfig;
  security: SecurityConfig;
  rolePermissions: RolePermissionsConfig;
  menuItems: MenuItemConfig[];
  updatedAt?: string;
}

// SHA-256 padrão para "1234"
// crypto.subtle.digest("SHA-256", new TextEncoder().encode("1234"))
// = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"
const DEFAULT_PIN_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

export const DEFAULT_QUOTE_TERMS: QuoteTermsConfig = {
  validadeDias: 15,
  validade_dias_padrao: 15,
  condicoes_padrao: "À vista ou 30 dias após emissão da NF.",
  termos_garantia: "Garantia de 12 meses na recarga e testes conforme normas técnicas do Inmetro.",
  clausula_ppci: "Emissão de documentação e conformidade técnica para vistoria do Corpo de Bombeiros Militar.",
  garantiaTexto:
    "Garantia de 01 (um) ano para recarga de extintores e 05 (cinco) anos para testes hidrostáticos, conforme normas da ABNT/NBR.",
  clausulaPpciTexto:
    "Taxas de análise e vistoria do Corpo de Bombeiros não estão inclusas no presente orçamento, salvo se explicitamente descrito acima.",
  condicoesPagamento: [
    "À Vista (PIX / Dinheiro)",
    "Boleto Bancário 30 dias",
    "Boleto Bancário 15/30/45 dias",
    "Cartão de Crédito até 3x sem juros",
    "Cartão de Crédito 6x",
    "A combinar / Faturado",
  ],
};

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  pinHash: DEFAULT_PIN_HASH,
  requirePinForPriceChange: true,
  requirePinForDelete: true,
  pinCacheMinutes: 5,
};

export const DEFAULT_MENU_ITEMS: MenuItemConfig[] = [
  { id: "dashboard", href: "/dashboard", title: "Dashboard", permission: "dashboard", visibleRoles: ["admin", "comercial", "tecnico", "financeiro"], order: 1 },
  { id: "vencimentos", href: "/dashboard/vencimentos", title: "Vencimentos", permission: "dashboard", visibleRoles: ["admin", "comercial", "tecnico"], order: 2 },
  { id: "usuarios", href: "/dashboard/usuarios", title: "Usuários", permission: "users", visibleRoles: ["admin"], order: 3 },
  { id: "leads", href: "/dashboard/leads", title: "Leads", permission: "leads", visibleRoles: ["admin", "comercial"], order: 4 },
  { id: "clientes", href: "/dashboard/clientes", title: "Clientes", permission: "clients", visibleRoles: ["admin", "comercial", "tecnico"], order: 5 },
  { id: "orcamentos", href: "/dashboard/orcamentos", title: "Orçamentos", permission: "quotes", visibleRoles: ["admin", "comercial"], order: 6 },
  { id: "agenda", href: "/dashboard/agenda", title: "Agenda", permission: "agenda", visibleRoles: ["admin", "comercial"], order: 7 },
  { id: "whatsapp", href: "/dashboard/whatsapp", title: "WhatsApp", permission: "whatsapp", visibleRoles: ["admin", "comercial"], order: 8 },
  { id: "produtos", href: "/dashboard/produtos", title: "Produtos & Serviços", permission: "catalog", visibleRoles: ["admin", "comercial"], order: 9 },
  { id: "extintores", href: "/dashboard/extintores", title: "Extintores", permission: "extinguishers", visibleRoles: ["admin", "tecnico"], order: 10 },
  { id: "mangueiras", href: "/dashboard/mangueiras", title: "Mangueiras", permission: "hoses", visibleRoles: ["admin", "tecnico"], order: 11 },
  { id: "os", href: "/dashboard/os", title: "Ordens de Serviço", permission: "service_orders", visibleRoles: ["admin", "tecnico"], order: 12 },
  { id: "bancada", href: "/dashboard/bancada", title: "Bancada", permission: "bench", visibleRoles: ["admin", "tecnico"], order: 13 },
  { id: "lotes", href: "/dashboard/lotes", title: "Lotes & Rotas", permission: "service_orders", visibleRoles: ["admin", "tecnico"], order: 14 },
  { id: "pedidos", href: "/dashboard/pedidos", title: "Pedidos", permission: "orders", visibleRoles: ["admin", "financeiro"], order: 15 },
  { id: "financeiro", href: "/dashboard/financeiro", title: "Financeiro", permission: "receipts", visibleRoles: ["admin", "financeiro"], order: 16 },
  { id: "relatorios", href: "/dashboard/relatorios", title: "Relatórios", permission: "reports", visibleRoles: ["admin", "financeiro"], order: 17 },
  { id: "custos", href: "/dashboard/custos", title: "Custos Financeiros", permission: "financial_costs", visibleRoles: ["admin"], order: 18 },
  { id: "configuracoes", href: "/dashboard/configuracoes", title: "Configurações", permission: "users", visibleRoles: ["admin"], order: 19 },
];

const SETTINGS_STORAGE_KEY = "fire_crm_app_settings";
const PIN_UNLOCKED_UNTIL_KEY = "fire_crm_pin_unlocked_until";

/**
 * Calcula o hash SHA-256 de um texto simples (ex: PIN)
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Carrega as configurações completas do sistema (localStorage + companies metadata)
 */
export function getAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return {
      quoteTerms: DEFAULT_QUOTE_TERMS,
      security: DEFAULT_SECURITY_CONFIG,
      rolePermissions: {},
      menuItems: DEFAULT_MENU_ITEMS,
    };
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        quoteTerms: { ...DEFAULT_QUOTE_TERMS, ...(parsed.quoteTerms || {}) },
        security: { ...DEFAULT_SECURITY_CONFIG, ...(parsed.security || {}) },
        rolePermissions: parsed.rolePermissions || {},
        menuItems: Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0 ? parsed.menuItems : DEFAULT_MENU_ITEMS,
        updatedAt: parsed.updatedAt,
      };
    }
  } catch (e) {
    console.warn("Erro ao ler app settings:", e);
  }

  return {
    quoteTerms: DEFAULT_QUOTE_TERMS,
    security: DEFAULT_SECURITY_CONFIG,
    rolePermissions: {},
    menuItems: DEFAULT_MENU_ITEMS,
  };
}

/**
 * Busca as configurações da tabela app_settings no Supabase e sincroniza o cache local
 */
export async function fetchAppSettings(): Promise<AppSettings> {
  const local = getAppSettings();
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const merged: AppSettings = {
        quoteTerms: { ...DEFAULT_QUOTE_TERMS, ...(data.quote_terms || {}) },
        security: {
          pinHash: data.pin_hash || DEFAULT_PIN_HASH,
          requirePinForPriceChange: data.require_pin_for_price_change ?? true,
          requirePinForDelete: data.require_pin_for_delete ?? true,
          pinCacheMinutes: data.pin_cache_minutes || 5,
        },
        rolePermissions: data.role_permissions || {},
        menuItems:
          Array.isArray(data.menu_items) && data.menu_items.length > 0
            ? data.menu_items
            : DEFAULT_MENU_ITEMS,
        updatedAt: data.updated_at,
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
      }

      return merged;
    }
  } catch (err) {
    console.warn("Aviso ao buscar app_settings no Supabase:", err);
  }

  return local;
}

/**
 * Salva as configurações completas do sistema no localStorage e sincroniza com a tabela app_settings
 */
export async function saveAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = getAppSettings();
  const merged: AppSettings = {
    quoteTerms: { ...current.quoteTerms, ...(patch.quoteTerms || {}) },
    security: { ...current.security, ...(patch.security || {}) },
    rolePermissions: { ...current.rolePermissions, ...(patch.rolePermissions || {}) },
    menuItems: patch.menuItems || current.menuItems,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn("Erro ao salvar localStorage de settings:", e);
    }
  }

  // Persiste na tabela app_settings do Supabase
  try {
    const supabase = createClient();
    const { data: comp } = await supabase.from("companies").select("id").limit(1).maybeSingle();
    const companyId = comp?.id || null;

    if (companyId) {
      await supabase.from("app_settings").upsert(
        {
          company_id: companyId,
          pin_hash: merged.security.pinHash,
          require_pin_for_price_change: merged.security.requirePinForPriceChange,
          require_pin_for_delete: merged.security.requirePinForDelete,
          pin_cache_minutes: merged.security.pinCacheMinutes,
          quote_terms: merged.quoteTerms,
          role_permissions: merged.rolePermissions,
          menu_items: merged.menuItems,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" }
      );
    }
  } catch (err) {
    console.warn("Aviso ao persistir app_settings no Supabase:", err);
  }

  return merged;
}

/**
 * Valida se um PIN digitado é correto.
 * Se correto, memoriza o acesso por X minutos.
 */
export async function verifyPin(pinInput: string): Promise<boolean> {
  const settings = getAppSettings();
  const inputHash = await hashPin(pinInput);

  const isValid = inputHash === settings.security.pinHash;
  if (isValid && typeof window !== "undefined") {
    const expiresAt = Date.now() + (settings.security.pinCacheMinutes || 5) * 60 * 1000;
    sessionStorage.setItem(PIN_UNLOCKED_UNTIL_KEY, String(expiresAt));
  }
  return isValid;
}

/**
 * Verifica se a sessão do PIN ainda está desbloqueada na janela atual
 */
export function isPinTemporarilyUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const val = sessionStorage.getItem(PIN_UNLOCKED_UNTIL_KEY);
    if (!val) return false;
    const expiresAt = Number(val);
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

/**
 * Força o bloqueio do PIN (limpa a memória de desbloqueio temporário)
 */
export function lockPinSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(PIN_UNLOCKED_UNTIL_KEY);
  }
}

/**
 * Altera o PIN de segurança para um novo valor de 4 dígitos
 */
export async function updatePin(oldPin: string, newPin: string): Promise<{ success: boolean; message?: string }> {
  if (!/^\d{4}$/.test(newPin.trim())) {
    return { success: false, message: "O PIN deve conter exatamente 4 números." };
  }

  const isOldValid = await verifyPin(oldPin);
  if (!isOldValid) {
    return { success: false, message: "PIN atual incorreto." };
  }

  const newHash = await hashPin(newPin);
  const settings = getAppSettings();
  await saveAppSettings({
    security: {
      ...settings.security,
      pinHash: newHash,
    },
  });

  lockPinSession();
  return { success: true };
}

/**
 * Verifica se uma ação protegida requer que o usuário insira o PIN.
 * Se a sessão estiver temporariamente desbloqueada (dentro do cache de 5 minutos), retorna false.
 */
export function isPinRequiredForAction(action: "price_change" | "delete"): boolean {
  if (isPinTemporarilyUnlocked()) return false;
  const settings = getAppSettings();
  if (action === "price_change") return !!settings.security.requirePinForPriceChange;
  if (action === "delete") return !!settings.security.requirePinForDelete;
  return false;
}

