"use client";

import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
import { resolveApiUrl } from "@/lib/api/config";
import { createSseParser } from "@/lib/saarthi/sse";
import type {
  ActionDecision,
  ChatFeedback,
  ChatMessage,
  ChatSessionDetail,
  ChatSessionSummary,
  FillForm,
  FillResult,
  SaarthiEvent,
  TodaySummary,
} from "@/lib/types/saarthi";

/** Local dev without a Supabase session falls back to the backend's LOCAL_DEV_AUTH_EMAIL user. */
async function authHeaders(): Promise<Record<string, string>> {
  try {
    return { Authorization: `Bearer ${await getBrowserAccessToken()}` };
  } catch {
    return {};
  }
}

export async function listSessions(): Promise<ChatSessionSummary[]> {
  return apiGet("/v1/saarthi/sessions", { headers: await authHeaders() });
}

export async function getSession(id: string): Promise<ChatSessionDetail> {
  return apiGet(`/v1/saarthi/sessions/${encodeURIComponent(id)}`, { headers: await authHeaders() });
}

export async function deleteSession(id: string): Promise<void> {
  await apiDelete(`/v1/saarthi/sessions/${encodeURIComponent(id)}`, { headers: await authHeaders() });
}

export async function sendFeedback(
  messageId: string,
  rating: ChatFeedback,
  reason?: string,
): Promise<ChatMessage> {
  return apiPost(
    `/v1/saarthi/messages/${encodeURIComponent(messageId)}/feedback`,
    { rating, reason: reason?.trim() || undefined },
    { headers: await authHeaders() },
  );
}

/** A chip's change shown as a confirmation card in the chat (no model call). */
export async function proposeAction(
  sessionId: string,
  action: { tool: string; args: Record<string, unknown> },
): Promise<ChatMessage> {
  return apiPost("/v1/saarthi/actions/propose", { sessionId, ...action }, { headers: await authHeaders() });
}

export async function confirmAction(id: string): Promise<ActionDecision> {
  return apiPost(`/v1/saarthi/actions/${encodeURIComponent(id)}/confirm`, undefined, {
    headers: await authHeaders(),
  });
}

export async function cancelAction(id: string): Promise<ActionDecision> {
  return apiPost(`/v1/saarthi/actions/${encodeURIComponent(id)}/cancel`, undefined, {
    headers: await authHeaders(),
  });
}

/** The stored proposal behind a card, for prefilling a form ("Edit"). */
export async function getActionPayload(
  id: string,
): Promise<{ tool: string; payload: Record<string, unknown> }> {
  return apiGet(`/v1/saarthi/actions/${encodeURIComponent(id)}`, { headers: await authHeaders() });
}

/** Home "Today in your society", written by Saarthi (cached on the server for the day). */
export async function getToday(): Promise<TodaySummary> {
  return apiGet("/v1/saarthi/today", { headers: await authHeaders() });
}

/** Fill with Saarthi: one sentence in, form values out. Never submits anything. */
export async function fillForm(
  form: FillForm,
  text: string,
  current?: Record<string, unknown>,
  itemId?: string,
): Promise<FillResult> {
  return apiPost("/v1/saarthi/fill", { form, text, current, itemId }, { headers: await authHeaders() });
}

export interface StreamChatInput {
  message: string;
  sessionId?: string;
  page?: string;
  signal?: AbortSignal;
  onEvent: (event: SaarthiEvent) => void;
}

/** POSTs a message and feeds each server-sent event to `onEvent` until the stream ends. */
export async function streamChat({ message, sessionId, page, signal, onEvent }: StreamChatInput) {
  let response: Response;
  try {
    response = await fetch(resolveApiUrl("/v1/saarthi/chat"), {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify({ message, sessionId, page }),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError("Network error", 0, "network_error");
  }

  if (!response.ok || !response.body) {
    let body: { code?: string; message?: string } = {};
    try {
      body = await response.json();
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(body.message ?? response.statusText, response.status, body.code);
  }

  const parser = createSseParser((raw) => onEvent(raw as SaarthiEvent));
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true }));
  }
  parser.push(decoder.decode());
}
