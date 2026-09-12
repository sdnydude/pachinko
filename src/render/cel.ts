export function svgDataUrl(svg: string): string { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }

const cache = new Map<string, Promise<HTMLCanvasElement>>();
/** Rasterize an SVG once per (url, w, h, dpr). */
export function loadCel(url: string, w: number, h: number, dpr: number): Promise<HTMLCanvasElement> {
  const key = `${url}|${w}|${h}|${dpr}`;
  let p = cache.get(key);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c);
      };
      img.onerror = () => reject(new Error(`cel failed: ${url}`));
      img.src = url;
    });
    cache.set(key, p);
    p.catch(() => cache.delete(key));   // a failed load must not poison later retries (attached after set: onerror may fire synchronously)
  }
  return p;
}
