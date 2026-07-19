import { useState, useRef } from "react";
import {
  Video, Mic, MicOff, Play, X, Loader2, Download, CheckCircle,
  MonitorSpeaker, Camera, Type, Maximize2, ChevronDown, ChevronRight,
} from "lucide-react";
import type { PresentationDeck } from "@/lib/deckStore";
import {
  requestSystemAudio,
  recordDeckVideo,
  type VideoOptions,
  type VideoResult,
} from "@/lib/deckVideoRecorder";
import { downloadBlob } from "@/lib/deckExport";

// 50 MB threshold for large-file modal

type Step = "configure" | "audio" | "recording" | "done" | "error";

interface Props {
  deck: PresentationDeck;
  onClose: () => void;
  onSaveToGitHub?: (blob: Blob, filename: string) => Promise<void>;
}

export default function VideoExportModal({ deck, onClose, onSaveToGitHub }: Props) {
  const [step, setStep] = useState<Step>("configure");
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioGranted, setAudioGranted] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<VideoResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Options
  const [subtitleOverlay, setSubtitleOverlay] = useState(false);
  const [webcamPip, setWebcamPip] = useState(false);
  const [kenBurns, setKenBurns] = useState(true);
  const [introText, setIntroText] = useState("");
  const [outroText, setOutroText] = useState("");
  const [secondsPerSlide, setSecondsPerSlide] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const abortRef = useRef(false);

  const slideCount = deck.slides.length;
  const hasNarration = deck.slides.some((s) => s.narrationScript?.trim());
  const filename = `${deck.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.webm`;

  async function handleRequestAudio() {
    const stream = await requestSystemAudio();
    if (stream) {
      setAudioStream(stream);
      setAudioGranted(true);
    } else {
      setAudioGranted(false);
    }
  }

  async function handleStartRecording() {
    setStep("recording");
    setProgress(0);
    abortRef.current = false;

    const opts: VideoOptions = {
      subtitleOverlay,
      webcamPip,
      kenBurns,
      secondsPerSlide,
      introText: introText.trim() || undefined,
      outroText: outroText.trim() || undefined,
      onProgress: (pct, label) => {
        setProgress(pct);
        setProgressLabel(label);
      },
    };

    try {
      const res = await recordDeckVideo(deck, audioStream, opts);
      setResult(res);
      setStep("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  async function handleDownload() {
    if (!result) return;
    downloadBlob(result.blob, filename);
  }

  async function handleSaveGitHub() {
    if (!result || !onSaveToGitHub) return;
    setSaving(true);
    try {
      await onSaveToGitHub(result.blob, filename);
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadSrt() {
    if (!result) return;
    const blob = new Blob([result.srtText], { type: "text/plain" });
    downloadBlob(blob, filename.replace(".webm", ".srt"));
  }

  function handleDownloadVtt() {
    if (!result) return;
    const blob = new Blob([result.vttText], { type: "text/plain" });
    downloadBlob(blob, filename.replace(".webm", ".vtt"));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-indigo-400" />
            <h2 className="text-white font-semibold">Export Video</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* ── Configure ── */}
          {step === "configure" && (
            <>
              <div className="text-sm text-zinc-400">
                <span className="text-zinc-200 font-medium">{deck.title}</span> · {slideCount} slides
                {hasNarration && <span className="ml-2 text-emerald-400 text-xs">✓ Narration ready</span>}
              </div>

              {/* Basic options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={kenBurns} onChange={(e) => setKenBurns(e.target.checked)} className="accent-indigo-500 w-4 h-4" />
                  <div>
                    <span className="text-sm text-zinc-200 flex items-center gap-1.5"><Maximize2 size={13} className="text-indigo-400" /> Ken Burns zoom</span>
                    <span className="text-xs text-zinc-500">Subtle slow zoom adds depth to each slide</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={subtitleOverlay} onChange={(e) => setSubtitleOverlay(e.target.checked)} className="accent-indigo-500 w-4 h-4" />
                  <div>
                    <span className="text-sm text-zinc-200 flex items-center gap-1.5"><Type size={13} className="text-amber-400" /> Subtitle overlay</span>
                    <span className="text-xs text-zinc-500">Narration text shown at bottom of video</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={webcamPip} onChange={(e) => setWebcamPip(e.target.checked)} className="accent-indigo-500 w-4 h-4" />
                  <div>
                    <span className="text-sm text-zinc-200 flex items-center gap-1.5"><Camera size={13} className="text-emerald-400" /> Webcam picture-in-picture</span>
                    <span className="text-xs text-zinc-500">Your camera shown in the corner (optional)</span>
                  </div>
                </label>
              </div>

              {/* Advanced */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showAdvanced ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Advanced options
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-3 pl-4 border-l border-zinc-800">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Seconds per slide (fallback)</label>
                      <input
                        type="number"
                        min={2} max={30}
                        value={secondsPerSlide}
                        onChange={(e) => setSecondsPerSlide(Number(e.target.value))}
                        className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200"
                      />
                      <span className="ml-2 text-xs text-zinc-500">used when a slide has no narration</span>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Intro card text (optional)</label>
                      <input
                        type="text"
                        value={introText}
                        onChange={(e) => setIntroText(e.target.value)}
                        placeholder="e.g. Welcome to KnowHub"
                        className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Outro card text (optional)</label>
                      <input
                        type="text"
                        value={outroText}
                        onChange={(e) => setOutroText(e.target.value)}
                        placeholder="e.g. Thank you!"
                        className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep("audio")}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Play size={15} /> Next: Audio setup
              </button>
            </>
          )}

          {/* ── Audio step ── */}
          {step === "audio" && (
            <>
              <p className="text-sm text-zinc-300">
                KnowHub narrates slides using your browser's text-to-speech.
                To capture audio in the video, share a browser tab — the system will capture what's playing.
              </p>

              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <MonitorSpeaker size={15} className="text-indigo-400" /> Capture system audio (recommended)
                </div>
                <p className="text-xs text-zinc-400">
                  Click below → browser asks you to share a tab → choose any tab → KnowHub captures the audio automatically.
                  No quiet room required — audio plays and records in real time.
                </p>
                {audioGranted === null && (
                  <button
                    onClick={handleRequestAudio}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded transition-colors"
                  >
                    <Mic size={14} /> Request audio capture
                  </button>
                )}
                {audioGranted === true && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle size={14} /> Audio capture active
                  </div>
                )}
                {audioGranted === false && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                      <MicOff size={14} /> Permission denied or unsupported
                    </div>
                    <p className="text-xs text-zinc-500">Video will be generated silently. You can add audio later using a video editor.</p>
                    <button onClick={handleRequestAudio} className="text-xs text-indigo-400 hover:text-indigo-300">Retry</button>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep("configure")} className="flex-1 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-lg transition-colors">
                  Back
                </button>
                <button
                  onClick={handleStartRecording}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={14} /> Start recording
                </button>
              </div>
            </>
          )}

          {/* ── Recording ── */}
          {step === "recording" && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="text-indigo-400 animate-spin" />
                <div>
                  <p className="text-sm text-zinc-200 font-medium">Recording in progress…</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{progressLabel || "Starting…"}</p>
                </div>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500">{progress.toFixed(0)}% — do not close this window</p>
              {audioStream && (
                <p className="text-xs text-emerald-500">🔊 Audio is being captured — narration is playing now</p>
              )}
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">Video ready!</span>
                <span className="text-xs text-zinc-500 ml-auto">{(result.blob.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium transition-colors justify-center"
                >
                  <Download size={15} /> Download video (.webm)
                </button>

                {onSaveToGitHub && (
                  <button
                    onClick={handleSaveGitHub}
                    disabled={saving}
                    className="w-full flex items-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-sm rounded-lg transition-colors justify-center disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    {saving ? "Saving…" : "Save to GitHub"}
                  </button>
                )}

                <div className="flex gap-2">
                  <button onClick={handleDownloadSrt} className="flex-1 py-1.5 text-xs bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 rounded transition-colors">
                    Download .srt
                  </button>
                  <button onClick={handleDownloadVtt} className="flex-1 py-1.5 text-xs bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 rounded transition-colors">
                    Download .vtt
                  </button>
                </div>
              </div>

              {result.chapters.length > 0 && (
                <details className="text-xs">
                  <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300">Chapter markers ({result.chapters.length})</summary>
                  <div className="mt-2 space-y-1 pl-3">
                    {result.chapters.map((ch, i) => (
                      <div key={i} className="flex gap-3 text-zinc-400">
                        <span className="tabular-nums text-zinc-600">{ch.startSec.toFixed(1)}s</span>
                        <span>{ch.title}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* ── Error ── */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="text-red-400 text-sm">Recording failed: {errorMsg}</div>
              <div className="flex gap-2">
                <button onClick={() => { setStep("configure"); setErrorMsg(""); }} className="flex-1 py-2 text-sm border border-zinc-700 text-zinc-300 rounded-lg hover:border-zinc-500 transition-colors">
                  Try again
                </button>
                <button onClick={onClose} className="flex-1 py-2 text-sm bg-zinc-800 text-zinc-400 rounded-lg hover:text-zinc-200 transition-colors">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
