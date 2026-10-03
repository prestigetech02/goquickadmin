import { Cloud, Database, HardDrive, Layers, Mail, MapPin, Send, Server, Smartphone, WalletCards, Zap, type LucideIcon } from 'lucide-react';
import type { SystemHealthComponent } from '@/types/api';
import { Chip } from '../errand/parts';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { latencyTone, splitComponents, statusLabel, statusTone } from './healthPresentation';

const ICONS: Record<string, LucideIcon> = {
  database: Database,
  cache: Zap,
  queue: Layers,
  storage: HardDrive,
  paystack: WalletCards,
  flutterwave: Send,
  email: Mail,
  cloudinary: Cloud,
  google_maps: MapPin,
  firebase: Smartphone,
  fcm_tokens: Smartphone,
};

function ComponentRow({ component }: { component: SystemHealthComponent }) {
  const tone = statusTone(component.status);
  const Icon = ICONS[component.key] ?? Server;
  return (
    <div className="flex items-center gap-[12px] border-b border-[#eef2ef] px-[16px] py-[11px] last:border-b-0">
      <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: tone.bg }}>
        <Icon className="size-[15px]" strokeWidth={1.8} color={tone.color} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-[#17211b]">{component.label}</p>
        <p className="truncate text-[10px] text-[#7c857f]" title={component.message}>
          {component.message}
        </p>
      </div>
      {component.latency_ms != null ? (
        <span
          className="flex-shrink-0 rounded-full px-[7px] py-[3px] font-mono text-[10px] font-semibold"
          style={{ backgroundColor: latencyTone(component.latency_ms).bg, color: latencyTone(component.latency_ms).color }}
        >
          {component.latency_ms} ms
        </span>
      ) : null}
      <Chip tone={tone} label={statusLabel(component.status)} dot />
    </div>
  );
}

export function HealthComponentsCard({ components, loading }: { components: SystemHealthComponent[] | undefined; loading: boolean }) {
  const { core, integrations } = splitComponents(components ?? []);

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <div className="px-[16px] pb-[10px] pt-[16px]">
        <CardTitle title="Infrastructure & integrations" subtitle="Live checks run each time this page refreshes" />
      </div>
      {loading && !components ? (
        <div className="flex flex-col gap-[10px] px-[16px] pb-[16px]">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[38px] w-full" />
          ))}
        </div>
      ) : (
        <>
          <p className="bg-[#f8faf8] px-[16px] py-[6px] text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">Core services</p>
          {core.map((c) => (
            <ComponentRow key={c.key} component={c} />
          ))}
          <p className="bg-[#f8faf8] px-[16px] py-[6px] text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">Third-party services</p>
          {integrations.map((c) => (
            <ComponentRow key={c.key} component={c} />
          ))}
        </>
      )}
    </Card>
  );
}
