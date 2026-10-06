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
  LoteRecolhimento,
  LoteRecolhimentoStatus,
  PaymentMethod,
  DeliveryReceiptData,
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
  localizacao?: string,
  dataVencimento?: string,
  dataUltimaRecarga?: string
): Promise<void> {
  const supabase = createClient();
  const today = dataUltimaRecarga || new Date().toISOString().split("T")[0];
  const nextYear = dataVencimento || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];

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
  loteId?: string;
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

  // 0. TRAVA ANTI-DUPLICIDADE: Impede recolher mais de uma vez o mesmo extintor para a bancada
  const extintorIds = input.itens.map((i) => i.extintorId).filter(Boolean);
  if (extintorIds.length > 0) {
    const { data: extsDb } = await supabase
      .from("extintores")
      .select("id, identificacao, status")
      .in("id", extintorIds);

    let jaNaBancada = (extsDb || []).filter((e) => e.status === "em_bancada");
    if (jaNaBancada.length === 0) {
      const { data: legDb } = await supabase
        .from("extinguishers")
        .select("id, patrimonio, status")
        .in("id", extintorIds);
      jaNaBancada = (legDb || []).filter((e) => e.status === "em_bancada").map((e) => ({
        id: e.id,
        identificacao: e.patrimonio || "Extintor",
        status: e.status,
      }));
    }

    if (jaNaBancada.length > 0) {
      const nomes = jaNaBancada.map((e) => e.identificacao).join(", ");
      throw new Error(
        `Recolhimento duplicado bloqueado: O(s) extintor(es) [${nomes}] já está(ão) na bancada da oficina.`
      );
    }
  }

  // Se tiver loteId, embute tag [LOTE:id] nas observações para garantia caso a coluna lote_id ainda não exista
  const observacaoComLote = input.loteId
    ? `${input.observacoes ? input.observacoes + " " : ""}[LOTE:${input.loteId}]`
    : input.observacoes || null;

  // 1. Tenta criar a Ordem de Recolhimento com lote_id
  let ordem: any = null;
  let ordemError: any = null;

  try {
    const payload: Record<string, any> = {
      client_id: input.clientId,
      motivo: input.motivo,
      deixou_reserva: input.deixouReserva,
      detalhes_reserva: input.deixouReserva ? input.detalhesReserva : null,
      tecnico_responsavel: input.tecnicoResponsavel || "Oficina Central",
      data_recolhimento: input.dataRecolhimento,
      previsao_devolucao: input.previsaoDevolucao || null,
      observacoes: observacaoComLote,
      status: "recolhido",
      created_by: user?.id || null,
    };
    if (input.loteId) {
      payload.lote_id = input.loteId;
    }

    const res = await supabase
      .from("ordens_recolhimento")
      .insert(payload)
      .select("id, numero_ordem")
      .single();

    if (res.error && res.error.message?.includes("lote_id")) {
      // Coluna lote_id ainda não adicionada no DB pelo usuário; retry sem lote_id
      delete payload.lote_id;
      const retryRes = await supabase
        .from("ordens_recolhimento")
        .insert(payload)
        .select("id, numero_ordem")
        .single();
      ordem = retryRes.data;
      ordemError = retryRes.error;
    } else {
      ordem = res.data;
      ordemError = res.error;
    }
  } catch (err: any) {
    ordemError = err;
  }

  let ordemId = ordem?.id;
  let numeroOrdem = ordem?.numero_ordem || Math.floor(1000 + Math.random() * 9000);

  if (ordemError || !ordemId) {
    // Fallback: cria como uma Ordem de Serviço padrão no CRM com status pendente
    const { data: os, error: osErr } = await supabase
      .from("service_orders")
      .insert({
        customer_id: input.clientId,
        type: `Recolhimento (${input.motivo})`,
        description: `Recolhimento de ${input.itens.length} extintores para oficina. Reserva: ${input.deixouReserva ? "Sim - " + (input.detalhesReserva || "") : "Não"} ${observacaoComLote || ""}`,
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

    // 4. Cria os registros na tabela bench_records para o fluxo de Bancada (Kanban da oficina)
    try {
      const { data: clientData } = await supabase
        .from("clients")
        .select("id, razao_social, nome_fantasia, company_id")
        .eq("id", input.clientId)
        .maybeSingle();

      let companyId = clientData?.company_id;
      if (!companyId && user?.id) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("company_id")
          .eq("id", user.id)
          .maybeSingle();
        companyId = profile?.company_id;
      }
      if (!companyId) {
        const { data: firstComp } = await supabase.from("companies").select("id").limit(1).maybeSingle();
        companyId = firstComp?.id;
      }

      const { data: extintoresData } = await supabase
        .from("extintores")
        .select("id, identificacao, tipo_capacidade, localizacao, valor_servico")
        .in("id", extintorIds);

      const extMap = new Map((extintoresData || []).map((e) => [e.id, e]));
      const customerName = clientData?.razao_social || clientData?.nome_fantasia || "Cliente";

      if (companyId) {
        const benchRows = input.itens.map((it) => {
          const ext = extMap.get(it.extintorId);
          return {
            company_id: companyId,
            client_id: input.clientId,
            extinguisher_id: it.extintorId,
            service_order_id: ordemId,
            stage: "entrada",
            priority: "media",
            arrived_at: input.dataRecolhimento
              ? new Date(input.dataRecolhimento + "T12:00:00").toISOString()
              : new Date().toISOString(),
            due_at: input.previsaoDevolucao
              ? new Date(input.previsaoDevolucao + "T12:00:00").toISOString()
              : null,
            equip_type: ext?.tipo_capacidade?.split("-")[0]?.trim() || "Extintor",
            equip_capacity: ext?.tipo_capacidade?.split("-")[1]?.trim() || ext?.tipo_capacidade || "4kg",
            equip_serial: ext?.identificacao || "S/N",
            customer_name: customerName,
            notes: `OS de Recolhimento nº ${numeroOrdem}. Motivo: ${input.motivo}. Modalidade: ${it.modalidade}.${
              input.deixouReserva ? ` Deixou reserva: ${input.detalhesReserva || "Sim"}.` : ""
            } ${input.observacoes || ""}`.trim(),
            created_by: user?.id || null,
          };
        });

        const { error: insertErr } = await supabase.from("bench_records").insert(benchRows);
        if (insertErr) {
          // Fallback se houver constraint FK apontando para tabelas legadas
          const fallbackRows = benchRows.map((r) => ({
            ...r,
            extinguisher_id: null,
            service_order_id: null,
          }));
          await supabase.from("bench_records").insert(fallbackRows);
        }
      }
    } catch (benchErr) {
      console.warn("Falha ao registrar itens na bench_records:", benchErr);
    }
  }

  return { id: ordemId, numero_ordem: numeroOrdem };
}

