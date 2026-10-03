import { NextResponse } from "next/server";
import { demoAddIssueComment } from "@/lib/demo-store/help-desk-write";
import { useDemoStore } from "@/lib/demo-store/config";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!useDemoStore()) {
    return NextResponse.json({ code: "demo_disabled", message: "Demo store is off." }, { status: 404 });
  }
  const session = await getDemoSessionUser();
  if (!session) {
    return NextResponse.json({ code: "unauthorised", message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const { message } = (await request.json()) as { message?: string };
  if (!message?.trim()) {
    return NextResponse.json({ code: "validation_error", message: "Comment is required." }, { status: 422 });
  }
  try {
    return NextResponse.json(demoAddIssueComment(session.id, id, message));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not add comment.";
    return NextResponse.json({ code: "validation_error", message: msg }, { status: 422 });
  }
}
