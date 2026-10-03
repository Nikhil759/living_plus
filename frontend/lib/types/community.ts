export type GroupVisibility = "public" | "private";

export interface CommunityGroup {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  description: string;
  visibility?: GroupVisibility;
  joined?: boolean;
  suggested?: boolean;
}

export interface WhatsappGroupEntry {
  id: string;
  name: string;
  memberCount: number;
  topic?: string;
  /** Invite link shown only after admin approval. */
  inviteLink?: string;
  pendingApproval?: boolean;
}

export interface VisibleNeighbour {
  id: string;
  firstName: string;
  tower: string;
  interests: string[];
  avatarUrl?: string;
}

export interface CommunityCatalog {
  groups: CommunityGroup[];
  whatsappGroups: WhatsappGroupEntry[];
  neighbours?: VisibleNeighbour[];
}
