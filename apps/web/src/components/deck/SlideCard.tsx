import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type { Slide, SlideType, DeckFrontmatter } from "@/lib/deckStore";
import SlidePreview from "./SlidePreview";
import ImagePanel from "./ImagePanel";
import NarrationEditor from "./NarrationEditor";

const SLIDE_TYPES: SlideType[] = ["title", "content", "section", "quiz", "closing"];

interface Props {
  slide: Slide;
  frontmatter: DeckFrontmatter;
  isSelected: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onSelect: () => void;
  onChange: (patch: Partial<Slide>) => void;
  onDelete: () => void;
  onAddAfter: () => void;
  onGenerateNarration?: () => Promise<void>;
  isGeneratingNarration?: boolean;
}

export default function SlideCard({
  slide,
  frontmatter,
  isSelected,
  dragHandleProps,
  onSelect,
  onChange,
  onDelete,
  onAddAfter,
  onGenerateNarration,
  isGeneratingNarration,
}: Props) {
  const [showImage, setShowImage] = useState(false);
  const [showNarration, setShowNarration] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  function handleBulletChange(idx: number, val: string) {
    const bullets = [...slide.bullets];
    bullets[idx] = val;
    onChange({ bullets });
  }

  function handleAddBullet() {
    onChange({ bullets: [...slide.bullets, ""] });
  }

  function handleRemoveBullet(idx: number) {
    onChange({ bullets: slide.bullets.filter((_, i) => i !== idx) });
  }

  return (
    <div
      className={`rounded-xl border transition-all ${
        isSelected
          ? "border-indigo-500 shadow-lg shadow-indigo-500/20"
          : "border-zinc-700 hover:border-zinc-500"
      } bg-zinc-900 overflow-hidden`}
      onClick={onSelect}
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border-b border-zinc-700">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300" onClick={(e) => e.stopPropagation()}>
          <GripVertical size={14} />
        </div>
        <select
          value={slide.type}
          onChange={(e) => onChange({ type: e.target.value as SlideType })}
          onClick={(e) => e.stopPropagation()}
          className="text-xs bg-zinc-700 border border-zinc-600 rounded px-2 py-0.5 text-zinc-300 capitalize"
        >
          {SLIDE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-xs text-zinc-500 flex-1">Slide {slide.order + 1}</span>
        <button onClick={(e) => { e.stopPropagation(); onAddAfter(); }} className="p-1 text-zinc-500 hover:text-green-400 transition-colors" title="Add slide after">
          <Plus size={13} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-zinc-500 hover:text-red-400 transition-colors" title="Delete slide">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Slide preview thumbnail */}
      <div className="p-3 pb-0">
        <SlidePreview slide={slide} theme={frontmatter.theme} accentColor={frontmatter.accentColor} titleColor={frontmatter.titleColor} bodyColor={frontmatter.bodyColor} backgroundColor={frontmatter.backgroundColor} font={frontmatter.font} logoUrl={frontmatter.logoUrl} logoCorner={frontmatter.logoCorner} className="w-full" />
      </div>

      {/* Edit fields (shown when selected) */}
      {isSelected && (
        <div className="p-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Title */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Title</label>
            <input
              type="text"
              value={slide.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Bullets */}
          {slide.type !== "title" && slide.type !== "section" && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Bullets</label>
              <div className="space-y-1.5">
                {slide.bullets.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={b}
                      onChange={(e) => handleBulletChange(i, e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                      placeholder="Bullet point…"
                    />
                    <button onClick={() => handleRemoveBullet(i)} className="text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddBullet}
                  disabled={slide.bullets.length >= 6}
                  className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 flex items-center gap-1"
                >
                  <Plus size={11} /> Add bullet
                </button>
              </div>
            </div>
          )}

          {/* Callout */}
          {slide.type !== "title" && slide.type !== "section" && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Key Insight / Callout</label>
              <input
                type="text"
                value={slide.callout ?? ""}
                onChange={(e) => onChange({ callout: e.target.value })}
                placeholder="A key stat, quote, or insight…"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Speaker notes (collapsible) */}
          <div>
            <button onClick={() => setShowNotes(!showNotes)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200">
              {showNotes ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              Speaker Notes
            </button>
            {showNotes && (
              <textarea
                value={slide.speakerNotes}
                onChange={(e) => onChange({ speakerNotes: e.target.value })}
                rows={3}
                placeholder="Detailed notes for the presenter…"
                className="w-full mt-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            )}
          </div>

          {/* Narration (collapsible) */}
          <div>
            <button onClick={() => setShowNarration(!showNarration)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200">
              {showNarration ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              Narration Script
            </button>
            {showNarration && (
              <div className="mt-1.5">
                <NarrationEditor
                  slide={slide}
                  tone={frontmatter.narrationTone}
                  voiceName={frontmatter.voiceName}
                  speechRate={frontmatter.speechRate}
                  speechPitch={frontmatter.speechPitch}
                  onScriptChange={(script) => onChange({ narrationScript: script })}
                  onGenerateSingle={onGenerateNarration}
                  isGenerating={isGeneratingNarration}
                />
              </div>
            )}
          </div>

          {/* Image (collapsible) */}
          <div>
            <button onClick={() => setShowImage(!showImage)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200">
              {showImage ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              Image
              {slide.image && <span className="ml-1 text-indigo-400">●</span>}
            </button>
            {showImage && (
              <div className="mt-1.5">
                <ImagePanel
                  image={slide.image}
                  imagePrompt={slide.imagePrompt}
                  imageStyle={slide.imageStyle ?? frontmatter.imageStyle}
                  onImageChange={(img) => onChange({ image: img })}
                  onPromptChange={(prompt) => onChange({ imagePrompt: prompt })}
                  onImageStyleChange={(style) => onChange({ imageStyle: style })}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
