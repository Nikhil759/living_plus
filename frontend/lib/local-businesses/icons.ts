import {
  faBrush,
  faBroom,
  faChalkboardUser,
  faDog,
  faSpa,
  faUtensils,
  faChildReaching,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import type { BusinessCategory } from "@/lib/types/local-business";

export const BUSINESS_CATEGORY_ICON: Record<BusinessCategory, IconDefinition> = {
  food: faUtensils,
  tuition: faChalkboardUser,
  childcare: faChildReaching,
  pet_care: faDog,
  art: faBrush,
  wellness: faSpa,
  home_services: faBroom,
};