export async function listOrdensRecolhimento(clientId?: string, loteId?: string): Promise<OrdemRecolhimento[]> {
  const supabase = createClient();
  let query = supabase
    .from("ordens_recolhimento")
    .select(
      "*, client:client_id(id, razao_social, nome_fantasia, cnpj, telefone, whatsapp, logradouro, numero, bairro, cidade, estado, cep), itens:itens_recolhimento(*, extintor:extintor_id(*))"
    )
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) return [];

  const mapped: OrdemRecolhimento[] = (data || []).map((o: any) => {
    // Detecta lote_id da coluna direta ou da tag [LOTE:id] em observações
    let resolvedLoteId = o.lote_id || null;
    if (!resolvedLoteId && o.observacoes && typeof o.observacoes === "string") {
      const match = o.observacoes.match(/\[LOTE:([^\]]+)\]/);
      if (match) resolvedLoteId = match[1];
    }

    const c = o.client;
    return {
      id: o.id,
      lote_id: resolvedLoteId,
      client_id: o.client_id,
      numero_ordem: o.numero_ordem,
      motivo: o.motivo,
      deixou_reserva: o.deixou_reserva,
      detalhes_reserva: o.detalhes_reserva,
      tecnico_responsavel: o.tecnico_responsavel,
      data_recolhimento: o.data_recolhimento,
      previsao_devolucao: o.previsao_devolucao,
      observacoes: o.observacoes ? o.observacoes.replace(/\[LOTE:[^\]]+\]\s*/g, "").trim() : null,
      status: o.status,
      created_at: o.created_at,
      updated_at: o.updated_at,
      created_by: o.created_by,
      client: c
        ? {
            id: c.id,
            name: c.razao_social || c.nome_fantasia || "Cliente",
            document: c.cnpj || undefined,
            telefone: c.whatsapp || c.telefone || null,
            address: {
              street: c.logradouro || null,
              number: c.numero || null,
              neighborhood: c.bairro || null,
              city: c.cidade || null,
              state: c.estado || null,
            },
          }
        : null,
      itens: (o.itens || []).map((it: any) => ({
        id: it.id,
        ordem_id: it.ordem_id,
        extintor_id: it.extintor_id,
        modalidade_recarga: it.modalidade_recarga,
        valor_registrado: Number(it.valor_registrado || 0),
        created_at: it.created_at,
        extintor: it.extintor
          ? {
              ...it.extintor,
              valor_servico: Number(it.extintor.valor_servico || 0),
            }
          : undefined,
      })),
    };
  });

  if (loteId) {
    return mapped.filter((o) => o.lote_id === loteId);
  }

  return mapped;
}

