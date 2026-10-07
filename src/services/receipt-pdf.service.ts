import { jsPDF } from "jspdf";
import type { LoteRecolhimento, PaymentMethod } from "@/types";
import { uploadClientDocument } from "@/services/prevention.service";

export interface ReceiptItem {
  id?: string;
  identificacao: string; // Ex: EXT-01 ou nº cilindro
  tipo_capacidade: string; // Ex: Pó ABC - 4kg
  modalidade: string; // Normal ou Reaproveitamento
  localizacao?: string;
  nova_validade?: string; // Mês/Ano
  valor: number;
}

export interface EditableReceiptData {
  numero_recibo: string; // Ex: "REC-202610-01"
  data_emissao: string; // "YYYY-MM-DD" ou formatada
  cliente_id: string;
  cliente_nome: string;
  cliente_documento?: string; // CPF ou CNPJ
  cliente_telefone?: string;
  cliente_endereco?: string;
  lote_codigo?: string;
  lote_nome?: string;
  ordens_numeros?: string; // Ex: "OS #25, OS #27"
  itens: ReceiptItem[];
  valor_total: number;
  forma_pagamento: PaymentMethod | string;
  status_pagamento: "QUITADO" | "PENDENTE";
  observacoes?: string;
  empresa_nome?: string;
  empresa_cnpj?: string;
  empresa_telefone?: string;
  empresa_endereco?: string;
}

/**
 * Formata valor monetário em R$ 0,00
 */
