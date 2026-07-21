import { chatJSON, chatCompletion, chatStream, extractJson, AiError } from "./ai";
import type { ProviderKey } from "./types";
import type { Slide, DeckFrontmatter, SlideType, NarrationTone, AudienceLevel } from "./deckStore";

// ---------------------------------------------------------------------------
// All AI calls for the Presentations feature.
// Every function uses the existing multi-provider gateway via ai.ts.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Slide outline generation
// ---------------------------------------------------------------------------

interface RawSlide {
  type: SlideType;
  title: string;
  bullets: string[];
  callout?: string;
  speakerNotes: string;
  narrationScript: string;
  imagePrompt: string;
}

function uid(): string {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toLowerCase();
}

function buildOutlineSystemPrompt(fm: DeckFrontmatter): string {
  return `You are a world-class presentation designer (think M365 Copilot, Google Gemini Slides). Convert the provided Markdown into a visually compelling slide deck outline.

CREATIVE RULES — make slides look like a professional deck:
- Titles should be ACTION-ORIENTED or INSIGHT-DRIVEN (not just topic labels). Examples: "72% of Teams Fail Without This" not "Team Challenges". "Three Steps to Digital Transformation" not "Digital Transformation Steps".
- bullets: use SPECIFIC, CONCRETE content — statistics, named frameworks, real examples. Avoid vague generic statements. Max 5 bullets per slide, max 15 words each. NO markdown syntax.
- callout: a single powerful insight, key statistic, or memorable quote for this slide (1 sentence, max 20 words). Leave empty ("") for title/section/closing slides.
- imagePrompt: a specific, vivid visual description (10-20 words) for an AI image generator. Every content slide MUST have one. Be specific — "a diverse team collaborating around a whiteboard with sticky notes" not "teamwork".
- speakerNotes: 2-4 sentences of presenter context, data sources, or talking points.
- narrationScript: 2-4 natural spoken sentences for text-to-speech, as if speaking aloud to an audience.

SLIDE TYPES:
- "title": First slide only. Has subtitle as first bullet.
- "section": Major chapter dividers — short punchy title, 0-1 bullets.
- "content": Regular slides. Rich, specific bullets + callout.
- "closing": Last slide — key takeaways + call to action.

Aim for ${fm.slideCount ?? 10} slides (±2). Audience: ${fm.audienceLevel}. Language: ${fm.language === "en" ? "English" : fm.language}.

Return ONLY a valid JSON array. No prose, no code fences.
Schema per slide:
{"type":"title"|"content"|"section"|"closing","title":string,"bullets":string[],"callout":string,"speakerNotes":string,"narrationScript":string,"imagePrompt":string}`;
}

export async function generateSlideOutline(
  keys: ProviderKey[],
  markdown: string,
  frontmatter: DeckFrontmatter
): Promise<Slide[]> {
  const systemPrompt = buildOutlineSystemPrompt(frontmatter);
  const raw = await chatJSON<RawSlide[]>(keys, [
    { role: "system", content: systemPrompt },
    { role: "user", content: markdown.slice(0, 12000) }, // cap to avoid token overflow
  ]);
  if (!Array.isArray(raw)) throw new AiError("AI did not return a slide array. Try again.");
  return raw.map((s, i) => ({
    id: uid(),
    type: (s.type as SlideType) || "content",
    title: s.title ?? `Slide ${i + 1}`,
    bullets: Array.isArray(s.bullets) ? s.bullets : [],
    speakerNotes: s.speakerNotes ?? "",
    narrationScript: s.narrationScript ?? "",
    imagePrompt: s.imagePrompt ?? "",
    callout: s.callout ?? "",
    order: i,
  }));
}

// ---------------------------------------------------------------------------
// Narration script generation (batch — all slides in one call)
// ---------------------------------------------------------------------------

export async function generateNarrationScripts(
  keys: ProviderKey[],
  slides: Slide[],
  tone: NarrationTone
): Promise<Record<string, string>> {
  const toneDesc: Record<NarrationTone, string> = {
    formal: "formal and academic, as if delivering a university lecture",
    conversational: "friendly and conversational, as if explaining to a colleague",
    enthusiastic: "enthusiastic and energetic, like an inspiring teacher or TED speaker",
  };
  const slideList = slides
    .map((s) => `[${s.id}] "${s.title}": ${s.bullets.join(" | ")}`)
    .join("\n");
  const systemPrompt = `You are a professional narrator. Write spoken narration scripts for each slide listed below.
Tone: ${toneDesc[tone]}.
Rules:
- Return ONLY a valid JSON object: { "slideId": "narration text", ... }
- Write 2-4 natural spoken sentences per slide — no bullet points, no markdown.
- Keep each narration under 60 words for a ~15-second delivery.`;

  const result = await chatJSON<Record<string, string>>(keys, [
    { role: "system", content: systemPrompt },
    { role: "user", content: slideList },
  ]);
  return result;
}

// ---------------------------------------------------------------------------
// Per-slide improvement (streaming)
// ---------------------------------------------------------------------------

