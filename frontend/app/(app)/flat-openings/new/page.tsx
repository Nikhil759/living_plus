import { AppPage } from "@/components/layout/app-page";
import { OpeningForm } from "@/components/openings/opening-form";
import { ErrorState } from "@/components/ui/error-state";
import { fetchOpeningOptions } from "@/lib/api/openings";
import { marketplaceIsLive } from "@/lib/data";

export default async function NewFlatOpeningPage() {
  return (
    <AppPage title="Post an opening" backHref="/flat-openings" backLabel="Flat openings">
      {marketplaceIsLive() ? (
        <OpeningForm options={await fetchOpeningOptions()} />
      ) : (
        <ErrorState message="Posting an opening needs the live backend. Set NEXT_PUBLIC_DATA_SOURCE=api." />
      )}
    </AppPage>
  );
}
