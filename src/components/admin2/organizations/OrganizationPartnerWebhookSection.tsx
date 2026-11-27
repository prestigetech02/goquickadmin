import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminOrganizationWebhook,
  fetchAdminOrganizationWebhookDeliveries,
  upsertAdminOrganizationWebhook,
  type AdminOrganization,
} from '@/api/adminOrganizationsApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';

export function OrganizationPartnerWebhookSection({
  org,
  onNotice,
}: {
  org: AdminOrganization;
  onNotice: (tone: 'ok' | 'error', text: string) => void;
}) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  const webhookQuery = useQuery({
    queryKey: queryKeys.organizations.webhook(org.id),
    queryFn: () => fetchAdminOrganizationWebhook(org.id),
  });

  const deliveriesQuery = useQuery({
    queryKey: queryKeys.organizations.webhookDeliveries(org.id, { page: 1, per_page: 10 }),
    queryFn: () => fetchAdminOrganizationWebhookDeliveries(org.id, { page: 1, per_page: 10 }),
  });

  const endpoint = webhookQuery.data?.endpoint ?? null;
  const deliveries = deliveriesQuery.data?.deliveries ?? [];

  useEffect(() => {
    if (endpoint?.url) setUrl(endpoint.url);
  }, [endpoint?.url]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.webhook(org.id) });
    void queryClient.invalidateQueries({ queryKey: ['admin-organizations', 'webhook-deliveries', org.id] });
  };

  const saveMutation = useMutation({
    mutationFn: (rotate: boolean) =>
      upsertAdminOrganizationWebhook(org.id, {
        url: url.trim(),
        is_active: true,
        rotate_secret: rotate,
      }),
    onSuccess: (result, rotate) => {
      invalidate();
      if (result.endpoint.secret) setFreshSecret(result.endpoint.secret);
      onNotice('ok', rotate || result.endpoint.secret ? 'Webhook saved. Copy the signing secret now.' : 'Webhook saved.');
    },
    onError: (error) => onNotice('error', getApiErrorMessage(error, 'Could not save webhook.')),
  });

  const busy = saveMutation.isPending;

  return (
    <section className="flex flex-col gap-[12px] rounded-[12px] border border-[#e2e8e3] p-[14px]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">Partner webhooks</p>
        <p className="mt-1 text-[12px] text-[#45514a]">
          Outbound signed events (`job.created`, `job.assigned`, `job.status_changed`, `job.completed`,
          `job.cancelled`) when org jobs change.
        </p>
      </div>

      {freshSecret ? (
        <div className="rounded-[10px] border border-[#cfe8d6] bg-[#eaf6ed] px-[12px] py-[10px]">
          <p className="text-[11px] font-semibold text-[#0d5e27]">Signing secret (copy now)</p>
          <p className="mt-1 break-all font-mono text-[11px] text-[#17211b]">{freshSecret}</p>
          <button
            type="button"
            className="mt-2 h-[30px] rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[11px] font-semibold"
            onClick={() => setFreshSecret(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <label className="flex flex-col gap-[4px]">
        <span className="text-[11px] font-semibold text-[#7c857f]">Webhook URL</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://partner.example.com/goquick/webhooks"
          className="h-[36px] rounded-[8px] border border-[#e2e8e3] px-[10px] text-[12px] outline-none focus:border-[#167d35]"
        />
      </label>
      {endpoint ? (
        <p className="text-[10px] text-[#7c857f]">
          {endpoint.is_active ? 'Active' : 'Inactive'} · Secret {endpoint.secret_hint ?? '—'}
        </p>
      ) : (
        <p className="text-[10px] text-[#7c857f]">No webhook configured yet.</p>
      )}

      <div className="flex flex-wrap gap-[8px]">
        <button
          type="button"
          disabled={busy || !url.trim()}
          onClick={() => saveMutation.mutate(false)}
          className="h-[34px] rounded-[8px] bg-[#167d35] px-[12px] text-[12px] font-semibold text-white disabled:opacity-50"
        >
          {endpoint ? 'Save URL' : 'Create webhook'}
        </button>
        {endpoint ? (
          <button
            type="button"
            disabled={busy || !url.trim()}
            onClick={() => {
              if (window.confirm('Rotate signing secret? Partners must update their verifier.')) {
                saveMutation.mutate(true);
              }
            }}
            className="h-[34px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[12px] font-semibold text-[#17211b] disabled:opacity-50"
          >
            Rotate secret
          </button>
        ) : null}
      </div>

      <div className="border-t border-[#e2e8e3] pt-[12px]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">
          Recent deliveries
        </p>
        {deliveriesQuery.isLoading ? (
          <p className="text-[12px] text-[#7c857f]">Loading…</p>
        ) : deliveries.length === 0 ? (
          <p className="text-[12px] text-[#7c857f]">No deliveries yet.</p>
        ) : (
          <ul className="flex flex-col gap-[6px]">
            {deliveries.map((d) => (
              <li key={d.id} className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[8px] text-[11px]">
                <p className="font-semibold text-[#17211b]">
                  {d.event}{' '}
                  <span className={d.success ? 'text-[#0d5e27]' : 'text-[#b84545]'}>
                    {d.success ? 'OK' : 'FAIL'}
                  </span>
                  {d.response_status != null ? ` · HTTP ${d.response_status}` : ''}
                  {` · try #${d.attempt}`}
                </p>
                <p className="text-[#7c857f]">
                  {d.created_at ? new Date(d.created_at).toLocaleString() : ''}
                  {d.errand_id ? ` · errand #${d.errand_id}` : ''}
                  {d.duration_ms != null ? ` · ${d.duration_ms}ms` : ''}
                </p>
                {d.error_message ? <p className="text-[#b84545]">{d.error_message}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
