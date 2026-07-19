// src/lib/deckVideoRecorder.ts
import type { Slide, PresentationDeck } from "./types";
import { THEMES } from "./deckExport";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface VideoOptions {
  width?: number;            // default 1280
  height?: number;           // default 720
  fps?: number;              // default 30
  secondsPerSlide?: number;  // fallback if no narration — default 5
  subtitleOverlay?: boolean;
  webcamPip?: boolean;
  kenBurns?: boolean;
  introText?: string;        // if set, renders a 3-second intro card
  outroText?: string;        // if set, renders a 3-second outro card
  onProgress?: (pct: number, label: string) => void;
}

export interface VideoResult {
  blob: Blob;
  mimeType: string;
  chapters: ChapterMarker[];
  srtText: string;
  vttText: string;
}

export interface ChapterMarker {
  slideIndex: number;
  title: string;
  startSec: number;
}

// --------------------------------------------------------------------------
// Audio capture
// --------------------------------------------------------------------------

export async function requestSystemAudio(): Promise<MediaStream | null> {
  try {
    // Chrome requires video:true in getDisplayMedia — we request minimal video
    // and immediately stop those tracks so only audio remains.
    const stream = await (navigator.mediaDevices as any).getDisplayMedia({
      video: { width: 1, height: 1, frameRate: 1 },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: 44100,
      },
    });
    // Stop video tracks — we only need audio
    stream.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());
    return stream;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// Slide renderer — draws a slide to a canvas
// --------------------------------------------------------------------------

function renderSlideToCanvas(
  ctx: CanvasRenderingContext2D,
  slide: Slide,
  deck: PresentationDeck,
  width: number,
  height: number,
  kenBurnsScale = 1.0,
  subtitleLine = ""
) {
  const theme = THEMES[deck.frontmatter.theme] ?? THEMES["aurora-dark"];
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // Accent sidebar
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 0, 6, height);

  // Ken Burns: slight zoom toward center
  if (kenBurnsScale > 1) {
    const ox = (width * (kenBurnsScale - 1)) / 2;
    const oy = (height * (kenBurnsScale - 1)) / 2;
    ctx.save();
    ctx.translate(-ox, -oy);
    ctx.scale(kenBurnsScale, kenBurnsScale);
  }

  // Title
  const isTitle = slide.type === "title";
  const isSection = slide.type === "section";

  const titleSize = isTitle ? Math.floor(height * 0.075) : Math.floor(height * 0.055);
  ctx.fillStyle = theme.titleColor;
  ctx.font = `bold ${titleSize}px ${deck.frontmatter.font ?? "Inter, system-ui, sans-serif"}`;
  ctx.textBaseline = "top";
  const titleY = isTitle || isSection ? height * 0.35 : height * 0.08;
  ctx.textAlign = isTitle || isSection ? "center" : "left";
  wrapText(ctx, slide.title, isTitle || isSection ? width / 2 : width * 0.07, titleY, isTitle || isSection ? width * 0.8 : width * 0.86, titleSize * 1.3, theme.titleColor);

  if (kenBurnsScale > 1) ctx.restore();

  // Bullets (content slides only)
  if (!isTitle && !isSection && slide.bullets?.length) {
    const bulletSize = Math.floor(height * 0.038);
    ctx.font = `${bulletSize}px ${deck.frontmatter.font ?? "Inter, system-ui, sans-serif"}`;
    ctx.textAlign = "left";
    let bulletY = height * 0.26;
    for (const bullet of slide.bullets.slice(0, 6)) {
      ctx.fillStyle = theme.accent;
      ctx.fillText("•", width * 0.07, bulletY);
      ctx.fillStyle = theme.bodyColor;
      wrapText(ctx, bullet, width * 0.1, bulletY, width * 0.82, bulletSize * 1.4, theme.bodyColor);
      bulletY += bulletSize * 2.2;
      if (bulletY > height * 0.85) break;
    }
  }

  // Slide image (if present and layout allows)
  // Images are skipped in video (external URLs may be CORS-blocked); only dataUrl images are drawn
  if (slide.image?.dataUrl && slide.image.layout !== "none") {
    const img = new Image();
    img.src = slide.image.dataUrl;
    // draw synchronously if already cached — otherwise skip
    try {
      if (img.complete) {
        const iw = width * 0.38;
        const ih = height * 0.55;
        ctx.drawImage(img, width * 0.58, height * 0.25, iw, ih);
      }
    } catch { /* ignore */ }
  }

  // Subtitle overlay (bottom bar)
  if (subtitleLine) {
    const subSize = Math.floor(height * 0.032);
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, height - subSize * 2.8, width, subSize * 2.8);
    ctx.fillStyle = "#ffffff";
    ctx.font = `${subSize}px ${deck.frontmatter.font ?? "Inter, system-ui, sans-serif"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(subtitleLine, width / 2, height - subSize * 1.4);
    ctx.textBaseline = "top";
  }

  // Slide number (bottom right)
  ctx.fillStyle = theme.bodyColor;
  ctx.font = `${Math.floor(height * 0.025)}px sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(`${(slide.order ?? 0) + 1}`, width - 20, height - 30);
  ctx.textAlign = "left";
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  color: string
): number {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  ctx.fillStyle = color;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, cy); cy += lineHeight; }
  return cy;
}

