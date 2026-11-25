import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, Star, Trash2 } from 'lucide-react';
import { uploadAdminPlaceImage } from '@/api/adminPlacesApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { MAX_PLACE_IMAGE_BYTES, MAX_PLACE_IMAGES } from './presentation';

export function PlaceImageGallery({
  images,
  onChange,
  error,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remaining = MAX_PLACE_IMAGES - images.length;

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setUploadError(null);
    setBusy(true);
    try {
      const room = Math.max(0, MAX_PLACE_IMAGES - images.length);
      if (room === 0) {
        setUploadError(`You already have ${MAX_PLACE_IMAGES} photos.`);
        return;
      }

      const accepted = files.slice(0, room);
      const next: string[] = [];
      for (const file of accepted) {
        if (!file.type.startsWith('image/')) {
          setUploadError('Use PNG, JPG, WebP or GIF.');
          continue;
        }
        if (file.size > MAX_PLACE_IMAGE_BYTES) {
          setUploadError('Each photo must be under 1.5MB.');
          continue;
        }
        const uploaded = await uploadAdminPlaceImage(file);
        next.push(uploaded.url);
      }
      if (next.length > 0) onChange([...images, ...next]);
      if (files.length > room) setUploadError(`Only ${room} more photo${room === 1 ? '' : 's'} can be added.`);
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'Upload failed.'));
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (index: number) => onChange(images.filter((_, i) => i !== index));
  const makeCover = (index: number) => {
    if (index === 0) return;
    const next = [...images];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-[8px]">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={handleFiles}
        className="hidden"
        aria-hidden
      />

      <div className="grid grid-cols-3 gap-[8px] sm:grid-cols-4">
        {images.map((src, index) => (
          <div key={`${index}-${src.slice(0, 24)}`} className="group relative aspect-square overflow-hidden rounded-[10px] border border-[#e2e8e3] bg-[#f8faf8]">
            <img src={src} alt="" className="size-full object-cover" />
            {index === 0 ? (
              <span className="absolute left-[6px] top-[6px] rounded-full bg-[#167d35] px-[6px] py-[2px] text-[9px] font-semibold text-white">
                Cover
              </span>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-[4px] bg-gradient-to-t from-black/50 to-transparent p-[6px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              {index !== 0 ? (
                <button
                  type="button"
                  onClick={() => makeCover(index)}
                  className="flex size-[26px] items-center justify-center rounded-[6px] bg-white/95 text-[#17211b]"
                  title="Set as cover"
                  aria-label="Set as cover"
                >
                  <Star className="size-[12px]" strokeWidth={2} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="flex size-[26px] items-center justify-center rounded-[6px] bg-white/95 text-[#b84545]"
                title="Remove"
                aria-label="Remove photo"
              >
                <Trash2 className="size-[12px]" strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}

        {remaining > 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={`flex aspect-square flex-col items-center justify-center gap-[6px] rounded-[10px] border-2 border-dashed px-[8px] text-center transition-colors hover:border-[#a3c9ad] hover:bg-[#f3faf5] disabled:opacity-60 ${
              error ? 'border-[#e5a5a5]' : 'border-[#d4ddd6]'
            }`}
          >
            <ImagePlus className="size-[18px] text-[#a3aca6]" strokeWidth={1.6} />
            <span className="text-[10px] font-semibold text-[#17211b]">{busy ? 'Adding…' : 'Add photos'}</span>
            <span className="text-[9px] text-[#7c857f]">
              {remaining} left · up to {MAX_PLACE_IMAGES}
            </span>
          </button>
        ) : null}
      </div>

      {uploadError ? <span className="text-[10px] text-[#b84545]">{uploadError}</span> : null}
      {!uploadError && error ? <span className="text-[10px] text-[#b84545]">{error}</span> : null}
      {!uploadError && !error ? (
        <span className="text-[10px] text-[#7c857f]">
          First photo is the cover in the table and Explore. PNG, JPG, WebP or GIF up to 1.5MB each (local preview until API upload).
        </span>
      ) : null}
    </div>
  );
}
