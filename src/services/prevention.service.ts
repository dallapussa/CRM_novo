import { createClient } from "@/lib/supabase/client";
import { getTenantContext } from "@/services/tenant.service";
import type {
  DocumentoCliente,
  DocumentoClienteTipo,
  ExtintorInventario,
  ExtintorStatus,
  OrdemRecolhimento,
  OrdemRecolhimentoMotivo,
  OrdemRecolhimentoStatus,
  ModalidadeRecarga,
  ItemRecolhimento,
} from "@/types";

// ============================================================================
// 1. DOCUMENTOS DO CLIENTE (ANEXOS COM STORAGE)
// ============================================================================

export async function listClientDocuments(clientId: string): Promise<DocumentoCliente[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documentos_cliente")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    // Fallback gracioso para tabela "documents" existente
    const { data: legacyData, error: legacyErr } = await supabase
      .from("documents")
      .select("*")
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (legacyErr) return [];

    return (legacyData || []).map((d) => ({
      id: d.id,
      client_id: d.client_id,
      tipo_documento: (d.categoria || "Outro") as DocumentoClienteTipo,
      file_url: d.storage_path
        ? supabase.storage.from("client-documents").getPublicUrl(d.storage_path).data.publicUrl
        : "",
      file_name: d.nome || "Documento",
      storage_path: d.storage_path,
      file_size: d.size_bytes,
      created_at: d.created_at,
    }));
  }

  return data || [];
}

export async function uploadClientDocument(
  clientId: string,
  file: File,
  tipo: DocumentoClienteTipo
): Promise<DocumentoCliente> {
  const supabase = createClient();
  const fileExt = file.name.split(".").pop();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const storagePath = `${clientId}/${Date.now()}_${cleanName}`;

  // Upload para o bucket "client-documents" (ou fallback "documentos")
  let bucketName = "client-documents";
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, file, { cacheControl: "3600", upsert: true });

  if (uploadError) {
    bucketName = "documentos";
    const { error: retryError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file, { cacheControl: "3600", upsert: true });
    if (retryError) throw retryError;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(storagePath);

  const fileUrl = publicUrlData.publicUrl;

  // Tenta salvar na tabela dedicada "documentos_cliente"
  const { data, error } = await supabase
    .from("documentos_cliente")
    .insert({
      client_id: clientId,
      tipo_documento: tipo,
      file_url: fileUrl,
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
    })
    .select("*")
    .single();

  if (error) {
    // Fallback para tabela legacy "documents"
    const { data: legacyRow, error: legErr } = await supabase
      .from("documents")
      .insert({
        client_id: clientId,
        nome: file.name,
        categoria: tipo,
        storage_path: storagePath,
        size_bytes: file.size,
      })
      .select("*")
      .single();

    if (legErr) throw error;

    return {
      id: legacyRow.id,
      client_id: clientId,
      tipo_documento: tipo,
      file_url: fileUrl,
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      created_at: legacyRow.created_at,
    };
  }

  return data;
}

export async function deleteClientDocument(id: string, storagePath?: string | null): Promise<void> {
  const supabase = createClient();
  if (storagePath) {
    try {
      await supabase.storage.from("client-documents").remove([storagePath]);
      await supabase.storage.from("documentos").remove([storagePath]);
    } catch {
      // Ignora erro no storage se arquivo não existir
    }
  }

  const { error } = await supabase.from("documentos_cliente").delete().eq("id", id);
  if (error) {
    await supabase.from("documents").delete().eq("id", id);
  }
}

// ============================================================================
// 2. EXTINTORES (INVENTÁRIO DO CLIENTE)
// ============================================================================

