import Link from "next/link";
import { Home } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { OpeningCard } from "@/components/openings/opening-card";
import { EmptyState } from "@/components/ui/empty-state";
import { loadFlatOpenings } from "@/lib/data";

export default async function FlatOpeningsPage() {
  const openings = await loadFlatOpenings();
  const active = openings.filter((o) => o.status === "active");
  const filled = openings.filter((o) => o.status === "filled");

  return (
    <AppPage title="Flat openings">
      <div className="flex items-end justify-between gap-4">
        <p className="text-body text-ink-secondary">
          Rooms, flatmates, and full flats posted by residents in your society.
        </p>
        <Link href="/flat-openings/new" className="text-callout font-semibold text-primary">
          Post
        </Link>
      </div>
      {active.length === 0 && filled.length === 0 ? (
        <EmptyState
          icon={<Home />}
          title="No openings listed"
          action={
            <Link href="/flat-openings/new" className="text-callout font-semibold text-primary">
              Post opening
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {active.map((opening) => (
              <OpeningCard key={opening.id} opening={opening} />
            ))}
          </div>
          {filled.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-headline text-ink-secondary">Recently filled</h2>
              {filled.map((opening) => (
                <OpeningCard key={opening.id} opening={opening} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </AppPage>
  );
}
