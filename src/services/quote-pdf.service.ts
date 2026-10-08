import { jsPDF } from "jspdf";
import { getCompanySettings, DEFAULT_COMPANY_SETTINGS } from "@/services/company-settings.service";
import { getAppSettings } from "@/services/settings-security.service";

export interface QuotePdfItem {
  id?: string;
  descricao: string;
  tipo?: string;
  quantidade: number;
  unidade?: string;
  preco_unitario: number;
  total: number;
}

export interface QuotePdfData {
  numero: string;
  status: string;
  data_emissao: string;
  validade_dias?: number;
  data_validade?: string;
  // Cliente
  cliente_nome: string;
  cliente_razao_social?: string;
  cliente_documento?: string;
  cliente_telefone?: string;
  cliente_email?: string;
  cliente_endereco?: string;
  // Itens
  itens: QuotePdfItem[];
  // Valores
  subtotal: number;
  desconto?: number;
  total: number;
  // Condições e Termos
  condicoes_pagamento?: string;
  prazo_execucao?: string;
  termos_garantia?: string;
  clausula_ppci?: string;
  observacoes?: string;
  // Vendedor/Responsável
  responsavel_nome?: string;
}

function formatMoeda(val: number): string {
  return Number(val || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function safeText(str?: string | null): string {
  if (!str) return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

/**
 * Converte imagem URL em base64 com timeout e fallback
 */
async function getBase64Image(url: string): Promise<string | null> {
  if (!url || typeof window === "undefined") return null;
  if (url.startsWith("data:image")) return url;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildQuotePdfDocument(data: QuotePdfData): Promise<{
  doc: jsPDF;
  fileName: string;
}> {
  const company = await getCompanySettings().catch(() => DEFAULT_COMPANY_SETTINGS);
  const appSettings = getAppSettings();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  let currentY = 14;

  // 1. TOPO: Faixa decorativa sutil
  doc.setFillColor(234, 88, 12); // Laranja Fire (#EA580C)
  doc.rect(0, 0, pageWidth, 4, "F");

  // 2. CABEÇALHO DA EMPRESA E TÍTULO
  const headerHeight = 28;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(marginX, currentY, contentWidth, headerHeight, 2, 2, "F");
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, currentY, contentWidth, headerHeight, 2, 2, "S");

  // Logo ou Placeholder
  let hasRenderedLogo = false;
  if (company.logo_url) {
    try {
      const b64 = await getBase64Image(company.logo_url);
      if (b64) {
        doc.addImage(b64, "PNG", marginX + 3, currentY + 3, 24, 22, undefined, "FAST");
        hasRenderedLogo = true;
      }
    } catch {}
  }

  const companyTextX = hasRenderedLogo ? marginX + 30 : marginX + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(safeText(company.nome).toUpperCase(), companyTextX, currentY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  let cY = currentY + 12;
  if (company.cnpj) {
    doc.text(`CNPJ: ${safeText(company.cnpj)}`, companyTextX, cY);
    cY += 4;
  }
  const contatos = [company.telefone ? `Tel: ${company.telefone}` : "", company.email ? `E-mail: ${company.email}` : ""]
    .filter(Boolean)
    .join("  |  ");
  if (contatos) {
    doc.text(contatos, companyTextX, cY);
    cY += 4;
  }
  if (company.endereco) {
    doc.text(safeText(company.endereco), companyTextX, cY);
  }

  // Caixa do Orçamento à Direita
  const rightBoxWidth = 52;
  const rightBoxX = marginX + contentWidth - rightBoxWidth - 3;
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(rightBoxX, currentY + 3, rightBoxWidth, 22, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(194, 65, 12);
  doc.text(`ORÇAMENTO`, rightBoxX + rightBoxWidth / 2, currentY + 9, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(`Nº ${safeText(data.numero)}`, rightBoxX + rightBoxWidth / 2, currentY + 15, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text(`Emissão: ${data.data_emissao}`, rightBoxX + rightBoxWidth / 2, currentY + 20, { align: "center" });

  currentY += headerHeight + 5;

  // 3. DADOS DO CLIENTE
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(marginX, currentY, contentWidth, 24, 2, 2, "F");
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, currentY, contentWidth, 24, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(194, 65, 12);
  doc.text("DADOS DO CLIENTE / SOLICITANTE", marginX + 4, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  const clienteNomeExibicao = data.cliente_razao_social
    ? `${data.cliente_nome} (${data.cliente_razao_social})`
    : data.cliente_nome;
  doc.text(safeText(clienteNomeExibicao), marginX + 4, currentY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Documento: ${data.cliente_documento || "Não informado"}`, marginX + 4, currentY + 15);
  doc.text(
    `Contato: ${[data.cliente_telefone, data.cliente_email].filter(Boolean).join("  |  ") || "Não informado"}`,
    marginX + 4,
    currentY + 19
  );

  const endCliente = data.cliente_endereco ? `Local/Obra: ${data.cliente_endereco}` : "Endereço: Não informado";
  doc.text(safeText(endCliente), marginX + 95, currentY + 15, { maxWidth: 82 });

  currentY += 28;

  // 4. TABELA DE ITENS (Zebra striped)
  doc.setFillColor(31, 41, 55); // Cabeçalho escuro moderno
  doc.rect(marginX, currentY, contentWidth, 6.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("ITEM / DESCRIÇÃO", marginX + 4, currentY + 4.5);
  doc.text("TIPO", marginX + 96, currentY + 4.5);
  doc.text("QTD", marginX + 118, currentY + 4.5, { align: "center" });
  doc.text("UNITÁRIO", marginX + 148, currentY + 4.5, { align: "right" });
  doc.text("TOTAL", marginX + contentWidth - 4, currentY + 4.5, { align: "right" });

  currentY += 6.5;

  const rowHeight = 7;
  let isZebra = false;

  data.itens.forEach((item, index) => {
    // Quebra de página se necessário
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = 15;
    }

    if (isZebra) {
      doc.setFillColor(249, 250, 251);
      doc.rect(marginX, currentY, contentWidth, rowHeight, "F");
    }
    isZebra = !isZebra;

    doc.setDrawColor(243, 244, 246);
    doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);

    const descTruncada = doc.splitTextToSize(safeText(item.descricao), 90);
    doc.text(descTruncada[0] || "", marginX + 4, currentY + 4.5);

    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(item.tipo || "Geral", marginX + 96, currentY + 4.5);

    doc.setTextColor(31, 41, 55);
    doc.text(`${item.quantidade} ${item.unidade || "un"}`, marginX + 118, currentY + 4.5, { align: "center" });
    doc.text(formatMoeda(item.preco_unitario), marginX + 148, currentY + 4.5, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(formatMoeda(item.total), marginX + contentWidth - 4, currentY + 4.5, { align: "right" });

    currentY += rowHeight;
  });

  // 5. RESUMO FINANCEIRO
  currentY += 3;
  const totBoxWidth = 75;
  const totBoxX = marginX + contentWidth - totBoxWidth;

  doc.setFillColor(254, 242, 242);
  doc.roundedRect(totBoxX, currentY, totBoxWidth, 20, 1.5, 1.5, "F");
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(totBoxX, currentY, totBoxWidth, 20, 1.5, 1.5, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text("Subtotal dos Itens:", totBoxX + 4, currentY + 5);
  doc.text(formatMoeda(data.subtotal), totBoxX + totBoxWidth - 4, currentY + 5, { align: "right" });

  if (data.desconto && data.desconto > 0) {
    doc.text("Desconto concedido:", totBoxX + 4, currentY + 9);
    doc.setTextColor(220, 38, 38);
    doc.text(`- ${formatMoeda(data.desconto)}`, totBoxX + totBoxWidth - 4, currentY + 9, { align: "right" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(153, 27, 27);
  doc.text("VALOR TOTAL:", totBoxX + 4, currentY + 16);
  doc.text(formatMoeda(data.total), totBoxX + totBoxWidth - 4, currentY + 16, { align: "right" });

  // 6. CONDIÇÕES, GARANTIA & CLÁUSULA PPCI (lado esquerdo)
  const condWidth = contentWidth - totBoxWidth - 4;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(marginX, currentY, condWidth, 20, 1.5, 1.5, "F");
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, currentY, condWidth, 20, 1.5, 1.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(194, 65, 12);
  doc.text("CONDIÇÕES COMERCIAIS", marginX + 3, currentY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(75, 85, 99);
  const condText = `Pagamento: ${data.condicoes_pagamento || appSettings.quoteTerms.condicoes_padrao}`;
  const validadeText = `Validade: ${data.validade_dias || appSettings.quoteTerms.validade_dias_padrao} dias (${data.data_validade || ""})`;
  doc.text(condText, marginX + 3, currentY + 9);
  doc.text(validadeText, marginX + 3, currentY + 13);
  if (data.prazo_execucao) {
    doc.text(`Prazo de execução: ${data.prazo_execucao}`, marginX + 3, currentY + 17);
  }

  currentY += 24;

  // 7. TERMOS TÉCNICOS & PPCI (Configurações Gerais)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, currentY, contentWidth, 23, 1.5, 1.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text("TERMOS DE GARANTIA E CONFORMIDADE TÉCNICA / PPCI", marginX + 4, currentY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(107, 114, 128);

  const garantiaTexto = data.termos_garantia || appSettings.quoteTerms.termos_garantia;
  const ppciTexto = data.clausula_ppci || appSettings.quoteTerms.clausula_ppci;

  const splitGarantia = doc.splitTextToSize(`• Garantia: ${garantiaTexto}`, contentWidth - 8);
  doc.text(splitGarantia, marginX + 4, currentY + 9);

  const nextLineY = currentY + 9 + splitGarantia.length * 3.2;
  const splitPpci = doc.splitTextToSize(`• Normas/PPCI: ${ppciTexto}`, contentWidth - 8);
  doc.text(splitPpci, marginX + 4, nextLineY);

  currentY += 27;

  // 8. ACEITE DO CLIENTE & ASSINATURAS
  const sigBoxY = Math.max(currentY, pageHeight - 38);
  const colWidth = (contentWidth - 10) / 2;

  // Assinatura Empresa
  doc.setDrawColor(156, 163, 175);
  doc.line(marginX + 5, sigBoxY + 15, marginX + 5 + colWidth - 10, sigBoxY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text(safeText(company.nome), marginX + 5 + (colWidth - 10) / 2, sigBoxY + 19, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Responsável Comercial / Técnico", marginX + 5 + (colWidth - 10) / 2, sigBoxY + 22.5, { align: "center" });

  // Assinatura Cliente
  const clienteSigX = marginX + colWidth + 10;
  doc.line(clienteSigX, sigBoxY + 15, clienteSigX + colWidth - 10, sigBoxY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text("DE ACORDO DO CLIENTE", clienteSigX + (colWidth - 10) / 2, sigBoxY + 19, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Data: ____/____/________  Assinatura / Carimbo", clienteSigX + (colWidth - 10) / 2, sigBoxY + 22.5, {
    align: "center",
  });

  // Rodapé da página
  doc.setFontSize(6);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Documento gerado eletronicamente em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} - ExtinControl CRM`,
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  const cleanNum = safeText(data.numero).replace(/[^a-zA-Z0-9]/g, "_");
  const cleanCli = safeText(data.cliente_nome).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
  const fileName = `Orcamento_${cleanNum}_${cleanCli}.pdf`;

  return { doc, fileName };
}
