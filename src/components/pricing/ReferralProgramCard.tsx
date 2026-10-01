import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  fetchAdminReferralProgram,
  updateAdminReferralProgram,
} from '@/api/adminPricingApi';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type {
  ReferralAudienceSettings,
  ReferralProgram,
  ReferralRewardRule,
} from '@/types/api';

const emptyRule: ReferralRewardRule = {
  enabled: true,
  amount: 0,
  timing: 'first_errand',
  min_errand_amount: 0,
};

const emptyAudience: ReferralAudienceSettings = {
  enabled: true,
  new_user: { ...emptyRule },
  referrer: { ...emptyRule },
  screen_message: '',
  share_message: '',
};

const emptyProgram: ReferralProgram = {
  requester: { ...emptyAudience, new_user: { ...emptyRule }, referrer: { ...emptyRule } },
  runner: { ...emptyAudience, new_user: { ...emptyRule }, referrer: { ...emptyRule } },
};

function RewardFields({
  title,
  help,
  rule,
  onChange,
}: {
  title: string;
  help: string;
  rule: ReferralRewardRule;
  onChange: (next: ReferralRewardRule) => void;
}) {
  return (
    <div className="rounded-xl border border-ink-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-800">{title}</p>
          <p className="text-xs text-ink-500 mt-0.5">{help}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(e) => onChange({ ...rule, enabled: e.target.checked })}
            className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          Pay
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-xs font-medium text-ink-600 mb-1">Amount (₦)</span>
          <input
            type="number"
            min={0}
            step="1"
            value={rule.amount}
            onChange={(e) =>
              onChange({ ...rule, amount: e.target.value === '' ? 0 : Number(e.target.value) })
            }
            className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink-600 mb-1">When</span>
          <select
            value={rule.timing}
            onChange={(e) =>
              onChange({ ...rule, timing: e.target.value as ReferralRewardRule['timing'] })
            }
            className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="signup">At signup</option>
            <option value="first_errand">At first errand</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink-600 mb-1">Minimum errand (₦)</span>
          <input
            type="number"
            min={0}
            step="1"
            disabled={rule.timing !== 'first_errand'}
            value={rule.min_errand_amount}
            onChange={(e) =>
              onChange({
                ...rule,
                min_errand_amount: e.target.value === '' ? 0 : Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-ink-50"
          />
        </label>
      </div>
    </div>
  );
}

function AudienceFields({
  title,
  audience,
  onChange,
}: {
  title: string;
  audience: ReferralAudienceSettings;
  onChange: (next: ReferralAudienceSettings) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <input
            type="checkbox"
            checked={audience.enabled}
            onChange={(e) => onChange({ ...audience, enabled: e.target.checked })}
            className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          Accept referral codes
        </label>
      </div>
      <RewardFields
        title="New user"
        help="Paid to the person who signs up with a code."
        rule={audience.new_user}
        onChange={(new_user) => onChange({ ...audience, new_user })}
      />
      <RewardFields
        title="Referrer"
        help="Paid to the person who shared the code."
        rule={audience.referrer}
        onChange={(referrer) => onChange({ ...audience, referrer })}
      />
      <label className="block">
        <span className="block text-sm font-medium text-ink-700 mb-1.5">On-screen message</span>
        <textarea
          rows={2}
          maxLength={500}
          value={audience.screen_message}
          onChange={(e) => onChange({ ...audience, screen_message: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>
      <label className="block">
        <span className="block text-sm font-medium text-ink-700 mb-1.5">Share message</span>
        <textarea
          rows={3}
          maxLength={500}
          value={audience.share_message}
          onChange={(e) => onChange({ ...audience, share_message: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>
    </section>
  );
}

export function ReferralProgramCard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ReferralProgram>(emptyProgram);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const programQuery = useQuery({
    queryKey: queryKeys.pricing.referralProgram,
    queryFn: fetchAdminReferralProgram,
  });

  useEffect(() => {
    if (programQuery.data?.program) {
      setForm(programQuery.data.program);
    }
  }, [programQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => updateAdminReferralProgram(form),
    onSuccess: (data) => {
      setForm(data.program);
      setError(null);
      setSuccess('Referral program saved.');
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.referralProgram });
    },
    onError: (err) => {
      setSuccess(null);
      setError(getApiErrorMessage(err, 'Failed to save referral program.'));
    },
  });

  const placeholders = programQuery.data?.placeholders ?? [];

  return (
    <Card className="mb-6">
      <CardHeader
        title="Referral program"
        subtitle="Choose who can use a code, who gets paid, when the wallet credit is sent, and the text people see when they share."
      />
      <CardBody className="space-y-6">
        {programQuery.isLoading ? (
          <div className="flex items-center gap-3 text-sm text-ink-500 py-4">
            <span className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            Loading referral program…
          </div>
        ) : null}

        {programQuery.isError ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{getApiErrorMessage(programQuery.error, 'Failed to load referral program.')}</p>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-success-50 text-success-700 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{success}</p>
          </div>
        ) : null}

        {placeholders.length > 0 ? (
          <p className="text-xs text-ink-500">
            Placeholders:{' '}
            {placeholders.map((item) => (
              <span key={item.token} className="mr-3">
                <code>{item.token}</code> {item.help}
              </span>
            ))}
          </p>
        ) : null}

        <AudienceFields
          title="Requesters"
          audience={form.requester}
          onChange={(requester) => setForm({ ...form, requester })}
        />
        <AudienceFields
          title="Runners"
          audience={form.runner}
          onChange={(runner) => setForm({ ...form, runner })}
        />

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saveMutation.isPending || programQuery.isLoading || programQuery.isError}
            onClick={() => {
              setSuccess(null);
              saveMutation.mutate();
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save referral program'}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}
