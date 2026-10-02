import Link from "next/link";
import { Home } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function NewFlatOpeningPage() {
  return (
    <AppPage title="Post an opening">
      <Card>
        <EmptyState
          icon={<Home />}
          title="Posting connects to the API next."
          action={
            <Link href="/flat-openings" className="text-callout font-semibold text-primary">
              Browse openings
            </Link>
          }
        />
      </Card>
    </AppPage>
  );
}
