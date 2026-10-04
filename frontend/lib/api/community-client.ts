"use client";

import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { getBrowserAccessToken } from "@/lib/api/browser-auth";
import type {
  CommunityGroup,
  GroupVisibility,
  JoinRequest,
  WhatsappGroupEntry,
} from "@/lib/types/community";
import type { FeedPost, FeedPostType } from "@/lib/types/home";

async function auth(): Promise<RequestInit> {
  return { headers: { Authorization: `Bearer ${await getBrowserAccessToken()}` } };
}

const groupPath = (id: string) => `/v1/community/groups/${encodeURIComponent(id)}`;

export async function createPostApi(body: {
  body: string;
  postType: FeedPostType;
  groupId?: string;
}): Promise<FeedPost> {
  return apiPost("/v1/community/posts", body, await auth());
}

export async function createGroupApi(body: {
  name: string;
  emoji: string;
  description: string;
  visibility: GroupVisibility;
  tags: string[];
}): Promise<CommunityGroup> {
  return apiPost("/v1/community/groups", body, await auth());
}

export async function joinGroupApi(id: string): Promise<CommunityGroup> {
  return apiPost(`${groupPath(id)}/join`, undefined, await auth());
}

export async function leaveGroupApi(id: string): Promise<CommunityGroup> {
  return apiDelete(`${groupPath(id)}/membership`, await auth());
}

export async function requestWhatsappApi(id: string): Promise<WhatsappGroupEntry> {
  return apiPost(
    `/v1/community/whatsapp/${encodeURIComponent(id)}/request`,
    undefined,
    await auth(),
  );
}

export async function listJoinRequestsApi(): Promise<JoinRequest[]> {
  return apiGet("/v1/community/join-requests", await auth());
}

export async function decideJoinRequestApi(id: string, approve: boolean): Promise<void> {
  const action = approve ? "approve" : "reject";
  await apiPost(
    `/v1/community/join-requests/${encodeURIComponent(id)}/${action}`,
    undefined,
    await auth(),
  );
}
