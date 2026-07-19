import type { Slide, SlideTheme } from "@/lib/deckStore";
import { THEMES } from "@/lib/deckExport";

interface Props {
  slide: Slide;
  theme: SlideTheme;
  accentColor?: string;
  font?: string;
  /** Scale factor for thumbnail rendering (default 1 = full size). */
  scale?: number;
  className?: string;
}

export default function SlidePreview({ slide, theme, accentColor, font, scale = 1, className = "" }: Props) {
  const t = THEMES[theme] ?? THEMES["aurora-dark"];
  const accent = accentColor ?? t.accent;
  const fontFace = font ?? t.font;
  const isTitle = slide.type === "title";
  const isSection = slide.type === "section";
  const hasImage = !!(slide.image?.url || slide.image?.dataUrl);
  const imgSrc = slide.image?.dataUrl ?? slide.image?.url ?? "";
  const layout = slide.image?.layout ?? "none";
  // Image-only slide: imported picture that IS the slide — render it raw at full opacity.
  const isImageOnly = hasImage && layout === "full-background" && slide.image?.source === "local" && !!slide.image?.dataUrl && slide.bullets.length === 0;

  const baseStyle: React.CSSProperties = {
    backgroundColor: t.bg,
    color: t.titleColor,
    fontFamily: `${fontFace}, system-ui, sans-serif`,
    aspectRatio: "16/9",
    position: "relative",
    overflow: "hidden",
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: "top left",
  };

  // Image-only: render the picture as the entire slide, no text overlay.
  if (isImageOnly) {
    return (
      <div style={{ ...baseStyle, backgroundColor: "#000" }} className={`rounded select-none ${className}`}>
        <img
          src={imgSrc}
          alt={slide.image?.altText ?? ""}
          crossOrigin="anonymous"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: slide.image?.objectFit ?? "contain" }}
        />
      </div>
    );
  }

  if (isTitle || isSection) {
    return (
      <div style={baseStyle} className={`rounded select-none ${className}`}>
        {/* Left accent bar */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, backgroundColor: accent }} />
        {/* Centered content */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "0 10%" }}>
          <div style={{ fontSize: isTitle ? "2.2em" : "1.7em", fontWeight: 700, color: t.titleColor, textAlign: "center", marginBottom: 12 }}>
            {slide.title}
          </div>
          {isTitle && slide.bullets.length > 0 && (
            <div style={{ fontSize: "1em", color: t.bodyColor, textAlign: "center" }}>
              {slide.bullets.join(" · ")}
            </div>
          )}
          <div style={{ marginTop: 20, width: 60, height: 3, backgroundColor: accent, borderRadius: 2 }} />
        </div>
      </div>
    );
  }

  const contentStyle: React.CSSProperties = {
    flex: (layout === "right-half" || layout === "left-half") ? "0 0 58%" : "1",
  };

  return (
    <div style={baseStyle} className={`rounded select-none ${className}`}>
      {/* Left accent bar */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, backgroundColor: accent, zIndex: 2 }} />

      {/* Full-background image */}
      {hasImage && layout === "full-background" && (
        <img
          src={imgSrc}
          alt={slide.image?.altText ?? ""}
          crossOrigin="anonymous"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: slide.image?.objectFit ?? "cover", opacity: 0.6 }}
        />
      )}

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", padding: "4% 4% 4% 6%" }}>
        {/* Top banner image */}
        {hasImage && layout === "top-banner" && (
          <img src={imgSrc} alt={slide.image?.altText ?? ""} crossOrigin="anonymous"
            style={{ width: "100%", height: "18%", objectFit: slide.image?.objectFit ?? "cover", borderRadius: 4, marginBottom: 8 }} />
        )}

        <div style={{ display: "flex", flex: 1, gap: 12, minHeight: 0 }}>
          {/* Left-half image (appears before content) */}
          {hasImage && layout === "left-half" && (
            <img src={imgSrc} alt={slide.image?.altText ?? ""} crossOrigin="anonymous"
              style={{ flex: "0 0 40%", objectFit: slide.image?.objectFit ?? "cover", borderRadius: 4 }} />
          )}

          <div style={contentStyle}>
            {/* Title */}
            <div style={{ fontSize: "1.25em", fontWeight: 700, color: t.titleColor, marginBottom: 6 }}>
              {slide.title}
            </div>
            {/* Accent underline */}
            <div style={{ width: 40, height: 2, backgroundColor: accent, borderRadius: 1, marginBottom: 8 }} />

            {/* Inline below title image */}
            {hasImage && layout === "inline-below-title" && (
              <img src={imgSrc} alt={slide.image?.altText ?? ""} crossOrigin="anonymous"
                style={{ width: "100%", height: "28%", objectFit: slide.image?.objectFit ?? "cover", borderRadius: 4, marginBottom: 8 }} />
            )}

            {/* Bullets */}
            <ul style={{ margin: 0, paddingLeft: "1.2em", listStyleType: "disc" }}>
              {slide.bullets.map((b, i) => (
                <li key={i} style={{ fontSize: "0.85em", color: t.bodyColor, marginBottom: 4, lineHeight: 1.4 }}>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Right-half image (appears after content) */}
          {hasImage && layout === "right-half" && (
            <img src={imgSrc} alt={slide.image?.altText ?? ""} crossOrigin="anonymous"
              style={{ flex: "0 0 40%", objectFit: slide.image?.objectFit ?? "cover", borderRadius: 4 }} />
          )}
        </div>

        {/* Bottom strip image */}
        {hasImage && layout === "bottom-strip" && (
          <img src={imgSrc} alt={slide.image?.altText ?? ""} crossOrigin="anonymous"
            style={{ width: "100%", height: "18%", objectFit: slide.image?.objectFit ?? "cover", borderRadius: 4, marginTop: 8 }} />
        )}
      </div>

      {/* Slide type badge for section/quiz */}
      {(slide.type === "quiz" || slide.type === "closing") && (
        <div style={{ position: "absolute", top: 6, right: 8, fontSize: "0.6em", background: accent, color: "#fff", padding: "2px 6px", borderRadius: 10, textTransform: "uppercase", letterSpacing: 1 }}>
          {slide.type}
        </div>
      )}
    </div>
  );
}
