import { getTenantContext } from "@/services/tenant.service";
import type { ServiceOrder, ServiceOrderItem } from "@/types";

export type ServiceOrderInput = Omit<ServiceOrder, "id" | "number" | "created_at" | "updated_at" | "customer" | "technician">;
export type ServiceOrderItemInput = Omit<ServiceOrderItem, "id" | "service_order_id" | "created_at">;

const statusFromDb: Record<string, ServiceOrder["status"]> = {
  Pendente: "pendente",
  "Em andamento": "andamento",
  Atrasada: "atrasada",
  "Concluída": "concluida",
  Cancelada: "cancelada",
};
const statusToDb: Record<ServiceOrder["status"], string> = {
  pendente: "Pendente",
  andamento: "Em andamento",
  atrasada: "Atrasada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};
const priorityToDb: Record<ServiceOrder["priority"], string> = {
  baixa: "Baixa",
  media: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

function mapServiceOrder(row: Record<string, any>): ServiceOrder {
  return {
    id: row.id,
    number: Number(row.numero),
    customer_id: row.client_id,
    technician_id: row.assigned_to,
    scheduled_date: row.scheduled_at?.slice(0, 10) ?? "",
    scheduled_period: row.scheduled_period,
    priority: row.priority === "Baixa" ? "baixa" : row.priority === "Alta" ? "alta" : row.priority === "Urgente" ? "urgente" : "media",
    status: statusFromDb[row.status] ?? "pendente",
    type: row.tipo,
    description: row.descricao ?? "",
    technical_report: row.technical_report,
    arrival_time: row.arrival_time ?? row.started_at,
    departure_time: row.departure_time,
    signature_url: row.signature_url,
    signature_name: row.signature_name,
    subtotal: Number(row.subtotal ?? row.total ?? 0),
    discount: Number(row.discount ?? 0),
    cancellation_reason: row.cancellation_reason,
    total: Number(row.total ?? 0),
    created_by: row.created_by ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
    customer: row.client ? { name: row.client.razao_social } : null,
    technician: row.technician ? { full_name: row.technician.nome } : null,
  };
}

function orderRow(input: Partial<ServiceOrderInput>) {
  const row: Record<string, unknown> = {};
  if (input.customer_id !== undefined) row.client_id = input.customer_id;
  if (input.technician_id !== undefined) row.assigned_to = input.technician_id;
  if (input.scheduled_date !== undefined) row.scheduled_at = input.scheduled_date ? `${input.scheduled_date}T12:00:00.000Z` : null;
  if (input.scheduled_period !== undefined) row.scheduled_period = input.scheduled_period;
  if (input.type !== undefined) row.tipo = input.type;
  if (input.description !== undefined) row.descricao = input.description;
  if (input.status !== undefined) row.status = statusToDb[input.status];
  if (input.priority !== undefined) row.priority = priorityToDb[input.priority];
  if (input.technical_report !== undefined) row.technical_report = input.technical_report;
  if (input.arrival_time !== undefined) row.arrival_time = input.arrival_time;
  if (input.departure_time !== undefined) row.departure_time = input.departure_time;
  if (input.signature_url !== undefined) row.signature_url = input.signature_url;
  if (input.signature_name !== undefined) row.signature_name = input.signature_name;
  if (input.cancellation_reason !== undefined) row.cancellation_reason = input.cancellation_reason;
  if (input.subtotal !== undefined) row.subtotal = input.subtotal;
  if (input.discount !== undefined) row.discount = input.discount;
  if (input.total !== undefined) row.total = input.total;
  if (input.completed_at !== undefined) row.completed_at = input.completed_at;
  return row;
}

function mapServiceOrderItem(row: Record<string, any>): ServiceOrderItem {
  return {
    id: row.id,
    service_order_id: row.service_order_id,
    product_id: row.catalog_item_id,
    description: row.descricao,
    quantity: Number(row.quantidade ?? 1),
    unit_price: Number(row.unit_price ?? 0),
    total_price: Number(row.total ?? 0),
    type: row.item_type ?? "servico",
    created_at: row.created_at,
  };
}

export async function listServiceOrders(): Promise<ServiceOrder[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("service_orders")
    .select("*,client:clients!inner(id,razao_social,company_id),technician:assigned_to(nome)")
    .eq("company_id", companyId).eq("client.company_id", companyId).is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => mapServiceOrder(row));
}

export async function getServiceOrder(id: string): Promise<ServiceOrder> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("service_orders")
    .select("*,client:clients!inner(id,razao_social,company_id),technician:assigned_to(nome)")
    .eq("company_id", companyId).eq("client.company_id", companyId).eq("id", id).is("deleted_at", null).single();
  if (error) throw error;
  return mapServiceOrder(data);
}

