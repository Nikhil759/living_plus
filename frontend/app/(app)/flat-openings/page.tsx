import Link from "next/link";
import { AppPage } from "@/components/layout/app-page";
import { OpeningBrowse } from "@/components/openings/opening-browse";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { marketplaceIsLive } from "@/lib/data";

export default function FlatOpeningsPage() {
  return (
    <AppPage title="Flat openings">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-body text-ink-secondary">Rooms, flatmates and full flats from residents</p>
          <Link href="/flat-openings/new" className={buttonVariants()}>
            Post an opening
          </Link>
        </div>
        {marketplaceIsLive() ? (
          <OpeningBrowse />
        ) : (
          <ErrorState message="Flat openings need the live backend. Set NEXT_PUBLIC_DATA_SOURCE=api." />
        )}
      </div>
    </AppPage>
  );
}
