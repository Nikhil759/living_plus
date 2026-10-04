import type { AiUsageDay } from "@/lib/types/saarthi";

/** Rupees with paise for small amounts, whole rupees once it's over ₹100. */
export function formatInr(amount: number): string {
  if (amount === 0) return "₹0";
  if (amount < 1) return `₹${amount.toFixed(2)}`;
  if (amount < 100) return `₹${amount.toFixed(1)}`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatLatency(ms: number): string {
  if (ms === 0) return "–";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function formatPercent(ratio: number | null): string {
  return ratio === null ? "–" : `${Math.round(ratio * 100)}%`;
}

/** Bar heights (0–100) for the daily requests chart, relative to the busiest day. */
export function barHeights(days: AiUsageDay[]): number[] {
  const most = Math.max(0, ...days.map((d) => d.requests));
  return days.map((d) => (most === 0 ? 0 : Math.max(Math.round((d.requests / most) * 100), d.requests ? 4 : 0)));
}

export const PURPOSE_LABEL: Record<string, string> = {
  chat: "Chat",
  fill: "Fill with Saarthi",
  summary: "Home summary",
  embed: "Guide indexing",
  route: "Routing",
};