// ============================================================================
// 3.1 LOTES DE RECOLHIMENTO (MACRO LOTES POR CIDADE / DATA DE DEVOLUÇÃO)
// ============================================================================

const LOCAL_LOTES_STORAGE_KEY = "extincontrol_lotes_recolhimento_v1";

function getLocalLotes(): LoteRecolhimento[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_LOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalLotes(lotes: LoteRecolhimento[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_LOTES_STORAGE_KEY, JSON.stringify(lotes));
  } catch (err) {
    console.error("Erro ao salvar lotes no localStorage:", err);
  }
}

export async function listLotesRecolhimento(): Promise<LoteRecolhimento[]> {
  const supabase = createClient();
  let lotes: LoteRecolhimento[] = [];

  const { data, error } = await supabase
    .from("lotes_recolhimento")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // Fallback: lê da persistência local
    lotes = getLocalLotes();
  } else {
    lotes = data || [];
  }

  // Carrega todas as ordens para calcular totais por lote
  const allOrdens = await listOrdensRecolhimento();

  return lotes.map((lote) => {
    const ordensDoLote = allOrdens.filter((o) => o.lote_id === lote.id);
    const totalExtintores = ordensDoLote.reduce((acc, o) => acc + (o.itens?.length || 0), 0);
    const totalClientes = new Set(ordensDoLote.map((o) => o.client_id)).size;

    // Totais financeiros e modelos agrupados
    let valorTotal = 0;
    let valorRecebido = 0;
    const modeloMap = new Map<string, number>();

    ordensDoLote.forEach((ordem) => {
      const ordemValor = (ordem.itens || []).reduce(
        (sum, it) => sum + Number(it.valor_registrado || it.extintor?.valor_servico || 45.0),
        0
      );
      valorTotal += ordemValor;
      if (ordem.status === "concluido") {
        valorRecebido += ordemValor;
      }

      (ordem.itens || []).forEach((it) => {
        const mod = it.extintor?.tipo_capacidade || "Pó ABC - 4kg";
        modeloMap.set(mod, (modeloMap.get(mod) || 0) + 1);
      });
    });

    const valorPendente = Math.max(0, valorTotal - valorRecebido);
    const modelosAgrupados = Array.from(modeloMap.entries()).map(([modelo, count]) => ({
      modelo,
      count,
    }));

    // Verifica etapa informada em observações se houver tag [ETAPA:xxx]
    const etapaMatch = lote.observacoes?.match(/\[ETAPA:([^\]]+)\]/);
    const effectiveStatus = (etapaMatch ? etapaMatch[1] : lote.status) as LoteRecolhimentoStatus;

    return {
      ...lote,
      status: effectiveStatus,
      ordens: ordensDoLote,
      total_extintores: totalExtintores,
      total_clientes: totalClientes,
      valor_total: valorTotal,
      valor_recebido: valorRecebido,
      valor_pendente: valorPendente,
      modelos_agrupados: modelosAgrupados,
    };
  });
}

export async function getLoteRecolhimento(loteId: string): Promise<LoteRecolhimento | null> {
  const all = await listLotesRecolhimento();
  return all.find((l) => l.id === loteId) || null;
}

export async function saveLoteRecolhimento(
  input: Partial<LoteRecolhimento>
): Promise<LoteRecolhimento> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isEditing = Boolean(input.id);
  const loteId = input.id || crypto.randomUUID();

  // Gera código amigável tipo LOTE-AAAA-MM-XX
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const codigo = input.codigo || `LOTE-${yearMonth}-${Math.floor(10 + Math.random() * 90)}`;

  const prazoDias = input.prazo_dias || 7;
  const dataRecolhimento = input.data_recolhimento || new Date().toISOString().split("T")[0];

  const calcPrevisao = () => {
    if (input.previsao_devolucao) return input.previsao_devolucao;
    const base = new Date(dataRecolhimento + "T12:00:00");
    base.setDate(base.getDate() + prazoDias);
    return base.toISOString().split("T")[0];
  };

  const payload: LoteRecolhimento = {
    id: loteId,
    codigo,
    nome:
      input.nome ||
      `${input.cidade || "Região Central"} - Devolução em ${prazoDias} dias (${calcPrevisao()})`,
    cidade: input.cidade || null,
    regiao: input.regiao || null,
    data_recolhimento: dataRecolhimento,
    prazo_dias: prazoDias,
    previsao_devolucao: calcPrevisao(),
    status: input.status || "em_oficina",
    observacoes: input.observacoes || null,
    created_at: input.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: user?.id || null,
  };

  // Tenta salvar no Supabase
  if (isEditing) {
    const { data, error } = await supabase
      .from("lotes_recolhimento")
      .update({
        nome: payload.nome,
        cidade: payload.cidade,
        regiao: payload.regiao,
        prazo_dias: payload.prazo_dias,
        previsao_devolucao: payload.previsao_devolucao,
        status: payload.status,
        observacoes: payload.observacoes,
        updated_at: payload.updated_at,
      })
      .eq("id", loteId)
      .select("*")
      .single();

    if (error) {
      // Salva no localStorage
      const locals = getLocalLotes();
      const updated = locals.map((l) => (l.id === loteId ? { ...l, ...payload } : l));
      saveLocalLotes(updated);
      return payload;
    }
    return data;
  } else {
    const { data, error } = await supabase
      .from("lotes_recolhimento")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      // Salva no localStorage
      const locals = getLocalLotes();
      saveLocalLotes([payload, ...locals]);
      return payload;
    }
    return data;
  }
}

