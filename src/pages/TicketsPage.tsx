import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  Search,
  Ticket,
} from 'lucide-react';
import {
  fetchAdminSupportTicket,
  fetchAdminSupportTickets,
  replyAdminSupportTicket,
  updateAdminSupportTicketStatus,
  type SupportTicketListItem,
} from '@/api/adminSupportTicketsApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { useAdminOpsRealtimeStatus } from '@/context/AdminOpsRealtimeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime, partyDisplayName, titleCase } from '@/lib/utils';

type TicketStatusFilter = 'all' | 'open' | 'awaiting_user' | 'resolved' | 'closed';
type TicketCategoryFilter = 'all' | 'account' | 'errand' | 'payment' | 'kyc' | 'other';
type TicketStatus = 'open' | 'awaiting_user' | 'resolved' | 'closed';

function ticketUserName(ticket: SupportTicketListItem): string {
  return partyDisplayName(ticket.user) || (ticket.user?.email ? ticket.user.email : 'Unknown user');
}

export function TicketsPage() {
  const queryClient = useQueryClient();
  const { live } = useAdminOpsRealtimeStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<TicketStatusFilter>('all');
  const [category, setCategory] = useState<TicketCategoryFilter>('all');
  const [page, setPage] = useState(1);
  const [reply, setReply] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedId = useMemo(() => {
    const openParam = searchParams.get('open');
    const id = openParam ? Number(openParam) : null;
    return id != null && Number.isFinite(id) ? id : null;
  }, [searchParams]);

  useEffect(() => {
    setReply('');
    setActionError(null);
  }, [selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, category]);

  const listParams = {
    page,
    per_page: 20,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    category: category === 'all' ? undefined : category,
  };

  const ticketsQuery = useQuery({
    queryKey: queryKeys.tickets.list(listParams),
    queryFn: () => fetchAdminSupportTickets(listParams),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.tickets.detail(selectedId ?? 0),
    queryFn: () => fetchAdminSupportTicket(selectedId!),
    enabled: selectedId != null,
  });

  const invalidate = (id?: number) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(id) });
    }
  };

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) =>
      replyAdminSupportTicket(id, message),
    onSuccess: (ticket) => {
      setReply('');
      setActionError(null);
      invalidate(ticket.id);
    },
    onError: (error) => {
      setActionError(getApiErrorMessage(error, 'Failed to send reply.'));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: TicketStatus }) =>
      updateAdminSupportTicketStatus(id, next),
    onSuccess: (ticket) => {
      setActionError(null);
      invalidate(ticket.id);
    },
    onError: (error) => {
      setActionError(getApiErrorMessage(error, 'Failed to update status.'));
    },
  });

  const tickets = ticketsQuery.data?.data ?? [];
  const total = ticketsQuery.data?.total ?? 0;
  const openOnPage = tickets.filter((t) => t.status === 'open').length;
  const awaitingOnPage = tickets.filter((t) => t.status === 'awaiting_user').length;
  const resolvedOnPage = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const detail = detailQuery.data;

  function closeModal() {
    setReply('');
    setActionError(null);
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete('open');
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Tickets"
        subtitle={`${total} ticket${total === 1 ? '' : 's'} matching filters`}
        action={
          <>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                live
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-ink-50 text-ink-500 ring-1 ring-ink-200'
              }`}
              title={live ? 'Listening for live ticket alerts' : 'Realtime disconnected'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-ink-400'}`}
              />
              {live ? 'Live' : 'Offline'}
            </span>
            <button
              type="button"
              onClick={() => void ticketsQuery.refetch()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              <RefreshCw className={`w-4 h-4 ${ticketsQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Open" value={String(openOnPage)} icon={<Ticket className="w-5 h-5" />} accent="error" />
        <StatCard
          label="Awaiting user"
          value={String(awaitingOnPage)}
          icon={<Clock className="w-5 h-5" />}
          accent="warning"
        />
        <StatCard
          label="Resolved / closed"
          value={String(resolvedOnPage)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="success"
        />
      </div>

      {ticketsQuery.isError ? (
        <Card className="mb-4">
          <CardBody>
            <p className="font-medium text-error-600">Failed to load tickets</p>
            <p className="text-sm text-ink-500 mt-1">
              {getApiErrorMessage(ticketsQuery.error, 'Failed to load tickets.')}
            </p>
          </CardBody>
        </Card>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, user, email, or ST-000123…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatusFilter)}
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[180px]"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="awaiting_user">Awaiting user</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TicketCategoryFilter)}
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-700 bg-white min-w-[160px]"
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          <option value="account">Account</option>
          <option value="errand">Errand</option>
          <option value="payment">Payment</option>
          <option value="kyc">KYC</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(['all', 'open', 'awaiting_user', 'resolved', 'closed'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setStatus(opt)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === opt
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
            }`}
          >
            {opt === 'awaiting_user' ? 'Awaiting user' : titleCase(opt.replace(/_/g, ' '))}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ticketsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="h-24 bg-ink-100 rounded-xl animate-pulse" />
            </Card>
          ))
        ) : tickets.length === 0 ? (
          <Card className="p-12 text-center col-span-2">
            <Ticket className="w-10 h-10 text-ink-300 mx-auto mb-2" />
            <p className="text-ink-400">No tickets found</p>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <div
                onClick={() =>
                  setSearchParams((params) => {
                    const next = new URLSearchParams(params);
                    next.set('open', String(ticket.id));
                    return next;
                  })
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSearchParams((params) => {
                      const next = new URLSearchParams(params);
                      next.set('open', String(ticket.id));
                      return next;
                    });
                  }
                }}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-ink-900">{ticket.subject}</h3>
                    <p className="text-sm text-ink-400">
                      {ticket.public_id} · {ticketUserName(ticket)}
                    </p>
                  </div>
                  <Badge status={ticket.status} label={titleCase(ticket.status.replace(/_/g, ' '))} />
                </div>
                <p className="text-sm text-ink-600 line-clamp-2">{ticket.preview || 'No messages yet'}</p>
                <p className="text-xs text-ink-400 mt-3">
                  {titleCase(ticket.category)} ·{' '}
                  {ticket.last_replied_at ? formatDateTime(ticket.last_replied_at) : formatDateTime(ticket.created_at)}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>

      {ticketsQuery.data && ticketsQuery.data.last_page > 1 ? (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-ink-500">
            Page {ticketsQuery.data.current_page} of {ticketsQuery.data.last_page}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={ticketsQuery.data.current_page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-4 py-2 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={ticketsQuery.data.current_page >= ticketsQuery.data.last_page}
              onClick={() => setPage((p) => Math.min(p + 1, ticketsQuery.data!.last_page))}
              className="px-4 py-2 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <Modal open={selectedId !== null} onClose={closeModal} title="Ticket thread" size="lg">
        {detailQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-ink-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : detailQuery.isError || !detail ? (
          <p className="text-sm text-error-600">
            {getApiErrorMessage(detailQuery.error, 'Failed to load ticket details.')}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-ink-900">{detail.subject}</h3>
                <p className="text-sm text-ink-400">
                  {detail.public_id} · {titleCase(detail.category)}
                </p>
              </div>
              <Badge status={detail.status} label={titleCase(detail.status.replace(/_/g, ' '))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailField label="User" value={ticketUserName(detail)} />
              <DetailField label="Email" value={detail.user?.email || '—'} />
              <DetailField label="Phone" value={detail.user?.phone || '—'} />
              <DetailField
                label="Errand"
                value={detail.errand?.title || (detail.errand_id ? `Errand #${detail.errand_id}` : 'None')}
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {(detail.messages ?? []).map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-xl ${
                    message.is_staff ? 'bg-brand-50 border border-brand-100' : 'bg-ink-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold text-ink-700">
                      {message.is_staff ? 'Support' : partyDisplayName(message.user) || 'User'}
                    </p>
                    <p className="text-xs text-ink-400">{formatDateTime(message.created_at)}</p>
                  </div>
                  <p className="text-sm text-ink-800 whitespace-pre-wrap">{message.body}</p>
                  {message.attachment_url ? (
                    <a
                      href={message.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 text-sm text-brand-700 underline"
                    >
                      View attachment
                    </a>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-ink-500" htmlFor="ticket-status">
                Status
              </label>
              <select
                id="ticket-status"
                value={detail.status}
                disabled={statusMutation.isPending}
                onChange={(e) =>
                  statusMutation.mutate({ id: detail.id, next: e.target.value as TicketStatus })
                }
                className="rounded-xl border border-ink-200 px-3 py-2 text-sm bg-white"
              >
                <option value="open">Open</option>
                <option value="awaiting_user">Awaiting user</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {detail.is_locked ? (
              <p className="text-sm text-ink-500 bg-ink-50 rounded-xl px-4 py-3">
                This ticket is {detail.status}. Reopen it (set status to Open) before sending another reply.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const message = reply.trim();
                  if (!message) return;
                  replyMutation.mutate({ id: detail.id, message });
                }}
                className="space-y-2"
              >
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder="Write a reply…"
                  className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {actionError ? <p className="text-sm text-error-600">{actionError}</p> : null}
                <button
                  type="submit"
                  disabled={replyMutation.isPending || reply.trim() === ''}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  {replyMutation.isPending ? 'Sending…' : 'Send reply'}
                </button>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-ink-50">
      <p className="text-xs text-ink-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-ink-900 break-words">{value}</p>
    </div>
  );
}
