import type { DigestItem } from "@/lib/types/home";
import { mockHomeData } from "@/lib/mock/home";

const extra: DigestItem[] = [
  {
    id: "dg-parking",
    emoji: "🅿️",
    lead: "Visitor parking:",
    body: "Basement B2 slots 12–18 reserved for Diwali Mela setup this weekend.",
  },
  {
    id: "dg-agm",
    emoji: "📋",
    lead: "AGM reminder:",
    body: "Annual general meeting on Sunday, 10:00 AM in the amphitheatre.",
  },
];

export function getAnnouncements(): DigestItem[] {
  const fromDigest = mockHomeData.digest?.items ?? [];
  return [...fromDigest, ...extra];
}
