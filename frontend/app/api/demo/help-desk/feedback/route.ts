import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDemoDb } from "@/lib/demo-store/db";
import { useDemoStore } from "@/lib/demo-store/config";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";
import type { FeedbackTopic, HelpDeskFeedback } from "@/lib/types/help-desk";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!useDemoStore()) {
    return NextResponse.json({ code: "demo_disabled", message: "Demo store is off." }, { status: 404 });
  }
  const session = await getDemoSessionUser();
  if (!session) {
    return NextResponse.json({ code: "unauthorised", message: "Sign in required." }, { status: 401 });
  }
  const body = (await request.json()) as {
    topic?: FeedbackTopic;
    message?: string;
    anonymous?: boolean;
  };
  if (!body.message?.trim()) {
    return NextResponse.json({ code: "validation_error", message: "Message is required." }, { status: 422 });
  }
  const item: HelpDeskFeedback = {
    id: `fb-${randomUUID().slice(0, 8)}`,
    topic: body.topic ?? "suggestion",
    message: body.message.trim().slice(0, 500),
    anonymous: Boolean(body.anonymous),
    authorName: body.anonymous ? undefined : session.name,
    authorEmail: body.anonymous ? undefined : session.email ?? undefined,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const db = getDemoDb();
  db.prepare(
    `INSERT INTO demo_entity (collection, id, payload) VALUES (?, ?, ?)
     ON CONFLICT(collection, id) DO UPDATE SET payload = excluded.payload`,
  ).run("help_desk_feedback", item.id, JSON.stringify(item));
  return NextResponse.json(item, { status: 201 });
}
