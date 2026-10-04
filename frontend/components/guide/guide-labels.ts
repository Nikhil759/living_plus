import type { GuideDocType } from "@/lib/types/guide";

export const GUIDE_TYPE_LABEL: Record<GuideDocType, string> = {
  bylaws: "Handbook",
  minutes: "Meeting minutes",
  notice: "Notice",
  other: "Reference",
};

export function guideDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}
