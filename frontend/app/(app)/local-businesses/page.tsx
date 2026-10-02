import { Store } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { SectionHeader } from "@/components/home/section-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { IconTile } from "@/components/ui/icon-tile";
import { businessCategoryIcon } from "@/lib/category-icons";
import { loadLocalBusinesses } from "@/lib/data";
import { BUSINESS_CATEGORY_LABEL } from "@/lib/marketplace-labels";
import type { BusinessCategory, LocalBusiness } from "@/lib/types/local-business";

function groupByCategory(businesses: LocalBusiness[]): Map<BusinessCategory, LocalBusiness[]> {
  const map = new Map<BusinessCategory, LocalBusiness[]>();
  for (const biz of businesses) {
    const list = map.get(biz.category) ?? [];
    list.push(biz);
    map.set(biz.category, list);
  }
  return map;
}

const CATEGORY_ORDER: BusinessCategory[] = [
  "food",
  "home_services",
  "health",
  "education",
  "beauty",
  "other",
];

export default async function LocalBusinessesPage() {
  const businesses = await loadLocalBusinesses();
  const grouped = groupByCategory(businesses);

  return (
    <AppPage title="Local businesses">
      <p className="text-body text-ink-secondary">
        Opt-in directory near your society. These listings are not society notices.
      </p>
      {businesses.length === 0 ? (
        <EmptyState icon={<Store />} title="Directory coming soon" />
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.map((category) => {
            const items = grouped.get(category);
            if (!items?.length) return null;
            return (
              <section key={category} className="space-y-4">
                <SectionHeader title={BUSINESS_CATEGORY_LABEL[category]} />
                <GroupedList>
                  {items.map((biz) => {
                    const Icon = businessCategoryIcon(biz.category);
                    return (
                      <ListRow
                        key={biz.id}
                        href={`/local-businesses/${biz.id}`}
                        title={biz.name}
                        detail={`${biz.tagline}${biz.distanceLabel ? ` · ${biz.distanceLabel}` : ""}`}
                        leading={
                          <IconTile>
                            <Icon />
                          </IconTile>
                        }
                        trailing={
                          biz.listingType === "sponsored" ? <Badge>Listed</Badge> : undefined
                        }
                      />
                    );
                  })}
                </GroupedList>
              </section>
            );
          })}
        </div>
      )}
    </AppPage>
  );
}
