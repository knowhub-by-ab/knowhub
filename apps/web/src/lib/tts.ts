// Browser Text-to-Speech wrapper. Uses native Android TTS (Capacitor plugin) when
// running inside the APK, browser speechSynthesis on web.
// Provides a global player state with event-driven updates so components can subscribe.
import { Capacitor } from "@capacitor/core";
import { getState } from "./store";

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isTTSSupported(): boolean {
  if (isNative()) return true;
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
let _puterAudio: HTMLAudioElement | null = null;

// ---------------------------------------------------------------------------
// Native Android TTS (Capacitor plugin — only used inside the APK)
// ---------------------------------------------------------------------------
let _nativeTimer: ReturnType<typeof setInterval> | null = null;
let _nativePauseElapsed = 0; // ms elapsed when paused, so resume can continue

function clearNativeTimer() {
  if (_nativeTimer) { clearInterval(_nativeTimer); _nativeTimer = null; }
}

// Returns the plugin module (throws if unavailable).
function getTTS() {
  return import("@capacitor-community/text-to-speech");
}

// Android TTS hard limit is 4000 chars. Split at sentence boundaries into ≤3800-char chunks.
function splitIntoChunks(text: string, maxLen = 3800): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    // Find last sentence boundary (. ! ?) before the limit
    let cut = remaining.lastIndexOf(". ", maxLen);
    if (cut < maxLen / 2) cut = remaining.lastIndexOf(" ", maxLen);
    if (cut < 1) cut = maxLen;
    else cut += 1; // include the period/space
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

// Speaks chunks sequentially using plugin.
async function speakChunks(chunks: string[], rate: number): Promise<void> {
  const { TextToSpeech } = await getTTS();
  for (const chunk of chunks) {
    if (!_nativeTimer) return; // stopped by user
    await TextToSpeech.speak({ text: chunk, lang: "en-US", rate, pitch: 1.0, volume: 1.0 });
  }
}

// Starts Android TTS + a progress timer that is the sole source of state updates.
// offsetMs: resume from a mid-point (elapsed ms already spoken).
function nativeSpeak(text: string, rate: number, offsetMs = 0): void {
  clearNativeTimer();
  _nativePauseElapsed = 0;

  const chunks = splitIntoChunks(text);

  getTTS()
    .then(({ TextToSpeech }) => {
      // Check language is installed; if not, open the system TTS installer.
      return TextToSpeech.isLanguageSupported({ lang: "en-US" }).then(({ supported }) => {
        if (!supported) {
          update({ title: "⚠️ Android TTS language not installed — opening installer…" });
          return TextToSpeech.openInstall();
        }
        return speakChunks(chunks, rate);
      });
    })
    .then(() => { if (_nativeTimer) { clearNativeTimer(); update({ ...DEFAULT_STATE }); } })
    .catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      update({ title: `TTS error: ${msg.slice(0, 80)}` });
    });

  // Timer: simulate progress. Starts from offsetMs so resumed speech tracks correctly.
  const estimatedMs = Math.max(4000, (text.length / 5 / (130 * rate)) * 60000);
  const startTime = Date.now() - offsetMs;
  _nativeTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / estimatedMs);
    const charIndex = Math.round(progress * text.length);
    update({ progress, charIndex });
    if (progress >= 1) { clearNativeTimer(); update({ ...DEFAULT_STATE }); }
  }, 500);
}

// Stops native TTS audio only. Does NOT touch state — caller is responsible.
function nativeStopAudio(): void {
  getTTS().then(({ TextToSpeech }) => TextToSpeech.stop()).catch(() => {});
}

// Fetch native TTS voices asynchronously (called once on mount by TTSPlayer).
export async function getNativeVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isNative()) return [];
  try {
    const { TextToSpeech } = await getTTS();
    const { voices } = await TextToSpeech.getSupportedVoices();
    return voices as unknown as SpeechSynthesisVoice[];
  } catch {
    return [];
  }
}

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
  if (isNative() || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

// ---------------------------------------------------------------------------
// Android media session (lock-screen / notification controls)
// ---------------------------------------------------------------------------

function setMediaSession(title: string) {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: title || "KnowHub",
    artist: "KnowHub",
    album: "Podcast",
    artwork: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  });
  navigator.mediaSession.setActionHandler("play", () => resumeTTS());
  navigator.mediaSession.setActionHandler("pause", () => pauseTTS());
  navigator.mediaSession.setActionHandler("stop", () => stopTTS());
  navigator.mediaSession.setActionHandler("seekbackward", () => rewind(30));
  navigator.mediaSession.setActionHandler("seekforward", () => fastForward(30));
}

function clearMediaSession() {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = null;
  (["play", "pause", "stop", "seekbackward", "seekforward"] as MediaSessionAction[]).forEach((a) => {
    try { navigator.mediaSession.setActionHandler(a, null); } catch { /* unsupported action */ }
  });
}

function updateMediaSessionState(state: "playing" | "paused" | "none") {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.playbackState = state;
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
    if (isNative() || !("speechSynthesis" in window)) return;
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
  if (isNative() || !("speechSynthesis" in window)) return Promise.resolve([]);
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
    setTimeout(() => resolve([]), 2000);
  });
}

