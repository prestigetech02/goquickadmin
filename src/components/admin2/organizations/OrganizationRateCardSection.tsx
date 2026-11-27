import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  updateAdminOrganization,
  type AdminOrganization,
  type AdminOrgRateCardMode,
  type AdminOrgRateCardZone,
} from '@/api/adminOrganizationsApi';
import { fetchAdminZones } from '@/api/adminZonesApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';

const MODE_HELP: Record<AdminOrgRateCardMode, string> = {
  marketplace: 'Fallback when pickup is not in a priced zone: use global fare rules. Org minimum still applies.',
  uplift: 'Fallback when pickup is not in a priced zone: multiply engine quote by (1 + uplift%).',
  fixed: 'Fallback when pickup is not in a priced zone: charge this flat org fee.',
};

type ZoneDraft = {
  key: string;
  zone_id: string;
  fixed_amount: string;
};

function numOrEmpty(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return String(value);
}

function zonesToDraft(zones: AdminOrgRateCardZone[] | undefined): ZoneDraft[] {
  return (zones ?? []).map((z, index) => ({
    key: `existing-${z.id ?? z.zone_id}-${index}`,
    zone_id: String(z.zone_id),
    fixed_amount: numOrEmpty(z.fixed_amount),
  }));
}

export function OrganizationRateCardSection({
  org,
  onNotice,
}: {
  org: AdminOrganization;
  onNotice: (tone: 'ok' | 'error', text: string) => void;
}) {
  const queryClient = useQueryClient();
  const card = org.rate_card;
  const [enabled, setEnabled] = useState(Boolean(card?.enabled));
  const [mode, setMode] = useState<AdminOrgRateCardMode>(
    card?.mode === 'fixed' || card?.mode === 'marketplace' || card?.mode === 'uplift'
      ? card.mode
      : 'uplift',
  );
  const [uplift, setUplift] = useState(numOrEmpty(card?.uplift_percent));
  const [fixed, setFixed] = useState(numOrEmpty(card?.fixed_amount));
  const [minimum, setMinimum] = useState(numOrEmpty(card?.minimum_amount));
  const [zoneLines, setZoneLines] = useState<ZoneDraft[]>(() => zonesToDraft(card?.zones));

  const zonesQuery = useQuery({
    // Laravel boolean query rules accept 1/0, not the string "true".
    queryKey: queryKeys.zones.list({ per_page: 50, active: 1 }),
    queryFn: () => fetchAdminZones({ per_page: 50, active: 1 }),
  });

  const serviceZones = useMemo(() => {
    const rows = zonesQuery.data?.zones ?? [];
    return [...rows].sort((a, b) => {
      const left = `${a.city ?? ''} ${a.name}`.trim().toLowerCase();
      const right = `${b.city ?? ''} ${b.name}`.trim().toLowerCase();
      return left.localeCompare(right);
    });
  }, [zonesQuery.data?.zones]);

  useEffect(() => {
    setEnabled(Boolean(card?.enabled));
    setMode(
      card?.mode === 'fixed' || card?.mode === 'marketplace' || card?.mode === 'uplift'
        ? card.mode
        : 'uplift',
    );
    setUplift(numOrEmpty(card?.uplift_percent));
    setFixed(numOrEmpty(card?.fixed_amount));
    setMinimum(numOrEmpty(card?.minimum_amount));
    setZoneLines(zonesToDraft(card?.zones));
  }, [
    card?.enabled,
    card?.mode,
    card?.uplift_percent,
    card?.fixed_amount,
    card?.minimum_amount,
    card?.zones,
    org.id,
  ]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const upliftNum = uplift.trim() === '' ? 0 : Number(uplift);
      const fixedNum = fixed.trim() === '' ? null : Number(fixed);
      const minNum = minimum.trim() === '' ? null : Number(minimum);
      if (Number.isNaN(upliftNum) || upliftNum < -90 || upliftNum > 500) {
        throw new Error('Uplift % must be between -90 and 500.');
      }
      if (fixedNum !== null && (Number.isNaN(fixedNum) || fixedNum < 0)) {
        throw new Error('Fixed amount must be a non-negative number.');
      }
      if (minNum !== null && (Number.isNaN(minNum) || minNum < 0)) {
        throw new Error('Minimum amount must be a non-negative number.');
      }
      if (enabled && mode === 'fixed' && (fixedNum === null || fixedNum <= 0) && zoneLines.length === 0) {
        throw new Error('Fixed mode needs an org fixed amount, or at least one zone price.');
      }

      const seen = new Set<number>();
      const rateCardZones = zoneLines.map((line, index) => {
        const zoneId = Number(line.zone_id);
        const amount = Number(line.fixed_amount);
        if (!zoneId || Number.isNaN(zoneId)) {
          throw new Error(`Zone row ${index + 1}: pick a service zone.`);
        }
        if (Number.isNaN(amount) || amount <= 0) {
          throw new Error(`Zone row ${index + 1}: enter a fixed amount greater than 0.`);
        }
        if (seen.has(zoneId)) {
          throw new Error('Each service zone can only appear once.');
        }
        seen.add(zoneId);
        return { zone_id: zoneId, fixed_amount: amount, is_active: true };
      });

      return updateAdminOrganization(org.id, {
        rate_card_enabled: enabled,
        rate_card_mode: mode,
        rate_card_uplift_percent: upliftNum,
        rate_card_fixed_amount: fixedNum,
        rate_card_minimum_amount: minNum,
        rate_card_zones: rateCardZones,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(org.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      onNotice(
        'ok',
        'Rate card saved. Zone prices apply when pickup matches that service zone; otherwise the org fallback rules apply.',
      );
    },
    onError: (error) => onNotice('error', getApiErrorMessage(error, 'Could not save rate card.')),
  });

  const usedZoneIds = new Set(zoneLines.map((z) => Number(z.zone_id)).filter(Boolean));

  return (
    <section className="flex flex-col gap-[12px] rounded-[12px] border border-[#e2e8e3] p-[14px]">
      <div className="flex flex-wrap items-start justify-between gap-[10px]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">
            Partner rate card
          </p>
          <p className="mt-[4px] max-w-[560px] text-[12px] text-[#45514a]">
            Set flat fees by service zone (e.g. Ikeja → ₦5,000). Matched zone prices win. Org mode below is
            the fallback. Partner <code className="text-[11px]">budget_max</code> always overrides.
          </p>
        </div>
        <label className="flex items-center gap-[8px] text-[12px] font-semibold text-[#17211b]">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-[16px] w-[16px] accent-[#167d35]"
          />
          Enabled
        </label>
      </div>

      <div className="flex flex-col gap-[8px] rounded-[10px] border border-[#e2e8e3] bg-[#f8faf8] p-[12px]">
        <div className="flex flex-wrap items-center justify-between gap-[8px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">
            Prices by zone
          </p>
          <button
            type="button"
            disabled={!enabled}
            onClick={() =>
              setZoneLines((prev) => [
                ...prev,
                { key: `new-${Date.now()}`, zone_id: '', fixed_amount: '' },
              ])
            }
            className="h-[30px] rounded-[8px] border border-[#d4ddd6] bg-white px-[10px] text-[11px] font-semibold text-[#17211b] hover:bg-white disabled:opacity-50"
          >
            Add zone
          </button>
        </div>

        {zonesQuery.isError ? (
          <p className="text-[11px] text-[#b84545]">
            {getApiErrorMessage(zonesQuery.error, 'Could not load service zones.')}
          </p>
        ) : null}

        {zoneLines.length === 0 ? (
          <p className="text-[12px] text-[#7c857f]">
            No zone prices yet. Add Ikeja, Lekki, etc. from your service zones list.
          </p>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {zoneLines.map((line) => (
              <div key={line.key} className="grid grid-cols-1 gap-[8px] sm:grid-cols-[1fr_140px_auto]">
                <select
                  value={line.zone_id}
                  disabled={!enabled}
                  onChange={(e) =>
                    setZoneLines((prev) =>
                      prev.map((row) =>
                        row.key === line.key ? { ...row, zone_id: e.target.value } : row,
                      ),
                    )
                  }
                  className="h-[36px] rounded-[8px] border border-[#e2e8e3] bg-white px-[10px] text-[12px] outline-none focus:border-[#167d35] disabled:bg-[#f3f5f3]"
                >
                  <option value="">Select zone…</option>
                  {serviceZones.map((zone) => {
                    const taken = usedZoneIds.has(zone.id) && Number(line.zone_id) !== zone.id;
                    const label =
                      zone.city && zone.state
                        ? `${zone.city}, ${zone.state}`
                        : zone.name || `Zone #${zone.id}`;
                    return (
                      <option key={zone.id} value={zone.id} disabled={taken}>
                        {label}
                        {!zone.active ? ' (inactive)' : ''}
                      </option>
                    );
                  })}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={line.fixed_amount}
                  disabled={!enabled}
                  onChange={(e) =>
                    setZoneLines((prev) =>
                      prev.map((row) =>
                        row.key === line.key ? { ...row, fixed_amount: e.target.value } : row,
                      ),
                    )
                  }
                  placeholder="₦ amount"
                  className="h-[36px] rounded-[8px] border border-[#e2e8e3] px-[10px] text-[12px] outline-none focus:border-[#167d35] disabled:bg-[#f3f5f3]"
                />
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => setZoneLines((prev) => prev.filter((row) => row.key !== line.key))}
                  className="h-[36px] rounded-[8px] border border-[#e5a5a5] bg-[#fdeded] px-[12px] text-[12px] font-semibold text-[#b84545] hover:bg-[#fbe4e4] disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-[8px]">
        {(['uplift', 'fixed', 'marketplace'] as AdminOrgRateCardMode[]).map((option) => (
          <button
            key={option}
            type="button"
            disabled={!enabled}
            onClick={() => setMode(option)}
            className={`h-[34px] rounded-[8px] px-[12px] text-[12px] font-semibold capitalize disabled:opacity-50 ${
              mode === option
                ? 'bg-[#167d35] text-white'
                : 'border border-[#d4ddd6] bg-white text-[#17211b] hover:bg-[#f8faf8]'
            }`}
          >
            Fallback: {option}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[#7c857f]">{MODE_HELP[mode]}</p>

      <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-3">
        <label className="flex flex-col gap-[4px]">
          <span className="text-[11px] font-semibold text-[#7c857f]">Uplift %</span>
          <input
            type="number"
            step="0.01"
            value={uplift}
            disabled={!enabled || mode !== 'uplift'}
            onChange={(e) => setUplift(e.target.value)}
            placeholder="e.g. 15"
            className="h-[36px] rounded-[8px] border border-[#e2e8e3] px-[10px] text-[12px] outline-none focus:border-[#167d35] disabled:bg-[#f3f5f3]"
          />
        </label>
        <label className="flex flex-col gap-[4px]">
          <span className="text-[11px] font-semibold text-[#7c857f]">Fixed amount (₦)</span>
          <input
            type="number"
            step="1"
            min="0"
            value={fixed}
            disabled={!enabled || mode !== 'fixed'}
            onChange={(e) => setFixed(e.target.value)}
            placeholder="e.g. 2500"
            className="h-[36px] rounded-[8px] border border-[#e2e8e3] px-[10px] text-[12px] outline-none focus:border-[#167d35] disabled:bg-[#f3f5f3]"
          />
        </label>
        <label className="flex flex-col gap-[4px]">
          <span className="text-[11px] font-semibold text-[#7c857f]">Minimum (₦)</span>
          <input
            type="number"
            step="1"
            min="0"
            value={minimum}
            disabled={!enabled}
            onChange={(e) => setMinimum(e.target.value)}
            placeholder="optional floor"
            className="h-[36px] rounded-[8px] border border-[#e2e8e3] px-[10px] text-[12px] outline-none focus:border-[#167d35] disabled:bg-[#f3f5f3]"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-[8px] border-t border-[#e2e8e3] pt-[12px]">
        <p className="text-[10px] text-[#7c857f]">
          {enabled
            ? `${zoneLines.length} zone price${zoneLines.length === 1 ? '' : 's'} · fallback ${mode}${
                mode === 'uplift' && uplift ? ` ${uplift}%` : ''
              }${mode === 'fixed' && fixed ? ` ₦${fixed}` : ''}${minimum ? ` · min ₦${minimum}` : ''}`
            : 'Disabled — Partner quotes use marketplace fare rules only.'}
        </p>
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white hover:bg-[#136b2d] disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save rate card'}
        </button>
      </div>
    </section>
  );
}