export async function updateLoteStatus(
  loteId: string,
  status: LoteRecolhimentoStatus
): Promise<void> {
  const supabase = createClient();

  // Mapeamento compatível caso o PostgreSQL tenha restrição restrita de status
  let dbStatus = status;
  if (status === "aguardando_descarga") dbStatus = "recolhendo";
  else if (status === "saida") dbStatus = "em_oficina";
  else if (status === "em_devolucao") dbStatus = "pronto_entrega";

  // Tenta gravar o status diretamente
  let { error } = await supabase
    .from("lotes_recolhimento")
    .update({ status: status as any, updated_at: new Date().toISOString() })
    .eq("id", loteId);

  // Se der erro de constraint, grava dbStatus e a tag [ETAPA:status] nas observações
  if (error) {
    const { data: current } = await supabase
      .from("lotes_recolhimento")
      .select("observacoes")
      .eq("id", loteId)
      .maybeSingle();

    const cleanObs = (current?.observacoes || "").replace(/\[ETAPA:[^\]]+\]/g, "").trim();
    const newObs = `${cleanObs} [ETAPA:${status}]`.trim();

    const { error: err2 } = await supabase
      .from("lotes_recolhimento")
      .update({ status: dbStatus as any, observacoes: newObs, updated_at: new Date().toISOString() })
      .eq("id", loteId);

    if (err2) {
      const locals = getLocalLotes();
      const updated = locals.map((l) => (l.id === loteId ? { ...l, status, updated_at: new Date().toISOString() } : l));
      saveLocalLotes(updated);
    }
  }
}

export async function listLotesForBench(): Promise<LoteRecolhimento[]> {
  const allLotes = await listLotesRecolhimento();
  // Retorna somente lotes que estão na oficina (recolhendo/descarga, oficina ou saída)
  // Lotes liberados para rota de entrega (pronto_entrega / em_devolucao) ou concluídos são EXCLUÍDOS do Kanban
  return allLotes.filter((l) => {
    const s = l.status;
    return s === "recolhendo" || s === "aguardando_descarga" || s === "em_oficina" || s === "saida";
  });
}

export async function advanceLoteBenchStage(
  loteId: string,
  targetStage: "aguardando_descarga" | "em_oficina" | "saida" | "liberar_rota"
): Promise<void> {
  if (targetStage === "liberar_rota") {
    // Ao avançar da saída, o lote é excluído do Kanban da oficina e passa a figurar em "Lotes & Rotas" na entrega
    await updateLoteStatus(loteId, "em_devolucao");
  } else {
    await updateLoteStatus(loteId, targetStage as LoteRecolhimentoStatus);
  }
}

export async function addOrdemToLote(ordemId: string, loteId: string): Promise<void> {
  const supabase = createClient();

  // Tenta atualizar coluna lote_id
  const { error } = await supabase
    .from("ordens_recolhimento")
    .update({ lote_id: loteId, updated_at: new Date().toISOString() })
    .eq("id", ordemId);

  if (error) {
    // Fallback: insere a tag [LOTE:id] nas observações
    const { data: current } = await supabase
      .from("ordens_recolhimento")
      .select("observacoes")
      .eq("id", ordemId)
      .maybeSingle();

    const obs = current?.observacoes ? `${current.observacoes} [LOTE:${loteId}]` : `[LOTE:${loteId}]`;
    await supabase.from("ordens_recolhimento").update({ observacoes: obs }).eq("id", ordemId);
  }
}

