import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { BLOG_CATEGORIES } from '@/types/api';

type BlogFormSidebarProps = {
  category: string;
  onCategoryChange: (value: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  onImageUpload: (file: File, onProgress?: (percent: number) => void) => Promise<string>;
};

export function BlogFormSidebar({
  category,
  onCategoryChange,
  tags,
  onTagsChange,
  imageUrl,
  onImageUrlChange,
  onImageUpload,
}: BlogFormSidebarProps) {
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addTag(tag: string) {
    const value = tag.trim().slice(0, 50);
    if (!value || tags.includes(value)) return;
    onTagsChange([...tags, value]);
    setTagInput('');
  }

  function removeTag(index: number) {
    onTagsChange(tags.filter((_, i) => i !== index));
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    setUploadProgress(0);
    event.target.value = '';
    try {
      const url = await onImageUpload(file, (p) => setUploadProgress(p));
      onImageUrlChange(url);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Category" />
          <CardBody>
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label="Category"
              className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">None</option>
              {BLOG_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tags" subtitle="Press Enter or comma to add" />
          <CardBody className="space-y-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
                if (e.key === ',') {
                  e.preventDefault();
                  const before = tagInput.split(',')[0]?.trim() ?? '';
                  if (before) addTag(before);
                  setTagInput(tagInput.slice(tagInput.indexOf(',') + 1).trim());
                }
              }}
              onBlur={() => tagInput.trim() && addTag(tagInput)}
              placeholder="Add tag"
              aria-label="Add tag"
              className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="rounded p-0.5 hover:bg-brand-100"
                      aria-label={`Remove ${tag}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Featured image" subtitle="PNG or JPG, max 5MB" />
        <CardBody>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden
          />
          {imageUrl ? (
            <div className="space-y-3">
              <img src={imageUrl} alt="" className="w-full rounded-xl border border-ink-100 object-cover max-h-48" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-2 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
                >
                  {uploading ? 'Uploading…' : 'Replace'}
                </button>
                <button
                  type="button"
                  onClick={() => onImageUrlChange('')}
                  className="px-3 py-2 rounded-xl border border-error-200 text-sm font-medium text-error-700 hover:bg-error-50"
                >
                  Remove
                </button>
              </div>

              {uploading ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-ink-500 font-medium">Uploading</p>
                    <p className="text-xs text-ink-500 font-mono">{uploadProgress}%</p>
                  </div>
                  <div className="w-full bg-ink-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-brand-600" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-xl border-2 border-dashed border-ink-200 px-4 py-8 text-center hover:border-brand-300 hover:bg-brand-50/40 transition-colors disabled:opacity-60"
            >
              <ImagePlus className="w-8 h-8 text-ink-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-ink-700">
                {uploading ? 'Uploading…' : 'Upload image'}
              </p>
              <p className="text-xs text-ink-400 mt-1">Stored on Cloudinary</p>
              {uploading ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-ink-500 font-medium">Uploading</p>
                    <p className="text-xs text-ink-500 font-mono">{uploadProgress}%</p>
                  </div>
                  <div className="w-full bg-ink-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-brand-600" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : null}
            </button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
