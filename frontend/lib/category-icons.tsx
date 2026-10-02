import {
  ArrowUpDown,
  Bug,
  GraduationCap,
  Hammer,
  HeartPulse,
  Scissors,
  Shield,
  Sparkles,
  Store,
  UtensilsCrossed,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { BusinessCategory } from "@/lib/types/local-business";
import type { VendorCategory } from "@/lib/types/help-desk";

const VENDOR_ICONS: Record<VendorCategory, LucideIcon> = {
  housekeeping: Sparkles,
  electrical: Zap,
  plumbing: Wrench,
  lift: ArrowUpDown,
  security: Shield,
  carpentry: Hammer,
  pest_control: Bug,
  other: Wrench,
};

const BUSINESS_ICONS: Record<BusinessCategory, LucideIcon> = {
  food: UtensilsCrossed,
  home_services: Wrench,
  health: HeartPulse,
  education: GraduationCap,
  beauty: Scissors,
  other: Store,
};

export function vendorCategoryIcon(category: VendorCategory): LucideIcon {
  return VENDOR_ICONS[category];
}

export function businessCategoryIcon(category: BusinessCategory): LucideIcon {
  return BUSINESS_ICONS[category];
}
