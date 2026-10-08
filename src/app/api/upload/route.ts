import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, deleteFromR2, detectContentType } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const DISALLOWED_EXTENSIONS = [
  "exe", "dll", "bat", "cmd", "sh", "php", "phtml", "jsp", "asp", "aspx", "cgi", "pl"
];

/**
 * POST /api/upload
 * Endpoint autenticado para upload seguro de arquivos no Cloudflare R2 usando PutObjectCommand.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Valida autenticação da sessão
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Acesso não autorizado. Faça login para enviar arquivos." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const requestedKey = (formData.get("key") || formData.get("path")) as string | null;
    const explicitContentType = formData.get("contentType") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado no campo 'file'." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `O arquivo excede o limite máximo permitido de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    const fileName = file.name || "arquivo";
    const fileExt = fileName.split(".").pop()?.toLowerCase() || "";
    if (DISALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json(
        { error: `Tipo de arquivo (.${fileExt}) não permitido por políticas de segurança.` },
        { status: 400 }
      );
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

    // Sanitiza requestedKey para prevenir directory traversal
    let sanitizedKey = requestedKey
      ? requestedKey.replace(/\.\./g, "").replace(/^\/+/, "")
      : "";

    let finalKey = sanitizedKey || `uploads/${user.id}/${Date.now()}_${cleanFileName}`;

    // Converte o arquivo para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = detectContentType(fileName, explicitContentType || file.type);

    // Faz upload para o bucket Cloudflare R2 via PutObjectCommand
    const result = await uploadToR2({
      fileBuffer: buffer,
      key: finalKey,
      contentType,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      size: result.size,
      contentType: result.contentType,
    });
  } catch (error: any) {
    console.error("[API Upload R2] Erro ao realizar upload:", error);
    return NextResponse.json(
      {
        error: error.message || "Falha ao enviar arquivo para o Cloudflare R2.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload
 * Deleta um arquivo do Cloudflare R2 pela chave (key) com autenticação obrigatória
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Acesso não autorizado. Faça login para excluir arquivos." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const key = body.key || body.path;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "Chave (key) do arquivo não informada." },
        { status: 400 }
      );
    }

    // Previne directory traversal ou exclusões indevidas
    const cleanKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
    if (!cleanKey || cleanKey === "/" || cleanKey === "*") {
      return NextResponse.json(
        { error: "Chave de arquivo inválida." },
        { status: 400 }
      );
    }

    await deleteFromR2(cleanKey);

    return NextResponse.json({ success: true, key: cleanKey });
  } catch (error: any) {
    console.error("[API Upload R2] Erro ao deletar:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao deletar arquivo do Cloudflare R2." },
      { status: 500 }
    );
  }
}
