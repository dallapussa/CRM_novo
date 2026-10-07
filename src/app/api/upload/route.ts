import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, deleteFromR2, detectContentType, buildR2PublicUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload
 * Endpoint universal para upload de qualquer arquivo (PDFs de PPCI, fotos de inspeção, imagens, recibos e propostas)
 * diretamente para o Cloudflare R2 usando PutObjectCommand.
 */
export async function POST(req: NextRequest) {
  try {
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

    const fileName = file.name || "arquivo";
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

    // Se uma key/caminho foi fornecida, utiliza ela; senão, gera chave padrão
    let finalKey = requestedKey
      ? requestedKey.replace(/^\//, "")
      : `uploads/${Date.now()}_${cleanFileName}`;

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
 * Deleta um arquivo do Cloudflare R2 pela chave (key)
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const key = body.key || body.path;

    if (!key) {
      return NextResponse.json(
        { error: "Chave (key) do arquivo não informada." },
        { status: 400 }
      );
    }

    await deleteFromR2(key);

    return NextResponse.json({ success: true, key });
  } catch (error: any) {
    console.error("[API Upload R2] Erro ao deletar:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao deletar arquivo do Cloudflare R2." },
      { status: 500 }
    );
  }
}
