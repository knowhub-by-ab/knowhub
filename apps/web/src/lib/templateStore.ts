import { useSyncExternalStore } from "react";
import type { PptTemplate } from "./types";

// Stored separately to avoid bloating the main AppData with large base64 files.
const STORAGE_KEY = "knowhub:templates:v1";

function uid() {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function load(): PptTemplate[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? (JSON.parse(raw) as PptTemplate[]) : [];
  } catch {
    return [];
  }
}

let state: PptTemplate[] = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage full */ }
}

function emit() {
  listeners.forEach((l) => l());
}

function setState(updater: (prev: PptTemplate[]) => PptTemplate[]) {
  state = updater(state);
  persist();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useTemplates(): PptTemplate[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const templates = {
  add(name: string, fileB64: string, opts?: { backgroundColor?: string; accentColor?: string }): PptTemplate {
    const tpl: PptTemplate = { id: uid(), name, fileB64, ...opts, createdAt: Date.now() };
    setState((prev) => [...prev, tpl]);
    return tpl;
  },
  rename(id: string, name: string) {
    setState((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  },
  remove(id: string) {
    setState((prev) => prev.filter((t) => t.id !== id));
  },
  update(id: string, patch: Partial<Pick<PptTemplate, "backgroundColor" | "accentColor" | "name">>) {
    setState((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  },
  getAll(): PptTemplate[] {
    return state;
  },
};
