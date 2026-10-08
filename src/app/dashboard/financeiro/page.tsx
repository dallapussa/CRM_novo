"use client";

import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LotesFinanceiroView } from "./lotes-financeiro-view";
import { InvoicesList } from "./invoices-list";
import { Calendar, FileText, DollarSign } from "lucide-react";

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<"caixa_diario" | "faturas">("caixa_diario");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
            Gestão Financeira & Caixa Diário
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Faturamento do dia separado por data, conferência de pagamentos por cliente, trocas imediatas, emissão de recibos e cupons térmicos 58mm.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="grid w-full sm:w-auto grid-cols-2 p-1 bg-muted/60 rounded-xl">
          <TabsTrigger
            value="caixa_diario"
            className="flex items-center gap-2 font-bold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs dark:data-[state=active]:text-emerald-400"
          >
            <Calendar className="h-4 w-4" />
            Faturamento do Dia (Caixa Diário)
          </TabsTrigger>

          <TabsTrigger
            value="faturas"
            className="flex items-center gap-2 font-bold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-xs"
          >
            <FileText className="h-4 w-4" />
            Faturas & Lançamentos Avulsos
          </TabsTrigger>
        </TabsList>

        {/* ABA PRINCIPAL: FATURAMENTO DO DIA (CAIXA DIÁRIO) */}
        <TabsContent value="caixa_diario" className="mt-4">
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
