import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function NewMarketplaceListingPage() {
  return (
    <AppPage title="Sell an item">
      <Card>
        <EmptyState
          icon={<ShoppingBag />}
          title="Listing creation connects to the API next."
          action={
            <Link href="/marketplace" className="text-callout font-semibold text-primary">
              Browse listings
            </Link>
          }
        />
      </Card>
    </AppPage>
  );
}