export async function listClientExtintores(clientId: string): Promise<ExtintorInventario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("extintores")
    .select("*, client:client_id(id, razao_social)")
    .eq("client_id", clientId)
    .order("identificacao", { ascending: true });

  if (error) {
    // Fallback para tabela "extinguishers"
    const { data: legacyData, error: legacyErr } = await supabase
      .from("extinguishers")
      .select("*, client:client_id(id, razao_social)")
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (legacyErr) return [];

    return (legacyData || []).map((e, idx) => ({
      id: e.id,
      client_id: e.client_id,
      identificacao: e.patrimonio || e.numero_serie || `Extintor #${idx + 1}`,
      tipo_capacidade: `${e.tipo || "Pó ABC"} - ${e.capacidade || "4kg"}`,
      localizacao: e.localizacao || "Padrão",
      data_ultima_recarga: e.last_recharge_at || null,
      data_vencimento: e.expires_at || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      valor_servico: Number(e.valor_servico || 45.0),
      status: (e.status === "Ativo" ? "no_cliente" : (e.status as ExtintorStatus)) || "no_cliente",
      created_at: e.created_at,
      updated_at: e.updated_at,
      client: e.client ? { id: e.client.id, name: e.client.razao_social } : null,
    }));
  }

  return (data || []).map((e) => ({
    ...e,
    valor_servico: Number(e.valor_servico || 0),
    client: e.client ? { id: e.client.id, name: e.client.razao_social } : null,
  }));
}

export async function saveExtintor(input: Partial<ExtintorInventario>): Promise<ExtintorInventario> {
  const supabase = createClient();
  if (input.id) {
    const { data, error } = await supabase
      .from("extintores")
      .update({
        identificacao: input.identificacao,
        tipo_capacidade: input.tipo_capacidade,
        localizacao: input.localizacao,
        data_ultima_recarga: input.data_ultima_recarga || null,
        data_vencimento: input.data_vencimento,
        valor_servico: input.valor_servico,
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) {
      // Fallback para extinguishers
      await supabase
        .from("extinguishers")
        .update({
          patrimonio: input.identificacao,
          tipo: input.tipo_capacidade?.split("-")[0]?.trim() || "Pó ABC",
          capacidade: input.tipo_capacidade?.split("-")[1]?.trim() || "4kg",
          localizacao: input.localizacao,
          last_recharge_at: input.data_ultima_recarga || null,
          expires_at: input.data_vencimento,
        })
        .eq("id", input.id);
      return input as ExtintorInventario;
    }
    return data;
  } else {
    const { data, error } = await supabase
      .from("extintores")
      .insert({
        client_id: input.client_id,
        identificacao: input.identificacao || "Extintor",
        tipo_capacidade: input.tipo_capacidade || "PÓ ABC - 4kg",
        localizacao: input.localizacao || "Térreo",
        data_ultima_recarga: input.data_ultima_recarga || new Date().toISOString().split("T")[0],
        data_vencimento: input.data_vencimento || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
        valor_servico: input.valor_servico || 45.0,
        status: input.status || "no_cliente",
      })
      .select("*")
      .single();

    if (error) {
      // Fallback para extinguishers
      const { data: leg, error: legErr } = await supabase
        .from("extinguishers")
        .insert({
          client_id: input.client_id,
          tipo: input.tipo_capacidade?.split("-")[0]?.trim() || "Pó ABC",
          capacidade: input.tipo_capacidade?.split("-")[1]?.trim() || "4kg",
          patrimonio: input.identificacao,
          localizacao: input.localizacao,
          last_recharge_at: input.data_ultima_recarga || new Date().toISOString().split("T")[0],
          expires_at: input.data_vencimento || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
        })
        .select("*")
        .single();
      if (legErr) throw error;
      return {
        id: leg.id,
        client_id: leg.client_id,
        identificacao: input.identificacao || "Extintor",
        tipo_capacidade: input.tipo_capacidade || "PÓ ABC - 4kg",
        localizacao: input.localizacao,
        data_ultima_recarga: input.data_ultima_recarga,
        data_vencimento: input.data_vencimento || leg.expires_at,
        valor_servico: input.valor_servico || 45,
        status: "no_cliente",
      };
    }
    return data;
  }
}

export async function batchAddExtintores(
  clientId: string,
  count: number,
  tipoCapacidade: string,
  valorServico: number,
  localizacao?: string
): Promise<void> {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];

  // Pega extintores existentes para continuar a numeração
  const existing = await listClientExtintores(clientId);
  const startNum = existing.length + 1;

  const rows = Array.from({ length: count }, (_, i) => {
    const num = String(startNum + i).padStart(2, "0");
    const prefix = tipoCapacidade.includes("CO2")
      ? "CO2"
      : tipoCapacidade.includes("Água")
      ? "AP"
      : "ABC";
    return {
      client_id: clientId,
      identificacao: `${prefix} ${tipoCapacidade.replace(/[^0-9kgL]/gi, "").trim() || "4kg"} ${num}`,
      tipo_capacidade: tipoCapacidade,
      localizacao: localizacao || "Geral",
      data_ultima_recarga: today,
      data_vencimento: nextYear,
      valor_servico: valorServico,
      status: "no_cliente",
    };
  });

  const { error } = await supabase.from("extintores").insert(rows);
  if (error) {
    // Fallback legado
    const legacyRows = rows.map((r) => ({
      client_id: clientId,
      tipo: r.tipo_capacidade.split("-")[0]?.trim() || "Pó ABC",
      capacidade: r.tipo_capacidade.split("-")[1]?.trim() || "4kg",
      patrimonio: r.identificacao,
      localizacao: r.localizacao,
      last_recharge_at: r.data_ultima_recarga,
      expires_at: r.data_vencimento,
    }));
    await supabase.from("extinguishers").insert(legacyRows);
  }
}

