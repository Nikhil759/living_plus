import { notFound } from "next/navigation";
import { NoticeForm } from "@/components/guide/notice-form";
import { AppPage } from "@/components/layout/app-page";
import { isCommittee } from "@/lib/help-desk/access";
import { loadGuideDocument, loadResident } from "@/lib/data";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGuideDocumentPage({ params }: EditPageProps) {
  const { id } = await params;
  const [document, resident] = await Promise.all([loadGuideDocument(id), loadResident()]);
  if (!document || !isCommittee(resident)) notFound();
  return (
    <AppPage title={`Edit: ${document.title}`} backHref={`/guide/${id}`} backLabel="Back">
      <NoticeForm existing={document} />
    </AppPage>
  );
}
