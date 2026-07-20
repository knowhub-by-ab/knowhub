import { useState } from "react";
import { ChevronDown, ChevronUp, Palette } from "lucide-react";
import type { DeckFrontmatter, SlideTheme, AudienceLevel, NarrationTone, ImageStyle } from "@/lib/deckStore";
import ThemeGallery from "./ThemeGallery";

const LANGUAGES = [
  { code: "en", label: "English" }, { code: "es", label: "Spanish" },
  { code: "fr", label: "French" }, { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" }, { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" }, { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" }, { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
];

interface Props {
  frontmatter: DeckFrontmatter;
  onChange: (patch: Partial<DeckFrontmatter>) => void;
}

export default function FrontmatterPanel({ frontmatter, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [showThemes, setShowThemes] = useState(false);

  return (
    <>
      <div className="border border-zinc-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 text-zinc-200 text-sm font-medium hover:bg-zinc-750 transition-colors"
        >
          <span>Deck Settings</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {open && (
          <div className="p-4 space-y-4 bg-zinc-900">
            {/* Theme */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Theme</label>
              <button
                onClick={() => setShowThemes(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 hover:border-zinc-500 transition-colors"
              >
                <Palette size={14} />
                <span className="capitalize">{frontmatter.theme.replace(/-/g, " ")}</span>
              </button>
            </div>

            {/* Colours */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Colours</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Accent</label>
                  <input
                    type="color"
                    value={frontmatter.accentColor ?? "#6366f1"}
                    onChange={(e) => onChange({ accentColor: e.target.value })}
                    className="w-full h-8 rounded border border-zinc-700 cursor-pointer bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Title text</label>
                  <input
                    type="color"
                    value={frontmatter.titleColor ?? "#ffffff"}
                    onChange={(e) => onChange({ titleColor: e.target.value })}
                    className="w-full h-8 rounded border border-zinc-700 cursor-pointer bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Body text</label>
                  <input
                    type="color"
                    value={frontmatter.bodyColor ?? "#cccccc"}
                    onChange={(e) => onChange({ bodyColor: e.target.value })}
                    className="w-full h-8 rounded border border-zinc-700 cursor-pointer bg-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* Font */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Font</label>
              <select
                value={frontmatter.font ?? "Inter"}
                onChange={(e) => onChange({ font: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
              >
                {["Inter", "Arial", "Georgia", "Merriweather", "Courier New", "Trebuchet MS", "Verdana"].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Audience level */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Audience Level</label>
              <div className="flex gap-2">
                {(["beginner", "intermediate", "expert"] as AudienceLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => onChange({ audienceLevel: lvl })}
                    className={`flex-1 py-1.5 text-xs rounded capitalize border transition-colors ${
                      frontmatter.audienceLevel === lvl
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Slide count */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Target Slide Count</label>
              <input
                type="number"
                min={3}
                max={30}
                value={frontmatter.slideCount ?? 10}
                onChange={(e) => onChange({ slideCount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Language</label>
              <select
                value={frontmatter.language ?? "en"}
                onChange={(e) => onChange({ language: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Image style */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Image Style</label>
              <select
                value={frontmatter.imageStyle ?? "illustration"}
                onChange={(e) => onChange({ imageStyle: e.target.value as ImageStyle })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
              >
                {(["illustration", "photorealistic", "minimal", "flat-icon", "none"] as ImageStyle[]).map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>

            {/* Narration tone */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Narration Tone</label>
              <div className="flex gap-2">
                {(["formal", "conversational", "enthusiastic"] as NarrationTone[]).map((tone) => (
                  <button
                    key={tone}
                    onClick={() => onChange({ narrationTone: tone })}
                    className={`flex-1 py-1.5 text-xs rounded capitalize border transition-colors ${
                      frontmatter.narrationTone === tone
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showThemes && (
        <ThemeGallery
          current={frontmatter.theme}
          onSelect={(theme: SlideTheme) => onChange({ theme })}
          onClose={() => setShowThemes(false)}
        />
      )}
    </>
  );
}
