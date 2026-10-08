"use client";

import React, { useRef } from "react";
import { Printer, ShieldCheck, Download, Calendar, MapPin, Building, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Customer, ExtintorInventario } from "@/types";
import type { CompanySettings } from "@/services/company-settings.service";

interface AnexoDViewProps {
  customer: Customer;
  company: CompanySettings;
  extinguishers: ExtintorInventario[];
}

export function AnexoDView({ customer, company, extinguishers }: AnexoDViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  // Ordena os extintores por localização/identificação
  const sortedExtinguishers = [...extinguishers].sort((a, b) =>
    (a.localizacao || "").localeCompare(b.localizacao || "")
  );

  return (
    <div className="space-y-4">
      {/* Barra de Ações no Portal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/40 rounded-xl border no-print">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-red-600" />
            Anexo D — Memorial Descritivo de Extintores de Incêndio
          </h3>
          <p className="text-xs text-muted-foreground">
            Documento regulamentar do Corpo de Bombeiros Militar (CBMRS / NBR 12962 e NBR 15808).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="bg-red-600 hover:bg-red-700 text-white shadow-sm h-9 text-xs"
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Imprimir / Salvar PDF (A4)
          </Button>
        </div>
      </div>

      {/* Conteúdo Imprimível do Documento */}
      <div
        ref={printRef}
        id="anexo-d-printable"
        className="bg-white text-black p-6 md:p-10 rounded-xl border shadow-sm print:p-0 print:border-none print:shadow-none font-sans text-xs"
      >
        {/* Cabeçalho do Laudo */}
        <div className="border-b-2 border-red-600 pb-4 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="h-6 w-6 text-red-600" />
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-neutral-900 uppercase">
                  Anexo D — Memorial Descritivo de Extintores
                </h1>
              </div>
              <p className="text-[11px] text-neutral-600 mt-0.5">
                Plano de Prevenção e Proteção Contra Incêndio (PPCI / PSPCI) • NBR 12962 / NBR 15808
              </p>
            </div>
            <div className="text-right text-[11px] text-neutral-600">
              <p className="font-semibold text-neutral-900">{company.nome}</p>
              <p>CNPJ: {company.cnpj}</p>
              <p>Tel: {company.telefone} • {company.email}</p>
            </div>
          </div>
        </div>

        {/* Informações da Edificação e do Responsável */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200 mb-6">
          <div className="space-y-1">
            <p className="font-semibold text-neutral-900 text-xs">Dados do Estabelecimento / Ocupação</p>
            <p><strong>Razão Social / Nome:</strong> {customer.name}</p>
            <p><strong>CNPJ / CPF:</strong> {customer.document || "Não informado"}</p>
            <p>
              <strong>Endereço:</strong>{" "}
              {customer.address
                ? `${customer.address.street || ""}, ${customer.address.number || "S/N"} - ${
                    customer.address.neighborhood || ""
                  }, ${customer.address.city || ""}/${customer.address.state || ""}`
                : "Não cadastrado"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-neutral-900 text-xs">Dados de Prevenção e PPCI</p>
            <p>
              <strong>Enquadramento:</strong>{" "}
              {customer.ppci_enquadramento || (customer.ppci_isento ? "Isento de PPCI" : "PSPCI (Simplificado)")}
            </p>
            <p>
              <strong>Nº APPCI / CLCB / Protocolo:</strong>{" "}
              {customer.ppci_number || "Em tramitação / Não informado"}
            </p>
            <p>
              <strong>Área Total Protegida:</strong>{" "}
              {customer.metragem ? `${customer.metragem} m²` : "Conforme projeto"}
            </p>
            <p>
              <strong>Validade do Alvará:</strong>{" "}
              {customer.ppci_expires_at ? formatDate(customer.ppci_expires_at) : "Aguardando vistoria"}
            </p>
          </div>
        </div>

        {/* Tabela Oficial do Anexo D */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-neutral-300 text-[11px]">
            <thead>
              <tr className="bg-neutral-100 text-neutral-800 text-left font-semibold border-b border-neutral-300">
                <th className="p-2 border-r border-neutral-300 w-10 text-center">Nº</th>
                <th className="p-2 border-r border-neutral-300">Localização / Setor</th>
                <th className="p-2 border-r border-neutral-300">Tipo de Agente</th>
                <th className="p-2 border-r border-neutral-300">Capacidade</th>
                <th className="p-2 border-r border-neutral-300">Selo INMETRO / N° Série</th>
                <th className="p-2 border-r border-neutral-300 text-center">Última Carga</th>
                <th className="p-2 border-r border-neutral-300 text-center">Próxima Recarga</th>
                <th className="p-2 border-r border-neutral-300 text-center">Teste Hidrostático</th>
                <th className="p-2 text-center">Situação</th>
              </tr>
            </thead>
            <tbody>
              {sortedExtinguishers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-neutral-500 italic">
                    Nenhum extintor registrado neste memorial descritivo.
                  </td>
                </tr>
              ) : (
                sortedExtinguishers.map((ext, idx) => {
                  const now = new Date();
                  const in30 = new Date(Date.now() + 30 * 86400000);
                  const expDate = ext.data_vencimento ? new Date(ext.data_vencimento) : null;

                  let statusText = "Em dia";
                  let statusBg = "bg-green-100 text-green-800";

                  if (expDate) {
                    if (expDate < now) {
                      statusText = "Vencido";
                      statusBg = "bg-red-100 text-red-800";
                    } else if (expDate <= in30) {
                      statusText = "Vence em breve";
                      statusBg = "bg-amber-100 text-amber-800";
                    }
                  }

                  // Cálculo do teste hidrostático (a cada 5 anos)
                  let testeHidro = "-";
                  if (ext.data_ultima_recarga) {
                    const uDate = new Date(ext.data_ultima_recarga);
                    if (!isNaN(uDate.getTime())) {
                      const hidroYear = uDate.getFullYear() + 5;
                      testeHidro = `${String(uDate.getMonth() + 1).padStart(2, "0")}/${hidroYear}`;
                    }
                  }

                  return (
                    <tr
                      key={ext.id}
                      className="border-b border-neutral-200 hover:bg-neutral-50/50 transition-colors"
                    >
                      <td className="p-2 border-r border-neutral-300 text-center font-medium">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-neutral-300 font-semibold text-neutral-900">
                        {ext.localizacao || "Padrão"}
                      </td>
                      <td className="p-2 border-r border-neutral-300">
                        {ext.tipo_capacidade?.split("-")[0]?.trim() || "Pó ABC"}
                      </td>
                      <td className="p-2 border-r border-neutral-300">
                        {ext.tipo_capacidade?.split("-")[1]?.trim() || "4 kg"}
                      </td>
                      <td className="p-2 border-r border-neutral-300 font-mono text-[10px]">
                        {ext.identificacao || "-"}
                      </td>
                      <td className="p-2 border-r border-neutral-300 text-center">
                        {ext.data_ultima_recarga ? formatDate(ext.data_ultima_recarga) : "-"}
                      </td>
                      <td className="p-2 border-r border-neutral-300 text-center font-bold text-neutral-900">
                        {ext.data_vencimento ? formatDate(ext.data_vencimento) : "12 meses"}
                      </td>
                      <td className="p-2 border-r border-neutral-300 text-center">
                        {testeHidro}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusBg}`}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Declaração de Conformidade e Normas */}
        <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2 mb-8 text-[11px] text-neutral-700">
          <p className="font-semibold text-neutral-900">Termo de Conformidade Técnica:</p>
          <p className="leading-relaxed">
            Declaramos que os aparelhos extintores relacionados neste memorial descritivo atendem às normas da
            Associação Brasileira de Normas Técnicas (ABNT NBR 12962, NBR 15808 e NBR 10721), bem como aos
            requisitos de portabilidade, sinalização, desobstrução e inspeção periódica conforme legislação
            vigente do Corpo de Bombeiros Militar do Estado do Rio Grande do Sul.
          </p>
        </div>

        {/* Campo de Assinaturas */}
        <div className="grid grid-cols-2 gap-8 pt-4">
          <div className="text-center">
            <div className="border-t border-neutral-400 pt-2 w-3/4 mx-auto" />
            <p className="font-semibold text-neutral-900">{customer.name}</p>
            <p className="text-[10px] text-neutral-500">Proprietário / Responsável pelo Uso</p>
          </div>
          <div className="text-center">
            <div className="border-t border-neutral-400 pt-2 w-3/4 mx-auto" />
            <p className="font-semibold text-neutral-900">{company.nome}</p>
            <p className="text-[10px] text-neutral-500">Empresa Credenciada de Manutenção e Prevenção</p>
          </div>
        </div>

        {/* Rodapé do Relatório */}
        <div className="mt-8 pt-4 border-t border-neutral-200 text-center text-[10px] text-neutral-400">
          Documento emitido em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")} • Portal de Autoatendimento do Cliente
        </div>
      </div>

      {/* Estilos para Impressão A4 Limpa */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #anexo-d-printable,
          #anexo-d-printable * {
            visibility: visible;
          }
          #anexo-d-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 15mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
