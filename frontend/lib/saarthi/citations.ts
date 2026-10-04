const MARKER = String.raw`\[\d+(?:\s*,\s*\d+)*\]`;
// One marker or a run like "[1], [2]" or "[1][2]", with the space before it.
const MARKER_RUN = new RegExp(String.raw`\s?${MARKER}(?:\s*,?\s*${MARKER})*`, "g");

/** Saarthi cites guide passages as [1] or [2, 3]; the chips below the reply replace them. */
export function stripCitationMarkers(text: string): string {
  return text.replace(MARKER_RUN, "");
}
