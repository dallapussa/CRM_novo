"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Package,
  Edit2,
  Trash2,
  Filter,
  X,
  Wrench,
  Box,
  RefreshCw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/types";
import { PRODUCT_TYPE_LABELS, PRODUCT_CATEGORIES } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDeleteProduct, useProducts } from "@/hooks/useProducts";
import { useQueryClient } from "@tanstack/react-query";
import { resetAndSyncExtinguishersFromCosts } from "@/services/extinguisher-catalog.service";
import { PinModal } from "@/components/ui/pin-modal";
import { isPinRequiredForAction } from "@/services/settings-security.service";

interface ProductsListProps {
  initialProducts?: Product[];
}

export function ProductsList({ initialProducts }: ProductsListProps = {}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useProducts(initialProducts);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [pinAction, setPinAction] = useState<(() => void) | null>(null);
  const [pinTitle, setPinTitle] = useState("");
  const [pinDescription, setPinDescription] = useState("");
  const { toast } = useToast();
  const deleteMutation = useDeleteProduct();
  const isDeleting = deleteMutation.isPending;

  async function handleSyncFromCosts() {
    setIsSyncing(true);
    try {
      await resetAndSyncExtinguishersFromCosts();
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        variant: "success",
        title: "Sincronização concluída",
        description: "Extintores atualizados a partir da Aba Custos sem duplicidades.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao sincronizar",
        description: err?.message || "Não foi possível sincronizar os extintores.",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (statusFilter !== "all") {
        const isActive = statusFilter === "active";
        if (p.is_active !== isActive) return false;
      }
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const haystack = [p.name, p.sku, p.description, p.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [products, search, typeFilter, categoryFilter, statusFilter]);

  async function handleDelete() {
    if (!deleteProduct) return;

    const doDelete = async () => {
      try {
        await deleteMutation.mutateAsync(deleteProduct.id);
        toast({
          variant: "success",
          title: "Item excluído",
          description: `${deleteProduct.name} foi removido com sucesso.`,
        });
        setDeleteProduct(null);
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Erro ao excluir",
          description: err?.message || "Não foi possível excluir o item.",
        });
      }
    };

    if (isPinRequiredForAction("delete")) {
      setPinTitle("PIN de Exclusão");
      setPinDescription(`Digite seu PIN de 4 dígitos para autorizar a exclusão de "${deleteProduct.name}".`);
      setPinAction(() => doDelete);
    } else {
      await doDelete();
    }
  }

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
  }

  const hasActiveFilters =
    search || typeFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all";

  const totalProdutos = products.filter((p) => p.type === "produto").length;
  const totalServicos = products.filter((p) => p.type === "servico").length;
  const totalActive = products.filter((p) => p.is_active).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{totalProdutos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{totalServicos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-green-600">
              {totalActive}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {products.length - totalActive} inativos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, SKU ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
              <X className="mr-1.5 h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px] h-10">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="produto">Produtos</SelectItem>
                <SelectItem value="servico">Serviços</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[170px] h-10">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {PRODUCT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncFromCosts}
            disabled={isSyncing}
            className="h-10 text-xs border-orange-200 text-orange-800 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:border-orange-900 dark:text-orange-300 font-medium"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 text-orange-600 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar com Aba Custos"}
          </Button>
          <Button asChild className="h-10">
            <Link href="/dashboard/produtos/novo">
              <Plus className="mr-1.5 h-4 w-4" />
              Novo Item
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Carregando itens...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary">
                <Package className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg">
                  {products.length === 0
                    ? "Nenhum item cadastrado"
                    : "Nenhum item encontrado"}
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {products.length === 0
                    ? "Cadastre produtos e serviços para usar nas Ordens de Serviço."
                    : "Tente ajustar os filtros de busca."}
                </p>
              </div>
              {products.length === 0 && (
                <Button asChild className="mt-2">
                  <Link href="/dashboard/produtos/novo">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Cadastrar primeiro item
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[110px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            p.type === "produto"
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-orange-50 text-orange-600"
                          }`}
                        >
                          {p.type === "produto" ? (
                            <Box className="h-4 w-4" />
                          ) : (
                            <Wrench className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold leading-tight">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          p.type === "produto"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-orange-50 text-orange-700 border-orange-200"
                        }
                      >
                        {PRODUCT_TYPE_LABELS[p.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5">
                        <span>{p.category}</span>
                        {p.category === "Extintor" && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] py-0 px-1 font-normal">
                            Aba Custos
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.sku || "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatCurrency(p.cost_price)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(p.sale_price)}
                      <span className="text-xs text-muted-foreground font-normal">
                        /{p.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          p.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }
                      >
                        {p.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Editar"
                        >
                          <Link href={`/dashboard/produtos/${p.id}/editar`}>
                            <Edit2 className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Excluir"
                          onClick={() => setDeleteProduct(p)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteProduct} onOpenChange={(o) => !o && setDeleteProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir item?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold">{deleteProduct?.name}</span>? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteProduct(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Validação de PIN */}
      {pinAction && (
        <PinModal
          open={Boolean(pinAction)}
          onOpenChange={(op: boolean) => {
            if (!op) setPinAction(null);
          }}
          title={pinTitle}
          description={pinDescription}
          onSuccess={() => {
            const act = pinAction;
            setPinAction(null);
            act();
          }}
        />
      )}
    </div>
  );
}
