export type ChatRole = "user" | "assistant";
export type ChatFeedback = "up" | "down";

export interface ChatSessionSummary {
  id: string;
  title: string;
  lastMessageAt: string;
}

/** A society guide section Saarthi's reply relied on. */
export interface Citation {
  label: string;
  documentId: string;
  anchor: string;
  date: string | null;
}

export type SaarthiCardKind =
  | "event"
  | "slots"
  | "booking"
  | "amenity"
  | "issue"
  | "vendor"
  | "listing"
  | "business"
  | "opening"
  | "group"
  | "notice"
  | "post"
  | "person";

/** A live-data result under a reply, linking to the real page. */
export interface SaarthiCard {
  kind: SaarthiCardKind;
  title: string;
  subtitle?: string | null;
  detail?: string | null;
  badge?: string | null;
  href?: string | null;
  chips: { label: string; href?: string | null }[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations: Citation[];
  cards: SaarthiCard[];
  status: "ok" | "error";
  feedback: ChatFeedback | null;
  createdAt: string;
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: ChatMessage[];
}

/** Server-sent events from POST /v1/saarthi/chat. */
export type SaarthiEvent =
  | { event: "session"; data: { sessionId: string; title: string } }
  | { event: "status"; data: { text: string } }
  | { event: "delta"; data: { text: string } }
  | { event: "reset"; data: Record<string, never> }
  | { event: "done"; data: { messageId: string; citations: Citation[]; cards: SaarthiCard[] } }
  | { event: "error"; data: { code: string; message: string } };
