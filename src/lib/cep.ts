/**
 * Utilitário de consulta de endereço por CEP
 * Utiliza ViaCEP como serviço primário e BrasilAPI como fallback automático.
 */

export interface AddressLookupResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
}

export async function fetchAddressByCep(cep: string): Promise<AddressLookupResult | null> {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) {
    return null;
  }

  // 1. Tentar ViaCEP
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (!data.erro) {
        return {
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: (data.uf || "").toUpperCase(),
          complement: data.complemento || "",
        };
      }
    }
  } catch (e) {
    // ViaCEP falhou ou timeout, seguir para fallback
  }

  // 2. Fallback para BrasilAPI
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.state) {
        return {
          street: data.street || "",
          neighborhood: data.neighborhood || "",
          city: data.city || "",
          state: (data.state || "").toUpperCase(),
        };
      }
    }
  } catch (e) {
    // Falha em ambos os serviços
  }

  return null;
}
