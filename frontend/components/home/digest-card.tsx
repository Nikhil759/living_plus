import Link from "next/link";
import { ChevronRight, Droplets, Package, Sparkles } from "lucide-react";
import { TodaySummary } from "@/components/home/today-summary";
import { Card } from "@/components/ui/card";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";
import { resolveDigestSummary } from "@/lib/home/digest-summary";
import type { Digest, DigestItem } from "@/lib/types/home";

function noticeIcon(item: DigestItem) {
  const key = `${item.emoji} ${item.lead}`.toLowerCase();
  if (key.includes("water")) return <Droplets />;
  if (key.includes("mail") || key.includes("package")) return <Package />;
  return <Sparkles />;
}

export function DigestCard({ digest }: { digest: Digest }) {
  const items = digest.items.slice(0, 3);
  const summary = resolveDigestSummary(digest);

  return (
    <section className="space-y-4">
      <Card className="space-y-4">
        <TodaySummary fallback={summary} />
      </Card>

      {items.length > 0 ? (
        <GroupedList>
          {items.map((item) => (
            <ListRow
              key={item.id}
              href="/announcements"
              title={item.lead.replace(/:$/, "")}
              detail={item.body}
              leading={<IconTile>{noticeIcon(item)}</IconTile>}
            />
          ))}
        </GroupedList>
      ) : null}

      <Link
        href="/announcements"
        className="inline-flex items-center gap-0.5 text-callout font-semibold text-primary"
      >
        All notices
        <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </Link>
    </section>
  );
}
