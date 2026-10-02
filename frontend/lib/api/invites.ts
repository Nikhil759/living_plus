import { apiPost } from "@/lib/api/client";

export type RedeemInviteResponse = {
  societyName: string;
  towerName: string;
  flatNo: string;
  role: string;
};

export async function redeemInvite(
  inviteCode: string,
  accessToken: string,
): Promise<RedeemInviteResponse> {
  return apiPost<RedeemInviteResponse>(
    "/v1/invites/redeem",
    { inviteCode: inviteCode.trim() },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}
