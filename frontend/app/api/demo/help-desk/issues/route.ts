import { NextResponse } from "next/server";
import { demoCreateIssue } from "@/lib/demo-store/help-desk-write";
import { useDemoStore } from "@/lib/demo-store/config";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!useDemoStore()) {
    return NextResponse.json({ code: "demo_disabled", message: "Demo store is off." }, { status: 404 });
  }
  const session = await getDemoSessionUser();
  if (!session) {
    return NextResponse.json({ code: "unauthorised", message: "Sign in required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const issue = demoCreateIssue(session.id, body);
    return NextResponse.json(issue, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create issue.";
    return NextResponse.json({ code: "validation_error", message }, { status: 422 });
  }
}
