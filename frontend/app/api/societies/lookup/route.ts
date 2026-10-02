import { getApiBaseUrl } from "@/lib/api/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code || code.trim().length < 4) {
    return Response.json(
      { code: "validation_error", message: "Invite code is too short." },
      { status: 400 },
    );
  }

  const upstream = `${getApiBaseUrl()}/v1/societies/lookup?code=${encodeURIComponent(code.trim())}`;

  try {
    const response = await fetch(upstream, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await response.text();
    return new Response(body, {
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
