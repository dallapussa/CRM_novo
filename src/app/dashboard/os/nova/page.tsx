import { createClient } from "@/lib/supabase/server";
import { OSForm } from "../os-form";
import type { Customer, Profile, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getCustomers(): Promise<Pick<Customer, "id" | "name">[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("id,name")
      .eq("is_active", true)
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

export default async function NovaOSPage() {
  const [customers, technicians, products] = await Promise.all([
    getCustomers(),
    getTechnicians(),
    getProducts(),
  ]);

  return (
    <OSForm
      mode="create"
      customers={customers}
      technicians={technicians}
      products={products}
    />
  );
}
