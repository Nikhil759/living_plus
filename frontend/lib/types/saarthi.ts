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
  chips: {
    label: string;
    href?: string | null;
    /** Tapping proposes this change on a confirmation card (e.g. book this slot). */
    action?: { tool: string; args: Record<string, unknown> } | null;
  }[];
}

export type ActionStatus =
  | "proposed"
  | "executed"
  | "pending_approval"
  | "cancelled"
  | "failed"
  | "expired";

/** A change Saarthi proposed; nothing happens until the resident confirms. */
export interface SaarthiAction {
  id: string;
  tool: string;
  title: string;
  lines: { label: string; value: string }[];
  warning: string | null;
  /** Who approves after confirming, e.g. "the Managing Committee". */
  approval: string | null;
  editHref: string | null;
  /** Only "Edit in form" is possible (e.g. a photo is needed). */
  draftOnly: boolean;
  confirmLabel: string;
  status: ActionStatus;
  result: { message: string; href: string | null } | null;
  error: string | null;
}

export interface ActionDecision {
  action: SaarthiAction;
  message: ChatMessage;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations: Citation[];
  cards: SaarthiCard[];
  action: SaarthiAction | null;
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
  | {
      event: "done";
      data: {
        messageId: string;
        citations: Citation[];
        cards: SaarthiCard[];
        action: SaarthiAction | null;
      };
    }
  | { event: "error"; data: { code: string; message: string } };

export type FillForm =
  | "event"
  | "listing"
  | "business"
  | "opening"
  | "issue"
  | "group"
  | "post"
  | "feedback";

export interface FillHint {
  kind: "me_too" | "price" | "clash" | "rule";
  text: string;
  href?: string | null;
  issueId?: string | null;
}

/** POST /v1/saarthi/fill: values keyed by the form's own field names. */
export interface FillResult {
  values: Record<string, unknown>;
  filled: string[];
  question: string | null;
  hints: FillHint[];
}
