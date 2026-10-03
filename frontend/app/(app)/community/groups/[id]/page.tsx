import Link from "next/link";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { loadCommunity } from "@/lib/data";

interface GroupPageProps {
  params: Promise<{ id: string }>;
}

export default async function CommunityGroupPage({ params }: GroupPageProps) {
  const { id } = await params;
  const catalog = await loadCommunity();
  const group = catalog.groups.find((g) => g.id === id);
  if (!group) notFound();

  return (
    <AppPage title={group.name} backHref="/community" backLabel="Community">
      <div className="mx-auto max-w-content space-y-4">
        <p className="text-4xl" aria-hidden="true">
          {group.emoji}
        </p>
        <p className="text-body text-ink-secondary">{group.description}</p>
        <p className="text-callout text-ink-tertiary">
          {group.memberCount} members · {group.visibility ?? "public"} group
        </p>
        <Link href="/events" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Upcoming events
        </Link>
        <p className="text-caption text-ink-tertiary">
          Group feed, join requests and admin tools connect to the API in a later phase.
        </p>
      </div>
    </AppPage>
  );
}
