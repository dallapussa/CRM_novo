"use client";

import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LotesFinanceiroView } from "./lotes-financeiro-view";
import { InvoicesList } from "./invoices-list";
import { Package, FileText, DollarSign } from "lucide-react";

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<"lotes" | "faturas">("lotes");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-red-600 rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
            Gestão Financeira
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle financeiro por lotes e rotas, conferência de pagamentos por cliente, emissão de recibos em PDF e faturamento.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="grid w-full sm:w-auto grid-cols-2 p-1 bg-muted/60 rounded-xl">
          <TabsTrigger
            value="lotes"
            className="flex items-center gap-2 font-bold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-xs"
          >
            <Package className="h-4 w-4" />
            Financeiro por Lotes (Principal)
          </TabsTrigger>

          <TabsTrigger
            value="faturas"
            className="flex items-center gap-2 font-bold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-xs"
          >
            <FileText className="h-4 w-4" />
            Faturas & Lançamentos Avulsos
          </TabsTrigger>
        </TabsList>

        {/* ABA PRINCIPAL: FINANCEIRO SEPARADO POR LOTE */}
        <TabsContent value="lotes" className="mt-4">
          <LotesFinanceiroView />
        </TabsContent>

        {/* ABA SECUNDÁRIA: FATURAS AVULSAS */}
        <TabsContent value="faturas" className="mt-4">
          <InvoicesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
