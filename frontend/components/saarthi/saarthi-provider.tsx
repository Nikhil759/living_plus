"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@/lib/api/client";
import { getDataSource } from "@/lib/data/source";
import * as saarthiApi from "@/lib/saarthi/api";
import { stripCitationMarkers } from "@/lib/saarthi/citations";
import type { SaarthiState } from "@/components/saarthi/saarthi-avatar";
import type {
  ChatFeedback,
  ChatSessionSummary,
  ChatMessage,
  Citation,
  SaarthiAction,
  SaarthiCard,
  SaarthiEvent,
} from "@/lib/types/saarthi";

export const FRIENDLY_ERROR = "I couldn't reach the server just now. Try again?";

export interface UiMessage {
  /** Server id once saved; a local id while streaming. */
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "ok" | "error";
  feedback: ChatFeedback | null;
  saved: boolean;
  citations: Citation[];
  cards: SaarthiCard[];
  action: SaarthiAction | null;
}

interface SaarthiContextValue {
  enabled: boolean;
  isOpen: boolean;
  open: (ask?: string) => void;
  close: () => void;
  toggle: () => void;
  firstName: string;
  messages: UiMessage[];
  avatarState: SaarthiState;
  statusText: string | null;
  busy: boolean;
  announcement: string;
  send: (text: string) => void;
  retry: () => void;
  newChat: () => void;
  rate: (messageId: string, rating: ChatFeedback, reason?: string) => Promise<void>;
  decide: (actionId: string, choice: "confirm" | "cancel") => Promise<void>;
  sessions: ChatSessionSummary[] | null;
  sessionId: string | null;
  loadSessions: () => Promise<void>;
  openSession: (id: string) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
}

const SaarthiContext = createContext<SaarthiContextValue | null>(null);

export function useSaarthi(): SaarthiContextValue {
  const value = useContext(SaarthiContext);
  if (!value) throw new Error("useSaarthi must be used inside SaarthiProvider");
  return value;
}

let localIds = 0;
const localId = () => `local-${++localIds}`;

function errorMessage(error: unknown): string {
  // Limits and "unavailable" carry a friendly server message; anything else stays generic.
  if (error instanceof ApiError && (error.status === 429 || error.status === 503)) {
    return error.message;
  }
  return FRIENDLY_ERROR;
}

function toUiMessage(m: ChatMessage): UiMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    status: m.status,
    feedback: m.feedback,
    saved: true,
    citations: m.citations ?? [],
    cards: m.cards ?? [],
    action: m.action ?? null,
  };
}