// --------------------------------------------------------------------------
// Text-to-speech promise wrapper
// --------------------------------------------------------------------------

function speakAndWait(
  text: string,
  deck: PresentationDeck,
  onWord?: (charIndex: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    if (!text.trim()) { resolve(); return; }
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = deck.frontmatter.speechRate ?? 1;
    utt.pitch = deck.frontmatter.speechPitch ?? 1;
    if (deck.frontmatter.voiceName) {
      const v = speechSynthesis.getVoices().find((v) => v.name === deck.frontmatter.voiceName);
      if (v) utt.voice = v;
    }
    utt.onboundary = (e) => { if (onWord && e.name === "word") onWord(e.charIndex); };
    utt.onend = () => resolve();
    utt.onerror = () => resolve();
    speechSynthesis.speak(utt);
  });
}

// --------------------------------------------------------------------------
// Intro / Outro card
// --------------------------------------------------------------------------

function renderTextCard(ctx: CanvasRenderingContext2D, text: string, width: number, height: number, bg: string, fg: string, accent: string) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 6, height);
  const sz = Math.floor(height * 0.065);
  ctx.font = `bold ${sz}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
}

// --------------------------------------------------------------------------
// SRT / VTT builders
// --------------------------------------------------------------------------

function secToTimecode(s: number, sep = ","): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(3).replace(".", sep === "," ? "," : ".");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${sec}`;
}

function buildSrt(chapters: ChapterMarker[], durations: number[]): string {
  return chapters.map((ch, i) => {
    const start = ch.startSec;
    const end = start + (durations[i] ?? 5);
    return `${i + 1}\n${secToTimecode(start, ",")} --> ${secToTimecode(end, ",")}\n${ch.title}\n`;
  }).join("\n");
}

function buildVtt(chapters: ChapterMarker[], durations: number[]): string {
  const cues = chapters.map((ch, i) => {
    const start = ch.startSec;
    const end = start + (durations[i] ?? 5);
    return `${secToTimecode(start, ".")} --> ${secToTimecode(end, ".")}\n${ch.title}`;
  }).join("\n\n");
  return `WEBVTT\n\n${cues}`;
}

// --------------------------------------------------------------------------
// Main recorder
// --------------------------------------------------------------------------

