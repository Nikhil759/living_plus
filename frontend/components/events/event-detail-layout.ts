/**
 * Shared by the detail screen and its skeleton so the loading state always matches.
 * Columns are explicit: auto-placement would pack the spanning sidebar into column 1.
 */
export const EVENT_DETAIL_GRID =
  "grid w-full items-start lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] lg:gap-x-8 xl:gap-x-12";

export const EVENT_DETAIL_HEADER = "space-y-4 lg:col-start-1 lg:row-start-1";

/** Spans both rows so it stays pinned while the left column scrolls. */
export const EVENT_DETAIL_ASIDE =
  "mt-6 w-full lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:sticky lg:top-[calc(4rem+env(safe-area-inset-top,0px))]";

export const EVENT_DETAIL_BODY = "mt-8 space-y-8 lg:col-start-1 lg:row-start-2";

export const EVENT_DETAIL_PAGE_PADDING = "max-md:pb-[calc(12.5rem+env(safe-area-inset-bottom,0px))]";
