import type { DigestItem } from "@/lib/types/home";

/** Fallback when API digest has items but no summary (older backend). */
export function digestSummaryFromItems(items: DigestItem[]): string {
  const snippets: string[] = [];
  for (const item of items.slice(0, 3)) {
    const body = item.body.trim();
    if (!body) continue;
    const clause = body.split(".")[0]?.trim().replace(/\.$/, "") ?? "";
    if (!clause) continue;
    snippets.push(clause.charAt(0).toLowerCase() + clause.slice(1));
  }
  if (snippets.length === 0) return "";
  if (snippets.length === 1) return `${snippets[0]}.`;
  if (snippets.length === 2) return `${snippets[0]}, and ${snippets[1]}.`;
  return `${snippets[0]}, ${snippets[1]}, and ${snippets[2]}.`;
}

export function resolveDigestSummary(digest: {
  summary?: string | null;
  items: DigestItem[];
}): string | undefined {
  const trimmed = digest.summary?.trim();
  if (trimmed) return trimmed;
  const built = digestSummaryFromItems(digest.items);
  return built || undefined;
}