export function speak(text: string, opts?: { title?: string; rate?: number; voiceURI?: string }): void {
  if (isNative()) {
    clearNativeTimer();
    nativeStopAudio();
    update({
      active: true, playing: true, paused: false,
      title: opts?.title ?? "", text, charIndex: 0, progress: 0,
      rate: opts?.rate ?? _state.rate, voiceURI: opts?.voiceURI ?? _state.voiceURI,
    });
    setMediaSession(opts?.title ?? "");
    updateMediaSessionState("playing");
    nativeSpeak(text, opts?.rate ?? _state.rate);
    return;
  }
  if (!isTTSSupported()) {
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

  setMediaSession(opts?.title ?? "");
  updateMediaSessionState("playing");
  window.speechSynthesis.speak(_utt);
  startPoll();
}

export function pauseTTS(): void {
  if (isNative()) {
    // Record how far we got so resume can continue from the same spot
    _nativePauseElapsed = Math.round(_state.progress * Math.max(4000, (_state.text.length / 5 / (130 * _state.rate)) * 60000));
    clearNativeTimer();
    nativeStopAudio();
    update({ playing: false, paused: true });
    updateMediaSessionState("paused");
    return;
  }
  if (_puterAudio) { _puterAudio.pause(); update({ playing: false, paused: true }); updateMediaSessionState("paused"); return; }
  if (!isTTSSupported()) return;
  window.speechSynthesis.pause();
  update({ playing: false, paused: true });
  updateMediaSessionState("paused");
}

export function resumeTTS(): void {
  if (isNative() && _state.paused && _state.text) {
    // Restart speech from the remaining text (Android TTS has no mid-utterance resume)
    const resumeText = _state.text.slice(_state.charIndex);
    update({ playing: true, paused: false });
    updateMediaSessionState("playing");
    nativeSpeak(resumeText.trim() || _state.text, _state.rate, _nativePauseElapsed);
    return;
  }
  if (isNative()) return;
  if (_puterAudio) { void _puterAudio.play(); update({ playing: true, paused: false }); updateMediaSessionState("playing"); return; }
  if (!isTTSSupported()) return;
  window.speechSynthesis.resume();
  update({ playing: true, paused: false });
  updateMediaSessionState("playing");
  startPoll();
}

export function stopTTS(): void {
  clearMediaSession();
  updateMediaSessionState("none");
  if (isNative()) { clearNativeTimer(); nativeStopAudio(); update({ ...DEFAULT_STATE }); return; }
  if (_puterAudio) {
    _puterAudio.pause();
    _puterAudio.src = "";
    _puterAudio = null;
    stopPoll();
    update({ ...DEFAULT_STATE });
    return;
  }
  if (!isTTSSupported()) { update({ ...DEFAULT_STATE }); return; }
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

export const canDownloadTTS = false;

// Legacy compatibility
export function isSpeaking(): boolean { return _state.playing; }
export function isPaused(): boolean { return _state.paused; }

/**
 * Call Puter TTS REST API directly with an API key (no puter.js SDK needed).
 * Returns an audio Blob. Works in any browser/WebView that supports fetch + audio.
 */
export async function puterTTSBlob(text: string, token: string): Promise<Blob> {
  const resp = await fetch("https://api.puter.com/drivers/call", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      interface: "puter-tts",
      method: "synthesize",
      args: { text },
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => resp.statusText);
    throw new Error(`Puter API ${resp.status}: ${errText}`);
  }
  return resp.blob();
}

/**
 * Play text via Puter TTS REST API (fallback for browsers without SpeechSynthesis).
 * Updates the shared TTS state so TTSPlayer shows controls.
 */
export async function speakViaPuter(text: string, opts?: { title?: string }): Promise<void> {
  const token = getState().puterApiToken;
  if (!token) {
    alert("Text-to-speech requires a Puter API token.\n\nGo to Settings → Puter and paste your free API token from puter.com → Account → API Keys.");
    return;
  }
  // Stop any existing playback
  stopTTS();
  update({ active: true, playing: false, paused: false, title: opts?.title ?? "", text, charIndex: 0, progress: 0 });
  try {
    const blob = await puterTTSBlob(text, token);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    _puterAudio = audio;
    audio.ontimeupdate = () => {
      const progress = audio.duration > 0 ? audio.currentTime / audio.duration : 0;
      update({ progress, playing: !audio.paused, paused: audio.paused });
    };
    audio.onended = () => {
      URL.revokeObjectURL(url);
      _puterAudio = null;
      update({ ...DEFAULT_STATE });
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      _puterAudio = null;
      update({ active: false, playing: false, paused: false });
      alert("Puter audio playback failed. Check your Puter API token in Settings.");
    };
    await audio.play();
    update({ active: true, playing: true, paused: false });
    setMediaSession(opts?.title ?? "");
    updateMediaSessionState("playing");
  } catch (err) {
    _puterAudio = null;
    update({ active: false, playing: false, paused: false });
    const msg = err instanceof Error ? err.message : String(err);
    alert(`Puter TTS failed: ${msg}\n\nCheck your Puter API token in Settings → Puter.`);
  }
}
