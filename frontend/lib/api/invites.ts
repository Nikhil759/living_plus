import { ApiError } from "@/lib/api/client";

export type RedeemInviteResponse = {
  societyName: string;
  towerName: string;
  flatNo: string;
  role: string;
};

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let code: string | undefined;
  let message = response.statusText;
  try {
    const body = (await response.json()) as { code?: string; message?: string };
    code = body.code;
    message = body.message ?? message;
  } catch {
    /* non-JSON */
  }
  return new ApiError(message, response.status, code);
}

export async function redeemInvite(
  inviteCode: string,
  accessToken: string,
): Promise<RedeemInviteResponse> {
  const response = await fetch("/api/invites/redeem", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ inviteCode: inviteCode.trim() }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return (await response.json()) as RedeemInviteResponse;
}
