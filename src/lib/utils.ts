import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num || 0);
}

export function formatCPF(value: string) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}

export function formatCNPJ(value: string) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    "$1.$2.$3/$4-$5"
  );
}

export function formatDocument(value: string) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  return digits.length <= 11 ? formatCPF(value) : formatCNPJ(value);
}

export function formatPhone(value: string) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

export function formatCEP(value: string) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
}

export function unmask(value: string) {
  return value.replace(/\D/g, "");
}

export function formatDate(date?: string | Date | null) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formata data estritamente como Mês/Ano (MM/AAAA) para extintores
 */
export function formatMonthYear(date?: string | Date | null) {
  if (!date) return "";
  const str = String(date).trim();
  // Se já estiver no padrão YYYY-MM ou YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[1]}`;
  }
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  if (isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${m}/${y}`;
}

/**
 * Converte data ou string ISO para YYYY-MM para uso em <input type="month" />
 */
export function toMonthInput(date?: string | Date | null) {
  if (!date) return "";
  const str = String(date).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  if (isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

/**
 * Converte valor de <input type="month" /> (YYYY-MM) para YYYY-MM-01 para persistência
 */
export function monthInputToDate(monthVal: string) {
  if (!monthVal) return "";
  const trimmed = monthVal.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  return trimmed;
}

export function formatDateTime(date?: string | Date | null) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type MaskType = "phone" | "cpf" | "cnpj" | "document" | "cep" | "none";

export function applyMask(value: string, mask: MaskType) {
  switch (mask) {
    case "phone":
      return formatPhone(value);
    case "cpf":
      return formatCPF(value);
    case "cnpj":
      return formatCNPJ(value);
    case "document":
      return formatDocument(value);
    case "cep":
      return formatCEP(value);
    default:
      return value;
  }
}

export { fetchAddressByCep, type AddressLookupResult } from "./cep";