export async function removeOrdemFromLote(ordemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ordens_recolhimento")
    .update({ lote_id: null, updated_at: new Date().toISOString() })
    .eq("id", ordemId);

  if (error) {
    const { data: current } = await supabase
      .from("ordens_recolhimento")
      .select("observacoes")
      .eq("id", ordemId)
      .maybeSingle();

    if (current?.observacoes) {
      const clean = current.observacoes.replace(/\[LOTE:[^\]]+\]\s*/g, "").trim();
      await supabase.from("ordens_recolhimento").update({ observacoes: clean }).eq("id", ordemId);
    }
  }
}

export interface ConfirmDeliveryAndPaymentInput {
  orderId: string;
  loteId?: string;
  clientId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  amountPaid: number;
  isPaid: boolean;
  notes?: string;
  dueDate?: string;
}

export async function confirmClientDeliveryAndPayment(
  input: ConfirmDeliveryAndPaymentInput
): Promise<DeliveryReceiptData> {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];

  // 1. Busca ordem e dados do cliente
  const { data: ordem } = await supabase
    .from("ordens_recolhimento")
    .select("*, client:client_id(*)")
    .eq("id", input.orderId)
    .single();

  const client = (ordem as any)?.client;
  const clientName = client?.razao_social || client?.nome_fantasia || "Cliente";

  // 2. Busca itens da ordem e extintores
  const { data: itens } = await supabase
    .from("itens_recolhimento")
    .select("*, extintor:extintor_id(*)")
    .eq("ordem_id", input.orderId);

  const extIds = (itens || []).map((i) => i.extintor_id).filter(Boolean);

  // 3. Atualiza os extintores do cliente em public.extintores: volta para 'no_cliente' e renova validade em +1 ano
  if (extIds.length > 0) {
    await supabase
      .from("extintores")
      .update({
        status: "no_cliente",
        data_ultima_recarga: today,
        data_vencimento: nextYear,
        updated_at: new Date().toISOString(),
      })
      .in("id", extIds);
  }

  // 4. Conclui a ordem de recolhimento
  await supabase
    .from("ordens_recolhimento")
    .update({
      status: "concluido",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.orderId);

  // 5. Identifica company_id para lançamento no Financeiro
  let companyId = client?.company_id;
  if (!companyId) {
    const { data: firstComp } = await supabase.from("companies").select("id").limit(1).maybeSingle();
    companyId = firstComp?.id;
  }

  // 6. Lança transação em public.receipts (FINANCEIRO & RELATÓRIOS)
  let receiptNumero: number = ordem?.numero_ordem || Math.floor(1000 + Math.random() * 9000);
  try {
    const { data: authUser } = await supabase.auth.getUser();
    if (companyId) {
      const receiptPayload = {
        company_id: companyId,
        client_id: input.clientId,
        invoice_type: "receber",
        status: input.isPaid ? "Recebido" : "Pendente",
        amount: input.amount,
        amount_paid: input.isPaid ? input.amountPaid : 0,
        due_at: input.dueDate || today,
        issued_at: today,
        received_at: input.isPaid ? new Date().toISOString() : null,
        payment_method: input.paymentMethod,
        description: `Recarga de ${(itens || []).length} extintor(es) - OS #${ordem?.numero_ordem || ""} - ${clientName}`,
        notes: input.notes || `Cobrança de devolução via ${input.paymentMethod}`,
        created_by: authUser.user?.id || null,
      };

      const { data: recData, error: recErr } = await supabase
        .from("receipts")
        .insert(receiptPayload)
        .select("id, numero")
        .single();

      if (!recErr && recData?.numero) {
        receiptNumero = Number(recData.numero);
      }
    }
  } catch (recEx) {
    console.warn("Lançamento financeiro em receipts:", recEx);
  }

  // 7. Se pertencer a um lote, verifica se todas as outras ordens do lote foram concluídas
  const loteId = input.loteId || ordem?.lote_id;
  let loteCodigo = "LOTE-GERAL";
  if (loteId) {
    const { data: loteData } = await supabase
      .from("lotes_recolhimento")
      .select("codigo")
      .eq("id", loteId)
      .maybeSingle();

    if (loteData?.codigo) loteCodigo = loteData.codigo;

    const allOrdensDoLote = await listOrdensRecolhimento(undefined, loteId);
    const pendentes = allOrdensDoLote.filter((o) => o.id !== input.orderId && o.status !== "concluido");
    if (pendentes.length === 0) {
      await updateLoteStatus(loteId, "concluido");
    }
  }

  // 8. Formata os dados oficiais do recibo
  const receiptItems = (itens || []).map((it) => {
    const ext = it.extintor;
    return {
      identificacao: ext?.identificacao || "Extintor",
      tipo_capacidade: ext?.tipo_capacidade || "Pó ABC - 4kg",
      localizacao: ext?.localizacao || "Padrão",
      modalidade: it.modalidade_recarga || "Normal",
      valor: Number(it.valor_registrado || ext?.valor_servico || 45.0),
      nova_validade: nextYear,
    };
  });

  return {
    numero_recibo: receiptNumero,
    data_emissao: new Date().toLocaleDateString("pt-BR"),
    cliente_nome: clientName,
    cliente_documento: client?.cnpj || client?.cpf || client?.documento || undefined,
    cliente_telefone: client?.telefone || client?.telefone2 || undefined,
    cliente_endereco: [
      client?.address_street,
      client?.address_number,
      client?.address_neighborhood,
      client?.address_city,
      client?.address_state,
    ]
      .filter(Boolean)
      .join(", "),
    lote_codigo: loteCodigo,
    ordem_numero: ordem?.numero_ordem || 1,
    itens: receiptItems,
    valor_total: input.amount,
    forma_pagamento: input.paymentMethod,
    status_pagamento: input.isPaid ? "QUITADO" : "PENDENTE",
    observacoes: input.notes,
  };
}

