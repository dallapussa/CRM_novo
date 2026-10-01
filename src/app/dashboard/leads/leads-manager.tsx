"use client";

import { useState } from "react";
import { ArrowRight, Plus, UserRoundPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useConvertLeadToClient, useLeads, useSaveLead } from "@/hooks/useLeads";
import { LEAD_STATUS_LABELS, type Lead, type LeadStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";

const statuses: LeadStatus[] = ["novo", "contatado", "qualificado", "proposta", "convertido", "perdido"];

export function LeadsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const leadsQuery = useLeads();
  const saveLead = useSaveLead();
  const convertLead = useConvertLeadToClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  async function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    try {
      await saveLead.mutateAsync({
        input: {
          name: name.trim(),
          company_name: companyName.trim() || null,
          document: document.replace(/\D/g, "") || null,
          email: email.trim() || null,
          phone: phone.replace(/\D/g, "") || null,
          source: source.trim() || null,
          status: "novo",
          notes: notes.trim() || null,
          owner_id: user.id,
          created_by: user.id,
        },
      });
      toast({ variant: "success", title: "Lead cadastrado" });
      setDialogOpen(false);
      setName("");
      setCompanyName("");
      setDocument("");
      setEmail("");
      setPhone("");
      setSource("");
      setNotes("");
    } catch (error) {
      toast({ variant: "destructive", title: "Não foi possível cadastrar", description: error instanceof Error ? error.message : undefined });
    }
  }

  async function updateStatus(lead: Lead, status: LeadStatus) {
    try {
      await saveLead.mutateAsync({ input: { status }, id: lead.id });
    } catch (error) {
      toast({ variant: "destructive", title: "Não foi possível atualizar a etapa", description: error instanceof Error ? error.message : undefined });
    }
  }

  async function convert(lead: Lead) {
    try {
      const clientId = await convertLead.mutateAsync(lead.id);
      toast({ variant: "success", title: "Lead convertido", description: `Cliente criado: ${clientId.slice(0, 8)}` });
    } catch (error) {
      toast({ variant: "destructive", title: "Conversão não concluída", description: error instanceof Error ? error.message : undefined });
    }
  }

  const leads = leadsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Pipeline de leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Prospects e oportunidades comerciais.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo lead
        </Button>
      </header>

      {leadsQuery.isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Carregando leads...</p>
      ) : leadsQuery.isError ? (
        <p className="py-12 text-center text-sm text-destructive">Não foi possível carregar os leads.</p>
      ) : leads.length === 0 ? (
        <div className="rounded-md border border-dashed py-16 text-center">
          <UserRoundPlus className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Nenhum lead cadastrado</p>
          <p className="mt-1 text-sm text-muted-foreground">Cadastre um prospect para iniciar o acompanhamento comercial.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((lead) => (
            <Card key={lead.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{lead.company_name || lead.name}</CardTitle>
                  {lead.company_name && <p className="mt-1 text-sm text-muted-foreground">{lead.name}</p>}
                </div>
                <Badge variant="outline">{LEAD_STATUS_LABELS[lead.status]}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm text-muted-foreground">
                  {lead.email && <p className="truncate">{lead.email}</p>}
                  {lead.phone && <p>{lead.phone}</p>}
                  {lead.source && <p>Origem: {lead.source}</p>}
                </div>
                {lead.status !== "convertido" && lead.status !== "perdido" && (
                  <div className="flex flex-wrap gap-2">
                    <Select value={lead.status} onValueChange={(value) => void updateStatus(lead, value as LeadStatus)}>
                      <SelectTrigger className="min-w-36 flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statuses.filter((status) => status !== "convertido").map((status) => <SelectItem key={status} value={status}>{LEAD_STATUS_LABELS[status]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" disabled={!lead.document || !lead.phone || convertLead.isPending} onClick={() => void convert(lead)} title="Exige documento e telefone">
                      Converter <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo lead</DialogTitle>
            <DialogDescription>Cadastre um prospect no pipeline comercial.</DialogDescription>
          </DialogHeader>
          <form id="lead-form" onSubmit={submitLead} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="lead-name">Contato *</Label><Input id="lead-name" required minLength={3} value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="lead-company">Empresa</Label><Input id="lead-company" value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="lead-email">E-mail</Label><Input id="lead-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="lead-phone">Telefone</Label><Input id="lead-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="lead-document">CPF/CNPJ</Label><Input id="lead-document" value={document} onChange={(event) => setDocument(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="lead-source">Origem</Label><Input id="lead-source" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Indicação, site..." /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="lead-notes">Notas</Label><Textarea id="lead-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          </form>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" form="lead-form" disabled={saveLead.isPending}>{saveLead.isPending ? "Salvando..." : "Salvar lead"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
