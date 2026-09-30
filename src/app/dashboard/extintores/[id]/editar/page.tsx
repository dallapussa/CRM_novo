import { createClient } from "@/lib/supabase/server";
import { ExtinguisherForm } from "../../extinguisher-form";
import type { Customer, Extinguisher } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

async function getExtinguisher(id: string): Promise<Extinguisher | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("extinguishers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as Extinguisher;
  } catch {
    return null;
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

export default async function EditarExtintorPage({ params }: PageProps) {
  const [extinguisher, customers] = await Promise.all([
    getExtinguisher(params.id),
    getCustomers(),
  ]);
  if (!extinguisher) notFound();
  return <ExtinguisherForm mode="edit" initialData={extinguisher} customers={customers} />;
}
