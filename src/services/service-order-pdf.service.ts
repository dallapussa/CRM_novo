import { jsPDF } from "jspdf";
import { getCompanySettings, DEFAULT_COMPANY_SETTINGS } from "@/services/company-settings.service";

export interface ServiceOrderPdfItem {
  id?: string;
  descricao: string;
  tipo?: string;
  quantidade: number;
  unidade?: string;
  selo_inmetro?: string;
  patrimonio_cilindro?: string;
  observacoes?: string;
}

export interface ServiceOrderPdfData {
  numero: string;
  status: string;
  data_abertura: string;
  data_agendamento?: string;
  data_conclusao?: string;
  // Técnico
  tecnico_nome?: string;
  equipe?: string;
  // Cliente
  cliente_nome: string;
  cliente_documento?: string | null;
  cliente_telefone?: string | null;
  cliente_endereco?: string | null;
  contato_local?: string;
  // Itens operacionais (sem valores monetários!)
  itens: ServiceOrderPdfItem[];
  // Notas e checklist
  observacoes?: string;
  instrucoes_campo?: string;
}

function safeText(str?: string | null): string {
  if (!str) return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

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

export async function buildServiceOrderPdfDocument(data: ServiceOrderPdfData): Promise<{
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
  const contentWidth = pageWidth - marginX * 2;

  let currentY = 14;

  // 1. Barra superior
  doc.setFillColor(15, 118, 110); // Tom técnico / Teal moderno
  doc.rect(0, 0, pageWidth, 4, "F");

  // 2. Cabeçalho
  const headerHeight = 28;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(marginX, currentY, contentWidth, headerHeight, 2, 2, "F");
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, currentY, contentWidth, headerHeight, 2, 2, "S");

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

  // Caixa da OS à Direita
  const rightBoxWidth = 55;
  const rightBoxX = marginX + contentWidth - rightBoxWidth - 3;
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(rightBoxX, currentY + 3, rightBoxWidth, 22, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text(`ORDEM DE SERVIÇO`, rightBoxX + rightBoxWidth / 2, currentY + 8, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(`Nº ${safeText(data.numero)}`, rightBoxX + rightBoxWidth / 2, currentY + 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text(`Abertura: ${data.data_abertura}  |  ${data.status.toUpperCase()}`, rightBoxX + rightBoxWidth / 2, currentY + 19, {
    align: "center",
  });

  currentY += headerHeight + 5;

  // 3. BLOCO: DADOS OPERACIONAIS & TÉCNICO RESPONSÁVEL
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(marginX, currentY, contentWidth, 28, 2, 2, "F");
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, currentY, contentWidth, 28, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 118, 110);
  doc.text("DADOS DO ATENDIMENTO & LOCAL", marginX + 4, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(safeText(data.cliente_nome), marginX + 4, currentY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Documento: ${data.cliente_documento || "Não informado"}`, marginX + 4, currentY + 15);
  doc.text(`Telefone: ${data.cliente_telefone || "Não informado"}`, marginX + 4, currentY + 19);
  doc.text(`Endereço/Local: ${safeText(data.cliente_endereco) || "No estabelecimento"}`, marginX + 4, currentY + 23, {
    maxWidth: 95,
  });

  // Coluna Equipe/Técnico
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 118, 110);
  doc.text("EQUIPE TÉCNICA / AGENDAMENTO", marginX + 105, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text(`Técnico Responsável: ${data.tecnico_nome || "Não atribuído"}`, marginX + 105, currentY + 10);
  if (data.equipe) {
    doc.text(`Equipe/Viatura: ${data.equipe}`, marginX + 105, currentY + 14);
  }
  doc.text(`Data Agendada: ${data.data_agendamento || "A combinar"}`, marginX + 105, currentY + 18);
  if (data.data_conclusao) {
    doc.text(`Conclusão: ${data.data_conclusao}`, marginX + 105, currentY + 22);
  }

  currentY += 32;

  // 4. TABELA DE ITENS E EQUIPAMENTOS OPERACIONAIS (Sem valores em R$!)
  doc.setFillColor(31, 41, 55);
  doc.rect(marginX, currentY, contentWidth, 6.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("ITEM / EQUIPAMENTO / SERVIÇO", marginX + 4, currentY + 4.5);
  doc.text("QTD", marginX + 105, currentY + 4.5, { align: "center" });
  doc.text("PATRIMÔNIO / CILINDRO", marginX + 125, currentY + 4.5);
  doc.text("SELO INMETRO / LACRE", marginX + 155, currentY + 4.5);

  currentY += 6.5;

  const rowHeight = 8;
  let isZebra = false;

  data.itens.forEach((item) => {
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

    const descTrunc = doc.splitTextToSize(safeText(item.descricao), 95);
    doc.text(descTrunc[0] || "", marginX + 4, currentY + 5);

    doc.text(`${item.quantidade} ${item.unidade || "un"}`, marginX + 105, currentY + 5, { align: "center" });

    // Patrimônio ou linha pontilhada para preenchimento em campo
    const patri = item.patrimonio_cilindro || "_________________";
    doc.text(patri, marginX + 125, currentY + 5);

    // Selo Inmetro ou linha para anotação
    const selo = item.selo_inmetro || "_________________";
    doc.text(selo, marginX + 155, currentY + 5);

    currentY += rowHeight;
  });

  // 5. CAMPO DE ANOTAÇÕES TÉCNICAS E VISTORIA DE CAMPO
  currentY += 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(marginX, currentY, contentWidth, 34, 1.5, 1.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text("REGISTRO DE CAMPO & ANOTAÇÕES TÉCNICAS", marginX + 4, currentY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(75, 85, 99);

  if (data.observacoes) {
    const splitObs = doc.splitTextToSize(`Obs: ${data.observacoes}`, contentWidth - 8);
    doc.text(splitObs, marginX + 4, currentY + 9);
  }

  // Linhas para o técnico anotar no papel / prancheta se imprimir
  const startLineY = currentY + (data.observacoes ? 15 : 10);
  doc.setDrawColor(229, 231, 235);
  for (let l = 0; l < 4; l++) {
    const ly = startLineY + l * 5;
    if (ly < currentY + 32) {
      doc.line(marginX + 4, ly, marginX + contentWidth - 4, ly);
    }
  }

  currentY += 38;

  // 6. TERMO DE RECEBIMENTO & ASSINATURAS
  const sigBoxY = Math.max(currentY, pageHeight - 38);
  const colWidth = (contentWidth - 10) / 2;

  // Assinatura Técnico
  doc.setDrawColor(156, 163, 175);
  doc.line(marginX + 5, sigBoxY + 15, marginX + 5 + colWidth - 10, sigBoxY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text(safeText(data.tecnico_nome || "Técnico Responsável"), marginX + 5 + (colWidth - 10) / 2, sigBoxY + 19, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Assinatura do Técnico Executante", marginX + 5 + (colWidth - 10) / 2, sigBoxY + 22.5, { align: "center" });

  // Assinatura Cliente / Recebedor
  const clienteSigX = marginX + colWidth + 10;
  doc.line(clienteSigX, sigBoxY + 15, clienteSigX + colWidth - 10, sigBoxY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text("RECEBIMENTO DO CLIENTE", clienteSigX + (colWidth - 10) / 2, sigBoxY + 19, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Nome legível / RG / Data", clienteSigX + (colWidth - 10) / 2, sigBoxY + 22.5, { align: "center" });

  // Rodapé
  doc.setFontSize(6);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Via Operacional sem valores comerciais impressa em ${new Date().toLocaleDateString("pt-BR")} - ExtinControl CRM`,
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  const cleanNum = safeText(data.numero).replace(/[^a-zA-Z0-9]/g, "_");
  const cleanCli = safeText(data.cliente_nome).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
  const fileName = `OS_Operacional_${cleanNum}_${cleanCli}.pdf`;

  return { doc, fileName };
}
