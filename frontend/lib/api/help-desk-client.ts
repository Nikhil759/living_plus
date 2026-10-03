"use client";

import type { HelpDeskIssue } from "@/lib/types/help-desk";
import type { CreateIssueInput } from "@/lib/demo-store/help-desk-write";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? response.statusText);
  }
  return (await response.json()) as T;
}

export async function createIssueApi(input: CreateIssueInput): Promise<HelpDeskIssue> {
  const response = await fetch("/api/demo/help-desk/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function joinIssueApi(issueId: string): Promise<HelpDeskIssue> {
  const response = await fetch(`/api/demo/help-desk/issues/${encodeURIComponent(issueId)}/me-too`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  return parseJson(response);
}

export async function commentIssueApi(issueId: string, message: string): Promise<HelpDeskIssue> {
  const response = await fetch(
    `/api/demo/help-desk/issues/${encodeURIComponent(issueId)}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ message }),
    },
  );
  return parseJson(response);
}

export async function confirmIssueFixedApi(
  issueId: string,
  fixed: boolean,
  note?: string,
): Promise<HelpDeskIssue> {
  const response = await fetch(
    `/api/demo/help-desk/issues/${encodeURIComponent(issueId)}/confirmation`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ fixed, note }),
    },
  );
  return parseJson(response);
}

export async function submitFeedbackApi(body: {
  topic: string;
  message: string;
  anonymous: boolean;
}): Promise<void> {
  const response = await fetch("/api/demo/help-desk/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  await parseJson(response);
}