export async function renewExtintoresBatch(ids: string[]): Promise<void> {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];

  const { error } = await supabase
    .from("extintores")
    .update({
      data_ultima_recarga: today,
      data_vencimento: nextYear,
      status: "no_cliente",
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (error) {
    await supabase
      .from("extinguishers")
      .update({
        last_recharge_at: today,
        expires_at: nextYear,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);
  }
}

export async function deleteExtintor(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("extintores").delete().eq("id", id);
  if (error) {
    await supabase.from("extinguishers").delete().eq("id", id);
  }
}

// ============================================================================
// 3. ORDENS DE RECOLHIMENTO (OFICINA)
// ============================================================================

export interface CreateOrdemRecolhimentoInput {
  clientId: string;
  motivo: OrdemRecolhimentoMotivo;
  deixouReserva: boolean;
  detalhesReserva?: string;
  tecnicoResponsavel?: string;
  dataRecolhimento: string;
  previsaoDevolucao?: string;
  observacoes?: string;
  itens: {
    extintorId: string;
    modalidade: ModalidadeRecarga;
    valorRegistrado: number;
  }[];
}

export async function createOrdemRecolhimento(
  input: CreateOrdemRecolhimentoInput
): Promise<{ id: string; numero_ordem: number }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Cria a Ordem de Recolhimento
  const { data: ordem, error: ordemError } = await supabase
    .from("ordens_recolhimento")
    .insert({
      client_id: input.clientId,
      motivo: input.motivo,
      deixou_reserva: input.deixouReserva,
      detalhes_reserva: input.deixouReserva ? input.detalhesReserva : null,
      tecnico_responsavel: input.tecnicoResponsavel || "Oficina Central",
      data_recolhimento: input.dataRecolhimento,
      previsao_devolucao: input.previsaoDevolucao || null,
      observacoes: input.observacoes || null,
      status: "recolhido",
      created_by: user?.id || null,
    })
    .select("id, numero_ordem")
    .single();

  let ordemId = ordem?.id;
  let numeroOrdem = ordem?.numero_ordem || Math.floor(1000 + Math.random() * 9000);

  if (ordemError || !ordemId) {
    // Fallback: cria como uma Ordem de Serviço padrão no CRM com status pendente
    const { data: os, error: osErr } = await supabase
      .from("service_orders")
      .insert({
        customer_id: input.clientId,
        type: `Recolhimento (${input.motivo})`,
        description: `Recolhimento de ${input.itens.length} extintores para oficina. Reserva: ${input.deixouReserva ? "Sim - " + (input.detalhesReserva || "") : "Não"}`,
        scheduled_date: input.dataRecolhimento,
        status: "pendente",
        priority: "media",
        subtotal: input.itens.reduce((acc, i) => acc + i.valorRegistrado, 0),
        discount: 0,
        total: input.itens.reduce((acc, i) => acc + i.valorRegistrado, 0),
        created_by: user?.id || "",
      })
      .select("id, number")
      .single();

    if (osErr) throw ordemError || osErr;
    ordemId = os.id;
    numeroOrdem = os.number;
  }

  // 2. Insere os itens de recolhimento
  if (input.itens.length > 0 && ordemId) {
    const itemRows = input.itens.map((it) => ({
      ordem_id: ordemId,
      extintor_id: it.extintorId,
      modalidade_recarga: it.modalidade,
      valor_registrado: it.valorRegistrado,
    }));

    await supabase.from("itens_recolhimento").insert(itemRows);

    // 3. Atualiza o status dos extintores para "em_bancada"
    const extintorIds = input.itens.map((i) => i.extintorId);
    await supabase
      .from("extintores")
      .update({ status: "em_bancada", updated_at: new Date().toISOString() })
      .in("id", extintorIds);

    await supabase
      .from("extinguishers")
      .update({ status: "em_bancada", updated_at: new Date().toISOString() })
      .in("id", extintorIds);
  }

  return { id: ordemId, numero_ordem: numeroOrdem };
}

export async function listOrdensRecolhimento(clientId?: string): Promise<OrdemRecolhimento[]> {
  const supabase = createClient();
  let query = supabase
    .from("ordens_recolhimento")
    .select("*, client:client_id(id, razao_social, cnpj), itens:itens_recolhimento(*, extintor:extintor_id(*))")
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) return [];

  return (data || []).map((o) => ({
    id: o.id,
    client_id: o.client_id,
    numero_ordem: o.numero_ordem,
    motivo: o.motivo,
    deixou_reserva: o.deixou_reserva,
    detalhes_reserva: o.detalhes_reserva,
    tecnico_responsavel: o.tecnico_responsavel,
    data_recolhimento: o.data_recolhimento,
    previsao_devolucao: o.previsao_devolucao,
    observacoes: o.observacoes,
    status: o.status,
    created_at: o.created_at,
    updated_at: o.updated_at,
    client: o.client ? { id: o.client.id, name: o.client.razao_social, document: o.client.cnpj } : null,
    itens: o.itens || [],
  }));
}

