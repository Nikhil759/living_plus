import { NextResponse } from "next/server";
import { demoConfirmIssueFixed } from "@/lib/demo-store/help-desk-write";
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
  const { fixed, note } = (await request.json()) as { fixed?: boolean; note?: string };
  try {
    return NextResponse.json(demoConfirmIssueFixed(session.id, id, Boolean(fixed), note));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update issue.";
    return NextResponse.json({ code: "validation_error", message }, { status: 422 });
  }
}
