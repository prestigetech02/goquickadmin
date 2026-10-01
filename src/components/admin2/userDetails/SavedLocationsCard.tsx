import { Building2, Heart, House, MapPin } from 'lucide-react';
import type { AdminUserProfile } from '@/types/api';
import { Card } from '../overview/primitives';
import { SectionHeader } from '../errand/parts';

function placeIcon(label: string) {
  const name = label.toLowerCase();
  if (/home|house/.test(name)) return House;
  if (/work|office|shop|store/.test(name)) return Building2;
  if (/mum|mom|dad|family|friend|love/.test(name)) return Heart;
  return MapPin;
}

function mapsHref(place: AdminUserProfile['saved_places'][number]): string {
  const query = place.latitude != null && place.longitude != null ? `${place.latitude},${place.longitude}` : place.address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function SavedLocationsCard({ places }: { places: AdminUserProfile['saved_places'] }) {
  return (
    <Card className="flex w-full flex-col gap-[12px] p-[18px]">
      <SectionHeader title="Saved locations" subtitle="Frequently used pickup and delivery addresses" />
      {places.length === 0 ? (
        <p className="rounded-[8px] bg-[#f8faf8] p-[12px] text-[11px] text-[#7c857f]">No saved places yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-3">
          {places.map((place) => {
            const Icon = placeIcon(place.label);
            return (
              <a
                key={place.id}
                href={mapsHref(place)}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 flex-col gap-[7px] rounded-[8px] bg-[#f8faf8] p-[12px] transition-colors hover:bg-[#eef3ef]"
              >
                <span className="flex items-center gap-[8px]">
                  <Icon className="size-[15px] flex-shrink-0 text-[#167d35]" strokeWidth={1.8} />
                  <span className="truncate text-[11px] text-[#17211b]">{place.label}</span>
                </span>
                <span className="text-[10px] leading-[1.4] text-[#45514a]">{place.address}</span>
                <span className="text-[9px] text-[#7c857f]">Open in Google Maps ↗</span>
              </a>
            );
          })}
        </div>
      )}
    </Card>
  );
}
