// Renders the exact same feTurbulence grain as before, but as a
// background-image data URI instead of a live SVG <filter> applied
// directly to a DOM node. A filter attached to an element inside the
// hero's scrolling/transforming context forces the browser to recompute
// the noise on every scroll frame — a background-image is rasterized once
// and reused, which is dramatically cheaper and was the main cause of the
// scroll jank on this page.
const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export default function GrainOverlay({ opacity = 0.35 }: { opacity?: number }) {
  return (
    <div
      className="grain-overlay"
      style={{ opacity, backgroundImage: `url("${GRAIN_SVG}")`, backgroundRepeat: "repeat" }}
      aria-hidden="true"
    />
  );
}
