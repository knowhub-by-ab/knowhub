// Browser Text-to-Speech wrapper using window.speechSynthesis.
// Provides a global player state with event-driven updates so components can subscribe.

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Strip markdown syntax down to readable plain text for TTS. */
export function markdownToSpeakable(md: string): string {
  return md
    .replace(/```mermaid[\s\S]*?```/gi, " Diagram. ")
    .replace(/```[\s\S]*?```/g, " Code block. ")
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+(.+)$/gm, "$1. ")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/^[-*_]{3,}\s*$/gm, ". ")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Global player state — shared across all components via subscription.
// ---------------------------------------------------------------------------

export interface TTSState {
  active: boolean;
  playing: boolean;
  paused: boolean;
  title: string;
  rate: number;
  voiceURI: string;
  /** Progress 0–1 (approximate, character-based). */
  progress: number;
  /** Full text being spoken. */
  text: string;
  /** Character offset of last boundary event. */
  charIndex: number;
}

const DEFAULT_STATE: TTSState = {
  active: false,
  playing: false,
  paused: false,
  title: "",
  rate: 1,
  voiceURI: "",
  progress: 0,
  text: "",
  charIndex: 0,
};

let _state: TTSState = { ...DEFAULT_STATE };
const _listeners = new Set<() => void>();
let _utt: SpeechSynthesisUtterance | null = null;

function notify() {
  _listeners.forEach((fn) => fn());
}

export function subscribeToTTS(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function getTTSState(): TTSState {
  return _state;
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isTTSSupported()) return [];
  return window.speechSynthesis.getVoices();
}

function update(patch: Partial<TTSState>) {
  _state = { ..._state, ...patch };
  notify();
}

// Poll-based progress update (Web Speech API boundary events are unreliable cross-browser)
let _poll: ReturnType<typeof setInterval> | null = null;

function startPoll() {
  if (_poll) return;
  _poll = setInterval(() => {
    if (!isTTSSupported()) return;
    const ss = window.speechSynthesis;
    const nowPlaying = ss.speaking && !ss.paused;
    const nowPaused = ss.paused;
    const nowStopped = !ss.speaking && !ss.paused;

    if (nowStopped && _state.active) {
      update({ active: false, playing: false, paused: false, progress: 1, charIndex: _state.text.length });
      stopPoll();
    } else {
      update({ playing: nowPlaying, paused: nowPaused });
    }
  }, 250);
}

function stopPoll() {
  if (_poll) { clearInterval(_poll); _poll = null; }
}

/**
 * Async voice loader: resolves immediately if voices are already available,
 * otherwise waits for the voiceschanged event (Android WebView loads them
 * asynchronously). Falls back to an empty array after 2 s so speech still
 * fires with the platform default voice.
 */
function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
    setTimeout(() => resolve([]), 2000);
  });
}

export function speak(text: string, opts?: { title?: string; rate?: number; voiceURI?: string }): void {
  if (!isTTSSupported()) {
    // Surface a clear error rather than silently doing nothing
    update({ active: false, playing: false, paused: false });
    console.warn("[TTS] speechSynthesis is not available on this device/browser.");
    return;
  }
  window.speechSynthesis.cancel();

  _utt = new SpeechSynthesisUtterance(text);
  _utt.rate = opts?.rate ?? _state.rate;

  // Resolve voices asynchronously so Android WebView (which loads them late)
  // still picks the right voice instead of silently falling back to nothing.
  const wantedURI = opts?.voiceURI ?? _state.voiceURI;
  getVoicesAsync().then((voices) => {
    if (!_utt) return; // speak() was cancelled before voices resolved
    const voice = voices.find((v) => v.voiceURI === wantedURI) ?? null;
    _utt.voice = voice; // null = platform default, which is fine
  });

  // Immediately proceed with speak() so there's no perceptible delay.
  // The voice property can be set before the utterance is dequeued.
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.voiceURI === wantedURI);
  if (voice) _utt.voice = voice;

  _utt.onboundary = (e) => {
    const charIndex = e.charIndex;
    const progress = text.length > 0 ? charIndex / text.length : 0;
    update({ charIndex, progress });
  };

  const thisUtt = _utt;
  _utt.onend = () => {
    if (_utt !== thisUtt) return; // A newer speak() already took over — ignore
    update({ active: false, playing: false, paused: false, progress: 1 });
    stopPoll();
  };

  _utt.onerror = () => {
    if (_utt !== thisUtt) return;
    update({ active: false, playing: false, paused: false });
    stopPoll();
  };

  update({
    active: true,
    playing: true,
    paused: false,
    title: opts?.title ?? "",
    rate: opts?.rate ?? _state.rate,
    voiceURI: opts?.voiceURI ?? _state.voiceURI,
    text,
    charIndex: 0,
    progress: 0,
  });

  window.speechSynthesis.speak(_utt);
  startPoll();
}

export function pauseTTS(): void {
  if (!isTTSSupported()) return;
  window.speechSynthesis.pause();
  update({ playing: false, paused: true });
}

export function resumeTTS(): void {
  if (!isTTSSupported()) return;
  window.speechSynthesis.resume();
  update({ playing: true, paused: false });
  startPoll();
}

export function stopTTS(): void {
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
  stopPoll();
  update({ ...DEFAULT_STATE });
}

export function setRate(rate: number): void {
  update({ rate });
  // Restart with new rate if currently speaking
  if (_state.active && _state.text) {
    const resumeText = _state.text.slice(_state.charIndex);
    speak(resumeText, { title: _state.title, rate, voiceURI: _state.voiceURI });
  }
}

export function setVoice(voiceURI: string): void {
  update({ voiceURI });
  if (_state.active && _state.text) {
    const resumeText = _state.text.slice(_state.charIndex);
    speak(resumeText, { title: _state.title, rate: _state.rate, voiceURI });
  }
}

export function rewind(seconds = 30): void {
  if (!_state.active || !_state.text) return;
  // Approximate: at ~130 words/min ~ 650 chars/min ~ 10.8 chars/sec
  const charsPerSec = 10.8 * _state.rate;
  const newIndex = Math.max(0, _state.charIndex - Math.round(seconds * charsPerSec));
  speak(_state.text.slice(newIndex), { title: _state.title, rate: _state.rate, voiceURI: _state.voiceURI });
}

export function fastForward(seconds = 30): void {
  if (!_state.active || !_state.text) return;
  const charsPerSec = 10.8 * _state.rate;
  const newIndex = Math.min(_state.text.length, _state.charIndex + Math.round(seconds * charsPerSec));
  if (newIndex >= _state.text.length) { stopTTS(); return; }
  speak(_state.text.slice(newIndex), { title: _state.title, rate: _state.rate, voiceURI: _state.voiceURI });
}

/** Export as MP3 — not natively possible in browsers via Web Speech API.
 * We use the MediaRecorder trick: record system audio is not available cross-origin.
 * Best we can do is show a message. */
export const canDownloadTTS = false;

// Legacy compatibility
export function isSpeaking(): boolean { return _state.playing; }
export function isPaused(): boolean { return _state.paused; }
