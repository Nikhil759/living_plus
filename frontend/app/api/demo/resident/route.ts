import { NextResponse } from "next/server";
import { mergeSessionIntoResident, patchDemoResident } from "@/lib/demo-store/resident-write";
import { demoGetResidentForUser } from "@/lib/demo-store/readers";
import { getDemoSessionUser } from "@/lib/demo-store/session-user";
import { useDemoStore } from "@/lib/demo-store/config";
import type { ProfilePatch } from "@/lib/types/home";

export const runtime = "nodejs";

export async function GET() {
  if (!useDemoStore()) {
    return NextResponse.json({ code: "demo_disabled", message: "Demo store is off." }, { status: 404 });
  }
  const session = await getDemoSessionUser();
  if (!session) {
    return NextResponse.json({ code: "unauthorised", message: "Sign in required." }, { status: 401 });
  }
  const resident = mergeSessionIntoResident(demoGetResidentForUser(session.id), session);
  return NextResponse.json(resident);
}

export async function PATCH(request: Request) {
  if (!useDemoStore()) {
    return NextResponse.json({ code: "demo_disabled", message: "Demo store is off." }, { status: 404 });
  }
  const session = await getDemoSessionUser();
  if (!session) {
    return NextResponse.json({ code: "unauthorised", message: "Sign in required." }, { status: 401 });
  }

  let body: ProfilePatch;
  try {
    body = (await request.json()) as ProfilePatch;
  } catch {
    return NextResponse.json({ code: "validation_error", message: "Invalid JSON body." }, { status: 422 });
  }

  const updated = patchDemoResident(session.id, body);
  return NextResponse.json(mergeSessionIntoResident(updated, session));
}
