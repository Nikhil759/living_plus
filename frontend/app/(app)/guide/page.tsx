import Link from "next/link";
import { BookOpen, Megaphone } from "lucide-react";
import { GUIDE_TYPE_LABEL, guideDate } from "@/components/guide/guide-labels";
import { AppPage } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";
import { isCommittee } from "@/lib/help-desk/access";
import { loadGuideDocuments, loadResident } from "@/lib/data";
import type { GuideDocument } from "@/lib/types/guide";

function DocumentRows({ documents }: { documents: GuideDocument[] }) {
  return (
    <GroupedList>
      {documents.map((doc) => (
        <ListRow
          key={doc.id}
          href={`/guide/${doc.id}`}
          title={doc.title}
          detail={[GUIDE_TYPE_LABEL[doc.docType], guideDate(doc.effectiveDate)]
            .filter(Boolean)
            .join(" · ")}
          leading={
            <IconTile tone="quiet">{doc.docType === "notice" ? <Megaphone /> : <BookOpen />}</IconTile>
          }
          trailing={doc.status !== "ready" ? <Badge dot="amber">{doc.status === "failed" ? "Failed" : "Indexing…"}</Badge> : undefined}
        />
      ))}
    </GroupedList>
  );
}

export default async function GuidePage() {
  const [documents, resident] = await Promise.all([loadGuideDocuments(), loadResident()]);
  const rules = documents.filter((d) => d.docType !== "notice");
  const notices = documents.filter((d) => d.docType === "notice");

  return (
    <AppPage title="Society guide">
      <div className="mx-auto max-w-content space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body text-ink-secondary">
            Rules, meeting minutes and notices. Saarthi answers from these and cites them.
          </p>
          {isCommittee(resident) ? (
            <Link href="/guide/new" className={buttonVariants({ size: "sm" })}>
              Add notice
            </Link>
          ) : null}
        </div>
        {documents.length === 0 ? (
          <EmptyState icon={<BookOpen />} title="The society guide needs the live backend." />
        ) : null}
        {rules.length ? (
          <section className="space-y-2">
            <h2 className="text-headline text-ink">Rules and minutes</h2>
            <DocumentRows documents={rules} />
          </section>
        ) : null}
        {notices.length ? (
          <section className="space-y-2">
            <h2 className="text-headline text-ink">Notices</h2>
            <DocumentRows documents={notices} />
          </section>
        ) : null}
      </div>
    </AppPage>
  );
}
