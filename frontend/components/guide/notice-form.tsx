"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createNoticeApi, updateDocumentApi, uploadNoticeApi } from "@/lib/api/guide-client";
import type { GuideDocumentDetail } from "@/lib/types/guide";

const field = "w-full rounded-tile border border-outline-variant/40 p-2.5 text-body";

/** Committee: add a notice (typed or uploaded .md/.pdf) or edit an existing document. */
export function NoticeForm({ existing }: { existing?: GuideDocumentDetail }) {
  const router = useRouter();
  const [mode, setMode] = useState<"write" | "upload">("write");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [effectiveDate, setEffectiveDate] = useState(existing?.effectiveDate ?? "");
  const [body, setBody] = useState(existing?.bodyMarkdown ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploading = !existing && mode === "upload";
  const ready = uploading ? file !== null : title.trim().length >= 3 && body.trim().length >= 10;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = existing
        ? await updateDocumentApi(existing.id, {
            title,
            body,
            effectiveDate,
            docType: existing.docType === "notice" ? "notice" : "other",
          })
        : uploading && file
          ? await uploadNoticeApi(file, title)
          : await createNoticeApi({ title, body, effectiveDate });
      router.push(`/guide/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
      {!existing ? (
        <div className="flex gap-2" role="tablist" aria-label="How to add the notice">
          {(["write", "upload"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={
                mode === m
                  ? "rounded-full bg-ink px-4 py-1.5 text-callout font-medium text-canvas"
                  : "rounded-full bg-quiet px-4 py-1.5 text-callout font-medium text-ink-secondary"
              }
            >
              {m === "write" ? "Write it" : "Upload a file"}
            </button>
          ))}
        </div>
      ) : null}
      <Card className="space-y-4 p-5">
        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">
            Title{uploading ? " (optional, taken from the file)" : ""}
          </span>
          <input
            className={field}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notice: Lift maintenance in Tower A"
            required={!uploading}
          />
        </label>
        {uploading ? (
          <label className="block space-y-1">
            <span className="text-callout font-medium text-ink">Markdown or PDF file (max 2 MB)</span>
            <input
              className={field}
              type="file"
              accept=".md,.markdown,.pdf,text/markdown,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-callout font-medium text-ink">Date</span>
              <input
                className={field}
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-callout font-medium text-ink">Text</span>
              <textarea
                className={`${field} font-mono text-callout`}
                rows={14}
                maxLength={50000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={"Lift 1 in Tower A will be shut on Friday from 10 AM to 1 PM.\n\n## Details\n- ..."}
                required
              />
              <span className="text-caption text-ink-tertiary">
                Markdown works: ## headings become sections Saarthi can cite.
              </span>
            </label>
          </>
        )}
      </Card>
      <p className="text-caption text-ink-tertiary">
        Saarthi can answer from it within a minute of saving.
      </p>
      {error ? <p className="text-callout text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy || !ready}>
        {existing ? "Save changes" : "Publish notice"}
      </Button>
    </form>
  );
}
