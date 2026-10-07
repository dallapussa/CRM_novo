import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Mapeamento e detecção dinâmica de ContentType para arquivos do sistema.
 */
export function detectContentType(fileNameOrExt: string, explicitType?: string | null): string {
  if (explicitType && explicitType !== "application/octet-stream" && explicitType !== "") {
    return explicitType;
  }

  const parts = fileNameOrExt.split(".");
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : "";

  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "txt":
      return "text/plain; charset=utf-8";
    case "csv":
      return "text/csv; charset=utf-8";
    case "json":
      return "application/json";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

/**
 * Constrói a URL final de acesso público usando o formato:
 * ${process.env.R2_PUBLIC_URL}/nome-do-arquivo.extensao
 */
export function buildR2PublicUrl(key: string): string {
  const publicBaseUrl = (
    process.env.R2_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    ""
  ).trim().replace(/\/$/, "");

  const cleanKey = key.replace(/^\//, "");

  if (!publicBaseUrl) {
    // Se ainda não configurado no ambiente local, retorna caminho amigável
    return `https://r2-storage-placeholder/${cleanKey}`;
  }

  return `${publicBaseUrl}/${cleanKey}`;
}

let cachedS3Client: S3Client | null = null;

/**
 * Inicializa e obtém instância do S3Client configurado para Cloudflare R2:
 * endpoint: https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com
 * region: "auto"
 */
export function getR2Client(): S3Client {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn(
      "[Cloudflare R2] Variáveis R2_ACCOUNT_ID, R2_ACCESS_KEY_ID ou R2_SECRET_ACCESS_KEY não definidas."
    );
  }

  cachedS3Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId || "default"}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId || "",
      secretAccessKey: secretAccessKey || "",
    },
  });

  return cachedS3Client;
}

export interface UploadToR2Params {
  fileBuffer: Buffer | Uint8Array;
  key: string;
  contentType?: string | null;
}

export interface UploadToR2Result {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

/**
 * Realiza o upload de qualquer arquivo para o Cloudflare R2 usando PutObjectCommand
 * e retorna a URL pública final formatada.
 */
export async function uploadToR2({
  fileBuffer,
  key,
  contentType,
}: UploadToR2Params): Promise<UploadToR2Result> {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("Variável R2_BUCKET_NAME não configurada.");
  }

  const s3 = getR2Client();
  const cleanKey = key.replace(/^\//, "");
  const dynamicContentType = detectContentType(cleanKey, contentType);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      Body: fileBuffer,
      ContentType: dynamicContentType,
    })
  );

  const publicUrl = buildR2PublicUrl(cleanKey);

  return {
    url: publicUrl,
    key: cleanKey,
    size: fileBuffer.byteLength,
    contentType: dynamicContentType,
  };
}

/**
 * Deleta um arquivo do bucket Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) return;

  try {
    const s3 = getR2Client();
    const cleanKey = key.replace(/^\//, "");
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: cleanKey,
      })
    );
  } catch (err) {
    console.warn(`[Cloudflare R2] Aviso ao deletar ${key}:`, err);
  }
}
