export type ChatRole = "user" | "assistant";
export type ChatFeedback = "up" | "down";

export interface ChatSessionSummary {
  id: string;
  title: string;
  lastMessageAt: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
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
  | { event: "done"; data: { messageId: string } }
  | { event: "error"; data: { code: string; message: string } };
