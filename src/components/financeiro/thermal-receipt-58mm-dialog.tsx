"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, QrCode, FileText, CheckCircle2, Flame, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EditableReceiptData, ReceiptItem } from "@/services/receipt-pdf.service";
import { buildReceiptPdfDocument, saveReceiptPdfToClientDocuments } from "@/services/receipt-pdf.service";
import { getCompanySettings } from "@/services/company-settings.service";
import { jsPDF } from "jspdf";

interface ThermalReceipt58mmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: EditableReceiptData | null;
  pdfPublicUrl?: string | null;
}

function formatMoeda(val: number): string {
  return Number(val || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ThermalReceipt58mmDialog({
  open,
  onOpenChange,
  receiptData,
  pdfPublicUrl: initialPdfUrl,
}: ThermalReceipt58mmDialogProps) {
  const { toast } = useToast();
  const printAreaRef = useRef<HTMLDivElement>(null);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [activePdfUrl, setActivePdfUrl] = useState<string>(initialPdfUrl || "");
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    getCompanySettings()
      .then((s) => {
        setCompanySettings(s);
      })
      .catch(() => {});
  }, []);

  // Agrupa os itens do recibo por Modelo/Capacidade + Modalidade para o resumo em 58mm
  const itensAgrupados = useMemo(() => {
    if (!receiptData?.itens) return [];

    const map = new Map<string, { tipo: string; modalidade: string; qtd: number; valorUnit: number; total: number }>();

    receiptData.itens.forEach((it) => {
      const key = `${it.tipo_capacidade}_${it.modalidade}_${it.valor}`;
      const existing = map.get(key);
      if (existing) {
        existing.qtd += 1;
        existing.total += Number(it.valor) || 0;
      } else {
        map.set(key, {
          tipo: it.tipo_capacidade,
          modalidade: it.modalidade,
          qtd: 1,
          valorUnit: Number(it.valor) || 0,
          total: Number(it.valor) || 0,
        });
      }
    });

    return Array.from(map.values());
  }, [receiptData]);

  // Se não temos a URL do PDF ainda, gera o PDF e salva nos documentos para obter a URL pública
  useEffect(() => {
    if (!open || !receiptData) return;

    let isMounted = true;

    async function ensurePdfUrl() {
      if (initialPdfUrl) {
        setActivePdfUrl(initialPdfUrl);
        generateQr(initialPdfUrl);
        return;
      }

      setIsGeneratingUrl(true);
      try {
        if (!receiptData) return;
        const currentData = receiptData;
        const { doc, receiptUrl } = await buildReceiptPdfDocument(currentData);
        
        // Exibe o link e gera o QR Code imediatamente para agilidade total
        if (isMounted) {
          setActivePdfUrl(receiptUrl);
          await generateQr(receiptUrl);
        }

        // Salva nos documentos do cliente em segundo plano se tiver cliente_id
        if (currentData.cliente_id) {
          try {
            const uploadedUrl = await saveReceiptPdfToClientDocuments(
              currentData.cliente_id,
              currentData,
              doc
            );
            if (isMounted && uploadedUrl && uploadedUrl !== receiptUrl) {
              setActivePdfUrl(uploadedUrl);
              generateQr(uploadedUrl);
            }
          } catch (uploadErr) {
            console.warn("Aviso ao salvar PDF em segundo plano:", uploadErr);
          }
        }
      } catch (err) {
        console.warn("Erro ao obter URL pública do PDF:", err);
        const fallbackUrl = `${window.location.origin}/dashboard/clientes/${receiptData?.cliente_id || ""}`;
        if (isMounted) {
          setActivePdfUrl(fallbackUrl);
          generateQr(fallbackUrl);
        }
      } finally {
        if (isMounted) setIsGeneratingUrl(false);
      }
    }

    async function generateQr(url: string) {
      try {
        const qr = await QRCode.toDataURL(url, {
          width: 140,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        if (isMounted) setQrCodeDataUrl(qr);
      } catch (e) {
        console.error("Erro gerando QR Code:", e);
      }
    }

    ensurePdfUrl();

    return () => {
      isMounted = false;
    };
  }, [open, receiptData, initialPdfUrl]);

  if (!receiptData) return null;

  const activeEmpresaNome =
    receiptData.empresa_nome && !receiptData.empresa_nome.toUpperCase().includes("EXTINCONTROL")
      ? receiptData.empresa_nome
      : (companySettings?.nome || "JC Extintores");

  const activeEmpresaCnpj =
    receiptData.empresa_cnpj || companySettings?.cnpj || "";

  const activeEmpresaTelefone =
    receiptData.empresa_telefone || companySettings?.telefone || "";

  const activeLogo = receiptData.empresa_logo || companySettings?.logo_url;

  // 1. Gera e baixa o arquivo PDF com dimensões nativas de 58mm (Não depende de spooler, funciona 100% no celular)
  const handleDownload58mmPdf = async () => {
    if (!receiptData) return;
    setIsDownloadingPdf(true);
    try {
      const itensCount = itensAgrupados.length || 1;
      const baseHeight = 150 + itensCount * 9 + (activeLogo ? 15 : 0);
      const pageHeight = Math.max(160, baseHeight);

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [58, pageHeight],
      });

      const margin = 3;
      const contentWidth = 58 - margin * 2; // 52mm
      let y = 5;

      // 1. Logo
      if (activeLogo) {
        try {
          doc.addImage(activeLogo, "PNG", (58 - 28) / 2, y, 28, 12, undefined, "FAST");
          y += 14;
        } catch (e) {
          console.warn("Aviso ao adicionar logo no PDF 58mm:", e);
        }
      }

      // 2. Cabeçalho da Empresa
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(activeEmpresaNome, 29, y, { align: "center", maxWidth: contentWidth });
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("PREVENÇÃO CONTRA INCÊNDIO", 29, y, { align: "center" });
      y += 3.5;

      if (activeEmpresaCnpj) {
        doc.text(`CNPJ: ${activeEmpresaCnpj}`, 29, y, { align: "center" });
        y += 3.5;
      }
      if (activeEmpresaTelefone) {
        doc.text(`Fone/Zap: ${activeEmpresaTelefone}`, 29, y, { align: "center" });
        y += 3.5;
      }

      // Linha tracejada
      y += 1;
      doc.setLineDashPattern([1, 1], 0);
      doc.line(margin, y, 58 - margin, y);
      y += 4;

      // 3. Título do Recibo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`RECIBO DE ENTREGA Nº ${receiptData.numero_recibo}`, 29, y, { align: "center" });
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`Data: ${receiptData.data_emissao}`, margin, y);
      y += 3.5;

      if (receiptData.lote_codigo) {
        const splitLote = doc.splitTextToSize(
          `Lote: ${receiptData.lote_codigo} ${receiptData.ordens_numeros ? `(${receiptData.ordens_numeros})` : ""}`,
          contentWidth
        );
        doc.text(splitLote, margin, y);
        y += splitLote.length * 3.5;
      }

      // Linha tracejada
      doc.line(margin, y, 58 - margin, y);
      y += 4;

      // 4. Dados do Cliente
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const splitCli = doc.splitTextToSize(receiptData.cliente_nome.toUpperCase(), contentWidth);
      doc.text(splitCli, margin, y);
      y += splitCli.length * 3.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      if (receiptData.cliente_documento) {
        doc.text(`Doc: ${receiptData.cliente_documento}`, margin, y);
        y += 3.5;
      }
      if (receiptData.cliente_endereco) {
        const splitEnd = doc.splitTextToSize(`End: ${receiptData.cliente_endereco}`, contentWidth);
        doc.text(splitEnd, margin, y);
        y += splitEnd.length * 3;
      }

      // Linha dupla
      y += 1;
      doc.setLineDashPattern([], 0);
      doc.setLineWidth(0.4);
      doc.line(margin, y, 58 - margin, y);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1, 1], 0);
      y += 4;

      // 5. Itens do Recibo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("ITENS / EXTINTORES", margin, y);
      doc.text("TOTAL", 58 - margin, y, { align: "right" });
      y += 3.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);

      itensAgrupados.forEach((it) => {
        const desc = `${it.qtd}x ${it.tipo} (${it.modalidade.slice(0, 4)}.)`;
        const valTot = formatMoeda(it.total);
        doc.text(desc, margin, y, { maxWidth: 35 });
        doc.text(valTot, 58 - margin, y, { align: "right" });
        y += 3;
        doc.setFontSize(5.5);
        doc.setTextColor(80, 80, 80);
        doc.text(`Un: ${formatMoeda(it.valorUnit)}`, margin + 2, y);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(6.5);
        y += 3.5;
      });

      // Linha dupla
      doc.setLineDashPattern([], 0);
      doc.setLineWidth(0.4);
      doc.line(margin, y, 58 - margin, y);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1, 1], 0);
      y += 4;

      // 6. Totais e Pagamento
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("VALOR TOTAL:", margin, y);
      doc.text(formatMoeda(receiptData.valor_total), 58 - margin, y, { align: "right" });
      y += 4.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`Pgto: ${receiptData.forma_pagamento}`, margin, y);
      y += 3.5;

      doc.setFont("helvetica", "bold");
      const statusText =
        receiptData.status_pagamento === "QUITADO"
          ? "[X] QUITADO / PAGO"
          : "[ ] PENDENTE / A PRAZO";
      doc.text(`Status: ${statusText}`, margin, y);
      y += 4;

      // Linha tracejada
      doc.line(margin, y, 58 - margin, y);
      y += 4;

      // 7. QR Code e Autenticação
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("RECIBO DIGITAL & CERTIFICADO", 29, y, { align: "center" });
      y += 3;

      if (qrCodeDataUrl) {
        try {
          doc.addImage(qrCodeDataUrl, "PNG", (58 - 26) / 2, y, 26, 26, undefined, "FAST");
          y += 28;
        } catch (qrErr) {
          console.warn("Aviso ao adicionar QR no PDF 58mm:", qrErr);
          y += 4;
        }
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      const splitQrHint = doc.splitTextToSize(
        "Aponte a câmera para abrir o recibo digital completo em PDF.",
        contentWidth
      );
      doc.text(splitQrHint, 29, y, { align: "center" });
      y += splitQrHint.length * 3;

      // Box Autenticado
      doc.setLineDashPattern([], 0);
      doc.rect(margin, y, contentWidth, 7, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.text("DOCUMENTO AUTENTICADO DIGITALMENTE", 29, y + 2.8, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.8);
      doc.text("Emitido via Fire CRM • Segurança anti-adulteração via QR Code", 29, y + 5.5, {
        align: "center",
      });
      y += 10;

      doc.setFontSize(6);
      doc.text(`Obrigado pela preferência! • ${activeEmpresaNome}`, 29, y, { align: "center" });

      const cleanNum = String(receiptData.numero_recibo || "001").replace(/[^a-zA-Z0-9.-]/g, "_");
      doc.save(`Cupom_58mm_${cleanNum}.pdf`);

      toast({
        variant: "success",
        title: "Cupom 58mm baixado em PDF!",
        description: `Arquivo Cupom_58mm_${cleanNum}.pdf salvo no formato exato de 58mm.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF de 58mm",
        description: err.message || "Tente novamente.",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // 2. Dispara a impressão direta do cupom de 58mm com iframe invisível sem window.close precipitado
  const handlePrint58mm = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    // Remove qualquer iframe de impressão antigo
    const oldIframe = document.getElementById("thermal-print-iframe");
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "thermal-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "58mm";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cupom 58mm - ${receiptData.numero_recibo}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page {
              size: 58mm auto;
              margin: 0mm;
            }
            body {
              width: 58mm;
              margin: 0;
              padding: 2mm 3mm;
              font-family: 'Courier New', Courier, monospace, -apple-system, sans-serif;
              font-size: 11px;
              line-height: 1.25;
              color: #000;
              background: #fff;
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 4px 0; }
            .double-divider { border-top: 2px solid #000; margin: 4px 0; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .item-desc { max-width: 65%; word-break: break-word; }
            .logo-container { text-align: center; margin-bottom: 4px; }
            .logo-container img { max-height: 44px; max-width: 120px; object-fit: contain; display: inline-block; }
            .qr-container { text-align: center; margin: 6px 0; }
            .qr-container img { width: 110px; height: 110px; display: inline-block; }
            .qr-hint { font-size: 9px; line-height: 1.1; margin-top: 2px; text-align: center; }
            .signature-box { margin-top: 15px; border-top: 1px solid #000; padding-top: 2px; text-align: center; font-size: 10px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    // Aguarda carregar elementos e dispara a impressão sem fechar o documento
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn("Fallback window.print:", e);
        window.print();
      }
    }, 350);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Impressão Térmica 58mm
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cupom resumido em bobina 58mm com QR Code para o recibo digital em PDF.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ÁREA DE VISUALIZAÇÃO E IMPRESSÃO (EXATA PARA 58MM) */}
        <div className="flex justify-center p-2 bg-muted/40 rounded-xl border">
          <div
            ref={printAreaRef}
            className="w-[58mm] min-w-[58mm] bg-white text-black p-2.5 font-mono text-[11px] leading-tight shadow-sm border border-neutral-300 rounded-sm select-text"
            style={{ width: "58mm" }}
          >
            {/* CABEÇALHO DA EMPRESA */}
            <div className="text-center space-y-0.5">
              {activeLogo && (
                <div className="logo-container flex justify-center mb-1">
                  <img
                    src={activeLogo}
                    alt="Logo"
                    className="max-h-10 max-w-[120px] object-contain mx-auto"
                  />
                </div>
              )}
              <p className="font-extrabold text-xs tracking-tight uppercase">
                {activeEmpresaNome}
              </p>
              {activeEmpresaCnpj && (
                <p className="text-[9px]">CNPJ: {activeEmpresaCnpj}</p>
              )}
              {activeEmpresaTelefone && (
                <p className="text-[9px]">Fone/Zap: {activeEmpresaTelefone}</p>
              )}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* IDENTIFICAÇÃO DO RECIBO */}
            <div className="text-center font-bold text-[11px]">
              RECIBO DE ENTREGA Nº {receiptData.numero_recibo}
            </div>

            <div className="space-y-0.5 text-[10px] mt-1">
              <p>
                <strong>Data:</strong> {receiptData.data_emissao}
              </p>
              {receiptData.lote_codigo && (
                <p>
                  <strong>Lote:</strong> {receiptData.lote_codigo}{" "}
                  {receiptData.ordens_numeros ? `(${receiptData.ordens_numeros})` : ""}
                </p>
              )}
            </div>

            <div className="border-t border-dashed border-black my-1.5" />

            {/* CLIENTE */}
            <div className="space-y-0.5 text-[10px]">
              <p className="font-bold uppercase break-words">
                {receiptData.cliente_nome}
              </p>
              {receiptData.cliente_documento && (
                <p>Doc: {receiptData.cliente_documento}</p>
              )}
              {receiptData.cliente_endereco && (
                <p className="break-words">End: {receiptData.cliente_endereco}</p>
              )}
            </div>

            <div className="border-t border-dashed border-black my-1.5" />

            {/* TABELA RESUMIDA DE ITENS */}
            <div className="space-y-1">
              <div className="flex justify-between font-bold text-[10px] border-b border-black pb-0.5">
                <span>QTD DESCRIÇÃO</span>
                <span className="text-right">TOTAL</span>
              </div>

              {itensAgrupados.map((it, idx) => (
                <div key={idx} className="flex justify-between text-[10px] leading-snug">
                  <span className="break-words max-w-[65%]">
                    <strong>{it.qtd}x</strong> {it.tipo} ({it.modalidade.slice(0, 4)}.)
                    <br />
                    <span className="text-[9px] text-neutral-600">
                      Un: {formatMoeda(it.valorUnit)}
                    </span>
                  </span>
                  <span className="font-bold font-mono text-right shrink-0">
                    {formatMoeda(it.total)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-black my-1.5" />

            {/* TOTAIS E PAGAMENTO */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between font-extrabold text-xs">
                <span>VALOR TOTAL:</span>
                <span className="font-mono">{formatMoeda(receiptData.valor_total)}</span>
              </div>
              <p className="text-[10px]">
                <strong>Pgto:</strong> {receiptData.forma_pagamento}
              </p>
              <p className="text-[10px] font-bold">
                <strong>Status:</strong>{" "}
                {receiptData.status_pagamento === "QUITADO"
                  ? "[X] QUITADO / PAGO"
                  : "[ ] PENDENTE / A PRAZO"}
              </p>
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* QR CODE PARA ACESSAR O RECIBO DIGITAL EM PDF */}
            <div className="text-center space-y-1 my-2">
              <p className="font-bold text-[9px] uppercase tracking-wider">
                Recibo Digital & Certificado
              </p>

              {isGeneratingUrl ? (
                <div className="py-4 flex flex-col items-center justify-center gap-1 text-[9px] text-neutral-600">
                  <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                  <span>Gerando link do PDF...</span>
                </div>
              ) : qrCodeDataUrl ? (
                <div className="flex justify-center">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code do Recibo Digital"
                    className="w-28 h-28 mx-auto"
                  />
                </div>
              ) : null}

              <p className="text-[8.5px] leading-tight text-neutral-800">
                Aponte a câmera do celular para abrir o recibo digital e documento PDF completo.
              </p>
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* AUTENTICAÇÃO DIGITAL & SEGURANÇA */}
            <div className="border border-black p-1.5 text-center text-[8px] mt-2 rounded">
              <p className="font-bold uppercase tracking-wider">DOCUMENTO AUTENTICADO DIGITALMENTE</p>
              <p className="text-[7.5px] mt-0.5 leading-tight">
                Emitido via Fire CRM. Dispensa assinatura manual e garante segurança anti-adulteração via QR Code.
              </p>
            </div>

            <p className="text-[8px] text-center mt-3">
              Obrigado pela preferência! • {activeEmpresaNome}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownload58mmPdf}
            disabled={isDownloadingPdf}
            className="gap-2 font-bold text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <Download className="h-4 w-4 text-emerald-600" />
            )}
            {isDownloadingPdf ? "Gerando PDF..." : "Baixar PDF (58mm)"}
          </Button>

          <Button
            onClick={handlePrint58mm}
            className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Imprimir Cupom 58mm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
