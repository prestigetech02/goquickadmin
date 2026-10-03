import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminPlatformFees, updateAdminPlatformFees } from '@/api/adminPricingApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { PlatformFeesResponse } from '@/types/api';
import { SectionLink } from '../errand/parts';
import { FieldSkeleton, LoadError, NumberField, SaveFooter, SettingsCard } from './parts';
import { sameValues } from './presentation';

export function FeesCard({ onOpenFareRules }: { onOpenFareRules?: () => void }) {
  const query = useQuery({ queryKey: queryKeys.pricing.fees, queryFn: fetchAdminPlatformFees });
  const [saved, setSaved] = useState(false);

  return (
    <SettingsCard
      id="pricing"
      title="Fees & commission"
      subtitle="Platform-wide charges applied to every errand, cancellation and withdrawal."
      action={onOpenFareRules ? <SectionLink onClick={onOpenFareRules}>Manage fare rules</SectionLink> : null}
    >
      {query.isError ? <LoadError text={getApiErrorMessage(query.error, 'Could not load platform fees.')} /> : null}
      {query.data ? (
        <FeesForm key={JSON.stringify(query.data.fees)} data={query.data} saved={saved} onSavedChange={setSaved} />
      ) : query.isLoading ? (
        <FieldSkeleton count={4} />
      ) : null}
    </SettingsCard>
  );
}

function FeesForm({ data, saved, onSavedChange: setSaved }: { data: PlatformFeesResponse; saved: boolean; onSavedChange: (saved: boolean) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(data.fees);
  const dirty = !sameValues(form, data.fees);
  const invalid = data.fields.some((field) => !Number.isFinite(form[field.key]) || form[field.key] < 0 || (field.unit === 'percent' && form[field.key] > 100));

  const save = useMutation({
    mutationFn: () => updateAdminPlatformFees(form),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.pricing.fees, response);
      setSaved(true);
    },
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
        {data.fields.map((field) => {
          const percent = field.unit === 'percent';
          return (
            <NumberField
              key={field.key}
              label={field.label}
              help={field.help}
              value={form[field.key]}
              onChange={(value) => {
                setSaved(false);
                setForm((current) => ({ ...current, [field.key]: value }));
              }}
              prefix={percent ? undefined : '₦'}
              suffix={percent ? '%' : undefined}
              min={0}
              max={percent ? 100 : undefined}
              step={percent ? 0.1 : 50}
            />
          );
        })}
      </div>
      <SaveFooter
        meta="Applies to new errands and withdrawals as soon as it is saved."
        dirty={dirty}
        invalid={invalid}
        saving={save.isPending}
        saved={saved}
        error={save.isError ? getApiErrorMessage(save.error, 'Could not save fees.') : null}
        onDiscard={() => {
          save.reset();
          setForm(data.fees);
        }}
        onSave={() => save.mutate()}
      />
    </>
  );
}
