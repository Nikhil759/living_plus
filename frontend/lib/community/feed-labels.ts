import type { FeedPostType } from "@/lib/types/home";

export const FEED_POST_TYPE_LABEL: Record<FeedPostType, string> = {
  general: "General",
  question: "Question",
  alert: "Alert",
  lost_found: "Lost & found",
  recommendation: "Recommendation",
};

export type FeedFilter = "all" | "my_groups" | "question" | "lost_found" | "recommendation";

export const FEED_FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "my_groups", label: "My groups" },
  { id: "question", label: "Questions" },
  { id: "lost_found", label: "Lost & found" },
  { id: "recommendation", label: "Recommendations" },
];
