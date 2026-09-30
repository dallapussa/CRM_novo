import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "../../customer-form";
import type { Customer } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as Customer;
  } catch {
    return null;
  }
}

export default async function EditarClientePage({ params }: PageProps) {
  const customer = await getCustomer(params.id);
  if (!customer) notFound();
  return <CustomerForm mode="edit" initialData={customer} />;
}
