import { resolveApiUrl } from "@/lib/api/config";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let code: string | undefined;
  let message = response.statusText;
  try {
    const body = (await response.json()) as { code?: string; message?: string };
    code = body.code;
    message = body.message ?? message;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(message, response.status, code);
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveApiUrl(path);
  const response = await fetch(url, {
    ...init,
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return (await response.json()) as T;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  const url = resolveApiUrl(path);
  const response = await fetch(url, {
    ...init,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return (await response.json()) as T;
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  const url = resolveApiUrl(path);
  const response = await fetch(url, {
    ...init,
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return (await response.json()) as T;
}

export async function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveApiUrl(path);
  const response = await fetch(url, {
    ...init,
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
