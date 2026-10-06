"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  Printer,
  X,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Tag,
  Calendar,
  Building2,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Extinguisher, Hose } from "@/types";
import { formatDate } from "@/lib/utils";

export type LabelTarget =
  | { kind: "extinguisher"; data: Extinguisher }
  | { kind: "hose"; data: Hose }
  | {
      kind: "custom";
      title: string;
      serialNumber: string;
      customerName: string;
      type: string;
      capacityOrLength: string;
      location?: string;
      rechargeDate?: string;
      expirationDate?: string;
      technicianName?: string;
    };

interface LabelPrinterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: LabelTarget | null;
}

export function LabelPrinterDialog({ open, onOpenChange, target }: LabelPrinterDialogProps) {
  const [labelType, setLabelType] = useState<"entrada" | "garantia">("entrada");
  const [printFormat, setPrintFormat] = useState<"termica" | "a4">("termica");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [inmetroSeal, setInmetroSeal] = useState<string>("");
  const [testPressure, setTestPressure] = useState<string>("12 kgf/cm²");
  const [companyName, setCompanyName] = useState<string>("JR EXTINTORES & SERVIÇOS");
  const [notes, setNotes] = useState<string>("");

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Normalização dos dados de exibição
  const itemData = (() => {
    if (!target) return null;
    if (target.kind === "extinguisher") {
      const e = target.data as any;
      const lastRecharge = e.last_recharge_date || e.recharge_date || "";
      const expDate = e.expiration_date || "";
      const seal = e.seal_number || "";
      return {
        kind: "extinguisher" as const,
        serialNumber: e.serial_number,
        customerName: e.customer?.name || "Cliente não informado",
        type: e.type,
        capacity: e.capacity,
        location: e.location || "—",
        rechargeDate: lastRecharge ? formatDate(lastRecharge) : "—",
        rawRechargeDate: lastRecharge,
        expirationDate: expDate ? formatDate(expDate) : "—",
        rawExpirationDate: expDate,
        hydroTestDate: e.next_inspection_date ? formatDate(e.next_inspection_date) : "—",
        rawHydroTestDate: e.next_inspection_date || "",
        sealNumber: seal,
      };
    } else if (target.kind === "hose") {
      const h = target.data as any;
      const serial =
        h.numero_serie ||
        h.patrimonio ||
        h.identification_code ||
        h.serial_number ||
        `MANG-${String(h.id || "").substring(0, 6).toUpperCase()}`;
      const customer =
        h.client?.name ||
        h.client?.razao_social ||
        h.customer?.name ||
        "Cliente não informado";
      const tipo = h.tipo || h.type || "Tipo 2 (Comercial)";
      const comp = h.comprimento || h.comprimento_m || h.length_meters || 15;
      const diam = h.diametro_polegadas || h.diameter_inches || '1 1/2"';
      const loc = h.localizacao || h.location || "Abrigo de Mangueira";
      const lastTest = h.last_test_at || h.last_test_date || "";
      const nextTest = h.next_test_at || h.next_test_date || "";
      return {
        kind: "hose" as const,
        serialNumber: serial,
        customerName: customer,
        type: tipo,
        capacity: `${comp}m — ${diam}`,
        location: loc,
        rechargeDate: lastTest ? formatDate(lastTest) : "—",
        rawRechargeDate: lastTest,
        expirationDate: nextTest ? formatDate(nextTest) : "—",
        rawExpirationDate: nextTest,
        hydroTestDate: nextTest ? formatDate(nextTest) : "—",
        rawHydroTestDate: nextTest,
        sealNumber: "",
      };
    } else {
      const c = target;
      return {
        kind: "custom" as const,
        serialNumber: c.serialNumber,
        customerName: c.customerName,
        type: c.type,
        capacity: c.capacityOrLength,
        location: c.location || "—",
        rechargeDate: c.rechargeDate || "—",
        rawRechargeDate: "",
        expirationDate: c.expirationDate || "—",
        rawExpirationDate: "",
        hydroTestDate: "—",
        rawHydroTestDate: "",
        sealNumber: "",
      };
    }
  })();

  // Gera o QR Code dinâmico
  useEffect(() => {
    if (!itemData) return;
    const qrPayload = JSON.stringify({
      id: itemData.serialNumber,
      cli: itemData.customerName,
      tipo: itemData.type,
      cap: itemData.capacity,
      val: itemData.expirationDate,
    });

    QRCode.toDataURL(qrPayload, {
      width: 140,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("Erro gerando QR Code:", err));
  }, [itemData]);

  // Função para acionar a impressão
  function handlePrint() {
    window.print();
  }

  if (!itemData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-display">
                Imprimir Etiqueta — {itemData.serialNumber}
              </DialogTitle>
              <DialogDescription>
                Gere etiquetas adesivas térmicas ou fichas A4 para identificação e selo de garantia.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Configurações da Etiqueta (Ocultas na impressão) */}
        <div className="space-y-4 print:hidden border-b pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold">Finalidade da Etiqueta</Label>
              <Select
                value={labelType}
                onValueChange={(v) => setLabelType(v as "entrada" | "garantia")}
              >
                <SelectTrigger className="mt-1 h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    🏷️ Tag de Entrada / Oficina (Bancada)
                  </SelectItem>
                  <SelectItem value="garantia">
                    🛡️ Selo de Garantia & Validade (Saída)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Formato do Papel</Label>
              <Select
                value={printFormat}
                onValueChange={(v) => setPrintFormat(v as "termica" | "a4")}
              >
                <SelectTrigger className="mt-1 h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="termica">
                    🖨️ Impressora Térmica (100x60mm)
                  </SelectItem>
                  <SelectItem value="a4">
                    📄 Folha A4 (Pimaco / Comum)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">
                {itemData.kind === "hose" ? "Pressão de Teste" : "Nº Selo Inmetro (Opcional)"}
              </Label>
              {itemData.kind === "hose" ? (
                <Input
                  className="mt-1 h-9 bg-background"
                  value={testPressure}
                  onChange={(e) => setTestPressure(e.target.value)}
                  placeholder="Ex: 12 kgf/cm²"
                />
              ) : (
                <Input
                  className="mt-1 h-9 bg-background"
                  value={inmetroSeal}
                  onChange={(e) => setInmetroSeal(e.target.value)}
                  placeholder="Ex: INM-884219"
                />
              )}
            </div>
          </div>
        </div>

        {/* ÁREA DE PRÉ-VISUALIZAÇÃO E IMPRESSÃO */}
        <div
          ref={printAreaRef}
          id="printable-label-area"
          className="flex flex-col items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-900 rounded-xl border"
        >
          {/* ========================================================== */}
          {/* ETIQUETA 1: TAG DE ENTRADA / BANCADA (OFICINA)             */}
          {/* ========================================================== */}
          {labelType === "entrada" && (
            <div
              className={`bg-white text-black p-4 border-2 border-black rounded-lg shadow-sm font-sans flex flex-col justify-between ${
                printFormat === "termica"
                  ? "w-[380px] h-[240px]"
                  : "w-[440px] h-[270px]"
              }`}
            >
              {/* Cabeçalho da Tag */}
              <div className="border-b-2 border-black pb-1.5 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm tracking-wide uppercase">
                    {companyName}
                  </h3>
                  <p className="text-[10px] text-neutral-600 font-semibold uppercase">
                    Controle de Bancada — {itemData.kind === "hose" ? "Mangueira NBR 12779" : "Extintor NBR 12962"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold bg-black text-white px-1.5 py-0.5 rounded">
                    ENTRADA OFICINA
                  </span>
                </div>
              </div>

              {/* Corpo Principal com QR Code e Dados */}
              <div className="grid grid-cols-3 gap-2 py-2 items-center flex-1">
                <div className="col-span-2 space-y-1">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block">
                      Código / Série Própria
                    </span>
                    <span className="text-base font-black font-mono tracking-tight text-neutral-950 bg-neutral-100 px-1 py-0.5 rounded border border-neutral-300 inline-block">
                      {itemData.serialNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block">
                      Cliente
                    </span>
                    <span className="text-xs font-bold text-neutral-900 line-clamp-1">
                      {itemData.customerName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">
                        Equipamento
                      </span>
                      <span className="font-semibold text-neutral-900">
                        {itemData.type}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">
                        {itemData.kind === "hose" ? "Medidas" : "Capacidade"}
                      </span>
                      <span className="font-semibold text-neutral-900">
                        {itemData.capacity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="col-span-1 flex flex-col items-center justify-center border-l border-neutral-300 pl-2">
                  {qrCodeDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code"
                      className="w-20 h-20 border border-neutral-200 p-0.5 rounded"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-400">
                      QR Code
                    </div>
                  )}
                  <span className="text-[8px] font-mono mt-0.5 text-neutral-600">
                    SCAN P/ DETALHES
                  </span>
                </div>
              </div>

              {/* Rodapé da Tag */}
              <div className="border-t border-dashed border-neutral-400 pt-1 text-[9px] flex items-center justify-between text-neutral-700">
                <span>
                  <strong>Local:</strong> {itemData.location}
                </span>
                <span>
                  <strong>Data Entrada:</strong> {new Date().toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* ETIQUETA 2: SELO DE GARANTIA & VALIDADE (SAÍDA / INSPEÇÃO)  */}
          {/* ========================================================== */}
          {labelType === "garantia" && (
            <div
              className={`bg-white text-black p-4 border-2 border-red-700 rounded-lg shadow-sm font-sans flex flex-col justify-between relative overflow-hidden ${
                printFormat === "termica"
                  ? "w-[380px] h-[240px]"
                  : "w-[440px] h-[270px]"
              }`}
            >
              {/* Faixa Superior de Validade */}
              <div className="bg-red-700 text-white -mx-4 -mt-4 px-4 py-1.5 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-xs tracking-wider uppercase">
                    {companyName}
                  </h3>
                  <p className="text-[9px] font-medium tracking-tight text-red-100">
                    {itemData.kind === "hose"
                      ? "ENSAIO HIDROSTÁTICO DE MANGUEIRAS — ABNT NBR 12779"
                      : "MANUTENÇÃO E RECARGA DE EXTINTORES — ABNT NBR 12962"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold bg-white text-red-800 px-1.5 py-0.5 rounded shadow-sm">
                    {itemData.kind === "hose" ? "APROVADO" : "CONFORME INMETRO"}
                  </span>
                </div>
              </div>

              {/* Informações Centrais */}
              <div className="grid grid-cols-3 gap-2 py-2 items-center flex-1">
                <div className="col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between pr-2">
                    <div>
                      <span className="text-[9px] font-bold uppercase text-neutral-500 block">
                        Identificação / Série
                      </span>
                      <span className="text-sm font-black font-mono text-neutral-900">
                        {itemData.serialNumber}
                      </span>
                    </div>
                    {inmetroSeal && (
                      <div className="text-right">
                        <span className="text-[8px] font-bold uppercase text-neutral-500 block">
                          Selo Inmetro
                        </span>
                        <span className="text-xs font-mono font-bold text-neutral-800">
                          {inmetroSeal}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] bg-neutral-50 p-1.5 rounded border border-neutral-200">
                    <div className="font-semibold text-neutral-900 truncate">
                      {itemData.customerName}
                    </div>
                    <div className="text-neutral-600 text-[10px]">
                      {itemData.type} — {itemData.capacity}
                    </div>
                  </div>

                  {/* Destaque das Datas de Validade */}
                  <div className="grid grid-cols-2 gap-1.5 text-center">
                    <div className="bg-neutral-100 p-1 rounded border border-neutral-300">
                      <span className="text-[8px] font-bold uppercase text-neutral-500 block">
                        {itemData.kind === "hose" ? "Data do Teste" : "Data Recarga"}
                      </span>
                      <span className="text-xs font-bold text-neutral-800">
                        {itemData.rechargeDate !== "—"
                          ? itemData.rechargeDate
                          : new Date().toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}
                      </span>
                    </div>

                    <div className="bg-red-50 p-1 rounded border border-red-300">
                      <span className="text-[8px] font-black uppercase text-red-600 block">
                        Próxima Validade
                      </span>
                      <span className="text-xs font-black text-red-700">
                        {itemData.expirationDate !== "—"
                          ? itemData.expirationDate
                          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code de Autenticidade */}
                <div className="col-span-1 flex flex-col items-center justify-center border-l border-neutral-300 pl-2">
                  {qrCodeDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code"
                      className="w-20 h-20 border border-neutral-200 p-0.5 rounded"
                    />
                  ) : null}
                  <span className="text-[8px] font-mono text-center mt-1 text-neutral-500 leading-tight">
                    AUTENTICIDADE DO SERVIÇO
                  </span>
                </div>
              </div>

              {/* Rodapé com aviso técnico */}
              <div className="border-t border-neutral-300 pt-1 text-[8px] text-neutral-500 flex items-center justify-between">
                <span>
                  {itemData.kind === "hose"
                    ? `Pressão aplicada: ${testPressure} — Inspeção anual obrigatória.`
                    : "Selo de segurança rompido invalida a garantia. Manter desobstruído."}
                </span>
                <span className="font-mono text-[7px] text-neutral-400">
                  REF-{itemData.serialNumber.replace(/[^a-zA-Z0-9]/g, "")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações de Impressão */}
        <DialogFooter className="print:hidden flex items-center justify-between sm:justify-between w-full border-t pt-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Pronto para imprimir na impressora padrão do sistema</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-1.5 shadow-sm"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Imprimir Etiqueta
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* ESTILOS DE IMPRESSÃO ESPECÍFICOS */}
      <style jsx global>{`
        @media print {
          /* Oculta tudo que não for a área da etiqueta */
          body * {
            visibility: hidden;
          }
          #printable-label-area,
          #printable-label-area * {
            visibility: visible;
          }
          #printable-label-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            border: none !important;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
          }
          @page {
            size: auto;
            margin: 4mm;
          }
        }
      `}</style>
    </Dialog>
  );
}
