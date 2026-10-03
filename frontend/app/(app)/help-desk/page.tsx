import Link from "next/link";
import {
  AlertCircle,
  MessageSquarePlus,
  Phone,
} from "lucide-react";
import { HelpDeskHub } from "@/components/help-desk/help-desk-hub";
import { AppPage } from "@/components/layout/app-page";
import { IconTile } from "@/components/ui/icon-tile";
import {
  helpDeskWriteEnabled,
  loadHelpDeskIssues,
  loadHelpDeskVendors,
  loadResident,
} from "@/lib/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const QUICK_ACTIONS = [
  {
    href: "/help-desk/report",
    label: "Report an issue",
    description: "Lift, water, security, amenities",
    icon: AlertCircle,
  },
  {
    href: "/help-desk/feedback",
    label: "Give feedback",
    description: "Suggestions for the committee and app",
    icon: MessageSquarePlus,
  },
  {
    href: "/help-desk/directory",
    label: "Vendor directory",
    description: "House help, electricians, plumbers",
    icon: Phone,
  },
] as const;

export default async function HelpDeskPage() {
  const [issues, vendors, resident] = await Promise.all([
    loadHelpDeskIssues(),
    loadHelpDeskVendors(),
    loadResident(),
  ]);
  const supabase = await createServerSupabaseClient();
  const email =
    supabase != null ? (await supabase.auth.getUser()).data.user?.email ?? null : null;
  const isCommittee = resident.roles.some((r) => /committee|admin|rep/i.test(r));

  return (
    <AppPage title="Help desk">
      <p className="text-body text-ink-secondary">
        Raise tickets for society issues, share feedback, and call approved vendors.
      </p>

      <ul className="grid gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex h-full flex-col gap-2 rounded-card bg-card p-5 shadow-card transition-[transform,box-shadow] duration-premium ease-premium motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hover"
            >
              <IconTile>
                <Icon />
              </IconTile>
              <p className="text-headline text-ink">{label}</p>
              <p className="text-callout text-ink-secondary">{description}</p>
            </Link>
          </li>
        ))}
      </ul>

      <HelpDeskHub
        issues={issues}
        vendors={vendors}
        resident={resident}
        viewerEmail={email}
        isCommittee={isCommittee}
      />
    </AppPage>
  );
}
