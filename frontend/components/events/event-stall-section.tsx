"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { applyStallApi, approveStallApi, rejectStallApi } from "@/lib/api/events-client";
import { buttonVariants } from "@/components/ui/button";
import { formatPriceInr } from "@/lib/format";
import type { HomeEvent, StallApplication } from "@/lib/types/home";

const inputClassName =
  "w-full rounded-tile border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-body text-ink outline-none ring-primary/30 focus:ring-2";

function stallStatusLabel(application: StallApplication): string {
  if (application.status === "pending") return "Pending review";
  if (application.status === "approved") {
    return application.spotNo ? `Approved · Spot ${application.spotNo}` : "Approved";
  }
  if (application.status === "paid") {
    return application.spotNo ? `Paid · Spot ${application.spotNo}` : "Paid";
  }
  return "Rejected";
}

function formatDeadline(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function EventStallSection({
  event,
  backend,
}: {
  event: HomeEvent;
  backend: "demo" | "api";
}) {
  const router = useRouter();
  const categories = event.stallCategories ?? [];
  const viewer = event.viewerStall;
  const canApply =
    backend === "api" &&
    event.status === "published" &&
    (!viewer || viewer.status === "rejected");
  const [stallType, setStallType] = useState(categories[0]?.name ?? "");
  const [description, setDescription] = useState("");
  const [spots, setSpots] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const applications = event.stallApplications ?? [];
  const canReview = Boolean(event.isCommittee && backend === "api");
  const showApplications = Boolean((event.isCommittee || event.isHost) && applications.length > 0);

  async function apply() {
    const cleaned = stallType.trim();
    if (cleaned.length < 2) {
      setError("Pick a stall type.");
      return;
    }
    setPending("apply");
    setError(null);
    try {
      await applyStallApi(event.id, { stallType: cleaned, description: description.trim() || undefined });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not apply for a stall.");
    } finally {
      setPending(null);
    }
  }

  async function approve(application: StallApplication) {
    const spot = (spots[application.id] ?? "").trim();
    if (!spot) {
      setError("Assign a stall spot before approving.");
      return;
    }
    setPending(application.id);
    setError(null);
    try {
      await approveStallApi(event.id, application.id, spot);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve this stall.");
    } finally {
      setPending(null);
    }
  }

  async function reject(application: StallApplication) {
    setPending(`${application.id}-reject`);
    setError(null);
    try {
      await rejectStallApi(event.id, application.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reject this stall.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section id="event-stalls" className="space-y-3 scroll-mt-24">
      <h2 className="text-caption font-semibold text-ink-secondary">Stalls</h2>
      <p className="text-body text-ink-secondary">
        {event.stallCount ? `${event.stallCount} stalls` : "Stalls"}
        {event.stallFeeInr ? ` · ${formatPriceInr(event.stallFeeInr)} after approval` : " · no fee"}
        {event.stallApplicationDeadline
          ? ` · apply by ${formatDeadline(event.stallApplicationDeadline)}`
          : ""}
      </p>
      {categories.length > 0 ? (
        <p className="text-caption text-ink-tertiary">
          {categories
            .map((item) => (item.limit ? `${item.name} (${item.limit})` : item.name))
            .join(" · ")}
        </p>
      ) : null}

      {viewer && viewer.status !== "rejected" ? (
        <div className="rounded-tile bg-quiet px-3 py-2.5">
          <p className="text-callout font-semibold text-ink">{viewer.stallType}</p>
          <p className="text-caption text-ink-secondary">{stallStatusLabel(viewer)}</p>
          {viewer.status === "approved" && viewer.feeInr > 0 ? (
            <p className="mt-1 text-caption text-ink-tertiary">
              Stall fee payment opens next. {formatPriceInr(viewer.feeInr)} is due after approval.
            </p>
          ) : null}
        </div>
      ) : null}

      {canApply ? (
        <div className="space-y-3">
          {categories.length > 0 ? (
            <label className="block space-y-1.5">
              <span className="text-caption font-medium text-ink-secondary">Stall type</span>
              <select
                className={inputClassName}
                value={stallType}
                onChange={(e) => setStallType(e.target.value)}
              >
                {categories.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.limit ? `${item.name} · ${item.limit} slots` : item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-caption font-medium text-ink-secondary">Stall type</span>
              <input
                className={inputClassName}
                maxLength={80}
                value={stallType}
                onChange={(e) => setStallType(e.target.value)}
                placeholder="Chaat"
              />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-caption font-medium text-ink-secondary">What will you sell?</span>
            <textarea
              className={`${inputClassName} min-h-20 resize-y`}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pani puri, dahi bhalla, and a sweet chaat."
            />
          </label>
          <button
            type="button"
            className={buttonVariants({ variant: "primary" })}
            disabled={pending !== null}
            onClick={() => void apply()}
          >
            {pending === "apply" ? "Sending…" : "Apply for a stall"}
          </button>
        </div>
      ) : null}

      {showApplications ? (
        <ul className="space-y-3">
          {applications.map((application) => (
            <li key={application.id} className="rounded-tile bg-quiet px-3 py-2.5 space-y-2">
              <p className="text-callout font-semibold text-ink">
                {application.applicantName} · {application.stallType}
              </p>
              <p className="text-caption text-ink-secondary">{stallStatusLabel(application)}</p>
              {application.description ? (
                <p className="text-caption text-ink-tertiary">{application.description}</p>
              ) : null}
              {canReview && application.status === "pending" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className={`${inputClassName} max-w-28`}
                    maxLength={20}
                    placeholder="Spot"
                    value={spots[application.id] ?? ""}
                    onChange={(e) => setSpots((current) => ({ ...current, [application.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className={buttonVariants({ variant: "primary", size: "sm" })}
                    disabled={pending !== null}
                    onClick={() => void approve(application)}
                  >
                    {pending === application.id ? "Saving…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                    disabled={pending !== null}
                    onClick={() => void reject(application)}
                  >
                    {pending === `${application.id}-reject` ? "Saving…" : "Reject"}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-caption text-error">{error}</p> : null}
    </section>
  );
}
