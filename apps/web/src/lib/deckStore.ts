import { useSyncExternalStore } from "react";
import type {
  PresentationDeck,
  Slide,
  SlideImage,
  DeckFrontmatter,
  Collection,
  CollectionItem,
  CollectionType,
  SlideTheme,
  AudienceLevel,
  NarrationTone,
  ImageStyle,
  SlideType,
} from "./types";

// ---------------------------------------------------------------------------
// Separate localStorage store for presentations and collections.
// Kept apart from the main AppData blob to avoid bloating GitHub sync.
// GitHub is the source of truth; this is a local cache for offline/fast access.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "knowhub:decks:v1";

export interface DeckStoreData {
  decks: PresentationDeck[];
  collections: Collection[];
}

const DEFAULT_DATA: DeckStoreData = {
  decks: [],
  collections: [],
};

export const DEFAULT_FRONTMATTER: DeckFrontmatter = {
  theme: "aurora-dark",
  imageStyle: "illustration",
  audienceLevel: "intermediate",
  language: "en",
  narrationTone: "conversational",
  slideCount: 10,
  speechRate: 1.0,
  speechPitch: 1.0,
};

function uid(): string {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toLowerCase();
}

function load(): DeckStoreData {
  if (typeof localStorage === "undefined") return structuredClone(DEFAULT_DATA);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw) as Partial<DeckStoreData>;
    return {
      decks: parsed.decks ?? [],
      collections: parsed.collections ?? [],
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

let state: DeckStoreData = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full — ignore; in-memory state still works.
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function setState(updater: (prev: DeckStoreData) => DeckStoreData) {
  state = updater(state);
  persist();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DeckStoreData {
  return state;
}

export function useDeckStore(): DeckStoreData {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getDeckStoreState(): DeckStoreData {
  return state;
}

// ---------------------------------------------------------------------------
// Deck mutations
// ---------------------------------------------------------------------------

export const decks = {
  create(title: string, sourceMd?: string, sourceNodeId?: string): PresentationDeck {
    const now = Date.now();
    const deck: PresentationDeck = {
      id: uid(),
      title: title.trim() || "Untitled Presentation",
      sourceNodeId,
      sourceMd,
      frontmatter: structuredClone(DEFAULT_FRONTMATTER),
      slides: [],
      createdAt: now,
      updatedAt: now,
    };
    setState((prev) => ({ ...prev, decks: [deck, ...prev.decks] }));
    return deck;
  },

  update(id: string, patch: Partial<Pick<PresentationDeck, "title" | "sourceMd" | "pptxAssetId" | "pptxAssetUrl" | "videoAssetId" | "videoAssetUrl" | "thumbnailPath">>) {
    setState((prev) => ({
      ...prev,
      decks: prev.decks.map((d) =>
        d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d
      ),
    }));
  },

  setSlides(id: string, slides: Slide[]) {
    setState((prev) => ({
      ...prev,
      decks: prev.decks.map((d) =>
        d.id === id ? { ...d, slides, updatedAt: Date.now() } : d
      ),
    }));
  },

  updateSlide(deckId: string, slideId: string, patch: Partial<Slide>) {
    setState((prev) => ({
      ...prev,
      decks: prev.decks.map((d) =>
        d.id === deckId
          ? {
              ...d,
              slides: d.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)),
              updatedAt: Date.now(),
            }
          : d
      ),
    }));
  },

  setSlideImage(deckId: string, slideId: string, image: SlideImage) {
    setState((prev) => ({
      ...prev,
      decks: prev.decks.map((d) =>
        d.id === deckId
          ? {
              ...d,
              slides: d.slides.map((s) => (s.id === slideId ? { ...s, image } : s)),
              updatedAt: Date.now(),
            }
          : d
      ),
    }));
  },

  clearSlideImage(deckId: string, slideId: string) {
    setState((prev) => ({
      ...prev,
      decks: prev.decks.map((d) =>
        d.id === deckId
          ? {
              ...d,
              slides: d.slides.map((s) =>
                s.id === slideId ? { ...s, image: undefined } : s
              ),
              updatedAt: Date.now(),
            }
          : d
      ),
    }));
  },

  reorderSlides(deckId: string, orderedIds: string[]) {
    setState((prev) => ({
      ...prev,
      decks: prev.decks.map((d) => {
        if (d.id !== deckId) return d;
        const slideMap = new Map(d.slides.map((s) => [s.id, s]));
        const reordered = orderedIds
          .map((id, idx) => {
            const s = slideMap.get(id);
            return s ? { ...s, order: idx } : null;
          })
          .filter(Boolean) as Slide[];
        return { ...d, slides: reordered, updatedAt: Date.now() };
      }),
    }));
  },

  updateFrontmatter(deckId: string, patch: Partial<DeckFrontmatter>) {
    setState((prev) => ({
      ...prev,
      decks: prev.decks.map((d) =>
        d.id === deckId
          ? { ...d, frontmatter: { ...d.frontmatter, ...patch }, updatedAt: Date.now() }
          : d
      ),
    }));
  },

  addSlide(deckId: string, afterSlideId?: string): Slide {
    const slide: Slide = {
      id: uid(),
      type: "content",
      title: "New Slide",
      bullets: ["Add your first point here"],
      speakerNotes: "",
      narrationScript: "",
      imagePrompt: "",
      order: 0,
    };
    setState((prev) => ({
      ...prev,
      decks: prev.decks.map((d) => {
        if (d.id !== deckId) return d;
        let slides: Slide[];
        if (afterSlideId) {
          const idx = d.slides.findIndex((s) => s.id === afterSlideId);
          slides = [...d.slides.slice(0, idx + 1), slide, ...d.slides.slice(idx + 1)];
        } else {
          slides = [...d.slides, slide];
        }
        return {
          ...d,
          slides: slides.map((s, i) => ({ ...s, order: i })),
          updatedAt: Date.now(),
        };
      }),
    }));
    return slide;
  },

  removeSlide(deckId: string, slideId: string) {
    setState((prev) => ({
      ...prev,
      decks: prev.decks.map((d) =>
        d.id === deckId
          ? {
              ...d,
              slides: d.slides
                .filter((s) => s.id !== slideId)
                .map((s, i) => ({ ...s, order: i })),
              updatedAt: Date.now(),
            }
          : d
      ),
    }));
  },

  remove(id: string) {
    setState((prev) => ({
      ...prev,
      decks: prev.decks.filter((d) => d.id !== id),
      // Remove from all collections too
      collections: prev.collections.map((c) => ({
        ...c,
        items: c.items.filter((item) => !(item.type === "deck" && item.refId === id)),
      })),
    }));
  },

  get(id: string): PresentationDeck | undefined {
    return state.decks.find((d) => d.id === id);
  },

  newSlideId: () => uid(),
};

// ---------------------------------------------------------------------------
// Collection mutations
// ---------------------------------------------------------------------------

export const collections = {
  create(name: string, type: CollectionType): Collection {
    const now = Date.now();
    const c: Collection = {
      id: uid(),
      name: name.trim() || "New Collection",
      type,
      items: [],
      createdAt: now,
      updatedAt: now,
    };
    setState((prev) => ({ ...prev, collections: [c, ...prev.collections] }));
    return c;
  },

  update(id: string, patch: Partial<Pick<Collection, "name" | "description" | "type" | "coverDeckId">>) {
    setState((prev) => ({
      ...prev,
      collections: prev.collections.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
      ),
    }));
  },

  addItem(collectionId: string, item: Omit<CollectionItem, "order" | "addedAt">) {
    setState((prev) => ({
      ...prev,
      collections: prev.collections.map((c) => {
        if (c.id !== collectionId) return c;
        const already = c.items.some((i) => i.refId === item.refId && i.type === item.type);
        if (already) return c;
        const newItem: CollectionItem = {
          ...item,
          order: c.items.length,
          addedAt: Date.now(),
        };
        return { ...c, items: [...c.items, newItem], updatedAt: Date.now() };
      }),
    }));
  },

  removeItem(collectionId: string, refId: string) {
    setState((prev) => ({
      ...prev,
      collections: prev.collections.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              items: c.items
                .filter((i) => i.refId !== refId)
                .map((i, idx) => ({ ...i, order: idx })),
              updatedAt: Date.now(),
            }
          : c
      ),
    }));
  },

  reorderItems(collectionId: string, orderedRefIds: string[]) {
    setState((prev) => ({
      ...prev,
      collections: prev.collections.map((c) => {
        if (c.id !== collectionId) return c;
        const itemMap = new Map(c.items.map((i) => [i.refId, i]));
        const reordered = orderedRefIds
          .map((refId, idx) => {
            const item = itemMap.get(refId);
            return item ? { ...item, order: idx } : null;
          })
          .filter(Boolean) as CollectionItem[];
        return { ...c, items: reordered, updatedAt: Date.now() };
      }),
    }));
  },

  remove(id: string) {
    setState((prev) => ({
      ...prev,
      collections: prev.collections.filter((c) => c.id !== id),
    }));
  },

  get(id: string): Collection | undefined {
    return state.collections.find((c) => c.id === id);
  },
};

// ---------------------------------------------------------------------------
// Bulk import (from GitHub sync)
// ---------------------------------------------------------------------------

export function importDecksFromGitHub(data: { decks?: PresentationDeck[]; collections?: Collection[] }) {
  setState((prev) => ({
    decks: mergeById(prev.decks, data.decks ?? []),
    collections: mergeById(prev.collections, data.collections ?? []),
  }));
}

function mergeById<T extends { id: string; updatedAt: number }>(local: T[], remote: T[]): T[] {
  const map = new Map(local.map((item) => [item.id, item]));
  for (const r of remote) {
    const l = map.get(r.id);
    if (!l || r.updatedAt > l.updatedAt) map.set(r.id, r);
  }
  return Array.from(map.values());
}

// Re-export types consumed by components so they only need one import
export type {
  PresentationDeck,
  Slide,
  SlideImage,
  DeckFrontmatter,
  Collection,
  CollectionItem,
  CollectionType,
  SlideTheme,
  AudienceLevel,
  NarrationTone,
  ImageStyle,
  SlideType,
};
