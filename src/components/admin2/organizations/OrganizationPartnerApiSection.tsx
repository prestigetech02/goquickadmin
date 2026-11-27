import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminOrganizationApiKey,
  fetchAdminOrganizationApiKeys,
  revokeAdminOrganizationApiKey,
  updateAdminOrganization,
  updateAdminOrganizationApiKey,
  type AdminOrganization,
} from '@/api/adminOrganizationsApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';

export function OrganizationPartnerApiSection({
  org,
  onNotice,
}: {
  org: AdminOrganization;
  onNotice: (tone: 'ok' | 'error', text: string) => void;
}) {
  const queryClient = useQueryClient();
  const [keyName, setKeyName] = useState('Production');
  const [environment, setEnvironment] = useState<'live' | 'test'>('live');
  const [allowedIps, setAllowedIps] = useState('');
  const [editingIpKeyId, setEditingIpKeyId] = useState<number | null>(null);
  const [editingIps, setEditingIps] = useState('');
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const keysQuery = useQuery({
    queryKey: queryKeys.organizations.apiKeys(org.id),
    queryFn: () => fetchAdminOrganizationApiKeys(org.id),
  });

  const enabled = keysQuery.data?.partner_api_enabled ?? Boolean(org.partner_api_enabled);
  const keys = keysQuery.data?.keys ?? [];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.apiKeys(org.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(org.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
  };

  const toggleMutation = useMutation({
    mutationFn: (next: boolean) => updateAdminOrganization(org.id, { partner_api_enabled: next }),
    onSuccess: (updated) => {
      invalidate();
      onNotice(
        'ok',
        updated.partner_api_enabled
          ? 'Partner API enabled for this business.'
          : 'Partner API disabled. Existing keys stay revoked-or-unused until re-enabled.',
      );
    },
    onError: (error) => onNotice('error', getApiErrorMessage(error, 'Could not update Partner API flag.')),
  });

  const mintMutation = useMutation({
    mutationFn: () =>
      createAdminOrganizationApiKey(org.id, {
        name: keyName.trim() || 'API key',
        environment,
        enable_partner_api: true,
        allowed_ips: allowedIps.trim() || undefined,
      }),
    onSuccess: (result) => {
      setFreshToken(result.token);
      setAllowedIps('');
      invalidate();
      onNotice('ok', 'API key created. Copy the token now — it will not be shown again.');
    },
    onError: (error) => onNotice('error', getApiErrorMessage(error, 'Could not create API key.')),
  });

  const updateIpMutation = useMutation({
    mutationFn: ({ apiKeyId, ips }: { apiKeyId: number; ips: string }) =>
      updateAdminOrganizationApiKey(org.id, apiKeyId, {
        allowed_ips: ips.trim() === '' ? [] : ips,
      }),
    onSuccess: () => {
      setEditingIpKeyId(null);
      setEditingIps('');
      invalidate();
      onNotice('ok', 'IP allowlist updated.');
    },
    onError: (error) => onNotice('error', getApiErrorMessage(error, 'Could not update IP allowlist.')),
  });

  const revokeMutation = useMutation({
    mutationFn: (apiKeyId: number) => revokeAdminOrganizationApiKey(org.id, apiKeyId),
    onSuccess: () => {
      invalidate();
      onNotice('ok', 'API key revoked.');
    },
    onError: (error) => onNotice('error', getApiErrorMessage(error, 'Could not revoke API key.')),
  });

  const busy =
    toggleMutation.isPending ||
    mintMutation.isPending ||
    revokeMutation.isPending ||
    updateIpMutation.isPending;
  const canMint = org.status === 'active';

  const copyToken = async () => {
    if (!freshToken) return;
    try {
      await navigator.clipboard.writeText(freshToken);
      onNotice('ok', 'API token copied to clipboard.');
    } catch {
      onNotice('error', 'Could not copy token. Select and copy it manually.');
    }
  };

  return (
    <section className="flex flex-col gap-[12px] rounded-[12px] border border-[#e2e8e3] p-[14px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">Partner API</p>
          <p className="mt-1 text-[12px] text-[#45514a]">
            Enable API so the business owner can mint keys on web (Profile → Partner API). You can also mint or
            revoke here. Ping: <code className="text-[11px]">GET /api/v1/partner/ping</code>.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || org.status !== 'active'}
          onClick={() => toggleMutation.mutate(!enabled)}
          className={`h-[34px] rounded-[8px] px-[12px] text-[12px] font-semibold ${
            enabled
              ? 'bg-[#167d35] text-white'
              : 'border border-[#d4ddd6] bg-white text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50'
          }`}
        >
          {enabled ? 'API enabled' : 'Enable API'}
        </button>
      </div>

      {freshToken ? (
        <div className="rounded-[10px] border border-[#cfe8d6] bg-[#eaf6ed] px-[12px] py-[10px]">
          <p className="text-[11px] font-semibold text-[#0d5e27]">New key (copy now)</p>
          <p className="mt-1 break-all font-mono text-[11px] text-[#17211b]">{freshToken}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyToken()}
              className="h-[30px] rounded-[7px] bg-[#167d35] px-[10px] text-[11px] font-semibold text-white"
            >
              Copy token
            </button>
            <button
              type="button"
              onClick={() => setFreshToken(null)}
              className="h-[30px] rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[11px] font-semibold text-[#17211b]"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-[8px] border-t border-[#e2e8e3] pt-[12px]">
        <label className="flex min-w-[140px] flex-1 flex-col gap-[4px]">
          <span className="text-[11px] font-semibold text-[#7c857f]">Key name</span>
          <input
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            className="h-[36px] rounded-[8px] border border-[#e2e8e3] px-[10px] text-[12px] outline-none focus:border-[#167d35]"
          />
        </label>
        <label className="flex flex-col gap-[4px]">
          <span className="text-[11px] font-semibold text-[#7c857f]">Environment</span>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as 'live' | 'test')}
            className="h-[36px] rounded-[8px] border border-[#e2e8e3] bg-white px-[10px] text-[12px] font-semibold outline-none focus:border-[#167d35]"
          >
            <option value="live">Live (gq_live_)</option>
            <option value="test">Sandbox (gq_test_)</option>
          </select>
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-[4px]">
          <span className="text-[11px] font-semibold text-[#7c857f]">IP allowlist (optional)</span>
          <input
            value={allowedIps}
            onChange={(e) => setAllowedIps(e.target.value)}
            placeholder="1.2.3.4, 10.0.0.0/8"
            className="h-[36px] rounded-[8px] border border-[#e2e8e3] px-[10px] text-[12px] outline-none focus:border-[#167d35]"
          />
        </label>
        <button
          type="button"
          disabled={busy || !canMint}
          onClick={() => mintMutation.mutate()}
          className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50"
        >
          {mintMutation.isPending ? 'Creating…' : 'Create key'}
        </button>
      </div>

      {keysQuery.isLoading ? (
        <p className="text-[12px] text-[#7c857f]">Loading keys…</p>
      ) : keys.length === 0 ? (
        <p className="text-[12px] text-[#7c857f]">No API keys yet.</p>
      ) : (
        <ul className="flex flex-col gap-[6px]">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#e2e8e3] px-[12px] py-[10px]"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#17211b]">
                  {key.name}{' '}
                  <span className="text-[10px] font-semibold uppercase text-[#7c857f]">{key.environment}</span>
                </p>
                <p className="font-mono text-[11px] text-[#6b6f66]">{key.masked_key}</p>
                <p className="text-[10px] text-[#7c857f]">
                  {key.is_active ? 'Active' : 'Revoked'}
                  {key.ip_allowlist_enabled
                    ? ` · IPs: ${(key.allowed_ips ?? []).join(', ')}`
                    : ' · IPs: any'}
                  {key.last_used_at ? ` · Last used ${new Date(key.last_used_at).toLocaleString()}` : ''}
                </p>
                {editingIpKeyId === key.id ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      value={editingIps}
                      onChange={(e) => setEditingIps(e.target.value)}
                      placeholder="Clear = allow all"
                      className="h-[30px] min-w-[200px] flex-1 rounded-[7px] border border-[#e2e8e3] px-[8px] text-[11px]"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateIpMutation.mutate({ apiKeyId: key.id, ips: editingIps })}
                      className="h-[30px] rounded-[7px] bg-[#167d35] px-[10px] text-[11px] font-semibold text-white disabled:opacity-50"
                    >
                      Save IPs
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIpKeyId(null);
                        setEditingIps('');
                      }}
                      className="h-[30px] rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[11px] font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </div>
              {key.is_active ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEditingIpKeyId(key.id);
                      setEditingIps((key.allowed_ips ?? []).join(', '));
                    }}
                    className="h-[30px] rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50"
                  >
                    Edit IPs
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Revoke ${key.masked_key}? This cannot be undone.`)) {
                        revokeMutation.mutate(key.id);
                      }
                    }}
                    className="h-[30px] rounded-[7px] border border-[#e5a5a5] bg-[#fdeded] px-[10px] text-[11px] font-semibold text-[#b84545] hover:bg-[#fbe4e4] disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
