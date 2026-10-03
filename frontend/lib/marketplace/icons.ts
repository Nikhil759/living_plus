import {
  faBabyCarriage,
  faBasketball,
  faBookOpen,
  faCouch,
  faLaptop,
  faUtensils,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import type { ListingCategory } from "@/lib/types/marketplace";

export const LISTING_CATEGORY_ICON: Record<ListingCategory, IconDefinition> = {
  furniture: faCouch,
  electronics: faLaptop,
  kids: faBabyCarriage,
  books: faBookOpen,
  sports: faBasketball,
  home_kitchen: faUtensils,
};
