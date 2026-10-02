import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { BlogBoardPost } from '@/types/api';
import { Chip } from '../errand/parts';
import { formatCount, formatPct, relativeAgo } from '../format';
import { Card } from '../overview/primitives';
import { fullWhenLabel, statusChip } from './presentation';

export const FIELD_INPUT =
  'h-[38px] w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-[12px] text-[#17211b] outline-none placeholder:text-[#a3aca6] focus:border-[#167d35]';

function SideCard({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-[10px] p-[16px]">
      <div className="flex flex-col gap-[2px]">
        <p className="text-[13px] font-semibold text-[#17211b]">{title}</p>
        {hint ? <p className="text-[10px] text-[#7c857f]">{hint}</p> : null}
      </div>
      {children}
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-[#7c857f]">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-[#17211b]">{value}</span>
    </div>
  );
}

export function PublishingCard({ post }: { post: BlogBoardPost | null }) {
  if (!post) {
    return (
      <SideCard title="Publishing">
        <Fact label="Status" value={<Chip tone={statusChip('draft').tone} label="New draft" dot />} />
        <p className="text-[10px] leading-relaxed text-[#7c857f]">Save it as a draft, send it to an editor for review, schedule it, or publish it straight away.</p>
      </SideCard>
    );
  }

  const chip = statusChip(post.status);
  const engagedRate = post.views > 0 ? (post.engaged_reads / post.views) * 100 : null;
  return (
    <SideCard title="Publishing">
      <Fact label="Status" value={<Chip tone={chip.tone} label={chip.label} dot />} />
      {post.status === 'published' ? <Fact label="Published" value={fullWhenLabel(post.published_at)} /> : null}
      {post.status === 'scheduled' ? <Fact label="Goes live" value={fullWhenLabel(post.published_at)} /> : null}
      {post.status === 'review' ? <Fact label="Sent for review" value={relativeAgo(post.review_requested_at)} /> : null}
      {post.status === 'archived' ? <Fact label="Archived" value={relativeAgo(post.archived_at)} /> : null}
      <Fact label="Author" value={post.author?.name ?? '—'} />
      <Fact label="Last edited" value={relativeAgo(post.updated_at)} />
      {post.views > 0 || post.status === 'published' ? (
        <>
          <Fact label="Views" value={formatCount(post.views)} />
          <Fact label="Engaged reads" value={`${formatCount(post.engaged_reads)}${engagedRate != null ? ` · ${formatPct(engagedRate, 0)}` : ''}`} />
        </>
      ) : null}
    </SideCard>
  );
}

export function CategoryField({ value, onChange, suggestions }: { value: string; onChange: (value: string) => void; suggestions: string[] }) {
  return (
    <SideCard title="Category" hint="Pick one or type a new category">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 100))}
        list="blog-category-options"
        placeholder="e.g. Safety"
        className={FIELD_INPUT}
        aria-label="Category"
      />
      <datalist id="blog-category-options">
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </SideCard>
  );
}

export function TagsField({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = (raw: string) => {
    const value = raw.trim().slice(0, 50);
    setInput('');
    if (!value || tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) return;
    onChange([...tags, value]);
  };

  return (
    <SideCard title="Tags" hint="Press Enter or comma to add">
      <input
        value={input}
        onChange={(event) => {
          const next = event.target.value;
          if (next.includes(',')) next.split(',').slice(0, -1).forEach(add);
          setInput(next.includes(',') ? (next.split(',').pop() ?? '') : next);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add(input);
          } else if (event.key === 'Backspace' && !input && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => input.trim() && add(input)}
        placeholder="Add a tag"
        className={FIELD_INPUT}
        aria-label="Add tag"
      />
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-[6px]">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-[4px] rounded-full bg-[#eaf6ed] py-[3px] pl-[9px] pr-[5px] text-[10px] font-semibold text-[#0d5e27]">
              {tag}
              <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`Remove ${tag}`} className="rounded-full p-[1px] hover:bg-[#d3ebd9]">
                <X className="size-[11px]" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </SideCard>
  );
}

export function ImageField({
  value,
  onChange,
  onUpload,
}: {
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File, onProgress: (percent: number) => void) => Promise<string>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setProgress(0);
    try {
      onChange(await onUpload(file, setProgress));
    } catch {
      // The page shows the upload error.
    } finally {
      setProgress(null);
    }
  };

  const uploading = progress != null;

  return (
    <SideCard title="Featured image" hint="Shown on the blog card and at the top of the post · PNG or JPG, up to 5MB">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" aria-hidden />
      {value ? (
        <div className="flex flex-col gap-[8px]">
          <img src={value} alt="" className="aspect-[16/9] w-full rounded-[8px] border border-[#e2e8e3] object-cover" />
          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="h-[32px] rounded-[7px] border border-[#d4ddd6] px-[11px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
            >
              {uploading ? `Uploading ${progress}%` : 'Replace'}
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              disabled={uploading}
              className="h-[32px] rounded-[7px] border border-[#f1d4d4] px-[11px] text-[11px] font-semibold text-[#b84545] hover:bg-[#fff0f0] disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center gap-[6px] rounded-[9px] border-2 border-dashed border-[#d4ddd6] px-[12px] py-[22px] text-center transition-colors hover:border-[#a3c9ad] hover:bg-[#f3faf5] disabled:opacity-70"
        >
          <ImagePlus className="size-[22px] text-[#a3aca6]" strokeWidth={1.6} />
          <span className="text-[11px] font-semibold text-[#17211b]">{uploading ? `Uploading ${progress}%` : 'Upload image'}</span>
          {uploading ? (
            <span className="h-[4px] w-full overflow-hidden rounded-full bg-[#e2e8e3]">
              <span className="block h-full bg-[#167d35] transition-[width]" style={{ width: `${progress}%` }} />
            </span>
          ) : null}
        </button>
      )}
    </SideCard>
  );
}
