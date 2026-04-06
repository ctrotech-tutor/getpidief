import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// ─────────────────────────────────────────────────────────────────────────────
// PDF VIEWER ATOMS  (Jotai — fine-grained atomic state for viewer controls)
// ─────────────────────────────────────────────────────────────────────────────

/** Current page number (1-indexed) */
export const currentPageAtom = atom<number>(1);

/** Total number of pages in the document */
export const totalPagesAtom = atom<number>(0);

/** Zoom level (0.5 = 50%, 1.0 = 100%, 2.0 = 200%) */
export const zoomLevelAtom = atomWithStorage<number>("pdf-zoom", 1.0);

/** Zoom presets */
export const ZOOM_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as const;

/** Fit mode: "width" | "page" | "custom" */
export const fitModeAtom = atom<"width" | "page" | "custom">("width");

/** Is the viewer in fullscreen mode? */
export const isFullscreenAtom = atom<boolean>(false);

/** Is the thumbnail strip panel visible? */
export const thumbnailStripOpenAtom = atomWithStorage<boolean>(
  "pdf-thumbnails",
  true
);

/** Is the document fully loaded? */
export const documentLoadedAtom = atom<boolean>(false);

/** Error loading document */
export const documentErrorAtom = atom<string | null>(null);

/** Derived: next zoom level (cycles through presets) */
export const nextZoomAtom = atom((get) => {
  const current = get(zoomLevelAtom);
  const idx = ZOOM_PRESETS.findIndex((p) => p >= current);
  const nextIdx = idx < ZOOM_PRESETS.length - 1 ? idx + 1 : idx;
  return ZOOM_PRESETS[nextIdx]!;
});

/** Derived: previous zoom level */
export const prevZoomAtom = atom((get) => {
  const current = get(zoomLevelAtom);
  const idx = ZOOM_PRESETS.findIndex((p) => p >= current);
  const prevIdx = idx > 0 ? idx - 1 : 0;
  return ZOOM_PRESETS[prevIdx]!;
});

/** Derived: can go to next page? */
export const canGoNextAtom = atom(
  (get) => get(currentPageAtom) < get(totalPagesAtom)
);

/** Derived: can go to previous page? */
export const canGoPrevAtom = atom((get) => get(currentPageAtom) > 1);
