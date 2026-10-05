import { getTenantContext } from "@/services/tenant.service";
import type { Document } from "@/types";

export interface DocumentUploadInput {
  name: string;
  category: "PPCI" | "Alvará Bombeiros" | "Laudo Técnico" | "ART" | "Certificado Inmetro" | "Contrato" | "Outro" | string;
  validade_em?: string | null;
  observacoes?: string | null;
}

export async function listClientDocuments(clientId: string): Promise<Document[]> {
  const { supabase, companyId } = await getTenantContext();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", companyId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    client_id: row.client_id,
    name: row.nome,
    category: row.categoria,
    storage_path: row.storage_path,
    mime_type: row.mime_type,
    size_bytes: row.file_size_bytes || row.size_bytes,
    url: row.url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    uploaded_by: row.uploaded_by || row.created_by,
  }));
}

export async function uploadClientDocument(
  clientId: string,
  file: File,
  meta: DocumentUploadInput
): Promise<string> {
  const { supabase, companyId, userId } = await getTenantContext();

  const fileExt = file.name.split(".").pop();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const storagePath = `${companyId}/${clientId}/${Date.now()}_${sanitizedName}`;

  // 1. Upload para o bucket 'documentos' no Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // 2. Obter URL pública ou assinada
  const { data: publicUrlData } = supabase.storage.from("documentos").getPublicUrl(storagePath);
  const fileUrl = publicUrlData?.publicUrl || null;

  // 3. Inserir registro na tabela documents
  const { data, error: insertError } = await supabase
    .from("documents")
    .insert({
      company_id: companyId,
      client_id: clientId,
      nome: meta.name || file.name,
      categoria: meta.category,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      size_bytes: file.size,
      url: fileUrl,
      validade_em: meta.validade_em || null,
      observacoes: meta.observacoes || null,
      created_by: userId,
      uploaded_by: userId,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  return data.id;
}

export async function deleteClientDocument(id: string, storagePath: string): Promise<void> {
  const { supabase, companyId } = await getTenantContext();

  // 1. Soft delete na tabela
  const { error: dbError } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", id);

  if (dbError) throw dbError;

  // 2. Remove do storage (opcional)
  if (storagePath) {
    await supabase.storage.from("documentos").remove([storagePath]);
  }
}
