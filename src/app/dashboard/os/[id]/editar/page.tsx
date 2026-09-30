import { createClient } from "@/lib/supabase/server";
import { OSForm } from "../../os-form";
import type { ServiceOrder, ServiceOrderItem, Customer, Profile, Product } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

async function getOrder(id: string): Promise<ServiceOrder | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("service_orders")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as ServiceOrder;
  } catch {
    return null;
  }
}

async function getItems(orderId: string): Promise<ServiceOrderItem[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("service_order_items")
      .select("*")
      .eq("service_order_id", orderId);
    if (error) return [];
    return (data as ServiceOrderItem[]) || [];
  } catch {
    return [];
  }
}

async function getCustomers(): Promise<Pick<Customer, "id" | "name">[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("id,name")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as any) || [];
  } catch {
    return [];
  }
}

async function getTechnicians(): Promise<Pick<Profile, "id" | "full_name">[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("role", ["admin", "tecnico"])
      .eq("is_active", true)
      .order("full_name", { ascending: true });
    if (error) throw error;
    return (data as any) || [];
  } catch {
    return [];
  }
}

async function getProducts(): Promise<
  Pick<Product, "id" | "name" | "sale_price" | "type" | "unit">[]
> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,sale_price,type,unit")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as any) || [];
  } catch {
    return [];
  }
}

export default async function EditarOSPage({ params }: PageProps) {
  const [order, items, customers, technicians, products] = await Promise.all([
    getOrder(params.id),
    Promise.resolve(null as unknown as Promise<ServiceOrderItem[]>),
    getCustomers(),
    getTechnicians(),
    getProducts(),
  ]);

  if (!order) notFound();

  const orderItems = await getItems(params.id);

  return (
    <OSForm
      mode="edit"
      initialData={order}
      initialItems={orderItems}
      customers={customers}
      technicians={technicians}
      products={products}
    />
  );
}
