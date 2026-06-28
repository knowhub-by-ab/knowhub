export type HighlightColor = "yellow" | "green" | "blue" | "pink";

export interface Highlight {
  id: string;
  pageId: string;
  text: string;
  prefix: string;
  suffix: string;
  color: HighlightColor;
  createdAt: number;
}

export const HIGHLIGHT_CLASSES: Record<HighlightColor, string> = {
  yellow: "bg-yellow-300/40 text-yellow-100",
  green: "bg-emerald-400/30 text-emerald-100",
  blue: "bg-blue-400/30 text-blue-100",
  pink: "bg-pink-400/30 text-pink-100",
};

/** Apply saved highlights to rendered HTML by text-matching. */
export function applyHighlights(html: string, highlights: Highlight[], pageId: string): string {
  let result = html;
  for (const h of highlights) {
    if (h.pageId !== pageId) continue;
    const escaped = h.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const cls = HIGHLIGHT_CLASSES[h.color] ?? HIGHLIGHT_CLASSES.yellow;
    result = result.replace(
      new RegExp(escaped, "g"),
      `<mark class="${cls}" data-hid="${h.id}" style="border-radius:3px;padding:0 2px;">${h.text}</mark>`
    );
  }
  return result;
}

/** Build a Highlight from a Selection within a container element. */
export function selectionToHighlight(
  sel: Selection,
  container: HTMLElement,
  pageId: string,
  color: HighlightColor
): Highlight | null {
  const text = sel.toString().trim();
  if (!text || text.length > 500) return null;
  const range = sel.getRangeAt(0);
  const preRange = document.createRange();
  preRange.setStart(container, 0);
  preRange.setEnd(range.startContainer, range.startOffset);
  const prefix = preRange.toString().slice(-30);
  const postRange = document.createRange();
  postRange.setStart(range.endContainer, range.endOffset);
  postRange.setEnd(container, container.childNodes.length);
  const suffix = postRange.toString().slice(0, 30);
  return {
    id: crypto.randomUUID(),
    pageId,
    text,
    prefix,
    suffix,
    color,
    createdAt: Date.now(),
  };
}