// ============================================================================
// 4. VENCIMENTOS E ALERTAS PARA O DASHBOARD
// ============================================================================

export interface VencimentoItem {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_telefone?: string | null;
  categoria: "Extintores" | "PPCI" | "Mangueiras";
  item_nome: string;
  localizacao?: string | null;
  data_vencimento: string;
  status_alerta: "vencido" | "mes_atual" | "proximo_mes" | "em_dia";
  dias_restantes: number;
}

export async function getExpiringItems(): Promise<{
  vencidosCount: number;
  vencendoMesCount: number;
  proximoMesCount: number;
  items: VencimentoItem[];
}> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  const allItems: VencimentoItem[] = [];

  // 1. Busca Extintores
  const { data: extintores } = await supabase
    .from("extintores")
    .select("id, client_id, identificacao, tipo_capacidade, localizacao, data_vencimento, client:client_id(id, razao_social, telefone, telefone2, whatsapp)");

  if (extintores && extintores.length > 0) {
    for (const e of extintores) {
      if (!e.data_vencimento) continue;
      const dueDate = new Date(e.data_vencimento + "T00:00:00");
      const diffTime = dueDate.getTime() - today.getTime();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: "vencido" | "mes_atual" | "proximo_mes" | "em_dia" = "em_dia";
      if (dueDate < today) {
        status = "vencido";
      } else if (dueDate <= endOfMonth) {
        status = "mes_atual";
      } else if (dueDate <= endOfNextMonth) {
        status = "proximo_mes";
      }

      allItems.push({
        id: e.id,
        cliente_id: e.client_id,
        cliente_nome: (e.client as any)?.razao_social || "Cliente",
        cliente_telefone: (e.client as any)?.whatsapp || (e.client as any)?.telefone || (e.client as any)?.telefone2,
        categoria: "Extintores",
        item_nome: `${e.identificacao} (${e.tipo_capacidade})`,
        localizacao: e.localizacao,
        data_vencimento: e.data_vencimento,
        status_alerta: status,
        dias_restantes: diasRestantes,
      });
    }
  } else {
    // Fallback: extinguishers legado
    const { data: legExt } = await supabase
      .from("extinguishers")
      .select("id, client_id, patrimonio, tipo, capacidade, localizacao, expires_at, client:client_id(id, razao_social, telefone, telefone2, whatsapp)")
      .is("deleted_at", null);

    if (legExt) {
      for (const e of legExt) {
        if (!e.expires_at) continue;
        const dueDate = new Date(e.expires_at + "T00:00:00");
        const diffTime = dueDate.getTime() - today.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: "vencido" | "mes_atual" | "proximo_mes" | "em_dia" = "em_dia";
        if (dueDate < today) {
          status = "vencido";
        } else if (dueDate <= endOfMonth) {
          status = "mes_atual";
        } else if (dueDate <= endOfNextMonth) {
          status = "proximo_mes";
        }

        allItems.push({
          id: e.id,
          cliente_id: e.client_id,
          cliente_nome: (e.client as any)?.razao_social || "Cliente",
          cliente_telefone: (e.client as any)?.whatsapp || (e.client as any)?.telefone || (e.client as any)?.telefone2,
          categoria: "Extintores",
          item_nome: `${e.patrimonio || "Extintor"} (${e.tipo} ${e.capacidade})`,
          localizacao: e.localizacao,
          data_vencimento: e.expires_at,
          status_alerta: status,
          dias_restantes: diasRestantes,
        });
      }
    }
  }

  // 2. Busca Mangueiras
  const { data: hoses } = await supabase
    .from("hoses")
    .select("id, client_id, tipo, comprimento, localizacao, next_test_at, client:client_id(id, razao_social, telefone, telefone2, whatsapp)")
    .is("deleted_at", null);

  if (hoses) {
    for (const h of hoses) {
      if (!h.next_test_at) continue;
      const dueDate = new Date(h.next_test_at + "T00:00:00");
      const diffTime = dueDate.getTime() - today.getTime();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: "vencido" | "mes_atual" | "proximo_mes" | "em_dia" = "em_dia";
      if (dueDate < today) {
        status = "vencido";
      } else if (dueDate <= endOfMonth) {
        status = "mes_atual";
      } else if (dueDate <= endOfNextMonth) {
        status = "proximo_mes";
      }

      allItems.push({
        id: h.id,
        cliente_id: h.client_id,
        cliente_nome: (h.client as any)?.razao_social || "Cliente",
        cliente_telefone: (h.client as any)?.whatsapp || (h.client as any)?.telefone || (h.client as any)?.telefone2,
        categoria: "Mangueiras",
        item_nome: `Mangueira ${h.tipo} (${h.comprimento}m)`,
        localizacao: h.localizacao,
        data_vencimento: h.next_test_at,
        status_alerta: status,
        dias_restantes: diasRestantes,
      });
    }
  }

  // 3. Busca PPCI dos clientes
  const { data: clientsWithPpci } = await supabase
    .from("clients")
    .select("id, razao_social, telefone, telefone2, whatsapp, ppci_expires_at, ppci_number, ppci_isento")
    .is("deleted_at", null)
    .eq("ppci_isento", false);

  if (clientsWithPpci) {
    for (const c of clientsWithPpci) {
      if (!c.ppci_expires_at) continue;
      const dueDate = new Date(c.ppci_expires_at + "T00:00:00");
      const diffTime = dueDate.getTime() - today.getTime();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: "vencido" | "mes_atual" | "proximo_mes" | "em_dia" = "em_dia";
      if (dueDate < today) {
        status = "vencido";
      } else if (dueDate <= endOfMonth) {
        status = "mes_atual";
      } else if (dueDate <= endOfNextMonth) {
        status = "proximo_mes";
      }

      allItems.push({
        id: c.id,
        cliente_id: c.id,
        cliente_nome: c.razao_social,
        cliente_telefone: c.whatsapp || c.telefone || c.telefone2,
        categoria: "PPCI",
        item_nome: `Alvará / PPCI nº ${c.ppci_number || "S/N"}`,
        localizacao: "Edifício",
        data_vencimento: c.ppci_expires_at,
        status_alerta: status,
        dias_restantes: diasRestantes,
      });
    }
  }

  // Ordena por dias restantes (menores primeiro, ou seja, mais urgentes)
  allItems.sort((a, b) => a.dias_restantes - b.dias_restantes);

  const vencidosCount = allItems.filter((i) => i.status_alerta === "vencido").length;
  const vencendoMesCount = allItems.filter((i) => i.status_alerta === "mes_atual").length;
  const proximoMesCount = allItems.filter((i) => i.status_alerta === "proximo_mes").length;

  return {
    vencidosCount,
    vencendoMesCount,
    proximoMesCount,
    items: allItems,
  };
}
