import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, Phone } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { businessCategoryIcon } from "@/lib/category-icons";
import { loadLocalBusinessById } from "@/lib/data";
import { BUSINESS_CATEGORY_LABEL, whatsappHref } from "@/lib/marketplace-labels";

interface LocalBusinessDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LocalBusinessDetailPage({ params }: LocalBusinessDetailPageProps) {
  const { id } = await params;
  const biz = await loadLocalBusinessById(id);
  if (!biz) notFound();

  const mapsQuery = encodeURIComponent(biz.addressHint);
  const Icon = businessCategoryIcon(biz.category);

  return (
    <AppPage title="Business">
      <Link href="/local-businesses" className="text-callout font-semibold text-primary">
        Directory
      </Link>
      <Card className="mt-4 space-y-4">
        <div className="flex items-start gap-3">
          <IconTile>
            <Icon />
          </IconTile>
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-title text-ink">{biz.name}</h1>
            <p className="text-body text-ink-secondary">{biz.tagline}</p>
            <div className="flex flex-wrap gap-2">
              <Badge>{BUSINESS_CATEGORY_LABEL[biz.category]}</Badge>
              {biz.listingType === "sponsored" ? (
                <Badge>Listed business · not a society notice</Badge>
              ) : (
                <Badge>Community pick</Badge>
              )}
            </div>
          </div>
        </div>
        <p className="text-body text-ink-secondary">{biz.description}</p>
        <ul className="space-y-2 text-body text-ink-secondary">
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
            <span>
              {biz.addressHint}
              {biz.distanceLabel ? ` (${biz.distanceLabel})` : ""}
            </span>
          </li>
          {biz.hours ? (
            <li className="flex items-center gap-2">
              <Clock className="h-5 w-5 shrink-0 text-ink-tertiary" strokeWidth={1.5} aria-hidden="true" />
              {biz.hours}
            </li>
          ) : null}
        </ul>
        <div className="flex flex-wrap gap-2">
          {biz.whatsapp ? (
            <a
              href={whatsappHref(biz.whatsapp, `Hi, I found you on Living+ Local Businesses.`)}
              className={buttonVariants({ variant: "primary" })}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          ) : null}
          {biz.phone ? (
            <a href={`tel:${biz.phone}`} className={buttonVariants({ variant: "secondary" })}>
              <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              Call
            </a>
          ) : null}
          <a
            href={`https://maps.google.com/?q=${mapsQuery}`}
            className={buttonVariants({ variant: "secondary" })}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Maps
          </a>
        </div>
      </Card>
    </AppPage>
  );
}
