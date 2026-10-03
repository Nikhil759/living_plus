export interface ContactLink {
  method: "whatsapp" | "call";
  url: string;
}

/**
 * Opens a WhatsApp or call link fetched on demand, so the other person's number is never in
 * the page. The tab opens inside the click itself, because popup blockers refuse it later.
 */
export async function openContactLink(
  method: ContactLink["method"],
  load: () => Promise<ContactLink>,
): Promise<void> {
  const tab = method === "whatsapp" ? window.open("", "_blank") : null;
  let link: ContactLink;
  try {
    link = await load();
  } catch (error) {
    tab?.close();
    throw error;
  }
  if (link.method === "call") window.location.href = link.url;
  else if (tab) tab.location.href = link.url;
  else window.location.assign(link.url);
}
