import type { CommunityCatalog, CommunityGroup, WhatsappGroupEntry } from "@/lib/types/community";
import type { HomeEvent, Resident } from "@/lib/types/home";

const GROUP_INTEREST_HINTS: Record<string, string[]> = {
  "g-fifa": ["fifa", "game", "board games"],
  "g-yoga": ["yoga", "meditation", "wellness"],
  "g-cyclists": ["cycling", "running", "walking"],
};

function residentFirstName(name: string): string {
  return name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

function interestBlob(interests: string[] | undefined): string {
  return (interests ?? []).join(" ").toLowerCase();
}

export function pickMyEvents(
  events: HomeEvent[],
  resident: Resident,
  limit = 4,
  options?: { rsvpEventIds?: string[] },
): HomeEvent[] {
  const first = residentFirstName(resident.name);
  const blob = interestBlob(resident.interests);
  const rsvpSet = new Set(options?.rsvpEventIds ?? []);

  const scored = events.map((event) => {
    let score = 0;
    const host = event.host.toLowerCase();
    if (rsvpSet.has(event.id)) score += 5;
    if (first && host.includes(first)) score += 3;
    if (event.going?.some((p) => p.id === resident.id || p.name.toLowerCase().includes(first))) {
      score += 2;
    }
    if (blob && blob.includes("fifa") && (host.includes("fifa") || event.title.toLowerCase().includes("fifa"))) {
      score += 2;
    }
    if (blob.includes("run") && event.glyph === "ride") score += 1;
    if (blob.includes("game") && event.glyph === "game") score += 1;
    return { event, score };
  });

  const matched = scored
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.event);

  if (matched.length > 0) {
    return matched.slice(0, limit);
  }

  return events.slice(0, Math.min(limit, 2));
}

export function pickMyGroups(
  catalog: CommunityCatalog,
  resident: Resident,
  limit = 4,
): CommunityGroup[] {
  const blob = interestBlob(resident.interests);
  const scored = catalog.groups.map((group) => {
    let score = 0;
    const hints = GROUP_INTEREST_HINTS[group.id] ?? [];
    for (const hint of hints) {
      if (blob.includes(hint)) score += 2;
    }
    const name = group.name.toLowerCase();
    if (blob.includes("fifa") && name.includes("fifa")) score += 2;
    if (blob.includes("yoga") && name.includes("yoga")) score += 2;
    if ((blob.includes("cycl") || blob.includes("run")) && name.includes("cycl")) score += 2;
    return { group, score };
  });

  const matched = scored
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.group);

  if (matched.length > 0) {
    return matched.slice(0, limit);
  }

  return catalog.groups.slice(0, Math.min(2, limit));
}

export function pickMyWhatsappGroups(
  catalog: CommunityCatalog,
  resident: Resident,
  limit = 2,
): WhatsappGroupEntry[] {
  const towerName = resident.tower.trim().toLowerCase();
  const towerMatch = catalog.whatsappGroups.filter((entry) =>
    entry.name.toLowerCase().includes(towerName),
  );
  if (towerMatch.length > 0) {
    return towerMatch.slice(0, limit);
  }
  return catalog.whatsappGroups.slice(0, limit);
}
