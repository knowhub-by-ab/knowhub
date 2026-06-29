// Shared store for podcast episode navigation.
// PodcastPage writes the episode list when playing; TTSPlayer reads it for Prev/Next.

export interface PodcastEpisode {
  id: string;
  title: string;
  text: string; // speakable text
}

let _episodes: PodcastEpisode[] = [];
let _currentIdx = -1;
const _listeners = new Set<() => void>();

function notify() { _listeners.forEach((fn) => fn()); }

export function subscribePodcast(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function getPodcastState() {
  return { episodes: _episodes, currentIdx: _currentIdx };
}

export function setPodcastEpisodes(episodes: PodcastEpisode[], currentIdx: number) {
  _episodes = episodes;
  _currentIdx = currentIdx;
  notify();
}

export function setPodcastCurrentIdx(idx: number) {
  _currentIdx = idx;
  notify();
}

export function clearPodcast() {
  _episodes = [];
  _currentIdx = -1;
  notify();
}
