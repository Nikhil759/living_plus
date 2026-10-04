"use client";

import { apiPatch, apiPost } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
import { getDataSource } from "@/lib/data/source";
import type { CreateIssueInput } from "@/lib/demo-store/help-desk-write";
import type { HelpDeskIssue, HelpDeskIssueStatus } from "@/lib/types/help-desk";

/** `api` mode talks to FastAPI; static/demo modes use the local demo store routes. */
const live = () => getDataSource() === "api";

async function backendPost<T>(path: string, body?: unknown): Promise<T> {
  return apiPost<T>(path, body, {
    headers: { Authorization: `Bearer ${await getBrowserAccessToken()}` },
  });
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? response.statusText);
  }
  return (await response.json()) as T;
}

async function demoPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parseJson(response);
}

const issuePath = (issueId: string) => `/help-desk/issues/${encodeURIComponent(issueId)}`;

export async function createIssueApi(
  input: CreateIssueInput & { towerId?: string },
): Promise<HelpDeskIssue> {
  if (live()) {
    const { tower: _tower, photoUrls: _photos, ...body } = input;
    return backendPost("/v1/help-desk/issues", {
      ...body,
      areaLabel: body.areaLabel?.trim() || undefined,
    });
  }
  return demoPost("/api/demo/help-desk/issues", input);
}

export async function joinIssueApi(issueId: string): Promise<HelpDeskIssue> {
  if (live()) return backendPost(`/v1${issuePath(issueId)}/me-too`);
  return demoPost(`/api/demo${issuePath(issueId)}/me-too`);
}

export async function commentIssueApi(issueId: string, message: string): Promise<HelpDeskIssue> {
  if (live()) return backendPost(`/v1${issuePath(issueId)}/comments`, { message });
  return demoPost(`/api/demo${issuePath(issueId)}/comments`, { message });
}

export async function confirmIssueFixedApi(
  issueId: string,
  fixed: boolean,
  note?: string,
): Promise<HelpDeskIssue> {
  const body = { fixed, note: note?.trim() || undefined };
  if (live()) return backendPost(`/v1${issuePath(issueId)}/confirmation`, body);
  return demoPost(`/api/demo${issuePath(issueId)}/confirmation`, body);
}

/** Committee only (API mode). */
export async function updateIssueStatusApi(
  issueId: string,
  body: { status: HelpDeskIssueStatus; note?: string; vendorId?: string },
): Promise<HelpDeskIssue> {
  return apiPatch(
    `/v1${issuePath(issueId)}/status`,
    { ...body, note: body.note?.trim() || undefined, vendorId: body.vendorId || undefined },
    { headers: { Authorization: `Bearer ${await getBrowserAccessToken()}` } },
  );
}

export async function submitFeedbackApi(body: {
  topic: string;
  message: string;
  anonymous: boolean;
}): Promise<void> {
  if (live()) {
    await backendPost("/v1/help-desk/feedback", body);
    return;
  }
  await demoPost("/api/demo/help-desk/feedback", body);
}