export function SaarthiProvider({ residentName, children }: { residentName: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const enabled = getDataSource() === "api";
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [avatarState, setAvatarState] = useState<SaarthiState>("idle");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [sessions, setSessions] = useState<ChatSessionSummary[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const sessionRef = useRef<string | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const updateMessage = useCallback((id: string, patch: (m: UiMessage) => Partial<UiMessage>) => {
    setMessages((all) => all.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)));
  }, []);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || busyRef.current || !enabled) return;
      busyRef.current = true;
      const replyId = localId();
      setMessages((all) => [
        ...all,
        {
          id: localId(),
          role: "user",
          content: text,
          status: "ok",
          feedback: null,
          saved: true,
          citations: [],
          cards: [],
          action: null,
        },
        {
          id: replyId,
          role: "assistant",
          content: "",
          status: "streaming",
          feedback: null,
          saved: false,
          citations: [],
          cards: [],
          action: null,
        },
      ]);
      setBusy(true);
      setAvatarState("thinking");
      setStatusText("Thinking…");
      setAnnouncement("");
      const controller = new AbortController();
      abortRef.current = controller;
      let currentId = replyId;
      let settled = false;

      const finish = (state: SaarthiState) => {
        settled = true;
        busyRef.current = false;
        setBusy(false);
        setStatusText(null);
        setAvatarState(state);
        abortRef.current = null;
      };

      const onEvent = (event: SaarthiEvent) => {
        switch (event.event) {
          case "session":
            sessionRef.current = event.data.sessionId;
            setSessionId(event.data.sessionId);
            setSessions(null);
            break;
          case "status":
            setStatusText(event.data.text);
            setAvatarState("thinking");
            break;
          case "delta":
            setStatusText(null);
            setAvatarState("talking");
            updateMessage(currentId, (m) => ({ content: m.content + event.data.text }));
            break;
          case "reset":
            updateMessage(currentId, () => ({ content: "" }));
            break;
          case "done": {
            const { messageId: savedId, citations, cards, action } = event.data;
            setMessages((all) => {
              const reply = all.find((m) => m.id === currentId);
              if (reply) setAnnouncement(`Saarthi: ${stripCitationMarkers(reply.content)}`);
              return all.map((m) =>
                m.id === currentId
                  ? {
                      ...m,
                      id: savedId,
                      status: "ok",
                      saved: true,
                      citations: citations ?? [],
                      cards: cards ?? [],
                      action: action ?? null,
                    }
                  : m,
              );
            });
            currentId = savedId;
            finish("idle");
            break;
          }
          case "error":
            updateMessage(currentId, () => ({ content: event.data.message, status: "error" }));
            setAnnouncement(event.data.message);
            finish("idle");
            break;
        }
      };

      saarthiApi
        .streamChat({
          message: text,
          sessionId: sessionRef.current ?? undefined,
          page: pathRef.current,
          signal: controller.signal,
          onEvent,
        })
        .then(() => {
          if (settled) return;
          // A stream that ends without done/error (dropped connection) is still a failure.
          updateMessage(currentId, () => ({ content: FRIENDLY_ERROR, status: "error" }));
          setAnnouncement(FRIENDLY_ERROR);
          finish("idle");
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          const message = errorMessage(error);
          updateMessage(currentId, () => ({ content: message, status: "error" }));
          setAnnouncement(message);
          finish("idle");
        });
    },
    [enabled, updateMessage],
  );

  const retry = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    // Drop the failed reply and the question it answered; send re-adds the question.
    setMessages((all) => all.slice(0, Math.max(0, all.lastIndexOf(lastUser))));
    send(lastUser.content);
  }, [messages, send]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    busyRef.current = false;
    sessionRef.current = null;
    setSessionId(null);
    setMessages([]);
    setBusy(false);
    setStatusText(null);
    setAvatarState("idle");
  }, []);

  const rate = useCallback(
    async (messageId: string, rating: ChatFeedback, reason?: string) => {
      const previous = messages.find((m) => m.id === messageId)?.feedback ?? null;
      updateMessage(messageId, () => ({ feedback: rating }));
      try {
        await saarthiApi.sendFeedback(messageId, rating, reason);
      } catch {
        updateMessage(messageId, () => ({ feedback: previous }));
      }
    },
    [messages, updateMessage],
  );

  /** Confirm or cancel a card. Only Confirm changes anything, through the app's own services. */
  const decide = useCallback(
    async (actionId: string, choice: "confirm" | "cancel") => {
      let decision;
      try {
        decision =
          choice === "confirm"
            ? await saarthiApi.confirmAction(actionId)
            : await saarthiApi.cancelAction(actionId);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : FRIENDLY_ERROR;
        setAnnouncement(message);
        setMessages((all) => [
          ...all,
          {
            id: localId(),
            role: "assistant",
            content: message,
            status: "error",
            feedback: null,
            saved: false,
            citations: [],
            cards: [],
            action: null,
          },
        ]);
        return;
      }
      setMessages((all) => [
        ...all.map((m) => (m.action?.id === actionId ? { ...m, action: decision.action } : m)),
        toUiMessage(decision.message),
      ]);
      setAnnouncement(`Saarthi: ${decision.message.content}`);
      const succeeded = ["executed", "pending_approval"].includes(decision.action.status);
      if (succeeded) {
        setAvatarState("happy");
        setTimeout(() => setAvatarState((state) => (state === "happy" ? "idle" : state)), 3000);
        // The rest of the app reflects the change straight away.
        router.refresh();
      }
    },
    [router],
  );

  const loadSessions = useCallback(async () => {
    if (!enabled) return;
    try {
      setSessions(await saarthiApi.listSessions());
    } catch {
      setSessions([]);
    }
  }, [enabled]);

  const openSession = useCallback(
    async (id: string) => {
      const detail = await saarthiApi.getSession(id);
      reset();
      sessionRef.current = detail.id;
      setSessionId(detail.id);
      setMessages(
        detail.messages.map(toUiMessage),
      );
    },
    [reset],
  );

  const removeSession = useCallback(
    async (id: string) => {
      await saarthiApi.deleteSession(id);
      setSessions((all) => all?.filter((s) => s.id !== id) ?? null);
      if (sessionRef.current === id) reset();
    },
    [reset],
  );

  const open = useCallback(
    (ask?: string) => {
      setIsOpen(true);
      if (ask) {
        reset();
        // Let the reset land before sending into a fresh chat.
        setTimeout(() => send(ask), 0);
      }
    },
    [reset, send],
  );

  // /ask-aangan and older links land on ?saarthi=1(&q=...): open the panel, then tidy the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("saarthi") !== "1") return;
    const ask = params.get("q") ?? undefined;
    params.delete("saarthi");
    params.delete("q");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    open(ask);
  }, [open]);

  const value = useMemo<SaarthiContextValue>(
    () => ({
      enabled,
      isOpen,
      open,
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
      firstName: residentName.split(" ")[0] || "there",
      messages,
      avatarState,
      statusText,
      busy,
      announcement,
      send,
      retry,
      newChat: reset,
      rate,
      decide,
      sessions,
      sessionId,
      loadSessions,
      openSession,
      removeSession,
    }),
    [
      enabled,
      isOpen,
      open,
      residentName,
      messages,
      avatarState,
      statusText,
      busy,
      announcement,
      send,
      retry,
      reset,
      rate,
      decide,
      sessions,
      sessionId,
      loadSessions,
      openSession,
      removeSession,
    ],
  );

  return <SaarthiContext.Provider value={value}>{children}</SaarthiContext.Provider>;
}
