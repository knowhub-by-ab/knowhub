import { useState, useRef } from "react";
import { Image, Search, Upload, X, Loader2 } from "lucide-react";
import type { SlideImage, ImageSource, ImageStyle } from "@/lib/types";
import type { ImageLayout } from "@/lib/deckImages";
import {
  fetchPollinationsImage,
  searchSvgRepo,
  searchOpenClipart,
  localFileToDataUrl,
  isImageFileTooLarge,
  LOCAL_IMAGE_WARN_BYTES,
} from "@/lib/deckImages";

const LAYOUT_OPTIONS: { value: ImageLayout; label: string }[] = [
  { value: "none", label: "None" },
  { value: "right-half", label: "Right Half" },
  { value: "left-half", label: "Left Half" },
  { value: "full-background", label: "Full Background" },
  { value: "top-banner", label: "Top Banner" },
  { value: "inline-below-title", label: "Below Title" },
  { value: "bottom-strip", label: "Bottom Strip" },
];

interface Props {
  image?: SlideImage;
  imagePrompt: string;
  imageStyle: ImageStyle;
  onImageChange: (img: SlideImage | undefined) => void;
  onPromptChange: (prompt: string) => void;
  onImageStyleChange?: (style: ImageStyle) => void;
}

export default function ImagePanel({ image, imagePrompt, imageStyle, onImageChange, onPromptChange, onImageStyleChange }: Props) {
  const [activeSource, setActiveSource] = useState<ImageSource>(image?.source ?? "pollinations");
  const [searchResults, setSearchResults] = useState<{ url: string; title?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const currentLayout: ImageLayout = image?.layout ?? "right-half";

  async function handleFetch() {
    if (!imagePrompt.trim()) return;
    setLoading(true);
    setError("");
    setSearchResults([]);
    try {
      if (activeSource === "pollinations") {
        const result = await fetchPollinationsImage(imagePrompt, 800, 450, imageStyle, image?.imageRatio);
        // Fetch as dataUrl so PPTX export embeds the exact image shown (Pollinations regenerates
        // on each URL access, so we must pin the result now).
        let dataUrl: string | undefined;
        try {
          const resp = await fetch(result.url);
          if (resp.ok) {
            const blob = await resp.blob();
            dataUrl = await new Promise<string>((res) => {
              const reader = new FileReader();
              reader.onload = () => res(reader.result as string);
              reader.onerror = () => res("");
              reader.readAsDataURL(blob);
            }) || undefined;
          }
        } catch { /* dataUrl stays undefined — PPTX export will retry via canvas */ }
        onImageChange({ source: "pollinations", url: result.url, dataUrl: dataUrl || undefined, prompt: imagePrompt, layout: currentLayout, imageRatio: image?.imageRatio, objectFit: image?.objectFit });
      } else if (activeSource === "svgrepo") {
        const results = await searchSvgRepo(imagePrompt);
        if (results.length === 0) setError("No icons found. Try a different keyword.");
        setSearchResults(results.map((r) => ({ url: r.url, title: r.title })));
      } else if (activeSource === "openclipart") {
        const results = await searchOpenClipart(imagePrompt);
        if (results.length === 0) setError("No illustrations found. Try a different keyword.");
        setSearchResults(results.map((r) => ({ url: r.url, title: r.title })));
      }
    } catch {
      setError("Failed to fetch images. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLocalFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isImageFileTooLarge(file)) {
      const mb = (LOCAL_IMAGE_WARN_BYTES / 1024 / 1024).toFixed(0);
      setError(`File is larger than ${mb} MB. Large local images may use significant storage. Continuing anyway.`);
    }
    const dataUrl = await localFileToDataUrl(file);
    onImageChange({ source: "local", dataUrl, layout: currentLayout, altText: file.name });
  }

  function handleSelectSearchResult(url: string) {
    onImageChange({ source: activeSource, url, prompt: imagePrompt, layout: currentLayout });
    setSearchResults([]);
  }

  function handleLayoutChange(layout: ImageLayout) {
    if (layout === "none") { onImageChange(undefined); return; }
    if (image) {
      onImageChange({ ...image, layout });
    } else if (activeSource === "pollinations" && imagePrompt) {
      // Auto-fetch properly (async) when layout is chosen but no image exists yet
      setLoading(true);
      fetchPollinationsImage(imagePrompt, 800, 450, imageStyle, undefined)
        .then(async (result) => {
          let dataUrl: string | undefined;
          try {
            const resp = await fetch(result.url);
            if (resp.ok) {
              const blob = await resp.blob();
              dataUrl = await new Promise<string>((res) => {
                const reader = new FileReader();
                reader.onload = () => res(reader.result as string);
                reader.onerror = () => res("");
                reader.readAsDataURL(blob);
              }) || undefined;
            }
          } catch { /* leave dataUrl undefined */ }
          onImageChange({ source: "pollinations", url: result.url, dataUrl: dataUrl || undefined, prompt: imagePrompt, layout });
        })
        .catch(() => setError("Failed to fetch image."))
        .finally(() => setLoading(false));
    }
  }

  const hasImage = !!(image?.url || image?.dataUrl);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Image size={14} className="text-zinc-400" />
        <span className="text-xs font-medium text-zinc-300">Slide Image</span>
      </div>

      {/* Source tabs */}
      <div className="flex gap-1 bg-zinc-800 rounded p-1">
        {(["pollinations", "svgrepo", "openclipart", "local"] as ImageSource[]).map((src) => (
          <button
            key={src}
            onClick={() => { setActiveSource(src); setSearchResults([]); setError(""); }}
            className={`flex-1 py-1 text-xs rounded capitalize transition-colors ${
              activeSource === src ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {src === "pollinations" ? "AI" : src === "svgrepo" ? "Icons" : src === "openclipart" ? "Illustr." : "Local"}
          </button>
        ))}
      </div>

      {/* Prompt input (not for local) */}
      {activeSource !== "local" && (
        <div className="flex gap-2">
          <input
            type="text"
            value={imagePrompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={activeSource === "pollinations" ? "Describe the image…" : "Search for…"}
            className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          />
          <button
            onClick={handleFetch}
            disabled={loading || !imagePrompt.trim()}
            className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-xs text-white flex items-center gap-1"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          </button>
        </div>
      )}

      {/* Local file picker */}
      {activeSource === "local" && (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLocalFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-zinc-600 rounded text-xs text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
          >
            <Upload size={14} />
            Pick image from device
          </button>
        </>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Search results grid */}
      {searchResults.length > 0 && (
        <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
          {searchResults.map((r, i) => (
            <button key={i} onClick={() => handleSelectSearchResult(r.url)} className="relative group">
              <img src={r.url} alt={r.title ?? ""} className="w-full h-14 object-contain bg-zinc-800 rounded border border-zinc-700 hover:border-indigo-500 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Current image preview */}
      {hasImage && (
        <div className="relative">
          <img
            src={image!.dataUrl ?? image!.url}
            alt={image!.altText ?? ""}
            className="w-full h-24 object-cover rounded border border-zinc-700"
          />
          <button
            onClick={() => onImageChange(undefined)}
            className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 rounded text-zinc-300 hover:text-white"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Layout preset picker */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Position</label>
        <div className="grid grid-cols-3 gap-1">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleLayoutChange(opt.value)}
              className={`py-1 text-xs rounded border transition-colors ${
                (image?.layout ?? "none") === opt.value
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-slide image style override */}
      {onImageStyleChange && (
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Style (this slide)</label>
          <select
            value={imageStyle}
            onChange={(e) => onImageStyleChange(e.target.value as ImageStyle)}
            className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200"
          >
            {(["illustration", "photorealistic", "minimal", "flat-icon", "none"] as ImageStyle[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Aspect ratio for AI images */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">AI Image Ratio</label>
        <select
          value={image?.imageRatio ?? "16:9"}
          onChange={(e) => {
            const ratio = e.target.value as NonNullable<SlideImage["imageRatio"]>;
            onImageChange(image ? { ...image, imageRatio: ratio } : undefined);
          }}
          className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200"
        >
          {(["16:9", "4:3", "1:1", "3:2", "2:3", "9:16"] as const).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Crop vs contain */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={(image?.objectFit ?? "cover") === "contain"}
          onChange={(e) => {
            const fit = e.target.checked ? "contain" : "cover";
            if (image) onImageChange({ ...image, objectFit: fit });
            // If no image yet, the next image generated will pick up objectFit from image prop (which is undefined).
            // We leave the checkbox state here; it applies as soon as an image is set.
          }}
          className="accent-indigo-500"
        />
        <span className="text-xs text-zinc-300">Fit without cropping</span>
      </label>
    </div>
  );
}