export async function confirmClientDevolucao(ordemId: string): Promise<{ success: boolean }> {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];

  // 1. Marca ordem como concluída
  const { data: ordem, error: ordemErr } = await supabase
    .from("ordens_recolhimento")
    .update({ status: "concluido", updated_at: new Date().toISOString() })
    .eq("id", ordemId)
    .select("id, lote_id, observacoes")
    .single();

  if (ordemErr) {
    console.error("Erro ao concluir ordem:", ordemErr);
  }

  // 2. Busca extintores desta ordem para devolver ao status 'no_cliente' e renovar validade
  const { data: itens } = await supabase
    .from("itens_recolhimento")
    .select("extintor_id")
    .eq("ordem_id", ordemId);

  const extIds = (itens || []).map((i) => i.extintor_id).filter(Boolean);

  if (extIds.length > 0) {
    await supabase
      .from("extintores")
      .update({
        status: "no_cliente",
        data_ultima_recarga: today,
        data_vencimento: nextYear,
        updated_at: new Date().toISOString(),
      })
      .in("id", extIds);
  }

  // 3. Se esta ordem pertence a um lote, verifica se todas as outras ordens do lote foram concluídas
  const loteId = ordem?.lote_id || (ordem?.observacoes?.match(/\[LOTE:([^\]]+)\]/)?.[1] ?? null);
  if (loteId) {
    const allOrdensDoLote = await listOrdensRecolhimento(undefined, loteId);
    const pendentes = allOrdensDoLote.filter((o) => o.status !== "concluido");
    if (pendentes.length === 0) {
      await updateLoteStatus(loteId, "concluido");
    }
  }

  return { success: true };
}

// ============================================================================
// 4. VENCIMENTOS E ALERTAS PARA O DASHBOARD
// ============================================================================

export interface VencimentoItem {
  id: string;
  extintor_id?: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_fantasia?: string;
  cliente_telefone?: string | null;
  cliente_documento?: string;
  cliente_endereco?: string;
  categoria: "Extintores" | "PPCI" | "Mangueiras";
  item_nome: string;
  subtipo?: string;
  localizacao?: string | null;
  data_vencimento: string;
  status_alerta: "vencido" | "mes_atual" | "proximo_mes" | "em_dia";
  dias_restantes: number;
  extintor_status?: string | null;
}

export interface ClienteLoteVencimento {
  cliente_id: string;
  cliente_nome: string;
  cliente_fantasia?: string;
  cliente_telefone?: string | null;
  cliente_documento?: string;
  cliente_endereco?: string;
  total_extintores: number;
  extintores: VencimentoItem[];
  extintores_disponiveis: VencimentoItem[];
  extintores_em_bancada: VencimentoItem[];
  modelos_agrupados: { modelo: string; count: number }[];
  meses_vencimento: string[];
  status_geral: "vencido" | "mes_atual" | "proximo_mes" | "em_dia";
  todos_em_bancada: boolean;
  tem_vencido: boolean;
  tem_mes_atual: boolean;
}

/**
 * Agrupa os extintores vencidos / a vencer por cliente em Lotes Completos
 */
