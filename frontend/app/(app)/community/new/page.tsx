import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NewCommunityGroupPage() {
  return (
    <AppPage title="Start a group">
      <Link
        href="/community"
        className="inline-flex items-center gap-1 text-label-md text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Community
      </Link>
      <Card className="mt-4 space-y-3 p-5">
        <h2 className="text-headline-sm text-on-surface">Create an interest group</h2>
        <p className="text-body-md text-on-surface-variant">
          Group creation will connect to the API in a later sprint. Use this page to preview the
          flow from Home → “Start a group”.
        </p>
        <Link href="/home" className={buttonVariants({ variant: "soft", size: "md" })}>
          Back to Home
        </Link>
      </Card>
    </AppPage>
  );
}
