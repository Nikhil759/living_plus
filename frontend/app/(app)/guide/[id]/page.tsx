import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteDocumentButton } from "@/components/guide/delete-document-button";
import { GUIDE_TYPE_LABEL, guideDate } from "@/components/guide/guide-labels";
import { GuideReader } from "@/components/guide/guide-reader";
import { AppPage } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { isCommittee } from "@/lib/help-desk/access";
import { loadGuideDocument, loadResident } from "@/lib/data";

interface GuideDocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function GuideDocumentPage({ params }: GuideDocumentPageProps) {
  const { id } = await params;
  const [document, resident] = await Promise.all([loadGuideDocument(id), loadResident()]);
  if (!document) notFound();
  const meta = [GUIDE_TYPE_LABEL[document.docType], guideDate(document.effectiveDate), document.issuedBy]
    .filter(Boolean)
    .join(" · ");

  return (
    <AppPage title={document.title} backHref="/guide" backLabel="Society guide">
      <div className="mx-auto max-w-content space-y-6">
        <div className="space-y-2">
          <h1 className="text-title text-ink">{document.title}</h1>
          <p className="text-callout text-ink-tertiary">{meta}</p>
          {document.status !== "ready" ? (
            <p className="text-callout text-ink-secondary">
              {document.status === "failed"
                ? "Indexing failed. Save it again to retry."
                : "Indexing… Saarthi can answer from it in a moment."}
            </p>
          ) : null}
          {isCommittee(resident) ? (
            <div className="flex gap-2">
              <Link
                href={`/guide/${document.id}/edit`}
                className={buttonVariants({ size: "sm", variant: "secondary" })}
              >
                Edit
              </Link>
              <DeleteDocumentButton id={document.id} title={document.title} />
            </div>
          ) : null}
        </div>
        <GuideReader sections={document.sections} />
      </div>
    </AppPage>
  );
}
