import { Drawer } from '@/components/ui/Drawer';
import { PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { categoryLabel, coordsLabel, placeFullAddress, type AdminPlace, type AdminPlaceCategory } from './presentation';

export function PlaceViewDrawer({
  place,
  categories,
  onClose,
  onEdit,
}: {
  place: AdminPlace;
  categories: AdminPlaceCategory[];
  onClose: () => void;
  onEdit: (place: AdminPlace) => void;
}) {
  const categoryName = categoryLabel(place.category, categories);
  return (
    <Drawer
      open
      onClose={onClose}
      width="xl"
      title={place.name}
      subtitle={`${categoryName} · ${place.is_active ? 'Active in Explore' : 'Paused'}`}
      footer={
        <div className="flex items-center justify-end gap-[8px]">
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
          >
            Close
          </button>
          <button type="button" onClick={() => onEdit(place)} className={PRIMARY_BUTTON}>
            Edit place
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-[18px] font-inter">
        {place.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-3">
            {place.images.map((src, index) => (
              <div key={`${index}-${src.slice(0, 24)}`} className="relative aspect-square overflow-hidden rounded-[10px] border border-[#e2e8e3] bg-[#f8faf8]">
                <img src={src} alt="" className="size-full object-cover" />
                {index === 0 ? (
                  <span className="absolute left-[6px] top-[6px] rounded-full bg-[#167d35] px-[6px] py-[2px] text-[9px] font-semibold text-white">
                    Cover
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-[10px] border border-dashed border-[#d4ddd6] px-[12px] py-[20px] text-center text-[11px] text-[#7c857f]">
            No photos yet
          </p>
        )}

        <section className="flex flex-col gap-[6px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">Description</p>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#17211b]">
            {place.description?.trim() || 'No description'}
          </p>
        </section>

        <section className="grid grid-cols-1 gap-[12px] rounded-[12px] border border-[#e2e8e3] bg-[#f8faf8] p-[14px] sm:grid-cols-2">
          <Detail label="Address line" value={place.address_line || '—'} className="sm:col-span-2" />
          <Detail label="Area" value={place.area || '—'} />
          <Detail label="City / LGA" value={place.city || '—'} />
          <Detail label="State" value={place.state || '—'} />
          <Detail label="Full address" value={placeFullAddress(place)} />
          <Detail label="Coordinates" value={coordsLabel(place.latitude, place.longitude)} mono />
          <Detail label="Phone" value={place.phone || '—'} />
          <Detail label="Category" value={categoryName} />
          <Detail label="Status" value={place.is_active ? 'Active' : 'Paused'} className="sm:col-span-2" />
          {place.notes?.trim() ? (
            <Detail label="Internal notes" value={place.notes} className="sm:col-span-2" />
          ) : null}
        </section>
      </div>
    </Drawer>
  );
}

function Detail({
  label,
  value,
  mono = false,
  className = '',
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-[3px] ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">{label}</span>
      <span className={`text-[12px] font-medium text-[#17211b] ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</span>
    </div>
  );
}
