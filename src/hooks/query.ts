import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  Profile,
  Customer,
  Product,
  Extinguisher,
  ServiceOrder,
  ServiceOrderItem,
  Invoice,
  UserRole,
} from "@/lib/types";

const Q = {
  profiles: ["profiles"] as const,
  customers: ["customers"] as const,
  products: ["products"] as const,
  extinguishers: ["extinguishers"] as const,
  serviceOrders: ["service-orders"] as const,
  serviceOrderItems: (id: string) => ["service-orders", id, "items"] as const,
  invoices: ["invoices"] as const,
};

function sb() {
  return createClient();
}

function toastMsg(
  toast: ReturnType<typeof useToast>["toast"],
  ok: boolean,
  titleOk: string,
  titleErr: string,
  err?: unknown
) {
  if (ok) {
    toast({ variant: "success", title: titleOk });
  } else {
    const msg = (err as any)?.message || "Verifique sua conexão e tente novamente.";
    toast({ variant: "destructive", title: titleErr, description: msg });
  }
}

/* ============ PROFILES ============ */

export function useProfiles(role?: UserRole) {
  return useQuery({
    queryKey: [...Q.profiles, role || "all"],
    queryFn: async () => {
      let q = sb().from("profiles").select("*").order("full_name", { ascending: true });
      if (role) q = q.eq("role", role);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Profile[];
    },
  });
}

export function useTechnicians() {
  return useQuery({
    queryKey: [...Q.profiles, "technicians"],
    queryFn: async () => {
      const { data, error } = await sb()
        .from("profiles")
        .select("id,full_name")
        .in("role", ["admin", "tecnico"])
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return (data || []) as Pick<Profile, "id" | "full_name">[];
    },
  });
}

export function useUpsertProfile() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (profile: Partial<Profile> & { id: string }) => {
      const { error } = await sb().from("profiles").upsert(profile, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: Q.profiles });
      toastMsg(toast, true, "Perfil salvo", "");
    },
    onError: (e) => toastMsg(toast, false, "", "Erro ao salvar perfil", e),
  });
}

export function useToggleProfileActive() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await sb()
        .from("profiles")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: Q.profiles }),
    onError: (e) => toastMsg(toast, false, "", "Erro ao atualizar status", e),
  });
}

/* ============ CUSTOMERS ============ */

export function useCustomers() {
  return useQuery({
    queryKey: Q.customers,
    queryFn: async () => {
      const { data, error } = await sb()
        .from("customers")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Customer[];
    },
  });
}

export function useCustomerOptions() {
  return useQuery({
    queryKey: [...Q.customers, "options"],
    queryFn: async () => {
      const { data, error } = await sb()
        .from("customers")
        .select("id,name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as Pick<Customer, "id" | "name">[];
    },
  });
}

export function useUpsertCustomer() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (c: Partial<Customer> & { id?: string }) => {
      if (c.id) {
        const { error } = await sb().from("customers").update(c).eq("id", c.id);
        if (error) throw error;
        return c.id;
      }
      const { data, error } = await sb()
        .from("customers")
        .insert(c as any)
        .select("id")
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: Q.customers }),
    onError: (e) => toastMsg(toast, false, "", "Erro ao salvar cliente", e),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: Q.customers });
      toastMsg(toast, true, "Cliente excluído", "");
    },
    onError: (e) => toastMsg(toast, false, "", "Erro ao excluir cliente", e),
  });
}

/* ============ PRODUCTS ============ */

export function useProducts() {
  return useQuery({
    queryKey: Q.products,
    queryFn: async () => {
      const { data, error } = await sb()
        .from("products")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as Product[];
    },
  });
}

export function useActiveProducts() {
  return useQuery({
    queryKey: [...Q.products, "active"],
    queryFn: async () => {
      const { data, error } = await sb()
        .from("products")
        .select("id,name,sale_price,type,unit")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as Pick<Product, "id" | "name" | "sale_price" | "type" | "unit">[];
    },
  });
}

export function useUpsertProduct() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (p: Partial<Product> & { id?: string }) => {
      if (p.id) {
        const { error } = await sb().from("products").update(p).eq("id", p.id);
        if (error) throw error;
        return p.id;
      }
      const { data, error } = await sb()
        .from("products")
        .insert(p as any)
        .select("id")
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: Q.products }),
    onError: (e) => toastMsg(toast, false, "", "Erro ao salvar produto", e),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: Q.products });
      toastMsg(toast, true, "Produto excluído", "");
    },
    onError: (e) => toastMsg(toast, false, "", "Erro ao excluir produto", e),
  });
}

/* ============ EXTINGUISHERS ============ */

export function useExtinguishers() {
  return useQuery({
    queryKey: Q.extinguishers,
    queryFn: async () => {
      const { data, error } = await sb()
        .from("extinguishers")
        .select("*,customer:customer_id (id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as (Extinguisher & { customer?: { id: string; name: string } })[];
    },
  });
}

export function useExtinguisher(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...Q.extinguishers, id],
    enabled: enabled && Boolean(id),
    queryFn: async () => {
      const { data, error } = await sb()
        .from("extinguishers")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Extinguisher;
    },
  });
}

