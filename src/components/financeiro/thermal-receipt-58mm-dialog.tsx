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

  // Dispara a impressão direta do cupom de 58mm
  const handlePrint58mm = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    // Cria janela ou iframe dedicado para impressão em 58mm
    const printWindow = window.open("", "_blank", "width=320,height=600");
    if (!printWindow) {
      // Fallback: imprime a tela direto
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo 58mm - ${receiptData.numero_recibo}</title>
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
              font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, sans-serif;
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
        <body onload="window.focus(); setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 250);">
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const activeEmpresaNome =
    receiptData.empresa_nome && !receiptData.empresa_nome.toUpperCase().includes("EXTINCONTROL")
      ? receiptData.empresa_nome
      : (companySettings?.nome || "JC Extintores");

  const activeEmpresaCnpj =
    receiptData.empresa_cnpj || companySettings?.cnpj || "";

  const activeEmpresaTelefone =
    receiptData.empresa_telefone || companySettings?.telefone || "";

  const activeLogo = receiptData.empresa_logo || companySettings?.logo_url;

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
              Obrigado pela preferência! • ExtinControl
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
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