function formatMoeda(val: number): string {
  return Number(val || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Gera o documento PDF do recibo utilizando jsPDF com layout profissional
 */
export function buildReceiptPdfDocument(data: EditableReceiptData): {
  doc: jsPDF;
  fileName: string;
} {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  // 1. Faixa Superior / Header Vermelho
  doc.setFillColor(220, 38, 38); // Vermelho fogo Fire CRM
  doc.rect(margin, y, contentWidth, 3, "F");
  y += 8;

  // Cabeçalho da Empresa e Título do Recibo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(data.empresa_nome || "EXTINCONTROL MANUTENÇÃO DE EXTINTORES", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  y += 5;
  const empSub = [
    data.empresa_cnpj ? `CNPJ: ${data.empresa_cnpj}` : null,
    data.empresa_telefone ? `Tel/WhatsApp: ${data.empresa_telefone}` : null,
    data.empresa_endereco ? data.empresa_endereco : null,
  ].filter(Boolean).join(" • ");
  doc.text(empSub || "Serviços especializados em Prevenção contra Incêndio • Normas ABNT / INMETRO", margin, y);

  y += 7;
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  // 2. Caixa de Título do Recibo & Identificação
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(margin, y, contentWidth, 14, "F");
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.rect(margin, y, contentWidth, 14, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(220, 38, 38);
  doc.text("RECIBO DE MANUTENÇÃO & ENTREGA", margin + 4, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const dataFormatada = data.data_emissao.includes("-")
    ? data.data_emissao.split("-").reverse().join("/")
    : data.data_emissao;
  doc.text(`Nº: ${data.numero_recibo}`, margin + contentWidth - 4, y + 6, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Emissão: ${dataFormatada} • Status: ${data.status_pagamento}`, margin + 4, y + 11);
  if (data.lote_codigo) {
    doc.text(`Lote: ${data.lote_codigo} ${data.ordens_numeros ? `(${data.ordens_numeros})` : ""}`, margin + contentWidth - 4, y + 11, { align: "right" });
  }

  y += 18;

  // 3. Dados do Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("DADOS DO CLIENTE", margin, y);
  y += 3;

  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 20, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 20, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Cliente: ${data.cliente_nome}`, margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`CPF/CNPJ: ${data.cliente_documento || "Não informado"}`, margin + 4, y + 11);
  doc.text(`Telefone: ${data.cliente_telefone || "Não informado"}`, margin + 95, y + 11);
  doc.text(`Endereço: ${data.cliente_endereco || "Endereço não cadastrado"}`, margin + 4, y + 16);

  y += 25;

  // 4. Tabela de Extintores e Serviços
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`EXTINTORES / ITENS DO RECIBO (${data.itens.length} unidade(s))`, margin, y);
  y += 4;

  // Cabeçalho da Tabela
  const tableTop = y;
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(margin, tableTop, contentWidth, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("ITEM / SELO", margin + 3, tableTop + 5);
  doc.text("MODELO / AGENTE & PESO", margin + 38, tableTop + 5);
  doc.text("MODALIDADE", margin + 105, tableTop + 5);
  doc.text("VALIDADE", margin + 142, tableTop + 5);
  doc.text("VALOR", margin + contentWidth - 3, tableTop + 5, { align: "right" });

  y += 7;

  // Linhas da Tabela
  data.itens.forEach((it, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 6.5, "F");
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6.5, margin + contentWidth, y + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(it.identificacao || `Cilindro #${idx + 1}`, margin + 3, y + 4.5);

    doc.setFont("helvetica", "normal");
    doc.text(it.tipo_capacidade || "Pó ABC - 4kg", margin + 38, y + 4.5);

    doc.setTextColor(71, 85, 105);
    doc.text(it.modalidade || "Normal", margin + 105, y + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // Verde validade
    doc.text(it.nova_validade || "Próx. Ano", margin + 142, y + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(formatMoeda(it.valor), margin + contentWidth - 3, y + 4.5, { align: "right" });

    y += 6.5;
  });

  y += 4;

  // 5. Bloco de Totais e Condições de Pagamento
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(margin, y, contentWidth, 18, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 18, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Forma de Pagamento:`, margin + 4, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(String(data.forma_pagamento || "A Combinar"), margin + 38, y + 6);

  // Badge de Status Quitado / Pendente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  if (data.status_pagamento === "QUITADO") {
    doc.setFillColor(220, 252, 231); // Green-100
    doc.rect(margin + 4, y + 9, 36, 5, "F");
    doc.setTextColor(21, 128, 61); // Green-700
    doc.text("✓ PAGO / QUITADO", margin + 6, y + 12.8);
  } else {
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.rect(margin + 4, y + 9, 44, 5, "F");
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text("⏱ PENDENTE / A PRAZO", margin + 6, y + 12.8);
  }

  // Total Geral
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("VALOR TOTAL:", margin + contentWidth - 55, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  doc.text(formatMoeda(data.valor_total), margin + contentWidth - 4, y + 13, { align: "right" });

  y += 24;

  // 6. Observações & Termo de Garantia
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("TERMO DE GARANTIA & OBSERVAÇÕES:", margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const garantiaLegal =
    "Garantia de 12 meses nos serviços de recarga e teste hidrostático conforme normas técnicas ABNT NBR 12962 e regulamentação INMETRO. Manter lacre intacto e manômetro na faixa verde.";
  const textoObs = data.observacoes ? `${garantiaLegal} Obs: ${data.observacoes}` : garantiaLegal;
  const splitObs = doc.splitTextToSize(textoObs, contentWidth);
  doc.text(splitObs, margin, y);

  y += splitObs.length * 4 + 14;

  // 7. Canhotos de Assinatura
  doc.setDrawColor(148, 163, 184); // Slate-400
  const colWidth = (contentWidth - 10) / 2;

  // Assinatura Emissor
  doc.line(margin, y, margin + colWidth, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(data.empresa_nome || "ExtinControl Prevenção contra Incêndio", margin + colWidth / 2, y + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Responsável Técnico / Entrega", margin + colWidth / 2, y + 8, { align: "center" });

  // Assinatura Cliente
  const rightColX = margin + colWidth + 10;
  doc.line(rightColX, y, rightColX + colWidth, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(data.cliente_nome, rightColX + colWidth / 2, y + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Assinatura e Carimbo do Cliente Recebedor", rightColX + colWidth / 2, y + 8, { align: "center" });

  // Rodapé com Timestamp
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento gerado eletronicamente em ${new Date().toLocaleString("pt-BR")} via Fire CRM.`,
    margin,
    290
  );

  const cleanClient = data.cliente_nome.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
  const fileName = `Recibo_${data.numero_recibo}_${cleanClient}.pdf`;

  return { doc, fileName };
}

/**
 * Salva o PDF do recibo gerado no bucket de documentos do cliente no Supabase
 * e faz com que fique imediatamente disponível no menu de documentos do cliente.
 */
export async function saveReceiptPdfToClientDocuments(
  clientId: string,
  receiptData: EditableReceiptData,
  pdfDoc: jsPDF
): Promise<string> {
  const blob = pdfDoc.output("blob");
  const cleanClient = receiptData.cliente_nome.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
  const fileName = `Recibo_${receiptData.numero_recibo}_${cleanClient}.pdf`;
  const pdfFile = new File([blob], fileName, { type: "application/pdf" });

  // Upload direto para o bucket e tabela de documentos do cliente
  const docResult = await uploadClientDocument(clientId, pdfFile, "Recibo");
  return docResult.file_url || docResult.id;
}

/**
 * Interface para geração do Relatório Financeiro Consolidado de Múltiplos Lotes
 */
export interface MultiLoteReportData {
  lotes: LoteRecolhimento[];
  totalExtintores: number;
  totalClientes: number;
  valorTotalFaturado: number;
  valorTotalRecebido: number;
  valorTotalPendente: number;
  breakdownPorFormaPagamento: Record<string, number>;
  clientesDetalhados: {
    loteCodigo: string;
    clienteNome: string;
    clienteCidade?: string;
    extintoresQtd: number;
    formaPagamento: string;
    valor: number;
    status: string;
  }[];
}

/**
 * Gera o relatório financeiro consolidado em PDF para múltiplos lotes
 */
export function buildMultiLotesReportPdfDocument(data: MultiLoteReportData): {
  doc: jsPDF;
  fileName: string;
} {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  // Faixa Superior
  doc.setFillColor(220, 38, 38);
  doc.rect(margin, y, contentWidth, 3, "F");
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59);
  doc.text("RELATÓRIO FINANCEIRO CONSOLIDADO DE LOTES", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  y += 5;
  doc.text(`Emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} • ${data.lotes.length} lote(s) selecionado(s)`, margin, y);

  y += 7;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  // Cards de Métricas Principais
  const cardW = (contentWidth - 6) / 3;
  // Card 1: Faturamento Total
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, cardW, 16, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, cardW, 16, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("FATURAMENTO TOTAL", margin + 3, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(formatMoeda(data.valorTotalFaturado), margin + 3, y + 12);

  // Card 2: Total Recebido
  doc.setFillColor(240, 253, 244);
  doc.rect(margin + cardW + 3, y, cardW, 16, "F");
  doc.setDrawColor(187, 247, 208);
  doc.rect(margin + cardW + 3, y, cardW, 16, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text("TOTAL RECEBIDO (QUITADO)", margin + cardW + 6, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(22, 101, 52);
  doc.text(formatMoeda(data.valorTotalRecebido), margin + cardW + 6, y + 12);

  // Card 3: Total Pendente
  doc.setFillColor(254, 242, 242);
  doc.rect(margin + (cardW + 3) * 2, y, cardW, 16, "F");
  doc.setDrawColor(254, 202, 202);
  doc.rect(margin + (cardW + 3) * 2, y, cardW, 16, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28);
  doc.text("TOTAL PENDENTE / A RECEBER", margin + (cardW + 3) * 2 + 3, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(153, 27, 27);
  doc.text(formatMoeda(data.valorTotalPendente), margin + (cardW + 3) * 2 + 3, y + 12);

  y += 22;

  // Tabela de Lotes Selecionados
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`RESUMO DOS LOTES SELECIONADOS (${data.lotes.length})`, margin, y);
  y += 4;

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("CÓDIGO", margin + 3, y + 4.5);
  doc.text("LOTE / CIDADE", margin + 35, y + 4.5);
  doc.text("EXTINTORES", margin + 115, y + 4.5);
  doc.text("STATUS", margin + 142, y + 4.5);
  doc.text("TOTAL (R$)", margin + contentWidth - 3, y + 4.5, { align: "right" });
  y += 6.5;

  data.lotes.forEach((lote, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 6, "F");
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(lote.codigo, margin + 3, y + 4.2);

    doc.setFont("helvetica", "normal");
    doc.text(`${lote.nome} ${lote.cidade ? `(${lote.cidade})` : ""}`.slice(0, 45), margin + 35, y + 4.2);

    doc.text(`${lote.total_extintores || 0} un`, margin + 115, y + 4.2);
    doc.text(lote.status, margin + 142, y + 4.2);

    doc.setFont("helvetica", "bold");
    doc.text(formatMoeda(lote.valor_total || 0), margin + contentWidth - 3, y + 4.2, { align: "right" });
    y += 6;
  });

  y += 8;

  // Detalhamento de Clientes e Formas de Pagamento
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`DETALHAMENTO POR CLIENTE (${data.clientesDetalhados.length})`, margin, y);
  y += 4;

  doc.setFillColor(51, 65, 85);
  doc.rect(margin, y, contentWidth, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("CLIENTE", margin + 3, y + 4.5);
  doc.text("LOTE", margin + 70, y + 4.5);
  doc.text("EXTINTORES", margin + 105, y + 4.5);
  doc.text("PAGAMENTO", margin + 130, y + 4.5);
  doc.text("VALOR (R$)", margin + contentWidth - 3, y + 4.5, { align: "right" });
  y += 6.5;

  data.clientesDetalhados.forEach((c, idx) => {
    if (y > 275) {
      doc.addPage();
      y = 15;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 6, "F");
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(c.clienteNome.slice(0, 35), margin + 3, y + 4.2);

    doc.setFont("helvetica", "normal");
    doc.text(c.loteCodigo, margin + 70, y + 4.2);
    doc.text(`${c.extintoresQtd} un`, margin + 105, y + 4.2);
    doc.text(c.formaPagamento || "A Combinar", margin + 130, y + 4.2);

    doc.setFont("helvetica", "bold");
    doc.text(formatMoeda(c.valor), margin + contentWidth - 3, y + 4.2, { align: "right" });
    y += 6;
  });

  const fileName = `Relatorio_Consolidado_Lotes_${new Date().toISOString().slice(0, 10)}.pdf`;
  return { doc, fileName };
}
