import { NextResponse } from "next/server";
import { demoRsvpEvent } from "@/lib/demo-store/events-write";
import { useDemoStore } from "@/lib/demo-store/config";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  if (!useDemoStore()) {
    return NextResponse.json({ code: "demo_disabled", message: "Demo store is off." }, { status: 404 });
  }
  const session = await getDemoSessionUser();
  if (!session) {
    return NextResponse.json({ code: "unauthorised", message: "Sign in required." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const event = demoRsvpEvent(session.id, id);
    return NextResponse.json(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not RSVP.";
    const status = message.includes("not found") ? 404 : message.includes("full") ? 409 : 422;
    const code =
      status === 404 ? "not_found" : status === 409 ? "capacity_full" : "validation_error";
    return NextResponse.json({ code, message }, { status });
  }
}
