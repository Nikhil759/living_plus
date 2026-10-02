import { getApiBaseUrl } from "@/lib/api/config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return Response.json({ code: "unauthorised", message: "Missing access token." }, { status: 401 });
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return Response.json({ code: "validation_error", message: "Invalid body." }, { status: 400 });
  }

  const upstream = `${getApiBaseUrl()}/v1/invites/redeem`;

  try {
    const response = await fetch(upstream, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body,
      cache: "no-store",
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return Response.json(
      {
        code: "api_unavailable",
        message: "Could not reach the Living+ API. Check NEXT_PUBLIC_API_URL and that the backend is running.",
      },
      { status: 503 },
    );
  }
}
