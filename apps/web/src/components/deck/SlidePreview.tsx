import type { Slide, SlideTheme } from "@/lib/deckStore";
import { THEMES } from "@/lib/deckExport";

interface Props {
  slide: Slide;
  theme: SlideTheme;
  accentColor?: string;
  /** Direct title colour override from template (bypasses built-in theme). */
  titleColor?: string;
  /** Direct body colour override from template (bypasses built-in theme). */
  bodyColor?: string;
  /** Direct background colour override from template (bypasses built-in theme). */
  backgroundColor?: string;
  font?: string;
  /** Scale factor for thumbnail rendering (default 1 = full size). */
  scale?: number;
  className?: string;
  /** Logo image as base64 data URL to overlay on every slide. */
  logoUrl?: string;
  /** Which corner to place the logo (default: bottom-right). */
  logoCorner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export default function SlidePreview({ slide, theme, accentColor, titleColor, bodyColor, backgroundColor, font, scale = 1, className = "", logoUrl, logoCorner = "bottom-right" }: Props) {
  const t = THEMES[theme] ?? THEMES["aurora-dark"];
  const accent    = accentColor    ?? t.accent;
  const fontFace  = font           ?? t.font;
  const bgColor   = backgroundColor ?? t.bg;
  const titleClr  = titleColor     ?? t.titleColor;
  const bodyClr   = bodyColor      ?? t.bodyColor;
  // Template mode: all three direct color overrides are present
  const isTemplate = !!(backgroundColor && titleColor && bodyColor);
  const isTitle = slide.type === "title";
  const isSection = slide.type === "section";
  const hasImage = !!(slide.image?.url || slide.image?.dataUrl);
  const imgSrc = slide.image?.dataUrl ?? slide.image?.url ?? "";
  const layout = slide.image?.layout ?? "none";
  // Image-only slide: imported picture that IS the slide — render it raw at full opacity.
  const isImageOnly = hasImage && layout === "full-background" && slide.image?.source === "local" && !!slide.image?.dataUrl && slide.bullets.length === 0;

  const baseStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    color: titleClr,
    fontFamily: `${fontFace}, system-ui, sans-serif`,
    aspectRatio: "16/9",
    position: "relative",
    overflow: "hidden",
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: "top left",
  };

  const logoCornerStyle: React.CSSProperties = logoCorner === "top-left"
    ? { top: 6, left: 6 }
    : logoCorner === "top-right"
    ? { top: 6, right: 6 }
    : logoCorner === "bottom-left"
    ? { bottom: 6, left: 6 }
    : { bottom: 6, right: 6 };

  const logoEl = logoUrl ? (
    <img
      src={logoUrl}
      alt="Logo"
      style={{ position: "absolute", width: "10%", maxWidth: 40, maxHeight: 40, objectFit: "contain", margin: 6, zIndex: 10, ...logoCornerStyle }}
    />
  ) : null;

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
        {logoEl}
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
          <div style={{ fontSize: isTitle ? "2.2em" : "1.7em", fontWeight: 700, color: titleClr, textAlign: "center", marginBottom: 12 }}>
            {slide.title}
          </div>
          {isTitle && slide.bullets.length > 0 && (
            <div style={{ fontSize: "1em", color: bodyClr, textAlign: "center" }}>
              {slide.bullets.join(" · ")}
            </div>
          )}
          <div style={{ marginTop: 20, width: 60, height: 3, backgroundColor: accent, borderRadius: 2 }} />
        </div>
        {isTemplate && (
          <div style={{ position: "absolute", bottom: 5, right: 6, fontSize: "0.5em", background: "rgba(0,0,0,0.45)", color: "#fff", padding: "1px 5px", borderRadius: 6, letterSpacing: 1 }}>
            TEMPLATE
          </div>
        )}
        {logoEl}
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
            <div style={{ fontSize: "1.25em", fontWeight: 700, color: titleClr, marginBottom: 6 }}>
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
                <li key={i} style={{ fontSize: "0.85em", color: bodyClr, marginBottom: 4, lineHeight: 1.4 }}>
                  {b}
                </li>
              ))}
            </ul>
            {slide.callout && (
              <div style={{
                marginTop: 8,
                borderLeft: `3px solid ${accent}`,
                paddingLeft: 8,
                color: accent,
                fontSize: "0.8em",
                fontStyle: "italic",
                fontWeight: 600,
              }}>
                {slide.callout}
              </div>
            )}
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
      {/* Template mode indicator */}
      {isTemplate && (
        <div style={{ position: "absolute", bottom: 5, right: 6, fontSize: "0.5em", background: "rgba(0,0,0,0.45)", color: "#fff", padding: "1px 5px", borderRadius: 6, letterSpacing: 1 }}>
          TEMPLATE
        </div>
      )}
      {logoEl}
    </div>
  );
}
