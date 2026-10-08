import { jsPDF } from "jspdf";
import { getCompanySettings, DEFAULT_COMPANY_SETTINGS } from "@/services/company-settings.service";
import type { Customer, ExtintorInventario } from "@/types";

export interface MemorialPdfData {
  cliente_id?: string | null;
  cliente_nome: string;
  cliente_razao_social?: string | null;
  cliente_documento?: string | null;
  cliente_telefone?: string | null;
  cliente_email?: string | null;
  cliente_endereco?: string | null;
  // PPCI e dados da edificação
  ppci_enquadramento?: string | null;
  ppci_number?: string | null;
  ppci_metragem?: string | number | null;
  ppci_expires_at?: string | null;
  responsavel_nome?: string | null;
  // Lista de Extintores
  extintores: ExtintorInventario[];
  data_emissao?: string | null;
}

function safeText(str?: string | null): string {
  if (!str) return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

function formatMonthYear(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("-");
    if (parts.length >= 2) {
      return `${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
  } catch {}
  return dateStr;
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

/**
 * Constrói o documento PDF do Memorial Descritivo de Extintores (Anexo D - NBR 12962 / CBMRS)
 * utilizando rigorosamente o mesmo padrão de Cabeçalho e Rodapé dos Orçamentos.
 */
export async function buildMemorialPdfDocument(data: MemorialPdfData): Promise<{
  doc: jsPDF;
  fileName: string;
}> {
  const company = await getCompanySettings().catch(() => DEFAULT_COMPANY_SETTINGS);

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

  const dataEmissao =
    data.data_emissao ||
    new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  let currentY = 14;

  // Função para desenhar o rodapé em qualquer página
  const renderFooter = (pageNumber: number, totalPages: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Documento gerado eletronicamente em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} - ExtinControl CRM`,
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" }
    );
    doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - marginX, pageHeight - 5, {
      align: "right",
    });
  };

  // ============================================================================
  // 1. TOPO: FAIXA DECORATIVA SUTIL (IDÊNTICA AOS ORÇAMENTOS)
  // ============================================================================
  doc.setFillColor(234, 88, 12); // Laranja Fire (#EA580C)
  doc.rect(0, 0, pageWidth, 4, "F");

  // ============================================================================
  // 2. CABEÇALHO DA EMPRESA E TÍTULO (IDÊNTICO AOS ORÇAMENTOS)
  // ============================================================================
  const headerHeight = 28;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(marginX, currentY, contentWidth, headerHeight, 2, 2, "F");
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, currentY, contentWidth, headerHeight, 2, 2, "S");

  // Logo ou identificação
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
  const contatos = [
    company.telefone ? `Tel: ${company.telefone}` : "",
    company.email ? `E-mail: ${company.email}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");
  if (contatos) {
    doc.text(contatos, companyTextX, cY);
    cY += 4;
  }
  if (company.endereco) {
    doc.text(safeText(company.endereco), companyTextX, cY);
  }

  // Caixa de Identificação do Documento à Direita (Idêntica aos Orçamentos)
  const rightBoxWidth = 56;
  const rightBoxX = marginX + contentWidth - rightBoxWidth - 3;
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(rightBoxX, currentY + 3, rightBoxWidth, 22, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(194, 65, 12);
  doc.text(`MEMORIAL DESCRITIVO`, rightBoxX + rightBoxWidth / 2, currentY + 8.5, {
    align: "center",
  });

  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text(`ANEXO D • NBR 12962`, rightBoxX + rightBoxWidth / 2, currentY + 13.5, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(107, 114, 128);
  doc.text(`Emissão: ${dataEmissao}`, rightBoxX + rightBoxWidth / 2, currentY + 18, {
    align: "center",
  });
  doc.text(`Total: ${data.extintores.length} aparelhos`, rightBoxX + rightBoxWidth / 2, currentY + 22, {
    align: "center",
  });

  currentY += headerHeight + 5;

  // ============================================================================
  // 3. DADOS DO CLIENTE / ESTABELECIMENTO (IDÊNTICO AOS ORÇAMENTOS)
  // ============================================================================
  const clientBoxHeight = 25;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(marginX, currentY, contentWidth, clientBoxHeight, 2, 2, "F");
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, currentY, contentWidth, clientBoxHeight, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(194, 65, 12);
  doc.text("DADOS DO CLIENTE / ESTABELECIMENTO OCUPANTE", marginX + 4, currentY + 5);

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
    currentY + 19.5
  );

  const endCliente = data.cliente_endereco
    ? `Local/Edificação: ${data.cliente_endereco}`
    : "Endereço: Não informado";
  doc.text(safeText(endCliente), marginX + 95, currentY + 15, { maxWidth: 82 });

  const ppciInfo = [
    data.ppci_enquadramento ? `PPCI: ${data.ppci_enquadramento}` : "PPCI: Conforme Projeto",
    data.ppci_number ? `Nº ${data.ppci_number}` : "",
    data.ppci_metragem ? `Área: ${data.ppci_metragem}m²` : "",
  ]
    .filter(Boolean)
    .join(" • ");
  doc.text(safeText(ppciInfo), marginX + 95, currentY + 19.5, { maxWidth: 82 });

  currentY += clientBoxHeight + 5;

  // ============================================================================
  // 4. TABELA DO MEMORIAL DESCRITIVO DE EXTINTORES
  // ============================================================================
  const tableHeaderHeight = 6.5;

  const renderTableHeader = (y: number) => {
    doc.setFillColor(31, 41, 55); // Cabeçalho escuro moderno
    doc.rect(marginX, y, contentWidth, tableHeaderHeight, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);
    doc.text("#", marginX + 3, y + 4.5);
    doc.text("IDENTIFICAÇÃO / TAG", marginX + 11, y + 4.5);
    doc.text("TIPO / CARGA", marginX + 50, y + 4.5);
    doc.text("LOCALIZAÇÃO / SETOR", marginX + 92, y + 4.5);
    doc.text("ÚLT. RECARGA", marginX + 138, y + 4.5);
    doc.text("VENCIMENTO", marginX + 160, y + 4.5);
    doc.text("STATUS", marginX + contentWidth - 4, y + 4.5, { align: "right" });
  };

  renderTableHeader(currentY);
  currentY += tableHeaderHeight;

  const rowHeight = 6.2;
  let isZebra = false;

  // Ordena os extintores por localização ou identificação
  const extintoresOrdenados = [...data.extintores].sort((a, b) =>
    (a.localizacao || "").localeCompare(b.localizacao || "")
  );

  extintoresOrdenados.forEach((ext, index) => {
    // Quebra de página automática com cabeçalho repetido caso necessário
    if (currentY > pageHeight - 55) {
      doc.addPage();
      // Faixa decorativa no topo da nova página
      doc.setFillColor(234, 88, 12);
      doc.rect(0, 0, pageWidth, 4, "F");
      currentY = 12;

      // Cabeçalho resumido da tabela na continuação
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(17, 24, 39);
      doc.text(
        `MEMORIAL DESCRITIVO DE EXTINTORES (CONTINUAÇÃO) — ${safeText(data.cliente_nome)}`,
        marginX,
        currentY + 4
      );
      currentY += 7;

      renderTableHeader(currentY);
      currentY += tableHeaderHeight;
      isZebra = false;
    }

    if (isZebra) {
      doc.setFillColor(249, 250, 251);
      doc.rect(marginX, currentY, contentWidth, rowHeight, "F");
    }
    isZebra = !isZebra;

    doc.setDrawColor(243, 244, 246);
    doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);

    // # Índice
    doc.text(String(index + 1).padStart(2, "0"), marginX + 3, currentY + 4.2);

    // Identificação
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(safeText(ext.identificacao || `CIL-${index + 1}`), marginX + 11, currentY + 4.2);

    // Tipo / Carga
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text(safeText(ext.tipo_capacidade || "Pó ABC - 4kg"), marginX + 50, currentY + 4.2);

    // Localização / Setor
    doc.setTextColor(75, 85, 99);
    const loc = safeText(ext.localizacao || "Padrão / Conforme Planta");
    doc.text(loc.length > 25 ? loc.slice(0, 25) + "..." : loc, marginX + 92, currentY + 4.2);

    // Última Recarga
    doc.text(formatMonthYear(ext.data_ultima_recarga), marginX + 138, currentY + 4.2);

    // Vencimento
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(formatMonthYear(ext.data_vencimento), marginX + 160, currentY + 4.2);

    // Status
    doc.setFont("helvetica", "normal");
    const isAtivo = ext.status === "no_cliente" || !ext.status;
    doc.setTextColor(isAtivo ? 16 : 180, isAtivo ? 120 : 80, isAtivo ? 60 : 30);
    doc.text(isAtivo ? "Conforme" : "Manutenção", marginX + contentWidth - 4, currentY + 4.2, {
      align: "right",
    });

    currentY += rowHeight;
  });

  if (extintoresOrdenados.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text("Nenhum extintor cadastrado na ficha técnica deste cliente.", marginX + 4, currentY + 5);
    currentY += 8;
  }

  currentY += 4;

  // ============================================================================
  // 5. RESUMO DE EQUIPAMENTOS POR AGENTE EXTINTOR
  // ============================================================================
  const resumoMap = new Map<string, number>();
  data.extintores.forEach((ext) => {
    const tipo = ext.tipo_capacidade || "Pó ABC - 4kg";
    resumoMap.set(tipo, (resumoMap.get(tipo) || 0) + 1);
  });

  if (currentY > pageHeight - 65) {
    doc.addPage();
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 0, pageWidth, 4, "F");
    currentY = 14;
  }

  doc.setFillColor(243, 244, 246);
  doc.roundedRect(marginX, currentY, contentWidth, 14, 1.5, 1.5, "F");
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, currentY, contentWidth, 14, 1.5, 1.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text("RESUMO DA PROTEÇÃO INSTALADA NA EDIFICAÇÃO", marginX + 4, currentY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(75, 85, 99);

  const resumoItens = Array.from(resumoMap.entries()).map(
    ([tipo, count]) => `${tipo}: ${count} un`
  );
  const resumoTexto =
    resumoItens.length > 0
      ? resumoItens.join("  |  ")
      : "Nenhum equipamento relacionado.";
  doc.text(
    `• Equipamentos: ${resumoTexto}  (Total: ${data.extintores.length} unidades)`,
    marginX + 4,
    currentY + 9.5
  );

  currentY += 18;

  // ============================================================================
  // 6. DECLARAÇÃO TÉCNICA DE CONFORMIDADE E NORMAS (CBMRS / ABNT NBR 12962)
  // ============================================================================
  if (currentY > pageHeight - 50) {
    doc.addPage();
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 0, pageWidth, 4, "F");
    currentY = 14;
  }

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, currentY, contentWidth, 20, 1.5, 1.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text("DECLARAÇÃO DE CONFORMIDADE TÉCNICA E NORMAS REGULAMENTARES", marginX + 4, currentY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(107, 114, 128);

  const textoDeclaracao =
    "Declaramos para os devidos fins legais, comprovação junto ao Corpo de Bombeiros Militar (CBMRS / Instruções Técnicas) e seguradoras que os aparelhos extintores de incêndio relacionados neste Memorial Descritivo atendem integralmente aos requisitos das normas técnicas ABNT NBR 12962, NBR 15808, Portarias do INMETRO e exigências de proteção contra incêndio da edificação.";

  const splitDecl = doc.splitTextToSize(textoDeclaracao, contentWidth - 8);
  doc.text(splitDecl, marginX + 4, currentY + 9);

  currentY += 24;

  // ============================================================================
  // 7. ASSINATURAS (IDÊNTICO AOS ORÇAMENTOS)
  // ============================================================================
  const sigBoxY = Math.max(currentY, pageHeight - 38);
  const colWidth = (contentWidth - 10) / 2;

  // Assinatura Empresa Emitente
  doc.setDrawColor(156, 163, 175);
  doc.line(marginX + 5, sigBoxY + 15, marginX + 5 + colWidth - 10, sigBoxY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text(safeText(company.nome), marginX + 5 + (colWidth - 10) / 2, sigBoxY + 19, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Responsável Técnico / Credenciado", marginX + 5 + (colWidth - 10) / 2, sigBoxY + 22.5, {
    align: "center",
  });

  // Assinatura Cliente / Edificação
  const clienteSigX = marginX + colWidth + 10;
  doc.line(clienteSigX, sigBoxY + 15, clienteSigX + colWidth - 10, sigBoxY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text("RESPONSÁVEL PELA EDIFICAÇÃO / OCUPAÇÃO", clienteSigX + (colWidth - 10) / 2, sigBoxY + 19, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(
    "Data: ____/____/________  Assinatura / Carimbo",
    clienteSigX + (colWidth - 10) / 2,
    sigBoxY + 22.5,
    { align: "center" }
  );

  // ============================================================================
  // 8. RENDERIZAÇÃO DO RODAPÉ EM TODAS AS PÁGINAS (IDÊNTICO AOS ORÇAMENTOS)
  // ============================================================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    renderFooter(i, totalPages);
  }

  const cleanCli = safeText(data.cliente_nome).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 24);
  const dataTag = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const fileName = `Memorial_Descritivo_${cleanCli}_${dataTag}.pdf`;

  return { doc, fileName };
}

/**
 * Dispara o download automático do PDF do Memorial Descritivo
 */
export async function downloadMemorialPdf(data: MemorialPdfData): Promise<string> {
  const { doc, fileName } = await buildMemorialPdfDocument(data);
  doc.save(fileName);
  return fileName;
}

/**
 * Abre o PDF do Memorial Descritivo em uma nova aba do navegador para visualização/impressão nativa
 */
export async function openMemorialPdfInNewTab(data: MemorialPdfData): Promise<void> {
  const { doc } = await buildMemorialPdfDocument(data);
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
}
