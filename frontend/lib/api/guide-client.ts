"use client";

import { ApiError, apiDelete, apiPut } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
import { resolveApiUrl } from "@/lib/api/config";
import type { GuideDocumentDetail } from "@/lib/types/guide";

export interface NoticeInput {
  title: string;
  body: string;
  effectiveDate?: string;
}

async function authorised(path: string, init: RequestInit): Promise<GuideDocumentDetail> {
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers: { Authorization: `Bearer ${await getBrowserAccessToken()}`, ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
  if (!response.ok) throw new ApiError(body.message ?? response.statusText, response.status, body.code);
  return body as unknown as GuideDocumentDetail;
}

export async function createNoticeApi(input: NoticeInput): Promise<GuideDocumentDetail> {
  return authorised("/v1/guide/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, effectiveDate: input.effectiveDate || undefined }),
  });
}

export async function uploadNoticeApi(file: File, title?: string): Promise<GuideDocumentDetail> {
  const form = new FormData();
  form.append("file", file);
  if (title?.trim()) form.append("title", title.trim());
  return authorised("/v1/guide/documents/upload", { method: "POST", body: form });
}

export async function updateDocumentApi(
  id: string,
  input: NoticeInput & { docType: "notice" | "other" },
): Promise<GuideDocumentDetail> {
  return apiPut(
    `/v1/guide/documents/${encodeURIComponent(id)}`,
    { ...input, effectiveDate: input.effectiveDate || undefined },
    { headers: { Authorization: `Bearer ${await getBrowserAccessToken()}` } },
  );
}

export async function deleteDocumentApi(id: string): Promise<void> {
  await apiDelete(`/v1/guide/documents/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${await getBrowserAccessToken()}` },
  });
}
