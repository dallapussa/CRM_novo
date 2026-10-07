import { detectContentType, buildR2PublicUrl } from "@/lib/r2";

export interface UniversalUploadParams {
  file: File | Blob;
  path?: string;
  key?: string;
  fileName?: string;
  contentType?: string;
}

export interface UniversalUploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

/**
 * Função universal de upload para o Cloudflare R2:
 * Envia o arquivo para a API Route segura /api/upload, que executa o PutObjectCommand
 * no bucket apontado em R2_BUCKET_NAME e retorna a URL pública formatada:
 * ${process.env.R2_PUBLIC_URL}/nome-do-arquivo.extensao
 */
export async function uploadFileToR2({
  file,
  path,
  key,
  fileName,
  contentType,
}: UniversalUploadParams): Promise<UniversalUploadResult> {
  const chosenKey = key || path || (fileName ? `uploads/${Date.now()}_${fileName}` : undefined);

  // Se estiver no ambiente de navegador ou Node, usamos FormData para /api/upload
  const formData = new FormData();
  formData.append("file", file, fileName || (file as File).name || "arquivo");
  if (chosenKey) {
    formData.append("key", chosenKey);
  }
  if (contentType) {
    formData.append("contentType", contentType);
  }

  // Faz a requisição POST para a API Route de upload
  const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(
      errorJson?.error || `Falha no upload para o Cloudflare R2 (status ${response.status})`
    );
  }

  const data = await response.json();
  return {
    url: data.url,
    key: data.key,
    size: data.size,
    contentType: data.contentType,
  };
}

/**
 * Deleta arquivo do Cloudflare R2 através da API Route
 */
export async function deleteFileFromR2(key: string): Promise<void> {
  if (!key) return;

  try {
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    await fetch(`${baseUrl}/api/upload`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
  } catch (err) {
    console.warn("[Storage Service] Aviso ao deletar arquivo do R2:", err);
  }
}
