"use client";

import { useState } from "react";
import {
  DollarSign,
  Plus,
  Trash2,
  Package,
  TrendingDown,
  Layers,
  Fuel,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface WorkshopCost {
  id: string;
  name: string;
  category: "Insumo de Recarga" | "Peças & Componentes" | "Gás & Nitrogênio" | "Geral";
  unitCost: number;
  unit: string;
  supplier: string;
  updatedAt: string;
}

const DEFAULT_COSTS: WorkshopCost[] = [
  {
    id: "1",
    name: "Pó Químico ABC 90%",
    category: "Insumo de Recarga",
    unitCost: 14.5,
    unit: "kg",
    supplier: "Distribuidora Química Brasil",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Carga de Nitrogênio Industrial (Pressurização)",
    category: "Gás & Nitrogênio",
    unitCost: 180.0,
    unit: "cilindro 50L",
    supplier: "White Martins",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Anel Plástico Indicador Inmetro (Ano Vigente)",
    category: "Peças & Componentes",
    unitCost: 1.2,
    unit: "un",
    supplier: "SeloTech",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Manômetro Indicador de Pressão 1/8",
    category: "Peças & Componentes",
    unitCost: 9.8,
    unit: "un",
    supplier: "Manômetros Brasil",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Válvula de Descarga Completa Latão",
    category: "Peças & Componentes",
    unitCost: 28.0,
    unit: "un",
    supplier: "Metalúrgica Fogo Forte",
    updatedAt: new Date().toISOString(),
  },
];

export function CostsView() {
  const { toast } = useToast();
  const [costs, setCosts] = useState<WorkshopCost[]>(DEFAULT_COSTS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<WorkshopCost["category"]>("Insumo de Recarga");
  const [unitCost, setUnitCost] = useState("");
  const [unit, setUnit] = useState("kg");
  const [supplier, setSupplier] = useState("");

  function handleOpenCreate() {
    setName("");
    setUnitCost("");
    setSupplier("");
    setIsDialogOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !unitCost) {
      toast({ variant: "destructive", title: "Preencha o nome e o custo unitário" });
      return;
    }

    const newCost: WorkshopCost = {
      id: String(Date.now()),
      name: name.trim(),
      category,
      unitCost: parseFloat(unitCost.replace(",", ".")) || 0,
      unit: unit.trim() || "un",
      supplier: supplier.trim() || "Não informado",
      updatedAt: new Date().toISOString(),
    };

    setCosts((prev) => [newCost, ...prev]);
    toast({ variant: "success", title: "Custo cadastrado com sucesso!" });
    setIsDialogOpen(false);
  }

  function handleDelete(id: string) {
    if (!confirm("Remover este item de custo?")) return;
    setCosts((prev) => prev.filter((c) => c.id !== id));
    toast({ variant: "success", title: "Item removido!" });
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" />
            Custos de Insumos & Oficina
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de custos de matérias-primas, pós químicos, nitrogênio, anéis plásticos e componentes de recarga.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="h-10">
          <Plus className="mr-2 h-4 w-4" />
          Novo Insumo / Custo
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Itens Monitorados
            </CardTitle>
            <Layers className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Insumos e peças cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Pó Químico ABC Médio
            </CardTitle>
            <Fuel className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">R$ 14,50 / kg</div>
            <p className="text-xs text-muted-foreground mt-1">Base para cálculo de recarga</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Impacto no Margem
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">~ 28% do PV</div>
            <p className="text-xs text-muted-foreground mt-1">Custo médio por extintor de 4kg/6kg</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Insumos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabela de Insumos e Preços de Custo</CardTitle>
          <CardDescription>
            Valores utilizados para referência de margem e orçamentos comerciais.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo / Peça</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Custo Unitário</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Atualizado em</TableHead>
                <TableHead className="text-right w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold text-sm">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {c.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-sm text-foreground">
                    {formatCurrency(c.unitCost)} / {c.unit}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.supplier}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(c.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Cadastro */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Novo Insumo / Matéria-Prima
              </DialogTitle>
              <DialogDescription>
                Cadastre o custo unitário de um insumo de recarga ou peça.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label>Nome do Insumo / Peça *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pó Químico BC 40%, Manômetro..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Custo Unitário (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0,00"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Unidade de Medida</Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="kg, un, litro..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ex: White Martins, SeloTech..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Insumo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
