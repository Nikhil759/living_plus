import { ListingPhoto } from "@/components/marketplace/listing-photo";
import { BUSINESS_CATEGORY_ICON } from "@/lib/local-businesses/icons";
import type { BusinessCategory } from "@/lib/types/local-business";

/** Business photos share the Marketplace tile: tinted background and icon until the image loads. */
export function BusinessPhoto({
  name,
  category,
  src,
  className,
  large,
}: {
  name: string;
  category: BusinessCategory;
  src?: string | null;
  className?: string;
  large?: boolean;
}) {
  return (
    <ListingPhoto
      title={name}
      icon={BUSINESS_CATEGORY_ICON[category]}
      src={src}
      className={className}
      large={large}
    />
  );
}
