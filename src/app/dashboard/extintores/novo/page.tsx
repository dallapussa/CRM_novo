import { createClient } from "@/lib/supabase/server";
import { ExtinguisherForm } from "../extinguisher-form";
import type { Customer } from "@/lib/types";

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

export default async function NovoExtintorPage() {
  const customers = await getCustomers();
  return <ExtinguisherForm mode="create" customers={customers} />;
}
