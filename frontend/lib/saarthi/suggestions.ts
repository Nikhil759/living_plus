/** Starter questions on Saarthi's empty screen, matched to the page the resident is on. */
const BY_SECTION: Array<[prefix: string, questions: string[]]> = [
  [
    "/amenities",
    [
      "When is a court free tonight?",
      "Is the pool open on Monday?",
      "Can my guests use the swimming pool?",
      "When is the gym least busy?",
    ],
  ],
  [
    "/events",
    [
      "What's happening this weekend?",
      "Can we use the hall until midnight?",
      "How much does it cost to book the community hall?",
      "When do Diwali Mela stall applications close?",
    ],
  ],
  [
    "/help-desk",
    [
      "What's the status of my lift complaint?",
      "Who do I call for a plumbing issue?",
      "When is water off in Tower B?",
      "How do I raise a complaint?",
    ],
  ],
  [
    "/marketplace",
    [
      "What's for sale this week?",
      "How do I sell something here?",
      "Are there any cycles for sale?",
      "What are the marketplace rules?",
    ],
  ],
  [
    "/community",
    [
      "Which groups match my interests?",
      "Who else plays football here?",
      "How do I join a WhatsApp group?",
      "What are people talking about?",
    ],
  ],
];

const DEFAULT_QUESTIONS = [
  "What's on today?",
  "What time can I shift luggage?",
  "Can I do renovation work on Sunday?",
  "When is maintenance due?",
];

export function suggestionsFor(pathname: string): string[] {
  const match = BY_SECTION.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match ? match[1] : DEFAULT_QUESTIONS;
}
