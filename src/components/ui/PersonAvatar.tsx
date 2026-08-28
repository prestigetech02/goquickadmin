import { useEffect, useState } from 'react';

type Size = 'sm' | 'md' | 'lg';

const sizeClass: Record<Size, string> = {
  sm: 'w-9 h-9 text-sm',
  md: 'w-14 h-14 text-xl',
  lg: 'w-16 h-16 text-2xl',
};

export function PersonAvatar({
  name,
  src,
  size = 'sm',
  className = '',
}: {
  name: string;
  src?: string | null;
  size?: Size;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  const showPhoto = Boolean(src) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={`${sizeClass[size]} rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden ${className}`}
    >
      {showPhoto ? (
        <img
          src={src!}
          alt={name}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        letter
      )}
    </div>
  );
}
