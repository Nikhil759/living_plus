import { NextResponse } from "next/server";
import { demoCreateEvent } from "@/lib/demo-store/events-write";
import { useDemoStore } from "@/lib/demo-store/config";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";
import type { DemoEventCreateInput } from "@/lib/demo-store/events-write";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!useDemoStore()) {
    return NextResponse.json({ code: "demo_disabled", message: "Demo store is off." }, { status: 404 });
  }
  const session = await getDemoSessionUser();
  if (!session) {
    return NextResponse.json({ code: "unauthorised", message: "Sign in required." }, { status: 401 });
  }

  let body: DemoEventCreateInput;
  try {
    body = (await request.json()) as DemoEventCreateInput;
  } catch {
    return NextResponse.json({ code: "validation_error", message: "Invalid JSON body." }, { status: 422 });
  }

  try {
    const event = demoCreateEvent(session.id, body);
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create event.";
    return NextResponse.json({ code: "validation_error", message }, { status: 422 });
  }
}
