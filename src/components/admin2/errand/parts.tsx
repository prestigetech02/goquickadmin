import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { avatarSrc, isAvatarLoaded, markAvatarLoaded } from '@/lib/avatarSrc';
import { personInitials } from '../format';
import type { Tone } from './errandPresentation';

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <p className="text-[14px] text-[#17211b]">{title}</p>
        {subtitle ? <p className="text-[10px] text-[#6b6f66]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SectionLink({
  children,
  onClick,
  href,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string | null;
  disabled?: boolean;
}) {
  const className = 'flex-shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#167d35] hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline';
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

export function Chip({ tone, label, dot = false }: { tone: Tone; label: string; dot?: boolean }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full px-[8px] py-[4px] text-[10px] font-semibold leading-none"
      style={{ backgroundColor: tone.bg, color: tone.color }}
    >
      {dot ? <span className="size-[6px] rounded-full" style={{ backgroundColor: tone.color }} /> : null}
      {label}
    </span>
  );
}

export function PersonAvatar({ name, url, tone, size = 42 }: { name: string; url?: string | null; tone: Tone; size?: number }) {
  const sources = useMemo(() => {
    if (!url) return [];
    const thumb = avatarSrc(url, size);
    return thumb === url ? [url] : [thumb, url];
  }, [url, size]);
  const [attempt, setAttempt] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  useEffect(() => {
    setAttempt(0);
  }, [sources]);

  const src = sources[attempt];
  const ready = src ? loadedSrc === src || isAvatarLoaded(src) : false;

  return (
    <span
      className="relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold"
      style={{ width: size, height: size, backgroundColor: tone.bg, color: tone.color, fontSize: size >= 48 ? 15 : undefined }}
    >
      {ready ? null : personInitials(name)}
      {src ? (
        <img
          key={src}
          ref={(el) => {
            if (el && !ready && el.complete && el.naturalWidth > 0) {
              markAvatarLoaded(src);
              setLoadedSrc(src);
            }
          }}
          src={src}
          alt=""
          width={size}
          height={size}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          style={{ opacity: ready ? 1 : 0 }}
          onLoad={() => {
            markAvatarLoaded(src);
            setLoadedSrc(src);
          }}
          onError={() => setAttempt((n) => n + 1)}
        />
      ) : null}
    </span>
  );
}
