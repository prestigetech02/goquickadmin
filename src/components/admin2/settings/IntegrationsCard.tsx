import { Plug } from 'lucide-react';
import type { AdminSettingsBoard } from '@/types/api';
import { Chip } from '../errand/parts';
import { Skeleton } from '../overview/primitives';
import { AMBER, GREEN } from '../userDetails/presentation';
import { SettingsCard } from './parts';

export function IntegrationsCard({ board }: { board: AdminSettingsBoard | undefined }) {
  const integrations = board?.integrations;
  const connected = integrations?.filter((i) => i.configured).length ?? 0;

  return (
    <SettingsCard
      id="integrations"
      title="Integrations"
      subtitle={
        board
          ? `${connected} of ${integrations?.length ?? 0} connected · ${board.environment.environment} · ${board.environment.timezone}`
          : 'Third-party services that power payments, maps, messaging and uploads.'
      }
    >
      <ul className="flex flex-col divide-y divide-[#eef1ee]">
        {!integrations
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="py-[10px]">
                <Skeleton className="h-[28px] w-full" />
              </li>
            ))
          : integrations.map((item) => (
              <li key={item.key} className="flex items-center gap-[10px] py-[10px]">
                <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[#f3faf5] text-[#167d35]">
                  <Plug className="size-[14px]" strokeWidth={1.8} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="truncate text-[12px] font-semibold text-[#17211b]">{item.label}</span>
                  <span className="truncate text-[10px] text-[#7c857f]">{item.purpose}</span>
                </div>
                {item.configured ? <Chip tone={GREEN} label="Connected" dot /> : <Chip tone={AMBER} label="Not configured" dot />}
              </li>
            ))}
      </ul>
      <p className="text-[10px] leading-[1.45] text-[#7c857f]">
        Keys are managed in the server configuration and never shown here. Ask an engineer to connect a missing service.
      </p>
    </SettingsCard>
  );
}
