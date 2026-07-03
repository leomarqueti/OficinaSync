import { toast } from "sonner";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiFetchOptions = RequestInit & {
  /** Corpo JSON — serializado e com Content-Type automático. */
  json?: unknown;
  /** Não dispara toast de erro automático (a tela trata o erro do seu jeito). */
  silent?: boolean;
};

/**
 * fetch com o padrão do app: injeta o Bearer token do localStorage,
 * serializa JSON, e transforma qualquer falha (rede ou HTTP) num toast
 * de erro amigável + ApiError lançado pra quem quiser tratar.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { json, silent, headers, ...rest } = options;

  const token = localStorage.getItem("token");

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let body = rest.body;

  if (json !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body,
    });
  } catch {
    const message = "Sem conexão com o servidor. Verifique sua internet.";
    if (!silent) toast.error(message);
    throw new ApiError(message, 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const backendMessage =
      payload && typeof payload.message === "string"
        ? payload.message
        : Array.isArray(payload?.message)
          ? payload.message[0]
          : null;

    const message =
      backendMessage ??
      (response.status === 401
        ? "Sessão expirada. Faça login novamente."
        : "Algo deu errado. Tente novamente.");

    if (!silent) toast.error(message);
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
