const UNSPLASH_HOST = "images.unsplash.com";

/** Ask Unsplash for a source large enough for the on-screen crop (including 2x). */
export function sizedEventCoverUrl(url: string | undefined, minWidth: number): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== UNSPLASH_HOST) return url;
    const current = Number(parsed.searchParams.get("w") ?? 0);
    if (!Number.isFinite(current) || current < minWidth) {
      parsed.searchParams.set("w", String(minWidth));
    }
    parsed.searchParams.set("auto", "format");
    parsed.searchParams.set("fit", "crop");
    parsed.searchParams.set("q", parsed.searchParams.get("q") ?? "80");
    return parsed.toString();
  } catch {
    return url;
  }
}

export const EVENT_HERO_COVER_WIDTH = 2400;
export const EVENT_CARD_COVER_WIDTH = 960;