export function useUpsertExtinguisher() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (e: Partial<Extinguisher> & { id?: string }) => {
      if (e.id) {
        const { error } = await sb().from("extinguishers").update(e).eq("id", e.id);
        if (error) throw error;
        return e.id;
      }
      const { data, error } = await sb()
        .from("extinguishers")
        .insert(e as any)
        .select("id")
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: Q.extinguishers }),
    onError: (err) => toastMsg(toast, false, "", "Erro ao salvar extintor", err),
  });
}

/* ============ SERVICE ORDERS ============ */

export function useServiceOrders() {
  return useQuery({
    queryKey: Q.serviceOrders,
    queryFn: async () => {
      const { data, error } = await sb()
        .from("service_orders")
        .select("*,customer:customer_id(name),technician:technician_id(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as (ServiceOrder & {
        customer?: { name: string } | null;
        technician?: { full_name: string } | null;
      })[];
    },
  });
}

export function useServiceOrder(id: string | undefined) {
  return useQuery({
    queryKey: [...Q.serviceOrders, id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await sb()
        .from("service_orders")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as ServiceOrder;
    },
  }) as UseQueryResult<ServiceOrder>;
}

export function useServiceOrderItems(id: string | undefined) {
  return useQuery({
    queryKey: Q.serviceOrderItems(id || "x"),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await sb()
        .from("service_order_items")
        .select("*")
        .eq("service_order_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ServiceOrderItem[];
    },
  });
}

export function useServiceOrderOptions() {
  return useQuery({
    queryKey: [...Q.serviceOrders, "options"],
    queryFn: async () => {
      const { data, error } = await sb()
        .from("service_orders")
        .select("id,number,customer_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Pick<ServiceOrder, "id" | "number" | "customer_id">[];
    },
  });
}

export type CreateServiceOrderInput = Omit<ServiceOrder, "id" | "number" | "created_at" | "updated_at" | "customer" | "technician" | "created_by"> & {
  created_by: string;
  items?: Omit<ServiceOrderItem, "id" | "service_order_id" | "created_at">[];
};

export function useCreateServiceOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: CreateServiceOrderInput) => {
      const { items, ...rest } = input;
      const { data, error } = await sb()
        .from("service_orders")
        .insert(rest as any)
        .select("id")
        .single();
      if (error) throw error;
      const soId = (data as any).id as string;
      if (items && items.length > 0) {
        const rows = items.map((i) => ({ ...i, service_order_id: soId }));
        const { error: e2 } = await sb().from("service_order_items").insert(rows as any);
        if (e2) throw e2;
      }
      return soId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: Q.serviceOrders }),
    onError: (e) => toastMsg(toast, false, "", "Erro ao criar OS", e),
  });
}

export function useUpdateServiceOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
      items,
    }: {
      id: string;
      patch: Partial<ServiceOrder>;
      items?: (Omit<ServiceOrderItem, "id" | "service_order_id" | "created_at"> & { id?: string })[];
    }) => {
      const { error } = await sb()
        .from("service_orders")
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
      if (items) {
        const { error: del } = await sb().from("service_order_items").delete().eq("service_order_id", id);
        if (del) throw del;
        if (items.length > 0) {
          const rows = items.map(({ id: _skip, ...r }) => ({ ...r, service_order_id: id }));
          const { error: ins } = await sb().from("service_order_items").insert(rows as any);
          if (ins) throw ins;
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: Q.serviceOrders }),
    onError: (e) => toastMsg(toast, false, "", "Erro ao atualizar OS", e),
  });
}

export function useDeleteServiceOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: e1 } = await sb().from("service_order_items").delete().eq("service_order_id", id);
      if (e1) throw e1;
      const { error: e2 } = await sb().from("service_orders").delete().eq("id", id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: Q.serviceOrders });
      toastMsg(toast, true, "OS excluída", "");
    },
    onError: (e) => toastMsg(toast, false, "", "Erro ao excluir OS", e),
  });
}

/* ============ INVOICES ============ */

export function useInvoices() {
  return useQuery({
    queryKey: Q.invoices,
    queryFn: async () => {
      const { data, error } = await sb()
        .from("invoices")
        .select("*,customer:customer_id(id,name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as (Invoice & { customer?: { id: string; name: string } })[];
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [...Q.invoices, id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await sb()
        .from("invoices")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Invoice;
    },
  });
}

export function useUpsertInvoice() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (i: Partial<Invoice> & { id?: string }) => {
      if (i.id) {
        const { error } = await sb().from("invoices").update(i as any).eq("id", i.id);
        if (error) throw error;
        return i.id;
      }
      const { data, error } = await sb()
        .from("invoices")
        .insert(i as any)
        .select("id")
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: Q.invoices }),
    onError: (e) => toastMsg(toast, false, "", "Erro ao salvar fatura", e),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: Q.invoices });
      toastMsg(toast, true, "Fatura excluída", "");
    },
    onError: (e) => toastMsg(toast, false, "", "Erro ao excluir fatura", e),
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (i: Invoice) => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await sb()
        .from("invoices")
        .update({
          status: "paga",
          amount_paid: i.amount,
          payment_date: today,
        })
        .eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: Q.invoices });
      toastMsg(toast, true, "Fatura marcada como paga", "");
    },
    onError: (e) => toastMsg(toast, false, "", "Erro ao marcar como paga", e),
  });
}
