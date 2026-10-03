import Link from "next/link";
import { AppPage } from "@/components/layout/app-page";
import { SectionHeader } from "@/components/home/section-header";
import { VendorRow } from "@/components/help-desk/vendor-row";
import { loadHelpDeskVendors } from "@/lib/data";
import { VENDOR_CATEGORY_LABEL, VENDOR_CATEGORY_ORDER } from "@/lib/help-desk-labels";
import type { HelpDeskVendor, VendorCategory } from "@/lib/types/help-desk";

function groupVendors(vendors: HelpDeskVendor[]): Map<VendorCategory, HelpDeskVendor[]> {
  const map = new Map<VendorCategory, HelpDeskVendor[]>();
  for (const vendor of vendors) {
    const list = map.get(vendor.category) ?? [];
    list.push(vendor);
    map.set(vendor.category, list);
  }
  return map;
}

export default async function HelpDeskDirectoryPage() {
  const vendors = await loadHelpDeskVendors();
  const grouped = groupVendors(vendors);

  return (
    <AppPage title="Vendor directory">
      <Link href="/help-desk" className="text-callout font-semibold text-primary">
        Help desk
      </Link>
      <p className="mt-3 text-body text-ink-secondary">
        Society-approved house help, electricians, plumbers, and other vendors.
      </p>
      <div className="space-y-8">
        {VENDOR_CATEGORY_ORDER.map((category) => {
          const items = grouped.get(category);
          if (!items?.length) return null;
          return (
            <section key={category} className="space-y-4">
              <SectionHeader title={VENDOR_CATEGORY_LABEL[category]} />
              <div className="space-y-2">
                {items.map((vendor) => (
                  <VendorRow key={vendor.id} vendor={vendor} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppPage>
  );
}
