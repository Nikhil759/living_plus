export type GuideDocType = "bylaws" | "minutes" | "notice" | "other";
export type GuideDocStatus = "indexing" | "ready" | "failed";

export interface GuideDocument {
  id: string;
  title: string;
  docType: GuideDocType;
  source: "seed" | "committee";
  effectiveDate: string | null;
  issuedBy: string | null;
  status: GuideDocStatus;
  updatedAt: string;
}

export interface GuideSection {
  heading: string;
  /** 0 = text before any heading, 1 = document title, 2 = section, 3 = subsection. */
  level: number;
  anchor: string;
  markdown: string;
}

export interface GuideDocumentDetail extends GuideDocument {
  sections: GuideSection[];
  bodyMarkdown: string;
}