export async function improveSlide(
  keys: ProviderKey[],
  slide: Slide,
  instruction: string,
  onDelta: (piece: string) => void
): Promise<Partial<Slide>> {
  const systemPrompt = `You are an expert presentation designer. Improve the given slide based on the user's instruction.
Return ONLY valid JSON matching this shape (omit fields you did not change):
{"title":string,"bullets":string[],"speakerNotes":string,"narrationScript":string,"imagePrompt":string}`;

  const userMsg = `Slide title: "${slide.title}"
Bullets: ${JSON.stringify(slide.bullets)}
Speaker notes: "${slide.speakerNotes}"
Instruction: ${instruction}`;

  const full = await chatStream(keys, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMsg },
  ], onDelta);
  return extractJson<Partial<Slide>>(full);
}

// ---------------------------------------------------------------------------
// Full deck translation
// ---------------------------------------------------------------------------

export async function translateSlides(
  keys: ProviderKey[],
  slides: Slide[],
  targetLanguage: string
): Promise<Slide[]> {
  const systemPrompt = `Translate the following slide content to ${targetLanguage}.
Return ONLY a valid JSON array with the same structure as the input.
Translate title, bullets, speakerNotes, narrationScript, and imagePrompt.
Preserve all id and order values exactly.`;

  const input = slides.map((s) => ({
    id: s.id,
    order: s.order,
    type: s.type,
    title: s.title,
    bullets: s.bullets,
    speakerNotes: s.speakerNotes,
    narrationScript: s.narrationScript,
    imagePrompt: s.imagePrompt,
  }));

  const translated = await chatJSON<typeof input>(keys, [
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(input) },
  ]);

  return slides.map((orig) => {
    const t = translated.find((r) => r.id === orig.id);
    if (!t) return orig;
    return {
      ...orig,
      title: t.title ?? orig.title,
      bullets: t.bullets ?? orig.bullets,
      speakerNotes: t.speakerNotes ?? orig.speakerNotes,
      narrationScript: t.narrationScript ?? orig.narrationScript,
      imagePrompt: t.imagePrompt ?? orig.imagePrompt,
    };
  });
}

// ---------------------------------------------------------------------------
// Frontmatter inference from content
// ---------------------------------------------------------------------------

