"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  Download,
  Loader2,
  Tag,
  CheckCircle2,
  AlertCircle,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { DocumentoCliente, DocumentoClienteTipo } from "@/types";
import {
  listClientDocuments,
  uploadClientDocument,
  deleteClientDocument,
} from "@/services/prevention.service";

interface ClientDragDropUploaderProps {
  clientId?: string;
  onDocumentsChange?: (docs: DocumentoCliente[]) => void;
}

const DOCUMENT_TYPES: DocumentoClienteTipo[] = [
  "PPCI",
  "Anexo D",
  "Nota Fiscal",
  "Recibo",
  "Foto",
  "Outro",
];

const TYPE_COLORS: Record<DocumentoClienteTipo, string> = {
  PPCI: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200",
  "Anexo D": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
  "Nota Fiscal": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
  Recibo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
  Foto: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200",
  Outro: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200",
};

export function ClientDragDropUploader({
  clientId,
  onDocumentsChange,
}: ClientDragDropUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentoCliente[]>([]);
  const [selectedTag, setSelectedTag] = useState<DocumentoClienteTipo>("PPCI");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    loadDocs();
  }, [clientId]);

  async function loadDocs() {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const data = await listClientDocuments(clientId);
      setDocuments(data);
      onDocumentsChange?.(data);
    } catch (err: any) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFiles(files: FileList | File[]) {
    if (!clientId) {
      toast({
        variant: "destructive",
        title: "Salve o cliente primeiro",
        description: "É necessário salvar o cliente antes de realizar o envio de anexos.",
      });
      return;
    }

    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (const file of fileList) {
      try {
        const newDoc = await uploadClientDocument(clientId, file, selectedTag);
        setDocuments((prev) => [newDoc, ...prev]);
        successCount++;
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: `Falha ao enviar ${file.name}`,
          description: err?.message || "Erro durante o upload para o Storage.",
        });
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      toast({
        variant: "success",
        title: "Anexo(s) enviado(s) com sucesso!",
        description: `${successCount} arquivo(s) foram armazenados com a tag "${selectedTag}".`,
      });
      loadDocs();
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }

  async function handleDelete(doc: DocumentoCliente) {
    setDeletingId(doc.id);
    try {
      await deleteClientDocument(doc.id, doc.storage_path);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast({
        variant: "success",
        title: "Arquivo excluído",
        description: `O documento "${doc.file_name}" foi removido.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: err?.message || "Não foi possível remover o arquivo.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  function formatBytes(bytes?: number | null) {
    if (!bytes) return "";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  return (
    <div className="space-y-4">
      {/* Barra de Seleção de Tipo + Zona de Drop */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Categoria do Anexo:
          </span>
          <Select
            value={selectedTag}
            onValueChange={(v) => setSelectedTag(v as DocumentoClienteTipo)}
          >
            <SelectTrigger className="w-36 h-8 text-xs bg-white dark:bg-neutral-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Formatos suportados: PDF, Imagens (PNG, JPG), Documentos
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-red-500 bg-red-50/50 dark:bg-red-950/20 scale-[0.99]"
            : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 bg-white dark:bg-neutral-900/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Fazendo upload para a nuvem...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-2">
            <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-full">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Arraste e solte arquivos aqui, ou{" "}
                <span className="text-red-600 underline">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Os arquivos serão etiquetados como{" "}
                <span className="font-semibold text-foreground">&quot;{selectedTag}&quot;</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Documentos Anexados */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            Arquivos Anexados ({documents.length})
          </h4>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos...
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 p-6 text-center text-xs text-muted-foreground bg-neutral-50/50 dark:bg-neutral-900/20">
            Nenhum documento anexado ainda para este cliente.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:shadow-sm transition-shadow gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[240px] sm:max-w-md">
                        {doc.file_name}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0 px-2 font-semibold ${
                          TYPE_COLORS[doc.tipo_documento] || TYPE_COLORS.Outro
                        }`}
                      >
                        {doc.tipo_documento}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(doc.file_size)}
                      {doc.created_at &&
                        ` • ${new Date(doc.created_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {doc.file_url && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-neutral-600 hover:text-neutral-900"
                      title="Download / Visualizar"
                    >
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Excluir documento"
                    disabled={deletingId === doc.id}
                    onClick={() => handleDelete(doc)}
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
