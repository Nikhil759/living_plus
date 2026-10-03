import { NextResponse } from "next/server";
import { demoJoinIssue } from "@/lib/demo-store/help-desk-write";
import { useDemoStore } from "@/lib/demo-store/config";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
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
  try {
    return NextResponse.json(demoJoinIssue(session.id, id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not join issue.";
    return NextResponse.json({ code: "validation_error", message }, { status: 422 });
  }
}
