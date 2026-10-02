/** Curated interests for neighbour matching (aligned with seed / PRODUCT demo). */
export const PROFILE_INTEREST_OPTIONS = [
  "FIFA",
  "Cricket",
  "Running",
  "Cycling",
  "Gym",
  "Yoga",
  "Badminton",
  "Tennis",
  "Swimming",
  "Dance",
  "Cooking",
  "Books",
  "Dogs",
  "Cats",
  "Gardening",
  "Photography",
  "Music",
  "Board games",
  "Parenting",
  "Startups",
  "Investing",
  "Travel",
  "Movies",
  "Volunteering",
  "Art & crafts",
  "Meditation",
  "Pickleball",
  "Walking",
] as const;

export const PROFILE_INTEREST_MAX = 10;

export function normalizeInterestLabel(label: string): string {
  return label.trim();
}

/** Merge saved interests with catalog (keeps legacy/custom labels). */
export function interestCatalogForUser(selected: string[]): string[] {
  const set = new Set<string>(PROFILE_INTEREST_OPTIONS);
  for (const item of selected) {
    const trimmed = normalizeInterestLabel(item);
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