export async function recordDeckVideo(
  deck: PresentationDeck,
  audioStream: MediaStream | null,
  options: VideoOptions = {}
): Promise<VideoResult> {
  const {
    width = 1280,
    height = 720,
    fps = 30,
    secondsPerSlide = 5,
    subtitleOverlay = false,
    webcamPip = false,
    kenBurns = false,
    introText,
    outroText,
    onProgress,
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Webcam PiP
  let webcamStream: MediaStream | null = null;
  let webcamVideo: HTMLVideoElement | null = null;
  if (webcamPip) {
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      webcamVideo = document.createElement("video");
      webcamVideo.srcObject = webcamStream;
      webcamVideo.muted = true;
      await webcamVideo.play();
    } catch { webcamStream = null; }
  }

  // Set up MediaRecorder
  const canvasStream = canvas.captureStream(fps);
  const tracks = [...canvasStream.getTracks()];
  if (audioStream) {
    audioStream.getAudioTracks().forEach((t) => tracks.push(t));
  }
  const combinedStream = new MediaStream(tracks);

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";

  const recorder = new MediaRecorder(combinedStream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  recorder.start(200); // collect every 200 ms

  const slides = [...deck.slides].sort((a, b) => a.order - b.order);
  const chapters: ChapterMarker[] = [];
  const durations: number[] = [];
  let currentSec = 0;

  const theme = THEMES[deck.frontmatter.theme] ?? THEMES["aurora-dark"];
  const totalItems = slides.length + (introText ? 1 : 0) + (outroText ? 1 : 0);
  let itemsDone = 0;

  function drawFrame(slide: Slide | null, kenBurnsScale: number, subtitleLine: string, isCard: false): void;
  function drawFrame(slide: null, kenBurnsScale: number, subtitleLine: string, isCard: true, text: string): void;
  function drawFrame(slide: Slide | null, kenBurnsScale: number, subtitleLine: string, isCard: boolean, cardText?: string) {
    if (isCard && cardText !== undefined) {
      renderTextCard(ctx, cardText, width, height, theme.bg, theme.titleColor, theme.accent);
    } else if (slide) {
      renderSlideToCanvas(ctx, slide, deck, width, height, kenBurnsScale, subtitleLine);
    }
    // Webcam PiP overlay
    if (webcamVideo && webcamStream) {
      const pw = Math.floor(width * 0.22);
      const ph = Math.floor(pw * (9 / 16));
      ctx.save();
      ctx.beginPath();
      ctx.arc(width - pw - 16 + pw / 2, height - ph - 16 + ph / 2, Math.min(pw, ph) / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(webcamVideo, width - pw - 16, height - ph - 16, pw, ph);
      ctx.restore();
    }
  }

  // Draw at fps for durationMs
  async function renderDuration(
    slide: Slide | null,
    durationMs: number,
    narrationText: string,
    isCard = false,
    cardText?: string
  ) {
    const frames = Math.ceil((durationMs / 1000) * fps);
    const startScale = kenBurns ? 1.0 : 1.0;
    const endScale = kenBurns ? 1.04 : 1.0;

    let narrationActive = false;

    if (narrationText && !audioStream) {
      // Speak via TTS if no system audio captured (narration drives timing)
      narrationActive = true;
      const charMap = narrationText.split(" ");
      speakAndWait(narrationText, deck, (charIdx) => {
        const wordIdx = narrationText.slice(0, charIdx).split(" ").length - 1;
        void charMap[wordIdx];
      });
    }

    for (let f = 0; f < frames; f++) {
      const t = frames > 1 ? f / (frames - 1) : 0;
      const scale = startScale + (endScale - startScale) * t;
      const sub = subtitleOverlay && narrationText
        ? (isCard ? cardText ?? "" : narrationText.slice(0, 60))
        : "";
      if (isCard && cardText !== undefined) {
        (drawFrame as any)(null, scale, "", true, cardText);
      } else if (slide) {
        (drawFrame as any)(slide, scale, sub, false);
      }
      await new Promise<void>((r) => setTimeout(r, 1000 / fps));
    }

    if (narrationActive) {
      speechSynthesis.cancel();
    }
  }

  // Intro card
  if (introText) {
    onProgress?.(0, "Intro…");
    await renderDuration(null, 3000, "", true, introText);
    currentSec += 3;
    itemsDone++;
  }

  // Slides
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const narration = slide.narrationScript || slide.speakerNotes || slide.title;

    // Estimate duration from narration word count (avg 2.5 words/sec)
    const words = narration.trim().split(/\s+/).length;
    const rate = deck.frontmatter.speechRate ?? 1;
    const estSec = narration.trim() ? Math.max(secondsPerSlide, words / (2.5 * rate)) : secondsPerSlide;
    const durationMs = estSec * 1000;

    chapters.push({ slideIndex: i, title: slide.title, startSec: currentSec });
    durations.push(estSec);

    onProgress?.(
      ((itemsDone + 0.5) / totalItems) * 100,
      `Slide ${i + 1}/${slides.length}: ${slide.title.slice(0, 30)}`
    );

    // Speak narration (TTS plays through system, captured by getDisplayMedia if audio stream exists)
    if (narration.trim()) {
      const speakPromise = speakAndWait(narration, deck);
      await Promise.all([
        renderDuration(slide, durationMs, narration),
        speakPromise,
      ]);
    } else {
      await renderDuration(slide, durationMs, "");
    }

    currentSec += estSec;
    itemsDone++;
    onProgress?.((itemsDone / totalItems) * 100, `Slide ${i + 1} done`);
  }

  // Outro card
  if (outroText) {
    onProgress?.((itemsDone / totalItems) * 100, "Outro…");
    await renderDuration(null, 3000, "", true, outroText);
    currentSec += 3;
    itemsDone++;
  }

  // Stop recorder
  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    recorder.stop();
  });

  // Cleanup
  webcamStream?.getTracks().forEach((t) => t.stop());
  audioStream?.getTracks().forEach((t) => t.stop());
  speechSynthesis.cancel();

  onProgress?.(100, "Encoding complete");

  const blob = new Blob(chunks, { type: mimeType });
  return {
    blob,
    mimeType,
    chapters,
    srtText: buildSrt(chapters, durations),
    vttText: buildVtt(chapters, durations),
  };
}

// --------------------------------------------------------------------------
// GIF export — single slide
// --------------------------------------------------------------------------

export async function exportSlideGif(
  slide: Slide,
  deck: PresentationDeck,
  durationSec = 3
): Promise<Blob> {
  // GIF encoding via canvas frames — we produce a webm and return it
  // (true GIF encoding requires a library; we return webm for single slide)
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(15);
  const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  rec.start();
  const frames = durationSec * 15;
  for (let f = 0; f < frames; f++) {
    const scale = 1 + 0.04 * (f / frames);
    renderSlideToCanvas(ctx, slide, deck, 640, 360, scale, "");
    await new Promise<void>((r) => setTimeout(r, 1000 / 15));
  }
  await new Promise<void>((r) => { rec.onstop = () => r(); rec.stop(); });
  return new Blob(chunks, { type: "video/webm" });
}

// --------------------------------------------------------------------------
// Video thumbnail — renders a single slide to a PNG data URL
// --------------------------------------------------------------------------

export function renderSlideThumbnail(
  slide: Slide,
  deck: PresentationDeck,
  width = 1280,
  height = 720
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  renderSlideToCanvas(ctx, slide, deck, width, height, 1.0, "");
  return canvas.toDataURL("image/png");
}
