import { notFound, redirect } from "next/navigation";
import { AppPage } from "@/components/layout/app-page";
import { BusinessForm } from "@/components/local-businesses/business-form";
import { fetchSellerProfile } from "@/lib/api/marketplace";
import { loadLocalBusinessById } from "@/lib/data";

interface EditBusinessPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBusinessPage({ params }: EditBusinessPageProps) {
  const { id } = await params;
  const business = await loadLocalBusinessById(id);
  if (!business) notFound();
  // Only the owner edits; everyone else goes back to the profile.
  if (!business.canManage) redirect(`/local-businesses/${id}`);

  return (
    <AppPage title="Edit business" backHref={`/local-businesses/${id}`} backLabel="Business">
      <BusinessForm profile={await fetchSellerProfile()} business={business} />
    </AppPage>
  );
}