async function verifyClientInCompany(clientId: string, companyId: string) {
  const { supabase } = await getTenantContext();
  const { data, error } = await supabase.from("clients").select("id").eq("id", clientId).eq("company_id", companyId).is("deleted_at", null).single();
  if (error || !data) throw new Error("Cliente não encontrado nesta empresa.");
}

export async function saveServiceOrder(input: Partial<ServiceOrderInput>, items: ServiceOrderItemInput[], id?: string): Promise<string> {
  const { supabase, companyId, userId } = await getTenantContext();
  if (input.customer_id) await verifyClientInCompany(input.customer_id, companyId);
  const row = orderRow(input);
  let serviceOrderId = id;

  if (serviceOrderId) {
    const { error } = await supabase.from("service_orders").update(row).eq("company_id", companyId).eq("id", serviceOrderId);
    if (error) throw error;
    const { error: deleteError } = await supabase.from("service_order_items").delete().eq("service_order_id", serviceOrderId);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase.from("service_orders").insert({
      ...row,
      company_id: companyId,
      created_by: userId,
    }).select("id").single();
    if (error) throw error;
    serviceOrderId = data.id;
  }

  if (!serviceOrderId) throw new Error("Service order could not be saved");
  if (items.length) {
    const { error } = await supabase.from("service_order_items").insert(items.map((item) => ({
      service_order_id: serviceOrderId,
      catalog_item_id: item.product_id,
      descricao: item.description,
      quantidade: item.quantity,
      unidade: "un",
      item_type: item.type,
      unit_price: item.unit_price,
      total: item.total_price,
      created_by: userId,
    })));
    if (error) throw error;
  }
  return serviceOrderId;
}

export async function updateServiceOrder(id: string, patch: Partial<ServiceOrder>): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error } = await supabase.from("service_orders").update(orderRow(patch)).eq("company_id", companyId).eq("id", id);
  if (error) throw error;
}

export async function deleteServiceOrder(id: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();
  const { error: itemError } = await supabase.from("service_order_items").delete().eq("service_order_id", id);
  if (itemError) throw itemError;
  const { error } = await supabase.from("service_orders").delete().eq("company_id", companyId).eq("id", id);
  if (error) throw error;
}

export async function listServiceOrderItems(id: string): Promise<ServiceOrderItem[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("service_order_items")
    .select("*,service_order:service_orders!inner(company_id)")
    .eq("service_order_id", id).eq("service_order.company_id", companyId).is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => mapServiceOrderItem(row));
}

export async function listServiceOrderPhotos(serviceOrderId: string) {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase.from("os_photos")
    .select("*,service_order:service_orders!inner(company_id)")
    .eq("service_order_id", serviceOrderId).eq("service_order.company_id", companyId).is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all((data || []).map(async (photo) => {
    const { data: signed } = await supabase.storage.from("os-photos").createSignedUrl(photo.storage_path, 60 * 60);
    return { ...photo, signedUrl: signed?.signedUrl ?? null };
  }));
}

export async function uploadServiceOrderPhoto(serviceOrderId: string, file: File) {
  const { supabase, userId, companyId } = await getTenantContext();
  const extensionByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensionByType[file.type];
  if (!extension || file.size > 10 * 1024 * 1024) throw new Error("Envie uma imagem JPG, PNG ou WebP de até 10 MB.");
  const storagePath = `${companyId}/${serviceOrderId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("os-photos").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data: photo, error: insertError } = await supabase.from("os_photos").insert({
    service_order_id: serviceOrderId,
    storage_path: storagePath,
    url: null,
    caption: file.name,
    uploaded_by: userId,
    created_by: userId,
  }).select("*").single();
  if (insertError) {
    await supabase.storage.from("os-photos").remove([storagePath]);
    throw insertError;
  }
  const { data: signed } = await supabase.storage.from("os-photos").createSignedUrl(storagePath, 60 * 60);
  return { ...photo, signedUrl: signed?.signedUrl ?? null };
}