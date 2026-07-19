import { THEMES } from "@/lib/deckExport";
import type { SlideTheme } from "@/lib/deckStore";

const THEME_KEYS = Object.keys(THEMES) as SlideTheme[];

const THEME_LABELS: Record<SlideTheme, string> = {
  "aurora-dark": "Aurora Dark",
  "corporate-blue": "Corporate Blue",
  "edu-warm": "Edu Warm",
  "minimal-white": "Minimal White",
  "tech-green": "Tech Green",
  "sunset-orange": "Sunset Orange",
  "ocean-teal": "Ocean Teal",
  "slate-pro": "Slate Pro",
};

interface Props {
  current: SlideTheme;
  onSelect: (theme: SlideTheme) => void;
  onClose: () => void;
}

export default function ThemeGallery({ current, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 rounded-xl shadow-2xl p-6 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Choose Theme</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEME_KEYS.map((key) => {
            const t = THEMES[key];
            const isSelected = key === current;
            return (
              <button
                key={key}
                onClick={() => { onSelect(key); onClose(); }}
                className={`rounded-lg overflow-hidden border-2 transition-all ${isSelected ? "border-indigo-500 shadow-lg shadow-indigo-500/30" : "border-transparent hover:border-zinc-500"}`}
              >
                {/* Mini slide preview */}
                <div style={{ backgroundColor: t.bg, aspectRatio: "16/9", position: "relative", padding: "8px 10px" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: t.accent }} />
                  <div style={{ fontSize: 9, fontWeight: 700, color: t.titleColor, marginBottom: 4 }}>
                    Slide Title
                  </div>
                  <div style={{ width: 20, height: 1.5, backgroundColor: t.accent, marginBottom: 4, borderRadius: 1 }} />
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ height: 3, backgroundColor: t.bodyColor, opacity: 0.6, borderRadius: 1, marginBottom: 2, width: `${70 - i * 10}%` }} />
                  ))}
                </div>
                <div style={{ backgroundColor: t.bg, padding: "4px 6px" }}>
                  <span style={{ fontSize: 10, color: t.bodyColor, fontFamily: t.font }}>{THEME_LABELS[key]}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