export async function generateFrontmatterFromContent(
  keys: ProviderKey[],
  markdown: string
): Promise<Partial<DeckFrontmatter>> {
  const systemPrompt = `You are a presentation designer. Analyse the provided Markdown and suggest presentation settings.

IMPORTANT: Look for explicit design intent in the text body itself — phrases like "use a dark theme", "professional corporate style", "blue colour scheme", "minimalist design", "warm and friendly", "technical/developer audience" etc. These design instructions in the text should take priority over generic content analysis.

Return ONLY valid JSON (no prose, no code fences) with these optional fields:
{
  "theme": "aurora-dark"|"corporate-blue"|"edu-warm"|"minimal-white"|"tech-green"|"sunset-orange"|"ocean-teal"|"slate-pro",
  "audienceLevel": "beginner"|"intermediate"|"expert",
  "imageStyle": "photorealistic"|"illustration"|"minimal"|"flat-icon"|"none",
  "slideCount": number,
  "narrationTone": "formal"|"conversational"|"enthusiastic"
}

Theme guide:
- aurora-dark: dark/night, vibrant/creative, tech-forward
- corporate-blue: professional, business, formal
- edu-warm: educational, warm, friendly, beginner-friendly
- minimal-white: clean, simple, minimal, modern
- tech-green: technology, developer, coding, green/neon
- sunset-orange: energetic, creative, marketing
- ocean-teal: calm, health, nature, wellness
- slate-pro: professional dark, executive, sophisticated`;

  const { content } = await chatCompletion(keys, [
    { role: "system", content: systemPrompt },
    { role: "user", content: markdown.slice(0, 4000) },
  ]);
  try {
    return extractJson<Partial<DeckFrontmatter>>(content);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Convert raw learning page content to MD authoring guide format
// ---------------------------------------------------------------------------

export async function convertPageToMdGuide(
  keys: ProviderKey[],
  rawContent: string,
  pageTitle: string
): Promise<string> {
  const systemPrompt = `You are an expert instructional designer. Convert the provided raw learning page content into a structured KnowHub Markdown authoring guide format suitable for generating a presentation.

Output format rules:
- Use # for the main title
- Use ## for major sections (each becomes a slide)
- Use ### for subsections
- Add <!-- image-prompt: a specific visual description --> after each ## heading where an image would help
- Add <!-- speaker-notes: key talking points for the presenter --> after the image-prompt where helpful
- Restructure content into clear bullet points under each section
- Keep bullet points concise (max 12 words each, max 6 per section)
- Add a closing section at the end with key takeaways
- Do NOT add YAML frontmatter — just the structured markdown
- Preserve the educational intent and all key information from the original content

Return ONLY the formatted Markdown, nothing else.`;

  const { content } = await chatCompletion(keys, [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Page title: "${pageTitle}"\n\nContent:\n${rawContent.slice(0, 8000)}` },
  ]);
  return content.trim();
}

// ---------------------------------------------------------------------------
// Per-slide narration generation (single slide, non-streaming)
// ---------------------------------------------------------------------------

export async function generateSingleNarration(
  keys: ProviderKey[],
  slide: Slide,
  tone: NarrationTone
): Promise<string> {
  const toneDesc: Record<NarrationTone, string> = {
    formal: "formal and academic",
    conversational: "friendly and conversational",
    enthusiastic: "enthusiastic and energetic",
  };
  const { content } = await chatCompletion(keys, [
    {
      role: "system",
      content: `Write a spoken narration script for this slide. Tone: ${toneDesc[tone]}.
Return ONLY plain text — 2-4 natural sentences, under 60 words. No JSON, no markdown.`,
    },
    {
      role: "user",
      content: `Title: "${slide.title}"\nBullets: ${slide.bullets.join(" | ")}`,
    },
  ]);
  return content.trim();
}

// ---------------------------------------------------------------------------
// MD frontmatter parser (scans raw markdown for YAML block + slide directives)
// ---------------------------------------------------------------------------

export interface ParsedMdDirectives {
  /** Extracted YAML frontmatter values (subset of DeckFrontmatter). */
  frontmatter: Partial<DeckFrontmatter>;
  /** Map of slide heading text → image hint from <!-- image-prompt: ... --> comments. */
  imagePrompts: Record<string, string>;
  /** Map of slide heading text → custom narration from <!-- narration: ... --> comments. */
  narrationOverrides: Record<string, string>;
  /** Heading texts of slides marked <!-- quiz: true -->. */
  quizSlides: string[];
  /** Cleaned markdown with directives stripped. */
  cleanMd: string;
}

export function parseMdDirectives(raw: string): ParsedMdDirectives {
  const result: ParsedMdDirectives = {
    frontmatter: {},
    imagePrompts: {},
    narrationOverrides: {},
    quizSlides: [],
    cleanMd: raw,
  };

  // Parse YAML frontmatter (---\n...\n---)
  const yamlMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (yamlMatch) {
    const yaml = yamlMatch[1];
    const fm: Partial<DeckFrontmatter> = {};
    const lines = yaml.split("\n");
    for (const line of lines) {
      const [k, ...rest] = line.split(":");
      const key = k.trim();
      const val = rest.join(":").trim().replace(/^["']|["']$/g, "");
      if (key === "theme") fm.theme = val as DeckFrontmatter["theme"];
      else if (key === "accent-color") fm.accentColor = val;
      else if (key === "font") fm.font = val;
      else if (key === "image-style") fm.imageStyle = val as DeckFrontmatter["imageStyle"];
      else if (key === "slide-count") fm.slideCount = Number(val) || undefined;
      else if (key === "audience-level") fm.audienceLevel = val as AudienceLevel;
      else if (key === "language") fm.language = val;
      else if (key === "narration-tone") fm.narrationTone = val as NarrationTone;
    }
    result.frontmatter = fm;
    result.cleanMd = raw.slice(yamlMatch[0].length);
  }

  // Single-pass line-by-line extraction: tracks the nearest preceding heading
  // for each directive so association is always to the slide directly above it.
  const outputLines: string[] = [];
  let currentHeading = "";
  for (const line of result.cleanMd.split("\n")) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim();
      outputLines.push(line);
      continue;
    }

    const imageMatch = line.match(/<!--\s*image-prompt:\s*(.*?)\s*-->/i);
    if (imageMatch) {
      if (currentHeading) result.imagePrompts[currentHeading] = imageMatch[1].trim();
      continue; // strip the directive from output
    }

    const narrationMatch = line.match(/<!--\s*narration:\s*([\s\S]*?)\s*-->/i);
    if (narrationMatch) {
      if (currentHeading) result.narrationOverrides[currentHeading] = narrationMatch[1].trim();
      continue;
    }

    const quizMatch = line.match(/<!--\s*quiz:\s*true\s*-->/i);
    if (quizMatch) {
      if (currentHeading && !result.quizSlides.includes(currentHeading)) {
        result.quizSlides.push(currentHeading);
      }
      continue;
    }

    outputLines.push(line);
  }

  // Handle multi-line <!-- narration: ... --> blocks that span multiple lines
  // Re-process outputLines for any remaining multi-line narration directives
  result.cleanMd = outputLines.join("\n").replace(
    /<!--\s*narration:\s*([\s\S]*?)\s*-->/gi,
    (_fullMatch, script, offset, str) => {
      // Find the nearest preceding heading in the string before this match
      const before = str.slice(0, offset);
      const headingMatches = [...before.matchAll(/^#{1,4}\s+(.+)/gm)];
      const nearest = headingMatches.at(-1)?.[1]?.trim();
      if (nearest) result.narrationOverrides[nearest] = script.trim();
      return "";
    }
  );

  return result;
}
