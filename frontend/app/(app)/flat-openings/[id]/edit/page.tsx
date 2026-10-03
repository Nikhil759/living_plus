import { notFound, redirect } from "next/navigation";
import { AppPage } from "@/components/layout/app-page";
import { OpeningForm } from "@/components/openings/opening-form";
import { fetchOpeningOptions } from "@/lib/api/openings";
import { loadFlatOpeningById } from "@/lib/data";

interface EditFlatOpeningPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFlatOpeningPage({ params }: EditFlatOpeningPageProps) {
  const { id } = await params;
  const opening = await loadFlatOpeningById(id);
  if (!opening) notFound();
  // Only the poster edits, and a filled opening is closed for good.
  if (!opening.isMine || opening.state === "filled") redirect(`/flat-openings/${id}`);

  return (
    <AppPage title="Edit opening" backHref={`/flat-openings/${id}`} backLabel="Opening">
      <OpeningForm options={await fetchOpeningOptions()} opening={opening} />
    </AppPage>
  );
}
