import {
  ArrowUpDown,
  Bug,
  Hammer,
  Shield,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
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

export function vendorCategoryIcon(category: VendorCategory): LucideIcon {
  return VENDOR_ICONS[category];
}
