"use client";

import Link from "next/link";
import { useState } from "react";
import { FillWithSaarthi } from "@/components/saarthi/fill-with-saarthi";
import { Sparkle, useFilledFields } from "@/components/saarthi/sparkle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitFeedbackApi } from "@/lib/api/help-desk-client";
import { feedbackFill } from "@/lib/saarthi/fill-mapping";
import { FEEDBACK_TOPIC_LABEL } from "@/lib/help-desk-labels";
import type { FeedbackTopic } from "@/lib/types/help-desk";

export function FeedbackForm({ writeEnabled }: { writeEnabled: boolean }) {
  const [topic, setTopic] = useState<FeedbackTopic>("suggestion");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fills = useFilledFields();

  function applyFill(raw: Record<string, unknown>) {
    const fill = feedbackFill(raw);
    if (fill.topic !== undefined) setTopic(fill.topic as FeedbackTopic);
    if (fill.message !== undefined) setMessage(fill.message);
    if (fill.anonymous !== undefined) setAnonymous(fill.anonymous);
    fills.mark(fill);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!writeEnabled) return;
    setBusy(true);
    setError(null);
    try {
      await submitFeedbackApi({ topic, message, anonymous });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Card className="space-y-3 p-6">
        <p className="text-headline text-ink">Thanks — we got your feedback.</p>
        <Link href="/help-desk" className="text-callout font-semibold text-primary">
          Back to Help desk
        </Link>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-4">
      {writeEnabled ? <FillWithSaarthi form="feedback" onFill={applyFill} /> : null}
      <Card className="space-y-4 p-5">
        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">
            Topic
            <Sparkle show={fills.shows("topic", topic)} />
          </span>
          <select
            className="w-full rounded-tile border border-outline-variant/40 p-2.5 text-body"
            value={topic}
            onChange={(e) => setTopic(e.target.value as FeedbackTopic)}
          >
            {(Object.keys(FEEDBACK_TOPIC_LABEL) as FeedbackTopic[]).map((key) => (
              <option key={key} value={key}>
                {FEEDBACK_TOPIC_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-callout font-medium text-ink">
            Message
            <Sparkle show={fills.shows("message", message)} />
          </span>
          <textarea
            className="w-full rounded-tile border border-outline-variant/40 p-2.5 text-body"
            rows={5}
            maxLength={500}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-body">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          Send anonymously
          <Sparkle show={fills.shows("anonymous", anonymous)} />
        </label>
      </Card>
      {error ? <p className="text-callout text-destructive">{error}</p> : null}
      {!writeEnabled ? (
        <p className="text-caption text-ink-tertiary">Feedback submission uses the local demo store.</p>
      ) : null}
      <Button type="submit" disabled={busy || !writeEnabled || !message.trim()}>
        Send feedback
      </Button>
    </form>
  );
}