export function groupExpiringExtintoresByClient(items: VencimentoItem[]): ClienteLoteVencimento[] {
  const extItems = items.filter((it) => it.categoria === "Extintores");
  const groups = new Map<string, ClienteLoteVencimento>();

  for (const item of extItems) {
    let group = groups.get(item.cliente_id);
    if (!group) {
      group = {
        cliente_id: item.cliente_id,
        cliente_nome: item.cliente_nome,
        cliente_fantasia: item.cliente_fantasia,
        cliente_telefone: item.cliente_telefone,
        cliente_documento: item.cliente_documento,
        cliente_endereco: item.cliente_endereco,
        total_extintores: 0,
        extintores: [],
        extintores_disponiveis: [],
        extintores_em_bancada: [],
        modelos_agrupados: [],
        meses_vencimento: [],
        status_geral: item.status_alerta,
        todos_em_bancada: false,
        tem_vencido: false,
        tem_mes_atual: false,
      };
      groups.set(item.cliente_id, group);
    }

    group.total_extintores += 1;
    group.extintores.push(item);
    if (item.extintor_status === "em_bancada") {
      group.extintores_em_bancada.push(item);
    } else {
      group.extintores_disponiveis.push(item);
    }

    // Atualiza status geral com base na severidade (vencido > mes_atual > proximo_mes)
    if (item.status_alerta === "vencido") {
      group.status_geral = "vencido";
    } else if (item.status_alerta === "mes_atual" && group.status_geral !== "vencido") {
      group.status_geral = "mes_atual";
    }

    // Adiciona mês/ano formatado à lista
    if (item.data_vencimento) {
      const ym = item.data_vencimento.slice(0, 7);
      const [year, month] = ym.split("-");
      const formatted = `${month}/${year}`;
      if (!group.meses_vencimento.includes(formatted)) {
        group.meses_vencimento.push(formatted);
      }
    }
  }

  const result: ClienteLoteVencimento[] = [];
  for (const group of groups.values()) {
    group.todos_em_bancada =
      group.total_extintores > 0 &&
      group.extintores_em_bancada.length === group.total_extintores;

    group.tem_vencido = group.status_geral === "vencido";
    group.tem_mes_atual = group.status_geral === "mes_atual";

    const countMap: Record<string, number> = {};
    for (const ext of group.extintores) {
      const model = ext.subtipo || ext.item_nome.replace(/^[^()]*\((.*)\)$/, "$1") || ext.item_nome;
      countMap[model] = (countMap[model] || 0) + 1;
    }
    group.modelos_agrupados = Object.entries(countMap).map(([modelo, count]) => ({
      modelo,
      count,
    }));
    result.push(group);
  }

  return result.sort((a, b) => {
    if (a.status_geral === "vencido" && b.status_geral !== "vencido") return -1;
    if (b.status_geral === "vencido" && a.status_geral !== "vencido") return 1;
    return b.extintores_disponiveis.length - a.extintores_disponiveis.length;
  });
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

  function extractPhone(clientObj: any): string | null {
    if (!clientObj) return null;
    let phone = clientObj.telefone || clientObj.telefone2 || null;
    if (clientObj.observacoes && clientObj.observacoes.includes("[EXTIN_META]")) {
      try {
        const meta = JSON.parse(clientObj.observacoes.match(/\[EXTIN_META\]([\s\S]*?)\[\/EXTIN_META\]/)?.[1] || "{}");
        if (meta.whatsapp) phone = meta.whatsapp;
      } catch {}
    }
    return phone;
  }

  // 1. Busca Extintores
  const { data: extintores } = await supabase
    .from("extintores")
    .select("id, client_id, identificacao, tipo_capacidade, localizacao, data_vencimento, status, client:client_id(id, razao_social, nome_fantasia, cpf_cnpj, endereco, telefone, telefone2, observacoes)");

  if (extintores && extintores.length > 0) {
    for (const e of extintores) {
      if (!e.data_vencimento) continue;
      const dueDate = new Date(e.data_vencimento + "T00:00:00");
      const diffTime = dueDate.getTime() - today.getTime();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: "vencido" | "mes_atual" | "proximo_mes" | "em_dia" = "em_dia";
      if (diasRestantes <= 0) {
        status = "vencido"; // Vence hoje (0) ou já venceu (< 0)
      } else if (dueDate <= endOfMonth) {
        status = "mes_atual";
      } else if (dueDate <= endOfNextMonth) {
        status = "proximo_mes";
      }

      // Vencimentos foca estritamente em itens vencidos ou a vencer no ciclo atual/próximo
      if (status === "em_dia") continue;

      allItems.push({
        id: e.id,
        extintor_id: e.id,
        cliente_id: e.client_id,
        cliente_nome: (e.client as any)?.razao_social || "Cliente",
        cliente_fantasia: (e.client as any)?.nome_fantasia || undefined,
        cliente_telefone: extractPhone(e.client),
        cliente_documento: (e.client as any)?.cpf_cnpj || undefined,
        cliente_endereco: (e.client as any)?.endereco || undefined,
        categoria: "Extintores",
        item_nome: `${e.identificacao} (${e.tipo_capacidade})`,
        subtipo: e.tipo_capacidade || "Extintor",
        localizacao: e.localizacao,
        data_vencimento: e.data_vencimento,
        status_alerta: status,
        dias_restantes: diasRestantes,
        extintor_status: e.status || "no_cliente",
      });
    }
  } else {
    // Fallback: extinguishers legado
    const { data: legExt } = await supabase
      .from("extinguishers")
      .select("id, client_id, patrimonio, tipo, capacidade, localizacao, expires_at, status, client:client_id(id, razao_social, telefone, telefone2, observacoes)")
      .is("deleted_at", null);

    if (legExt) {
      for (const e of legExt) {
        if (!e.expires_at) continue;
        const dueDate = new Date(e.expires_at + "T00:00:00");
        const diffTime = dueDate.getTime() - today.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: "vencido" | "mes_atual" | "proximo_mes" | "em_dia" = "em_dia";
        if (diasRestantes <= 0) {
          status = "vencido";
        } else if (dueDate <= endOfMonth) {
          status = "mes_atual";
        } else if (dueDate <= endOfNextMonth) {
          status = "proximo_mes";
        }

        if (status === "em_dia") continue;

        allItems.push({
          id: e.id,
          extintor_id: e.id,
          cliente_id: e.client_id,
          cliente_nome: (e.client as any)?.razao_social || "Cliente",
          cliente_telefone: extractPhone(e.client),
          categoria: "Extintores",
          item_nome: `${e.patrimonio || "Extintor"} (${e.tipo} ${e.capacidade})`,
          localizacao: e.localizacao,
          data_vencimento: e.expires_at,
          status_alerta: status,
          dias_restantes: diasRestantes,
          extintor_status: e.status || "no_cliente",
        });
      }
    }
  }

  // 2. Busca Mangueiras
  const { data: hoses } = await supabase
    .from("hoses")
    .select("id, client_id, tipo, comprimento, localizacao, next_test_at, client:client_id(id, razao_social, telefone, telefone2, observacoes)")
    .is("deleted_at", null);

  if (hoses) {
    for (const h of hoses) {
      if (!h.next_test_at) continue;
      const dueDate = new Date(h.next_test_at + "T00:00:00");
      const diffTime = dueDate.getTime() - today.getTime();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: "vencido" | "mes_atual" | "proximo_mes" | "em_dia" = "em_dia";
      if (diasRestantes <= 0) {
        status = "vencido";
      } else if (dueDate <= endOfMonth) {
        status = "mes_atual";
      } else if (dueDate <= endOfNextMonth) {
        status = "proximo_mes";
      }

      if (status === "em_dia") continue;

      allItems.push({
        id: h.id,
        cliente_id: h.client_id,
        cliente_nome: (h.client as any)?.razao_social || "Cliente",
        cliente_telefone: extractPhone(h.client),
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
    .select("id, razao_social, telefone, telefone2, observacoes, ppci_expires_at, ppci_number, ppci_isento")
    .is("deleted_at", null);

  if (clientsWithPpci) {
    for (const c of clientsWithPpci) {
      // Extrai data e enquadramento de colunas ou de observações [EXTIN_META]
      let dueDateStr = c.ppci_expires_at || null;
      let enquadramento = "PPCI";
      let ppciNumber = c.ppci_number || null;
      let isIsento = Boolean(c.ppci_isento);

      if (c.observacoes && c.observacoes.includes("[EXTIN_META]")) {
        try {
          const meta = JSON.parse(c.observacoes.match(/\[EXTIN_META\]([\s\S]*?)\[\/EXTIN_META\]/)?.[1] || "{}");
          if (!dueDateStr && meta.ppci_expires_at) dueDateStr = meta.ppci_expires_at;
          if (meta.ppci_enquadramento) enquadramento = meta.ppci_enquadramento;
          if (!ppciNumber && meta.ppci_number) ppciNumber = meta.ppci_number;
          if (meta.ppci_isento !== undefined) isIsento = meta.ppci_isento;
        } catch {}
      }

      if (isIsento || !dueDateStr) continue;

      const dueDate = new Date(dueDateStr + "T00:00:00");
      const diffTime = dueDate.getTime() - today.getTime();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: "vencido" | "mes_atual" | "proximo_mes" | "em_dia" = "em_dia";
      if (diasRestantes <= 0) {
        status = "vencido";
      } else if (dueDate <= endOfMonth) {
        status = "mes_atual";
      } else if (dueDate <= endOfNextMonth) {
        status = "proximo_mes";
      }

      if (status === "em_dia") continue;

      allItems.push({
        id: c.id,
        cliente_id: c.id,
        cliente_nome: c.razao_social,
        cliente_telefone: extractPhone(c),
        categoria: "PPCI",
        item_nome: `Alvará / ${enquadramento} nº ${ppciNumber || "S/N"}`,
        localizacao: "Edificação",
        data_vencimento: dueDateStr,
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
