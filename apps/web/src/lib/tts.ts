// Browser Text-to-Speech wrapper using window.speechSynthesis.

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Strip markdown syntax down to readable plain text for TTS. */
export function markdownToSpeakable(md: string): string {
  return md
    // Remove mermaid blocks entirely (replaced by caller with a description)
    .replace(/```mermaid[\s\S]*?```/gi, " Diagram. ")
    // Remove other code blocks
    .replace(/```[\s\S]*?```/g, " Code block. ")
    // Remove inline code
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    // Links — keep text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Headings — keep text, add pause
    .replace(/^#{1,6}\s+(.+)$/gm, "$1. ")
    // Bold / italic
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, ". ")
    // Blockquotes
    .replace(/^>\s+/gm, "")
    // List bullets
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    // Collapse multiple whitespace
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function speak(text: string, rate = 1): void {
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = rate;
  window.speechSynthesis.speak(utt);
}

export function pauseTTS(): void {
  if (!isTTSSupported()) return;
  window.speechSynthesis.pause();
}

export function resumeTTS(): void {
  if (!isTTSSupported()) return;
  window.speechSynthesis.resume();
}

export function stopTTS(): void {
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return isTTSSupported() && window.speechSynthesis.speaking;
}

export function isPaused(): boolean {
  return isTTSSupported() && window.speechSynthesis.paused;
}
