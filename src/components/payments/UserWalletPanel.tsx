import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { adjustAdminUserWallet, fetchAdminUserWallet } from '@/api/adminWalletApi';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { formatCurrency, formatDateTime, titleCase } from '@/lib/utils';

export function UserWalletPanel({
  userId,
  canAdjust,
}: {
  userId: number;
  canAdjust: boolean;
}) {
  const queryClient = useQueryClient();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const walletQuery = useQuery({
    queryKey: queryKeys.users.wallet(userId),
    queryFn: () => fetchAdminUserWallet(userId, { per_page: 8 }),
  });

  const adjustMutation = useMutation({
    mutationFn: () =>
      adjustAdminUserWallet(userId, {
        type,
        amount: Number(amount),
        reason: reason.trim(),
      }),
    onSuccess: async () => {
      setError(null);
      setAdjustOpen(false);
      setAmount('');
      setReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.wallet(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) }),
        queryClient.invalidateQueries({ queryKey: ['admin-payments'] }),
      ]);
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Adjustment failed.')),
  });

  const payload = walletQuery.data;
  const transactions = payload?.transactions.data ?? [];

  const submitAdjust = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (reason.trim().length < 8) {
      setError('Provide a reason of at least 8 characters.');
      return;
    }
    setError(null);
    adjustMutation.mutate();
  };

  if (walletQuery.isPending) {
    return <p className="text-sm text-ink-400">Loading wallet…</p>;
  }

  if (walletQuery.isError) {
    return (
      <p className="text-sm text-error-600">
        {getApiErrorMessage(walletQuery.error, 'Could not load this user wallet.')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-ink-400">Wallet balance</p>
          <p className="text-lg font-bold text-ink-900">{formatCurrency(payload?.wallet.balance ?? 0)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/payments?tab=ledger&user=${userId}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-ink-200 text-ink-700 hover:bg-ink-50"
          >
            Full ledger
          </Link>
          {canAdjust ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setAdjustOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700"
            >
              Adjust
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {transactions.length === 0 ? (
          <p className="text-sm text-ink-400">No wallet transactions yet.</p>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-ink-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900 truncate">{tx.description || tx.reference || `#${tx.id}`}</p>
                <p className="text-xs text-ink-400">{formatDateTime(tx.created_at)}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-success-700' : 'text-error-700'}`}>
                  {tx.type === 'debit' ? '−' : '+'}
                  {formatCurrency(tx.amount)}
                </p>
                <Badge status={tx.status} label={titleCase(tx.status.replace(/_/g, ' '))} />
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={adjustOpen}
        onClose={() => {
          if (adjustMutation.isPending) return;
          setAdjustOpen(false);
        }}
        title="Adjust wallet"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            Manual credits and debits are audited with your admin account and reason.
          </p>
          {error ? (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 text-sm text-error-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'credit' | 'debit')}
            className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
          >
            <option value="credit">Credit (add funds)</option>
            <option value="debit">Debit (remove funds)</option>
          </select>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
          />
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Audit reason"
            className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={adjustMutation.isPending}
              onClick={() => setAdjustOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-ink-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={adjustMutation.isPending}
              onClick={submitAdjust}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white disabled:opacity-50"
            >
              {adjustMutation.isPending ? 'Saving…' : 'Record adjustment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
