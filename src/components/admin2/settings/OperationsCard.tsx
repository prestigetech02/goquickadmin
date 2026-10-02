import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOperationsSettings } from '@/api/adminSettingsBoardApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminSettingsBoard, OperationsSettings, SettingsSection } from '@/types/api';
import { FieldSkeleton, NumberField, SaveFooter, SettingsCard } from './parts';
import { lastChangeText, sameValues } from './presentation';

type Section = SettingsSection<OperationsSettings>;

export function OperationsCard({ section }: { section: Section | null | undefined }) {
  const [saved, setSaved] = useState(false);

  return (
    <SettingsCard id="operations" title="Runner operations" subtitle="How far errands reach runners and how delivery and KYC performance are judged.">
      {section ? (
        <OperationsForm key={JSON.stringify(section.values)} section={section} saved={saved} onSavedChange={setSaved} />
      ) : (
        <FieldSkeleton count={3} />
      )}
    </SettingsCard>
  );
}

function OperationsForm({ section, saved, onSavedChange: setSaved }: { section: Section; saved: boolean; onSavedChange: (saved: boolean) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(section.values);
  const dirty = !sameValues(form, section.values);
  const limit = (key: keyof OperationsSettings, fallback: [number, number]) => section.limits[key] ?? fallback;
  const radius = limit('runner_matching_radius_km', [1, 50]);
  const grace = limit('on_time_grace_minutes', [0, 120]);
  const sla = limit('kyc_review_sla_hours', [1, 168]);
  const inRange = (value: number, [min, max]: [number, number]) => Number.isFinite(value) && value >= min && value <= max;
  const problem = !inRange(form.runner_matching_radius_km, radius)
    ? `Radius must be between ${radius[0]} and ${radius[1]} km.`
    : !inRange(form.on_time_grace_minutes, grace) || !Number.isInteger(form.on_time_grace_minutes)
      ? `Grace period must be a whole number from ${grace[0]} to ${grace[1]} minutes.`
      : !inRange(form.kyc_review_sla_hours, sla) || !Number.isInteger(form.kyc_review_sla_hours)
        ? `KYC review target must be a whole number from ${sla[0]} to ${sla[1]} hours.`
        : null;
  const invalid = problem !== null;

  const save = useMutation({
    mutationFn: () => updateOperationsSettings(form),
    onSuccess: (next) => {
      queryClient.setQueryData<AdminSettingsBoard>(queryKeys.settings.board, (board) => (board ? { ...board, operations: next } : board));
      for (const queryKey of [['admin-dashboard'], queryKeys.runners.all, queryKeys.errands.all]) {
        queryClient.invalidateQueries({ queryKey });
      }
      setSaved(true);
    },
  });

  const set = (key: keyof OperationsSettings) => (value: number) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <NumberField
          label="Runner matching radius"
          help="Runners within this distance of the pickup see new errands and get alerts. Runners in the same city can still see them."
          suffix="km"
          min={radius[0]}
          max={radius[1]}
          step={0.5}
          value={form.runner_matching_radius_km}
          onChange={set('runner_matching_radius_km')}
        />
        <NumberField
          label="On-time grace period"
          help="Minutes allowed past the estimated time before a completed errand counts as late in reports."
          suffix="minutes"
          min={grace[0]}
          max={grace[1]}
          value={form.on_time_grace_minutes}
          onChange={set('on_time_grace_minutes')}
        />
        <NumberField
          label="KYC review target"
          help="Complete runner verifications waiting longer than this are flagged as overdue."
          suffix="hours"
          min={sla[0]}
          max={sla[1]}
          value={form.kyc_review_sla_hours}
          onChange={set('kyc_review_sla_hours')}
        />
      </div>
      <SaveFooter
        meta={lastChangeText(section.last_change)}
        dirty={dirty}
        invalid={invalid}
        saving={save.isPending}
        saved={saved}
        error={save.isError ? getApiErrorMessage(save.error, 'Could not save operations settings.') : dirty ? problem : null}
        onDiscard={() => {
          save.reset();
          setForm(section.values);
        }}
        onSave={() => save.mutate()}
      />
    </>
  );
}
