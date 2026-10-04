const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
const SIZE_BUCKETS = [64, 128, 256];

/**
 * Small, face-cropped Cloudinary rendition of an avatar. Buckets keep the URL
 * identical across 24–64px avatars so the browser cache is shared between pages.
 * Non-Cloudinary URLs and already-transformed URLs are returned unchanged.
 */
export function avatarSrc(url: string, displayPx: number): string {
  const match = CLOUDINARY_UPLOAD.exec(url);
  if (!match) return url;
  const [, prefix, rest] = match;
  const firstSegment = rest.split('/')[0];
  if (!/^v\d+$/.test(firstSegment) && rest.includes('/')) return url;
  const target = displayPx * 2;
  const size = SIZE_BUCKETS.find((bucket) => bucket >= target) ?? SIZE_BUCKETS[SIZE_BUCKETS.length - 1];
  return `${prefix}c_fill,g_face,w_${size},h_${size},q_auto,f_auto/${rest}`;
}

const loaded = new Set<string>();

export function isAvatarLoaded(src: string): boolean {
  return loaded.has(src);
}

export function markAvatarLoaded(src: string): void {
  loaded.add(src);
}
