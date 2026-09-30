import { createClient } from "@/lib/supabase/server";
import { OSDetail } from "./os-detail";
import type { ServiceOrder, ServiceOrderItem, Customer, Profile } from "@/lib/types";
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
      .eq("service_order_id", orderId)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data as ServiceOrderItem[]) || [];
  } catch {
    return [];
  }
}

async function getCustomer(customerId: string): Promise<Customer | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();
    if (error) return null;
    return data as Customer;
  } catch {
    return null;
  }
}

async function getTechnician(techId: string | null): Promise<Profile | null> {
  if (!techId) return null;
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", techId)
      .single();
    if (error) return null;
    return data as Profile;
  } catch {
    return null;
  }
}

export default async function OSDetailPage({ params }: PageProps) {
  const order = await getOrder(params.id);
  if (!order) notFound();

  const [items, customer, technician] = await Promise.all([
    getItems(order.id),
    getCustomer(order.customer_id),
    getTechnician(order.technician_id ?? null),
  ]);

  return (
    <OSDetail
      order={order}
      items={items}
      customer={customer}
      technician={technician}
    />
  );
}
