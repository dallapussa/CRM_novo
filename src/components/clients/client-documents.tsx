"use client";

import { useState } from "react";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Calendar,
  AlertTriangle,
  Plus,
  FileCheck,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/useDocuments";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ClientDocumentsProps {
  clientId: string;
}

const CATEGORIES = [
  "PPCI",
  "Alvará Bombeiros",
  "Laudo Técnico",
  "ART / RRT",
  "Certificado Inmetro",
  "Contrato de Manutenção",
  "Outro",
];

export function ClientDocuments({ clientId }: ClientDocumentsProps) {
  const { toast } = useToast();
  const { data: documents = [], isLoading } = useClientDocuments(clientId);
  const uploadMutation = useUploadDocument(clientId);
  const deleteMutation = useDeleteDocument(clientId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [validadeEm, setValidadeEm] = useState("");

  function handleOpenUpload() {
    setSelectedFile(null);
    setName("");
    setCategory(CATEGORIES[0]);
    setValidadeEm("");
    setIsDialogOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      toast({ variant: "destructive", title: "Selecione um arquivo" });
      return;
    }
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Informe o nome do documento" });
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        meta: {
          name: name.trim(),
          category,
          validade_em: validadeEm || null,
        },
      });

      toast({ variant: "success", title: "Documento enviado com sucesso!" });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar arquivo",
        description: err?.message,
      });
    }
  }

  async function handleDelete(id: string, storagePath: string) {
    if (!confirm("Deseja excluir este documento?")) return;
    try {
      await deleteMutation.mutateAsync({ id, storagePath });
      toast({ variant: "success", title: "Documento excluído!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <div>
              <CardTitle className="text-base">Documentos & Laudos Técnicos (Storage)</CardTitle>
              <CardDescription>
                Armazenamento de PPCI, Alvarás do Corpo de Bombeiros, ARTs e laudos.
              </CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={handleOpenUpload} className="h-8">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Anexar Arquivo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Carregando documentos...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium">Nenhum documento anexado ainda</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faça upload do PPCI, fotos de vistorias ou alvarás para manter o histórico seguro.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((doc) => {
              const isPdf = doc.mime_type?.includes("pdf") || doc.name.toLowerCase().endsWith(".pdf");
              return (
                <div
                  key={doc.id}
                  className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{doc.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] py-0">
                          {doc.category}
                        </Badge>
                        {doc.created_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(doc.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {doc.url && (
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-blue-600">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Abrir Documento">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(doc.id, doc.storage_path)}
                      title="Excluir Documento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal de Upload */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Anexar Documento do Cliente
              </DialogTitle>
              <DialogDescription>
                Selecione o arquivo e a categoria técnica (PPCI, Laudo, Alvará, etc.).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label>Arquivo (PDF, Imagem, etc.) *</Label>
              <Input type="file" onChange={handleFileChange} required />
            </div>

            <div className="space-y-1.5">
              <Label>Nome de Identificação *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Alvará de Prevenção de Incêndio 2026"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Categoria Técnica *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Data de Validade (opcional)</Label>
              <Input
                type="date"
                value={validadeEm}
                onChange={(e) => setValidadeEm(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Útil para Alvarás e PPCI que exigem renovação periódica.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadMutation.isPending || !selectedFile}>
                {uploadMutation.isPending ? "Enviando..." : "Salvar no Storage"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
