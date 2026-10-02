export interface CommunityGroup {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  description: string;
}

export interface WhatsappGroupEntry {
  id: string;
  name: string;
  memberCount: number;
}

export interface CommunityCatalog {
  groups: CommunityGroup[];
  whatsappGroups: WhatsappGroupEntry[];
}
