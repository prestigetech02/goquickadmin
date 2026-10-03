import type { ApiResponse } from '@/types';

/** Laravel length-aware paginator payload. */
export type Paginated<T> = {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
};

/** Compact meta for tables / footers. */
export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type ListQueryParams = {
  page?: number;
  per_page?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
};

export type AdminActionResult = {
  message?: string;
};

export function toPaginationMeta(page: Paginated<unknown>): PaginationMeta {
  return {
    current_page: page.current_page,
    last_page: page.last_page,
    per_page: page.per_page,
    total: page.total,
    from: page.from,
    to: page.to,
  };
}

export function unwrapApiData<T>(response: ApiResponse<T>, fallback = 'Request failed'): T {
  if (!response.success || response.data === undefined || response.data === null) {
    throw new Error(response.error?.message || response.message || fallback);
  }
  return response.data;
}

export type SettingsGeneral = {
  app_name: string;
  environment: string;
  debug: boolean;
  app_url: string;
  frontend_url: string;
  timezone: string;
};

export type SettingsService = {
  configured: boolean;
  label: string;
};

export type SettingsData = {
  general: SettingsGeneral;
  services: Record<string, SettingsService>;
};

export type CompanyRevenueBreakdown = {
  total: number;
  commission: number;
  service_fee: number;
  cancellation_fee: number;
  withdrawal_fee: number;
};

export type DashboardStats = {
  metrics: {
    total_revenue: number;
    today_revenue: number;
    company_take?: number;
    today_company_take?: number;
    company_take_breakdown?: CompanyRevenueBreakdown;
    today_company_take_breakdown?: CompanyRevenueBreakdown;
    active_runners: number;
    pending_errands: number;
    ongoing_errands: number;
    completed_errands_today: number;
    cancelled_errands: number;
  };
  users: {
    total: number;
    buyers: number;
    runners: number;
    admins: number;
  };
  errands: {
    total: number;
    pending: number;
    accepted: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  operations: {
    pending_runner_verifications: number;
    open_disputes: number;
    pending_withdrawals: number;
  };
  finance: {
    wallet_balance_total: number;
  };
};

export type CompanyRevenueEntry = {
  id: number;
  type: 'commission' | 'service_fee' | 'cancellation_fee' | 'withdrawal_fee' | string;
  source_key: string;
  amount: number;
  currency: string;
  errand_id: number | null;
  withdrawal_id: number | null;
  wallet_transaction_id: number | null;
  occurred_at: string;
  meta?: Record<string, unknown> | null;
  errand?: { id: number; title?: string | null; category?: string | null; status?: string | null } | null;
  withdrawal?: {
    id: number;
    amount?: number;
    fee?: number | null;
    status?: string | null;
    reference?: string | null;
  } | null;
};

export type CompanyRevenueResponse = {
  from: string;
  to: string;
  summary: CompanyRevenueBreakdown;
  ledger_summary: CompanyRevenueBreakdown;
  using_ledger_for_list: boolean;
  note?: string | null;
  entries: Paginated<CompanyRevenueEntry>;
};

export type TransactionReconcileResult = {
  checked: number;
  settled: number;
  settled_amount: number;
  failed: number;
  still_open: number;
  errors: number;
  remaining: number;
  at: string;
};

export type TransactionMethodKey = 'card' | 'bank_transfer' | 'ussd' | 'other';

export type AdminTransactionsOverview = {
  range: { start_date: string; end_date: string; previous_start_date: string; previous_end_date: string };
  kpis: {
    volume: { amount: number; count: number; change_pct: number | null };
    payments: { amount: number; count: number; failed_count: number; success_rate: number | null; change_pct: number | null };
    escrow: { amount: number; count: number };
    refunds: {
      amount: number;
      refund_amount: number;
      refund_count: number;
      failed_amount: number;
      failed_count: number;
      count: number;
      share_pct: number | null;
    };
    fees: {
      amount: number;
      breakdown: { commission: number; service_fee: number; cancellation_fee: number; withdrawal_fee: number };
      change_pct: number | null;
      effective_pct: number | null;
    };
  };
  series: {
    bucket: 'day' | 'week';
    points: Array<{ start: string; end: string; volume: number; count: number; fees: number }>;
  };
  methods: Array<{ key: TransactionMethodKey; label: string; amount: number; count: number; share_pct: number }>;
  provider: {
    name: string;
    collections: { success_rate: number | null; completed: number; failed: number; fees: number; last_success_at: string | null };
    payouts: { paid_count: number; paid_amount: number; in_flight: number; rejected: number };
    open_checkouts: { count: number; amount: number };
    last_reconcile: TransactionReconcileResult | null;
  };
};

export type TransactionKind =
  | 'payment'
  | 'escrow'
  | 'release'
  | 'refund'
  | 'withdrawal'
  | 'fee'
  | 'adjustment'
  | 'referral'
  | 'other';

export type AdminTransactionRow = {
  id: number;
  code: string;
  reference: string | null;
  kind: TransactionKind;
  direction: 'credit' | 'debit';
  description: string | null;
  user: { id: number; name: string; email: string | null; city: string | null; role: string | null } | null;
  errand: { id: number; code: string; title: string | null; category: string | null } | null;
  provider: 'paystack' | 'wallet';
  channel: TransactionMethodKey | null;
  amount: number;
  fee: number | null;
  fee_type: 'provider' | 'platform' | null;
  status: string;
  ledger_status: string;
  can_verify: boolean;
  withdrawal_id: number | null;
  created_at: string | null;
  actions?: { mark_failed: boolean; cancel_funding: boolean; reverse: boolean };
};

export type AdminTransactionPage = Paginated<AdminTransactionRow> & {
  filter_user: { id: number; name: string; role: string | null } | null;
};

export type TransactionTab = 'all' | 'payments' | 'escrow' | 'refunds' | 'fees';

export type AdminTransactionFilters = {
  tab?: TransactionTab;
  status?: 'successful' | 'pending' | 'failed' | 'reversed' | 'held';
  provider?: 'paystack' | 'wallet';
  direction?: 'credit' | 'debit';
  amount?: 'under_5k' | '5k_20k' | '20k_100k' | 'over_100k';
  search?: string;
  user_id?: number;
  start_date?: string;
  end_date?: string;
};

export type RevenueStatus = 'settled' | 'pending' | 'refunded' | 'review';
export type RevenueChannel = 'wallet' | 'checkout';

export type RevenueTotals = {
  gtv: number;
  gtv_count: number;
  refunds: number;
  commission: number;
  service_fee: number;
  cancellation_fee: number;
  withdrawal_fee: number;
  gross: number;
  processing: number;
  subsidies: number;
  referral: number;
  promotions: number;
  net: number;
  runner_earnings: number;
  payouts: number;
  release_count: number;
};

export type RevenueSeriesPoint = { start: string; end: string; gtv: number; count: number; net: number };

export type RevenueCategoryRow = { key: string; revenue: number; count: number; share_pct: number };

export type RevenueZoneRow = {
  zone: string | null;
  revenue: number;
  gtv: number;
  count: number;
  share_pct: number;
  take_rate_pct: number | null;
};

export type RevenueHealth = {
  reconciled: { count: number; amount: number; settled_count: number; refunded_count: number };
  pending: { count: number; amount: number };
  review: { count: number; amount: number };
  reconciled_pct: number | null;
  oldest_pending_at: string | null;
};

export type AdminRevenueOverview = {
  range: AdminTransactionsOverview['range'];
  totals: RevenueTotals;
  previous: { gtv: number; net: number; gross: number };
  changes: Record<'gtv' | 'net' | 'gross' | 'commission' | 'service_fee' | 'refunds', number | null>;
  rates: {
    net_take_pct: number | null;
    blended_commission_pct: number | null;
    average_service_fee: number | null;
    refund_share_pct: number | null;
  };
  pending_settlement: { count: number; amount: number };
  series: { bucket: 'day' | 'week'; points: RevenueSeriesPoint[] };
  categories: RevenueCategoryRow[];
  zones: RevenueZoneRow[];
  health: RevenueHealth;
};

export type AdminRevenueRow = {
  id: number;
  code: string;
  errand: { id: number; code: string; title: string | null; category: string | null; status: string | null } | null;
  requester: { id: number; name: string } | null;
  zone: string | null;
  channel: 'wallet' | TransactionMethodKey;
  gross: number;
  revenue: number;
  revenue_expected: boolean;
  status: RevenueStatus;
  escrow_status: string;
  created_at: string | null;
  processed_at: string | null;
};

export type AdminRevenueFilters = {
  status?: RevenueStatus;
  channel?: RevenueChannel;
  zone?: string;
  category?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
};

export type ZoneHealth = 'healthy' | 'watch' | 'at_risk';

export type AnalyticsActivityPoint = { start: string; end: string; requested: number; completed: number; previous_requested: number };

export type AnalyticsFunnelStage = { key: string; label: string; count: number; pct: number | null };

export type AnalyticsZoneRow = {
  zone: string | null;
  jobs: number;
  match_rate_pct: number | null;
  median_minutes: number | null;
  cancellation_rate_pct: number | null;
  runners: number;
  health: ZoneHealth;
};

export type AnalyticsGrowthMonth = {
  month: string;
  requesters: number;
  runners: number;
  requester_index: number | null;
  runner_index: number | null;
};

export type AdminAnalyticsOverview = {
  range: AdminTransactionsOverview['range'];
  kpis: {
    requested: { value: number; previous: number; change_pct: number | null };
    completed: {
      value: number;
      previous: number;
      change_pct: number | null;
      completion_rate_pct: number | null;
      completion_rate_change_pts: number | null;
    };
    requesters: { value: number; previous: number; change_pct: number | null; first_time: number };
    runners: { value: number; previous: number; change_pct: number | null; registered: number };
    cancellation: {
      rate_pct: number | null;
      previous_pct: number | null;
      change_pts: number | null;
      cancelled: number;
      target_pct: number;
    };
  };
  activity: { bucket: 'day' | 'week'; points: AnalyticsActivityPoint[] };
  funnel: { stages: AnalyticsFunnelStage[]; largest_drop: { from: string; to: string; lost: number } | null };
  categories: {
    total: number;
    rows: Array<{ key: string; completed: number; share_pct: number; growth_pct: number | null }>;
    top_growth: { key: string; completed: number; share_pct: number; growth_pct: number | null } | null;
  };
  zones: AnalyticsZoneRow[];
  growth: {
    base_month: string | null;
    months: AnalyticsGrowthMonth[];
    requester_growth_pct: number | null;
    runner_growth_pct: number | null;
    supply_gap_pts: number | null;
    requesters_per_runner: number | null;
  };
  fulfillment: {
    median_minutes: number | null;
    median_change_minutes: number | null;
    fast_match_pct: number | null;
    fast_match_minutes: number;
    on_time_pct: number | null;
    cancellation_rate_pct: number | null;
    cancellation_hotspot: { zone: string; rate_pct: number; requested: number } | null;
  };
};

export type AnalyticsCategoryRow = {
  key: string;
  requested: number;
  completed: number;
  completion_rate_pct: number | null;
  median_minutes: number | null;
  cancellation_rate_pct: number | null;
  average_order_value: number | null;
  growth_pct: number | null;
};

export type AdminAnalyticsCategories = { zone: string | null; rows: AnalyticsCategoryRow[] };

export type RunnerBoardTab = 'all' | 'online' | 'verified' | 'pending_kyc' | 'suspended';
export type RunnerAvailability = 'online' | 'available' | 'on_errand' | 'offline';
export type RunnerAccountState = 'active' | 'review' | 'suspended';
export type RunnerCoachingFlag = 'on_time' | 'acceptance' | 'rating';

export type RunnerZoneCoverage = {
  id: number;
  zone: string;
  runners: number;
  online: number;
  requests: number;
  matched: number;
  match_rate_pct: number | null;
  tight: boolean;
};

export type RunnerKycItem = {
  verification_id: number;
  runner_id: number;
  name: string;
  issue: string;
  tone: 'green' | 'amber' | 'red';
  submitted_at: string | null;
  waiting_hours: number | null;
  overdue: boolean;
};

export type AdminRunnerBoardOverview = {
  range: AdminTransactionsOverview['range'];
  kpis: {
    total: { value: number; new: number; previous_new: number };
    online: { value: number; available: number; on_errand: number; share_pct: number | null };
    verified: { value: number; share_pct: number | null };
    pending: { value: number; overdue: number; sla_hours: number };
    suspended: { value: number; in_range: number };
    rating: { value: number | null; reviews: number; change: number | null };
  };
  activity: {
    bucket: 'day' | 'week';
    points: Array<{ start: string; end: string; active_runners: number; completed: number }>;
    completed: number;
    on_time_pct: number | null;
  };
  zones: {
    requests: number;
    demand_covered_pct: number | null;
    tight_count: number;
    tight_match_pct: number;
    rows: RunnerZoneCoverage[];
  };
  kyc: { pending: number; items: RunnerKycItem[] };
  coaching: {
    window_days: number;
    grace_minutes: number;
    total: number;
    on_time: { count: number; threshold: number };
    acceptance: { count: number; threshold: number };
    rating: { count: number; threshold: number };
  };
  zone_options: Array<{ id: number; name: string }>;
};

export type AdminRunnerRow = {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  verification: RunnerVerificationState;
  availability: RunnerAvailability;
  zone: string | null;
  completed_errands: number;
  acceptance_pct: number | null;
  on_time_pct: number | null;
  rating: number | null;
  reviews: number;
  coaching: RunnerCoachingFlag[];
  wallet_balance: number;
  pending_payout: number;
  last_active_at: string | null;
  is_online: boolean;
  is_suspended: boolean;
  account: RunnerAccountState;
  joined_at: string | null;
};

export type AdminRunnerFilters = {
  tab?: RunnerBoardTab;
  search?: string;
  zone?: number;
  availability?: RunnerAvailability;
  rating?: 'top' | 'good' | 'low' | 'unrated';
  performance?: 'coaching' | 'top';
  joined?: '7d' | '30d' | '90d' | 'older';
};

export type AdminRunnerDirectory = Paginated<AdminRunnerRow> & {
  tab_counts: Record<RunnerBoardTab, number>;
  online_now: number;
};

export type RunnerBulkAction = 'offline' | 'suspend' | 'reactivate';
export type RunnerBulkResult = { updated: number; skipped: number; not_found: number };

export type WithdrawalStage = 'pending' | 'approved' | 'processing' | 'paid' | 'rejected';
export type WithdrawalRiskKey = 'payout_failed' | 'shared_account' | 'name_mismatch' | 'kyc_unverified' | 'first_payout';
export type WithdrawalKycStatus = 'verified' | 'pending' | 'needs_review' | 'unverified';
export type RiskTone = 'green' | 'amber' | 'red';

export type WithdrawalSyncResult = {
  checked: number;
  paid: number;
  paid_amount: number;
  failed: number;
  still_processing: number;
  errors: number;
  at: string;
};

export type WithdrawalPerson = { id: number; name: string; role: string | null; city: string | null };

export type WithdrawalUrgentItem = {
  id: number;
  code: string;
  user: WithdrawalPerson | null;
  bank_name: string | null;
  account_masked: string | null;
  amount: number;
  status: string;
  stage: WithdrawalStage;
  reason: { key: WithdrawalRiskKey | 'sla_breached'; label: string; tone: RiskTone };
  signal_count: number;
  created_at: string | null;
};

export type AdminWithdrawalsOverview = {
  range: { start_date: string; end_date: string; previous_start_date: string; previous_end_date: string };
  kpis: {
    pending: { count: number; amount: number; wallets: number; needs_attention: number; overdue: number };
    approved: { count: number; amount: number; processing_count: number; processing_amount: number; awaiting_count: number };
    paid: { amount: number; count: number; change_pct: number | null };
    rejected: { amount: number; count: number; rejected_count: number; failed_count: number; share_pct: number | null };
  };
  urgent: { count: number; items: WithdrawalUrgentItem[] };
  intake?: { runners: boolean; requesters: boolean };
  health: {
    median_review_minutes: number | null;
    reviewed_count: number;
    same_day_paid_pct: number | null;
    paid_count: number;
    lifecycle: { awaiting_review: number; approved: number; processing: number; paid_today: number };
    oldest_pending_at: string | null;
    queue_amount: number;
    payout_balance: { provider: 'flutterwave'; amount: number; checked_at: string } | null;
    last_sync: WithdrawalSyncResult | null;
  };
  banks: string[];
};

export type AdminWithdrawalRow = {
  id: number;
  code: string;
  reference: string | null;
  user: (WithdrawalPerson & { email: string | null; phone: string | null }) | null;
  bank: {
    name: string | null;
    code: string | null;
    account_name: string | null;
    account_masked: string | null;
    account_last4: string | null;
  };
  amount: number;
  fee: number;
  wallet_balance: number;
  kyc_status: WithdrawalKycStatus;
  risks: Array<{ key: WithdrawalRiskKey; label: string; severity: 'high' | 'medium' }>;
  risk: { key: WithdrawalRiskKey | 'clear'; label: string; tone: RiskTone };
  stage: WithdrawalStage;
  status: string;
  payout_status: string | null;
  payout_reference: string | null;
  reason: string | null;
  sla_breached: boolean;
  due_at: string | null;
  processed_at: string | null;
  reviewed_at: string | null;
  reviewer: { id: number; name: string } | null;
  created_at: string | null;
  can_approve: boolean;
  can_reject: boolean;
  can_mark_paid: boolean;
};

export type AdminWithdrawalDetail = AdminWithdrawalRow & {
  account_number: string | null;
  payout: { status: string | null; reference: string | null; transfer_code: string | null; message: string | null };
  wallet: { balance: number; paid_count: number; paid_amount: number; open_count: number };
  history: Array<{
    id: number;
    code: string;
    amount: number;
    stage: WithdrawalStage;
    same_account: boolean;
    bank_name: string | null;
    created_at: string | null;
  }>;
};

export type WithdrawalAmountBand = 'under_10k' | '10k_50k' | '50k_100k' | 'over_100k';

export type AdminWithdrawalFilters = {
  stage?: WithdrawalStage | 'all';
  search?: string;
  bank?: string;
  amount?: WithdrawalAmountBand;
  risk?: 'flagged' | 'clear' | WithdrawalRiskKey;
  start_date?: string;
  end_date?: string;
};

export type KycStage = 'ready' | 'incomplete' | 'approved' | 'rejected';
export type KycRiskKey =
  | 'duplicate_id'
  | 'duplicate_bvn'
  | 'shared_account'
  | 'underage'
  | 'name_mismatch'
  | 'guarantor_conflict'
  | 'sla_breached';
export type KycCheckKey = 'id_document' | 'selfie' | 'guarantors' | 'payout' | 'vehicle_area';

export type KycCheck = { key: KycCheckKey; label: string; status: 'pass' | 'warn' | 'missing'; detail: string | null };
export type KycRisk = { key: KycRiskKey; label: string; tone: 'red' | 'amber' };

export type AdminKycRow = {
  id: number;
  runner: { id: number; name: string; email: string | null; phone: string | null; city: string | null; is_suspended: boolean } | null;
  selfie_url: string | null;
  document: { type: string | null; label: string | null; number_masked: string | null };
  checks: KycCheck[];
  checks_passed: number;
  checks_total: number;
  risks: KycRisk[];
  risk: { label: string; tone: RiskTone };
  vehicle: { type: string | null; plate: string | null };
  area: string | null;
  status: 'pending' | 'approved' | 'rejected';
  stage: KycStage;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer: { id: number; name: string } | null;
  rejection_reason: string | null;
  sla_breached: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_revoke: boolean;
};

export type AdminKycOverview = {
  range: { start_date: string; end_date: string; previous_start_date: string; previous_end_date: string };
  sla_hours: number;
  kpis: {
    awaiting: { count: number; over_sla: number; flagged: number; oldest_at: string | null };
    approved: { count: number; change_pct: number | null; verified_total: number };
    rejected: { count: number; rate_pct: number | null };
    review_time: { median_minutes: number | null; reviewed_count: number; within_sla_pct: number | null };
    incomplete: { count: number; not_started: number };
  };
  attention: { count: number; items: AdminKycRow[] };
  funnel: { signed_up: number; identity: number; selfie: number; payout: number; approved: number };
  tab_counts: Record<KycStage, number>;
  document_types: string[];
};

export type AdminKycDetail = AdminKycRow & {
  identity: {
    full_name: string | null;
    date_of_birth: string | null;
    age: number | null;
    gender: string | null;
    id_number: string | null;
    bvn_masked: string | null;
    previous_workplace: string | null;
  };
  documents: Array<{ key: string; label: string; url: string; kind: 'image' | 'pdf' }>;
  next_of_kin: { name: string | null; phone: string | null; address: string | null } | null;
  guarantors: Array<{ name: string | null; phone: string | null; address: string | null; conflict: boolean }>;
  payout: { bank_name: string | null; account_name: string | null; account_masked: string | null; name_matches: boolean | null } | null;
  profile_status: string | null;
  duplicates: Array<{ user_id: number; name: string; role: string | null; field: 'id_number' | 'bvn' | 'account'; status: string | null }>;
  activity: { joined_at: string | null; last_seen_at: string | null; is_suspended: boolean; errands_completed: number; errands_total: number };
};

export type AdminKycFilters = {
  stage?: KycStage | 'all';
  search?: string;
  document_type?: string;
  risk?: 'flagged' | 'clear' | 'missing' | KycRiskKey;
  start_date?: string;
  end_date?: string;
};

export type ErrandBoardTab = 'all' | 'live' | 'attention' | 'scheduled' | 'completed' | 'cancelled' | 'disputed';
export type ErrandFlagKey = 'disputed' | 'overdue' | 'no_zone_runners' | 'stuck' | 'unmatched' | 'tracking_lost' | 'proof_rejected';
export type ErrandPaymentState = 'held' | 'released' | 'refunded' | 'unpaid';
export type ErrandBoardSort = 'newest' | 'oldest' | 'stale' | 'value' | 'scheduled';
export type ErrandFlag = { key: ErrandFlagKey; label: string; tone: 'red' | 'amber' };

export type ErrandBoardPerson = { id: number; name: string; phone: string | null; avatar_url: string | null };

export type AdminErrandBoardRow = {
  id: number;
  code: string;
  title: string | null;
  category: string | null;
  type: 'instant' | 'scheduled';
  status: string;
  requester: ErrandBoardPerson | null;
  runner: ErrandBoardPerson | null;
  route: { pickup: string | null; dropoff: string | null; distance_km: number | null };
  area: string | null;
  amount: { total: number | null; payment: ErrandPaymentState };
  created_at: string | null;
  updated_at: string | null;
  scheduled_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  due_at: string | null;
  flags: ErrandFlag[];
  flag: { label: string; tone: 'red' | 'amber' } | null;
  is_active: boolean;
  can_cancel: boolean;
  can_reassign: boolean;
};

export type AdminErrandsOverview = {
  range: { start_date: string; end_date: string; previous_start_date: string; previous_end_date: string };
  kpis: {
    created: { count: number; change_pct: number | null; instant: number; scheduled: number };
    live: { count: number; unassigned: number; in_flight: number; flagged: number };
    completed: { count: number; change_pct: number | null; completion_rate_pct: number | null };
    value: { gmv: number; change_pct: number | null; avg_value: number | null; held_now: number };
    cancelled: { count: number; rate_pct: number | null; by_requester: number; by_runner: number; by_ops: number };
  };
  attention: { count: number; by_flag: Record<ErrandFlagKey, number>; items: AdminErrandBoardRow[] };
  pipeline: {
    stages: { finding: number; assigned: number; en_route: number; on_task: number; awaiting_requester: number };
    disputed: number;
    median_match_minutes: number | null;
    median_fulfil_minutes: number | null;
    on_time_pct: number | null;
    measured_count: number;
    grace_minutes: number;
  };
  series: {
    bucket: 'day' | 'week';
    points: Array<{ start: string; end: string; created: number; completed: number; cancelled: number; gmv: number }>;
  };
  categories: Array<{ key: string; count: number; completed: number; cancelled: number; gmv: number; share_pct: number }>;
  areas: Array<{ name: string; count: number }>;
  tab_counts: { live: number; attention: number; scheduled: number; disputed: number };
  filters: { categories: string[] };
};

export type AdminErrandBoardFilters = {
  tab?: ErrandBoardTab;
  search?: string;
  status?: string;
  category?: string;
  type?: 'instant' | 'scheduled';
  payment?: ErrandPaymentState;
  flag?: 'any' | ErrandFlagKey;
  assignment?: 'assigned' | 'unassigned';
  sort?: ErrandBoardSort;
  start_date?: string;
  end_date?: string;
};

export type DisputeTab = 'active' | 'unassigned' | 'mine' | 'attention' | 'resolved' | 'dismissed' | 'all';
export type DisputeType = 'payment' | 'service' | 'other';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed';
export type DisputeOutcome = 'refund_requester' | 'pay_runner' | 'no_action' | 'dismissed';
export type DisputeFlagKey = 'overdue' | 'repeat_runner' | 'unowned' | 'high_value' | 'settled' | 'repeat_raiser';
export type DisputeSort = 'oldest' | 'newest' | 'value' | 'updated' | 'decided';
export type DisputePartyRole = 'requester' | 'runner' | 'other';
export type DisputeFlag = { key: DisputeFlagKey; label: string; tone: 'red' | 'amber' };
export type DisputePerson = ErrandBoardPerson & { role: DisputePartyRole };

export type AdminDisputeRow = {
  id: number;
  code: string;
  type: DisputeType;
  status: DisputeStatus;
  reason: string | null;
  outcome: DisputeOutcome | null;
  resolution: string | null;
  settled_amount: number | null;
  errand: { id: number; code: string; title: string | null; category: string | null; status: string } | null;
  raised_by: DisputePerson | null;
  against: DisputePerson | null;
  requester: DisputePerson | null;
  runner: DisputePerson | null;
  amount: { at_stake: number | null; held: number; payment: ErrandPaymentState };
  assignee: { id: number; name: string } | null;
  assigned_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  resolved_at: string | null;
  resolved_by: { id: number; name: string } | null;
  due_at: string | null;
  flags: DisputeFlag[];
  flag: { label: string; tone: 'red' | 'amber' } | null;
  is_active: boolean;
  is_mine: boolean;
};

export type AdminDisputesOverview = {
  range: { start_date: string; end_date: string; previous_start_date: string; previous_end_date: string };
  targets: { pickup_hours: number; resolve_hours: number; high_value: number; repeat_threshold: number; repeat_window_days: number };
  kpis: {
    open: { count: number; unassigned: number; under_review: number; over_target: number };
    opened: { count: number; change_pct: number | null; rate_pct: number | null; by_requester: number; by_runner: number };
    resolved: { count: number; change_pct: number | null; on_time_pct: number | null; median_hours: number | null };
    at_stake: { amount: number; held_count: number; largest: number | null };
    settlements: { refunded: number; refund_count: number; paid_out: number; paid_count: number };
  };
  attention: { count: number; by_flag: Record<DisputeFlagKey, number>; items: AdminDisputeRow[] };
  caseload: {
    by_age: { under_4h: number; h4_24: number; d1_2: number; over_2d: number };
    median_pickup_minutes: number | null;
    owners: Array<{ id: number; name: string; count: number }>;
  };
  series: { bucket: 'day' | 'week'; points: Array<{ start: string; end: string; opened: number; decided: number }> };
  types: Array<{ key: DisputeType; count: number; share_pct: number }>;
  raisers: { requester: number; runner: number; other: number };
  outcomes: Record<DisputeOutcome, { count: number; amount: number }>;
  repeat: {
    runners: Array<{ id: number; name: string; count: number }>;
    requesters: Array<{ id: number; name: string; count: number }>;
  };
  tab_counts: { active: number; unassigned: number; mine: number; attention: number };
};

export type AdminDisputeFilters = {
  tab?: DisputeTab;
  search?: string;
  type?: DisputeType;
  raised_by?: 'requester' | 'runner';
  payment?: ErrandPaymentState;
  flag?: 'any' | DisputeFlagKey;
  outcome?: DisputeOutcome;
  sort?: DisputeSort;
  start_date?: string;
  end_date?: string;
};

export type DisputeParty = DisputePerson & {
  email: string | null;
  filed_this: boolean;
  joined_at: string | null;
  is_suspended: boolean;
  disputes_total: number;
  disputes_recent: number;
  disputes_filed: number;
  completed_jobs?: number;
  rating?: number | null;
  errands_count?: number;
};

export type DisputeChatMessage = {
  id: number;
  role: DisputePartyRole;
  sender_name: string;
  body: string;
  type: string;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  at: string | null;
  after_filing: boolean;
};

export type AdminDisputeCase = {
  dispute: AdminDisputeRow;
  parties: { requester: DisputeParty | null; runner: DisputeParty | null };
  chat: { total: number; messages: DisputeChatMessage[] };
  related: Array<{
    id: number;
    code: string;
    type: DisputeType;
    status: DisputeStatus;
    outcome: DisputeOutcome | null;
    reason: string | null;
    created_at: string | null;
    errand: { id: number; code: string; title: string | null } | null;
    shared: 'requester' | 'runner' | 'both';
  }>;
  history: Array<{ key: string; at: string; title: string; detail: string | null; kind: 'issue' | 'admin' }>;
};

export type SupportDeskTab = 'needs_reply' | 'mine' | 'unassigned' | 'awaiting_user' | 'attention' | 'resolved' | 'all';
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportDeskFlagKey = 'overdue' | 'urgent' | 'unowned' | 'repeat' | 'stale';
export type SupportDeskSort = 'priority' | 'waiting' | 'newest' | 'updated' | 'resolved';
export type SupportDeskTone = 'red' | 'amber' | 'gray';
export type SupportDeskFlag = { key: SupportDeskFlagKey; label: string; tone: SupportDeskTone };
export type SupportRequesterRole = 'requester' | 'runner' | 'user';

export type AdminSupportTicketRow = {
  id: number;
  code: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  preview: { body: string; from: 'customer' | 'staff'; has_attachment: boolean; at: string | null } | null;
  messages_count: number;
  notes_count: number;
  requester: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    role: SupportRequesterRole;
    avatar_url: string | null;
  } | null;
  errand: { id: number; code: string; title: string | null; status: string } | null;
  assignee: { id: number; name: string } | null;
  assigned_at: string | null;
  created_at: string | null;
  last_replied_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  waiting_since: string | null;
  due_at: string | null;
  target_hours: number;
  flags: SupportDeskFlag[];
  flag: { label: string; tone: SupportDeskTone } | null;
  has_unread: boolean;
  is_active: boolean;
  is_mine: boolean;
};

export type AdminSupportOverview = {
  range: { start_date: string; end_date: string; previous_start_date: string; previous_end_date: string };
  targets: { response_hours: Record<SupportTicketPriority, number>; stale_days: number };
  kpis: {
    open: { count: number; needs_reply: number; unassigned: number; overdue: number };
    created: { count: number; change_pct: number | null; by_requester: number; by_runner: number };
    first_response: { median_minutes: number | null; within_target_pct: number | null; responded: number; unanswered: number };
    resolved: { count: number; change_pct: number | null; median_hours: number | null };
    awaiting_user: { count: number; stale: number };
  };
  attention: { count: number; by_flag: Record<SupportDeskFlagKey, number>; items: AdminSupportTicketRow[] };
  workload: {
    by_wait: { under_1h: number; h1_4: number; h4_24: number; over_24h: number };
    owners: Array<{ id: number; name: string; open: number; needs_reply: number }>;
    unassigned: number;
  };
  series: { bucket: 'day' | 'week'; points: Array<{ start: string; end: string; created: number; resolved: number }> };
  categories: Array<{ key: SupportTicketCategory; count: number; share_pct: number }>;
  tab_counts: { needs_reply: number; mine: number; unassigned: number; awaiting_user: number; attention: number };
};

export type AdminSupportFilters = {
  tab?: SupportDeskTab;
  search?: string;
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
  role?: 'requester' | 'runner';
  flag?: 'any' | SupportDeskFlagKey;
  sort?: SupportDeskSort;
};

export type SupportDeskMessage = {
  id: number;
  body: string;
  attachment_url: string | null;
  is_internal: boolean;
  from: 'customer' | 'staff';
  author: { id: number; name: string; avatar_url: string | null } | null;
  created_at: string | null;
};

export type AdminSupportWorkspace = {
  ticket: AdminSupportTicketRow;
  messages: SupportDeskMessage[];
  requester: {
    id: number;
    joined_at: string | null;
    is_suspended: boolean;
    tickets_total: number;
    tickets_open: number;
    tickets_recent: number;
    errands_count: number;
    recent_tickets: Array<{
      id: number;
      code: string;
      subject: string;
      status: SupportTicketStatus;
      category: SupportTicketCategory;
      created_at: string | null;
    }>;
  } | null;
  history: Array<{ key: string; label: string; at: string; tone: 'blue' | 'purple' | 'green' | 'amber' | 'gray' }>;
};

export type SupportDeskAgent = {
  id: number;
  name: string;
  email: string | null;
  open: number;
  needs_reply: number;
  is_me: boolean;
};

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
export type CampaignCategory = 'announcement' | 'urgent_alert' | 'promotion' | 'finance_update';
export type CampaignChannel = 'in_app' | 'push' | 'email' | 'whatsapp';
export type CampaignAudience =
  | 'all'
  | 'requesters'
  | 'runners'
  | 'verified_runners'
  | 'active_requesters'
  | 'active_errands'
  | 'dormant'
  | 'custom';

export type NotificationDelivery = {
  total: number;
  delivered: number;
  failed: number;
  read: number;
  rate: number | null;
  read_rate: number | null;
};

export type NotificationHistoryRow = {
  key: string;
  kind: 'campaign' | 'transactional' | 'broadcast';
  campaign_id: number | null;
  type: string;
  date: string | null;
  title: string;
  message: string;
  category: CampaignCategory | null;
  audience: { key: CampaignAudience | 'triggered'; label: string; count: number; noun?: string; estimated: boolean };
  channels: CampaignChannel[];
  delivery: NotificationDelivery | null;
  status: CampaignStatus;
  author: { name: string; system: boolean };
  at: string | null;
  at_kind: 'sent' | 'scheduled' | 'edited';
  scheduled_at: string | null;
  sent_at: string | null;
  overdue: boolean;
  can_edit: boolean;
  can_send: boolean;
  can_cancel: boolean;
  can_delete: boolean;
};

export type NotificationAudienceSummary = {
  contactable: number;
  promotions_opt_in_pct: number | null;
  segments: Record<Exclude<CampaignAudience, 'custom'>, number>;
  checked_at: string;
};

export type AdminNotificationsOverview = {
  range: { start_date: string; end_date: string; previous_start_date: string; previous_end_date: string };
  kpis: {
    sent: { count: number; change_pct: number | null };
    delivered: { count: number; rate: number | null; push_sent: number };
    read: { count: number; rate: number | null; change_pts: number | null };
    failed: { count: number; share_pct: number | null; push_attempts: number };
  };
  series: {
    bucket: 'day' | 'week';
    points: Array<{ start: string; end: string; sent: number; delivered: number; read: number }>;
  };
  performance: { median_read_minutes: number | null; delivery_rate_change_pts: number | null };
  audience: NotificationAudienceSummary;
  campaigns: NotificationHistoryRow[];
  tab_counts: { scheduled: number; drafts: number };
};

export type NotificationRecipient = {
  id: number;
  user: { id: number; name: string; role: string | null } | null;
  title: string;
  push_status: string | null;
  read_at: string | null;
  created_at: string | null;
};

export type NotificationBreakdown = {
  in_app: number;
  push_sent: number;
  push_failed: number;
  no_device: number;
  push_disabled: number;
  email_sent?: number;
  whatsapp_sent?: number;
  failed?: number;
  opted_out?: number;
  untracked?: number;
};

export type CampaignEstimate = {
  recipients: number;
  opted_out: number;
  reachable: Record<CampaignChannel, number>;
};

export type NotificationCampaignDetail = NotificationHistoryRow & {
  category: CampaignCategory;
  audience_user_ids: number[];
  custom_users: Array<{ id: number; name: string; role: string | null }>;
  sender: { id: number; name: string } | null;
  breakdown: NotificationBreakdown;
  last_error: string | null;
  estimate: CampaignEstimate | null;
  recipients: NotificationRecipient[];
};

export type NotificationGroupDetail = {
  type: string;
  label: string;
  date: string;
  kind: 'transactional' | 'broadcast';
  delivery: NotificationDelivery;
  people: number;
  breakdown: NotificationBreakdown;
  titles: Array<{ title: string; count: number }>;
  recipients: NotificationRecipient[];
};

export type NotificationHistoryTab = 'all' | 'broadcasts' | 'transactional' | 'scheduled' | 'drafts';

export type NotificationHistoryFilters = {
  tab?: NotificationHistoryTab;
  search?: string;
  channel?: CampaignChannel;
  audience?: CampaignAudience | 'triggered';
  status?: CampaignStatus;
  start_date?: string;
  end_date?: string;
};

export type CampaignInput = {
  title: string;
  message: string;
  category: CampaignCategory;
  audience: CampaignAudience;
  user_ids?: number[];
  channels: CampaignChannel[];
  action: 'draft' | 'schedule' | 'send';
  scheduled_at?: string;
};

export type PerformanceTab = 'revenue' | 'errand_volume' | 'runner_activity' | 'user_growth';
export type PerformancePeriod =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_3_months'
  | 'custom'
  | 'all_time';

export type DashboardPerformance = {
  tab: PerformanceTab;
  period: PerformancePeriod;
  start_date: string;
  end_date: string;
  series: Array<{ date: string; value: number }>;
  summary: { total: number; average: number; max: number };
};

export type OverviewKpi = {
  value: number;
  previous: number;
  change_pct: number | null;
};

export type OverviewQueueItem = {
  id: number;
  title: string;
  subtitle?: string;
  amount?: number;
  bank_name?: string | null;
  waiting_since: string | null;
};

export type OverviewLiveBucket = 'in_progress' | 'matched' | 'awaiting_runner' | 'pending_confirmation';

export type DashboardOverview = {
  range: {
    start_date: string;
    end_date: string;
    previous_start_date: string;
    previous_end_date: string;
  };
  kpis: {
    gmv: OverviewKpi;
    commission: OverviewKpi & { take_rate_pct: number | null };
    completed_errands: OverviewKpi & { completion_rate_pct: number | null };
    active_users: OverviewKpi & { requesters: number; runners: number };
  };
  volume: {
    start_date: string;
    end_date: string;
    series: Array<{ date: string; errands: number; completed: number; gmv: number }>;
    errands: number;
    gmv: number;
    errands_change_pct: number | null;
  };
  live: {
    total: number;
    buckets: Record<OverviewLiveBucket, number>;
    cancellation_rate_pct: number | null;
  };
  queues: {
    kyc: { count: number; over_24h: number; items: OverviewQueueItem[] };
    disputes: { count: number; held_in_escrow: number; items: OverviewQueueItem[] };
    withdrawals: { count: number; amount: number; items: OverviewQueueItem[] };
  };
  top_runners: Array<{
    id: number;
    name: string;
    completed_errands: number;
    rating: number | null;
    on_time_pct: number | null;
    earnings: number;
  }>;
  quality: {
    avg_rating: number | null;
    dispute_rate_pct: number | null;
    avg_match_minutes: number | null;
  };
};

export type DashboardBadges = {
  kyc: number;
  errands: number;
  disputes: number;
  withdrawals: number;
  tickets: number;
};

export type UserListItem = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'buyer' | 'runner' | string;
  phone_verified: boolean;
  email_verified_at: string | null;
  is_online: boolean;
  is_suspended: boolean;
  created_at: string;
  avatar_url?: string | null;
  errands_as_buyer_count: number;
  errands_as_runner_count: number;
  city?: string | null;
  state?: string | null;
  wallet_balance?: number | null;
  last_active_at?: string | null;
  kyc_status?: UserKycStatus;
  account_status?: UserAccountStatus;
};

export type UserKycStatus = 'verified' | 'pending' | 'needs_review' | 'unverified';
export type UserAccountStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

export type UsersSummary = {
  range: { start_date: string; end_date: string };
  kpis: {
    total: { value: number; requesters: number; runners: number; growth_pct: number | null };
    active: { value: number; share_pct: number | null; window_days: number };
    suspended: { value: number; in_range: number; change_pct: number | null };
    new: { value: number; requesters: number; runners: number; change_pct: number | null };
  };
  tabs: { all: number; buyer: number; runner: number; admin: number };
  cities: string[];
  health: {
    kyc_pending: number;
    kyc_over_24h: number;
    users_in_disputes: number;
    dormant: number;
    dormant_window_days: number;
  };
};

export type UserReferralSummary = {
  code: string | null;
  used_count: number;
  used_by: { requesters: number; runners: number };
  qualified_count: number;
  pending_count: number;
  earned_total: number;
  bonus_total: number;
  bonus_count: number;
  welcome_total: number;
  last_earned_at: string | null;
  last_referral_at: string | null;
  referred_by: { id: number; name: string; role: string; code: string | null } | null;
  recent: Array<{
    id: number;
    name: string;
    role: 'requester' | 'runner';
    joined_at: string | null;
    reward_status: 'earned' | 'pending';
    reward_amount: number | null;
    reward_note: string | null;
  }>;
};

export type UserDetails = UserListItem & {
  referrals?: UserReferralSummary | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  is_available?: boolean;
  suspended_at?: string | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
  wallet_balance?: number | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_location_updated_at?: string | null;
};

export type ErrandParty = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

export type ErrandListItem = {
  id: number;
  title: string | null;
  description: string | null;
  type: 'instant' | 'scheduled' | string;
  category: string | null;
  status: string;
  budget_min: number | null;
  budget_max: number | null;
  base_price?: number | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  scheduled_at: string | null;
  created_at: string;
  code?: string | null;
  updated_at?: string;
  estimated_distance_km?: number | null;
  estimated_duration_min?: number | null;
  buyer?: ErrandParty | null;
  runner?: ErrandParty | null;
  is_active?: boolean;
  is_stuck?: boolean;
  escrow_payment?: {
    id: number;
    errand_id?: number;
    amount: number;
    status: string;
  } | null;
};

export type AdminErrandNote = {
  id: string;
  body: string;
  admin_id: number;
  admin_name: string;
  at: string;
};

export type LoginDeviceType = 'app' | 'desktop' | 'mobile' | 'tablet' | 'other';

export type AdminUserLogin = {
  id: number;
  client: string;
  device: string | null;
  device_type: LoginDeviceType | null;
  ip_address: string | null;
  location: string | null;
  country_code: string | null;
  user_agent: string | null;
  /** The token from this sign-in is still valid. */
  active: boolean;
  created_at: string | null;
};

export type AdminAuditLogEntry = {
  id: number;
  admin: { id: number; name: string | null } | null;
  action: string;
  resource: string;
  label: string;
  method: string;
  path: string;
  subject: { type: string; id: number | null } | null;
  target_user: { id: number; name: string | null; role: string } | null;
  status_code: number | null;
  succeeded: boolean;
  ip_address: string | null;
  device: string | null;
  payload: Record<string, unknown> | null;
  approved_by?: { id: number | null; name: string | null } | null;
  created_at: string | null;
};

export type AdminAuditLogSummary = {
  actions_24h: number;
  failed_24h: number;
  active_admins_24h: number;
  failed_sign_ins_7d: number;
  approved_actions_7d: number;
  approvals_denied_7d: number;
  deletions_7d: number;
  series: Array<{ date: string; total: number; failed: number }>;
  top_admins: Array<{ id: number; name: string; count: number }>;
  top_areas: Array<{ key: string; label: string; count: number }>;
};

export type AdminAuditLogOptions = {
  admins: Array<{ id: number; name: string }>;
  resources: Array<{ key: string; label: string }>;
};

export type AdminAuditLogFilters = {
  page?: number;
  per_page?: number;
  admin_id?: number;
  resource?: string;
  target_user_id?: number;
  outcome?: 'success' | 'failed';
  from?: string;
  to?: string;
  search?: string;
  approved?: 1;
};

export type AdminUserProfile = {
  user: {
    id: number;
    code: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    role: 'buyer' | 'runner' | 'admin' | string;
    avatar_url: string | null;
    account_status: 'active' | 'inactive' | 'suspended' | 'deleted' | string;
    kyc_status: 'verified' | 'pending' | 'needs_review' | 'unverified' | string;
    address: string | null;
    city: string | null;
    state: string | null;
    auth_provider: string | null;
    referral_code: string | null;
    referred_by: { id: number; name: string } | null;
    is_suspended: boolean;
    suspended_at: string | null;
    deactivated_at: string | null;
    deleted_at: string | null;
    created_at: string | null;
    last_active_at: string | null;
  };
  metrics: {
    errands_total: number;
    errands_completed: number;
    errands_cancelled: number;
    completion_pct: number | null;
    lifetime_value: number;
    average_order: number | null;
    wallet_balance: number | null;
    pending_withdrawals: { count: number; amount: number };
  };
  preferences: { push_enabled: boolean; email_enabled: boolean; has_push_device: boolean };
  verification: {
    email_verified: boolean;
    email_verified_at: string | null;
    phone_verified: boolean;
    phone_verified_at: string | null;
    identity: 'approved' | 'pending' | 'rejected' | 'not_submitted' | 'not_required' | string;
    payment_method: { label: string; bank: string | null } | null;
  };
  health: { score: number; level: 'low' | 'medium' | 'high'; factors: string[] };
  support: {
    tickets_total: number;
    tickets_open: number;
    disputes_total: number;
    disputes_open: number;
    last_ticket: { id: number; code: string; subject: string | null; status: string; created_at: string | null } | null;
  };
  notes: AdminErrandNote[];
  sessions: Array<{
    id: number;
    client: string;
    device: string | null;
    device_type: LoginDeviceType | null;
    ip_address: string | null;
    location: string | null;
    created_at: string | null;
    last_used_at: string | null;
  }>;
  logins: AdminUserLogin[];
  admin_actions: Array<{ id: number; label: string; admin_name: string | null; succeeded: boolean; created_at: string | null }>;
  activity: Array<{
    kind: 'session' | 'login' | 'verified' | 'suspended' | 'created';
    title: string;
    detail: string | null;
    at: string;
  }>;
  saved_places: Array<{ id: string; label: string; address: string; latitude: number | null; longitude: number | null }>;
  referrals: UserReferralSummary;
};

export type AdminUserErrandRow = {
  id: number;
  code: string;
  title: string | null;
  category: string | null;
  status: string;
  escrow_status: string | null;
  amount: number | null;
  /** Runner rows: true when the earning is projected from the job amount rather than paid out. */
  amount_estimated?: boolean;
  counterpart: string | null;
  created_at: string | null;
};

export type RunnerVerificationState = 'approved' | 'pending' | 'rejected' | 'not_submitted';
export type RunnerCheckState = 'passed' | 'review' | 'rejected' | 'missing';

export type AdminRunnerProfile = {
  runner: {
    id: number;
    code: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    is_online: boolean;
    is_suspended: boolean;
    suspended_at: string | null;
    deleted_at: string | null;
    created_at: string | null;
    last_seen_at: string | null;
    last_location_at: string | null;
    verification_status: RunnerVerificationState;
  };
  metrics: {
    errands_total: number;
    errands_completed: number;
    errands_cancelled: number;
    errands_active: number;
    completion_pct: number | null;
    month_earnings: number;
    previous_month_earnings: number;
    earnings_change_pct: number | null;
    median_completion_min: number | null;
    completion_sample: number;
    wallet_balance: number;
    pending_withdrawals: { count: number; amount: number };
  };
  ratings: {
    average: number | null;
    count: number;
    top_percent: number | null;
    recent: Array<{
      id: number;
      rating: number;
      comment: string | null;
      reviewer: string;
      errand_id: number | null;
      errand_code: string | null;
      created_at: string | null;
    }>;
  };
  active_errand: {
    id: number;
    code: string;
    title: string | null;
    category: string | null;
    status: string;
    requester: { id: number; name: string } | null;
    pickup_address: string | null;
    dropoff_address: string | null;
    distance_km: number | null;
    accepted_at: string | null;
    started_at: string | null;
    sla: { due_at: string | null; basis: 'deadline' | 'scheduled' | 'estimate' | null; estimate_min: number };
    tracking: 'healthy' | 'stale' | 'none';
    to_pickup_m: number | null;
    to_dropoff_m: number | null;
    earning: number | null;
    earning_estimated: boolean;
  } | null;
  onboarding: Array<{
    key: 'identity' | 'guarantors' | 'area' | 'payout';
    label: string;
    state: RunnerCheckState;
    detail: string | null;
    at: string | null;
  }>;
  verification: {
    id: number;
    status: string;
    submitted_at: string | null;
    reviewed_at: string | null;
    rejection_reason: string | null;
  } | null;
  emergency_contact: { name: string | null; phone: string | null; address: string | null } | null;
  vehicle: {
    type: string | null;
    plate_number: string | null;
    fleet: {
      id: number;
      name: string | null;
      brand: string | null;
      model: string | null;
      registration_number: string | null;
      status: string | null;
    } | null;
  };
  zone: {
    area: string | null;
    assigned: { id: number; name: string; active: boolean; has_boundary: boolean } | null;
    current: { id: number; name: string } | null;
    inside: boolean | null;
  };
  services: Array<{ category: string | null; count: number }>;
  payout_account: { bank_name: string | null; account_last4: string; account_name: string | null } | null;
  documents: Array<{
    key: 'id_front' | 'id_back' | 'selfie' | 'address';
    label: string;
    url: string;
    status: 'verified' | 'review' | 'rejected';
    uploaded_at: string | null;
  }>;
};

export type AdminRunnerPayoutRow = {
  id: number;
  code: string;
  reference: string | null;
  amount: number;
  fee: number;
  status: string;
  bank_name: string | null;
  account_last4: string | null;
  period_start: string | null;
  errands_count: number;
  created_at: string | null;
  processed_at: string | null;
};

export type AdminAssignableErrand = {
  id: number;
  code: string;
  title: string | null;
  category: string | null;
  status: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  requester: string | null;
  amount: number | null;
  distance_m: number | null;
  already_invited: boolean;
  created_at: string | null;
};

export type AdminRunnerAssignmentUpdate = Partial<{
  vehicle_type: string;
  plate_number: string | null;
  primary_errand_area: string | null;
}>;

export type AdminUserProfileUpdate = Partial<{
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
}>;

export type AdminErrandTimelineEvent = {
  key: string;
  at: string;
  title: string;
  detail: string | null;
  kind: 'system' | 'payment' | 'issue' | 'admin';
};

export type AdminErrandView = {
  errand: {
    id: number;
    code: string;
    title: string | null;
    description: string | null;
    category: string | null;
    type: string | null;
    status: string;
    city: string | null;
    zone: string | null;
    created_at: string | null;
    updated_at: string | null;
    scheduled_at: string | null;
    accepted_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    is_active: boolean;
    can_intervene: boolean;
  };
  route: {
    pickup: { address: string | null; latitude: number | null; longitude: number | null };
    dropoff: { address: string | null; latitude: number | null; longitude: number | null };
    distance_km: number | null;
    duration_min: number | null;
    active_leg: string | null;
  };
  sla: { due_at: string | null; basis: 'deadline' | 'scheduled' | 'estimate' | null; estimate_min: number };
  requester: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    errands_count: number;
    lifetime_spend: number;
  } | null;
  runner: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    vehicle: string | null;
    rating: number | null;
    completed_jobs: number;
    location: { latitude: number | null; longitude: number | null; updated_at: string } | null;
    tracking: 'healthy' | 'stale' | 'none';
  } | null;
  items: {
    list: Array<{ name: string; detail: string | null }>;
    spending_limit: number | null;
    instructions: string | null;
    expected_wait_minutes: number | null;
  };
  pricing: {
    source: 'escrow' | 'quote';
    status: string;
    job_amount: number | null;
    service_fee: number;
    coupon_code: string | null;
    coupon_discount: number;
    subsidy: number;
    total: number | null;
    held_at: string | null;
    released_at: string | null;
    refunded_at: string | null;
  };
  proof: {
    status: string | null;
    notes: string | null;
    photos: string[];
    submitted_at: string | null;
    rejection_reason: string | null;
  } | null;
  attachments: Array<{ id: number; name: string | null; type: string | null; url: string | null; created_at: string | null }>;
  dispute: { id: number; status: string; reason: string | null; created_at: string | null } | null;
  notes: AdminErrandNote[];
  timeline: AdminErrandTimelineEvent[];
};

export type ErrandDetails = ErrandListItem & {
  metadata?: Record<string, unknown> | null;
  accepted_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  attachments?: Array<{
    id: number;
    errand_id: number;
    file_path?: string | null;
    file_url?: string | null;
    file_type?: string | null;
    file_name?: string | null;
    created_at?: string;
  }>;
  proof?: {
    id: number;
    errand_id: number;
    status: string;
    proof_photos?: string[] | null;
    notes?: string | null;
    submitted_at?: string | null;
    accepted_at?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
  } | null;
  dispute?: {
    id: number;
    errand_id: number;
    status: string;
    type?: string;
    reason?: string;
    resolution?: string | null;
    resolved_by?: number | null;
    resolved_at?: string | null;
  } | null;
  escrow_payment?: {
    id: number;
    errand_id: number;
    amount: number;
    status: string;
    released_at?: string | null;
    refunded_at?: string | null;
  } | null;
  escrowPayment?: ErrandDetails['escrow_payment'];
  can_intervene?: boolean;
  interventions?: Array<{
    action: string;
    reason: string;
    from?: string | number | null;
    to?: string | number | null;
    admin_id?: number;
    admin_name?: string | null;
    at: string;
  }>;
};

export type ErrandOpsStats = {
  active: number;
  stuck: number;
  unassigned: number;
  in_progress: number;
  disputed: number;
};

export type RunnerListItem = {
  id: number;
  runner_name: string;
  phone: string | null;
  avatar_url?: string | null;
  rating: number;
  completion_rate: number;
  total_earnings: number;
  status: 'active' | 'inactive' | 'suspended' | string;
  verification: 'pending' | 'verified' | 'rejected' | string;
  joined_date: string;
  is_suspended: boolean;
};

export type RunnerMetrics = {
  total_runners: number;
  verified_runners: number;
  active_today: number;
  suspended_runners: number;
};

export type RunnerVerificationMetrics = {
  approved: number;
  pending: number;
  rejected: number;
};

export type RunnerProfile = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url?: string | null;
  address?: string | null;
  city: string | null;
  state: string | null;
  is_online: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  joined_date: string;
  rating: number;
  completion_rate: number;
  verification: string;
  runner_profile?: Record<string, unknown> | null;
  runner_verification?: RunnerVerificationItem | Record<string, unknown> | null;
};

export type RunnerEarnings = {
  summary: {
    total_earnings: number;
    today_earnings: number;
    this_month_earnings: number;
  };
  recent_transactions: Array<{
    id: number;
    amount: number;
    reference: string | null;
    description: string | null;
    created_at: string;
  }>;
};

export type WithdrawalUser = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'buyer' | 'runner' | string;
};

export type WithdrawalListItem = {
  id: number;
  wallet_id: number;
  amount: number;
  fee: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled' | string;
  bank_name: string | null;
  bank_code?: string | null;
  account_number: string | null;
  account_name: string | null;
  reference: string | null;
  reason: string | null;
  processed_at: string | null;
  created_at: string;
  payout_reference?: string | null;
  payout_status?: 'pending' | 'success' | 'failed' | 'reversed' | string | null;
  wallet?: {
    id: number;
    user?: WithdrawalUser | null;
  } | null;
};

export type WalletTransactionCategory =
  | 'wallet_funding'
  | 'withdrawal'
  | 'escrow'
  | 'referral'
  | 'payout'
  | 'other'
  | string;

export type WalletTransactionListItem = {
  id: number;
  wallet_id: number;
  errand_id: number | null;
  type: 'credit' | 'debit' | string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'reversed' | string;
  reference: string | null;
  description: string | null;
  category: WalletTransactionCategory;
  is_funding?: boolean;
  actions?: WalletTransactionActions;
  paystack_status?: string | null;
  created_at: string;
  updated_at: string;
  wallet?: {
    id: number;
    balance?: number;
    currency?: string;
    user?: WithdrawalUser | null;
  } | null;
  errand?: { id: number; title: string | null; status: string } | null;
};

export type WalletTransactionActions = {
  verify_funding: boolean;
  mark_failed: boolean;
  cancel_funding: boolean;
  reverse: boolean;
};

export type WalletLedgerStats = {
  pending_funding: { count: number; amount: number };
  failed_funding_24h: number;
  credits_today: number;
  debits_today: number;
  withdrawals_pending: number;
  withdrawals_approved: number;
};

export type WalletTransactionDetail = {
  transaction: WalletTransactionListItem;
  meta: Record<string, unknown> | null;
  wallet: WalletTransactionListItem['wallet'];
  user: WithdrawalUser | null;
  errand: { id: number; title: string | null; status: string; buyer_id?: number; runner_id?: number } | null;
  withdrawal: WithdrawalListItem | null;
  escrow_payment: {
    id: number;
    errand_id: number;
    amount: number;
    status: string;
    wallet_transaction_id: number | null;
  } | null;
  related_transactions: WalletTransactionListItem[];
  actions?: WalletTransactionActions;
};

export type UserWalletPayload = {
  user: WithdrawalUser;
  wallet: {
    id: number;
    balance: number;
    currency: string | null;
  };
  transactions: Paginated<WalletTransactionListItem>;
};

export type DisputeActor = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone?: string | null;
};

export type DisputeErrand = {
  id: number;
  title: string | null;
  status: string;
  buyer_id?: number | null;
  runner_id?: number | null;
};

export type DisputeListItem = {
  id: number;
  errand_id: number | null;
  raised_by: number | null;
  type: 'payment' | 'service' | 'other' | string;
  reason: string;
  status: 'open' | 'under_review' | 'resolved' | 'closed' | string;
  resolution: string | null;
  resolved_by: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  errand?: DisputeErrand | null;
  raisedBy?: DisputeActor | null;
  resolvedBy?: DisputeActor | null;
};

export type SupportTicketStatus = 'open' | 'awaiting_user' | 'resolved' | 'closed' | string;

export type SupportTicketCategory = 'account' | 'errand' | 'payment' | 'kyc' | 'other' | string;

export type SupportTicketUser = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone?: string | null;
};

export type SupportTicketMessage = {
  id: number;
  ticket_id: number;
  user_id: number;
  body: string;
  attachment_url: string | null;
  is_staff: boolean;
  user?: SupportTicketUser | null;
  created_at: string;
};

export type SupportTicketListItem = {
  id: number;
  public_id: string;
  category: SupportTicketCategory;
  subject: string;
  status: SupportTicketStatus;
  errand_id: number | null;
  errand?: DisputeErrand | null;
  last_replied_at: string | null;
  created_at: string;
  updated_at: string;
  is_locked: boolean;
  can_reply: boolean;
  preview?: string | null;
  user?: SupportTicketUser | null;
  messages?: SupportTicketMessage[];
};

export type RunnerVerificationUser = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role?: string;
  created_at?: string | null;
};

export type RunnerVerificationProfile = {
  user_id: number;
  vehicle_type: string | null;
  plate_number: string | null;
  primary_errand_area: string | null;
  bank_name: string | null;
  bank_code?: string | null;
  account_number: string | null;
  account_name: string | null;
  verification_status: string | null;
  verified_at: string | null;
};

export type RunnerVerificationItem = {
  id: number;
  user_id: number;
  date_of_birth: string | null;
  gender: string | null;
  id_number: string | null;
  id_document_type: string | null;
  id_document_front: string | null;
  id_document_back: string | null;
  selfie_photo: string | null;
  proof_of_address: string | null;
  address_document_type: string | null;
  bvn: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_address: string | null;
  guarantor1_name: string | null;
  guarantor1_phone: string | null;
  guarantor1_address: string | null;
  guarantor2_name: string | null;
  guarantor2_phone: string | null;
  guarantor2_address: string | null;
  previous_workplace: string | null;
  status: 'pending' | 'approved' | 'rejected' | string;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  user?: RunnerVerificationUser | null;
  runner_profile?: RunnerVerificationProfile | null;
};

export type NotificationUser = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'admin' | 'buyer' | 'runner' | string;
};

export type NotificationListItem = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  user?: NotificationUser | null;
};

export type NotificationListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type NotificationBroadcastResult = {
  sent_count: number;
  target: 'all' | 'buyers' | 'runners' | 'custom';
  total_eligible: number;
};

export type AdminNotificationsListResponse = {
  items: NotificationListItem[];
  meta: NotificationListMeta;
};

export type PricingRuleItem = {
  id: number;
  city: string | null;
  zone: string | null;
  errand_type: string | null;
  base_fare: number;
  per_km: number;
  per_minute: number;
  surge_multiplier: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PricingRuleListResponse = {
  rules: PricingRuleItem[];
  pagination: PaginationMeta;
  meta?: {
    zone_pricing: { enabled: boolean; active_zones: number };
    defaults: { base_fare: number; per_km: number; per_minute: number; minimum_fare: number };
    counts: { total: number; active: number };
  };
};

export type PricingRulePreviewInput = {
  city?: string;
  zone?: string;
  errand_type?: string;
  distance_km: number;
  duration_min: number;
};

export type PricingRulePreview = {
  rule: PricingRuleItem | null;
  base_price: number;
  suggested_min: number;
  suggested_max: number;
  minimum_applied: boolean;
  zone_pricing_applies: boolean;
};

export type PricingRuleInput = {
  city?: string | null;
  zone?: string | null;
  errand_type?: string | null;
  base_fare: number;
  per_km: number;
  per_minute: number;
  surge_multiplier?: number;
  is_active?: boolean;
};

export type PlatformFees = {
  cancellation_fee_percent: number;
  runner_commission_percent: number;
  withdrawal_fee_percent: number;
  service_fee_amount: number;
  referral_requester_discount_amount: number;
  referral_referrer_bonus_amount: number;
};

export type PlatformFeeField = {
  key: keyof PlatformFees;
  label: string;
  unit: 'percent' | 'naira';
  help: string;
};

export type PlatformFeesResponse = {
  fees: PlatformFees;
  fields: PlatformFeeField[];
};

export type ReferralRewardTiming = 'signup' | 'first_errand';

export type ReferralRewardRule = {
  enabled: boolean;
  amount: number;
  timing: ReferralRewardTiming;
  min_errand_amount: number;
};

export type ReferralAudienceSettings = {
  enabled: boolean;
  new_user: ReferralRewardRule;
  referrer: ReferralRewardRule;
  screen_message: string;
  share_message: string;
};

export type ReferralProgram = {
  requester: ReferralAudienceSettings;
  runner: ReferralAudienceSettings;
};

export type ReferralProgramResponse = {
  program: ReferralProgram;
  placeholders: Array<{ token: string; help: string }>;
};

export type OperationsSettings = {
  runner_matching_radius_km: number;
  on_time_grace_minutes: number;
  kyc_review_sla_hours: number;
};

export type PayoutSettings = {
  runner_min_withdrawal_amount: number;
  weekend_payouts_enabled: boolean;
  runner_withdrawals_enabled: boolean;
  requester_withdrawals_enabled: boolean;
  withdrawals_paused_message: string;
};

export type PayoutSettingsSection = SettingsSection<PayoutSettings> & {
  default_withdrawals_paused_message: string;
  withdrawals_paused_message_max: number;
};

export type SettingsLastChange = { updated_at: string | null; updated_by: string | null };

export type SettingsSection<T> = {
  values: T;
  limits: Partial<Record<keyof T, [number, number]>>;
  last_change: SettingsLastChange;
};

export type SettingsIntegration = {
  key: string;
  label: string;
  purpose: string;
  configured: boolean;
};

export type ErrandTypeUsage = { errands: number; completed: number; share_pct: number };

export type AdminErrandType = ErrandTypeUsage & {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  dropoff: 'required' | 'optional' | 'none';
  built_in: boolean;
  legacy: boolean;
  updated_at: string | null;
};

export type AdminErrandTypesResponse = {
  window_days: number;
  total_errands: number;
  types: AdminErrandType[];
  other_categories: Array<ErrandTypeUsage & { key: string }>;
  icons: string[];
};

export type ErrandTypeInput = {
  name: string;
  slug?: string;
  icon: string;
  description: string | null;
  is_active: boolean;
  sort_order: number | null;
};

export type AdminSettingsBoard = {
  permissions: { operations: boolean; finance: boolean; super_admin: boolean };
  operations: SettingsSection<OperationsSettings> | null;
  payouts: PayoutSettingsSection | null;
  integrations: SettingsIntegration[];
  environment: { app_name: string; environment: string; timezone: string };
};

export const ERRAND_TYPES = [
  'shopping',
  'pickup_drop',
  'queue',
  'delivery',
  'custom',
] as const;

export type HelpSupportData = {
  support_email: string;
  help_center_url: string | null;
};

export type GlobalSearchResultItem = {
  id: number;
  label: string;
  url: string;
};

export type GlobalSearchData = {
  users: GlobalSearchResultItem[];
  runners: GlobalSearchResultItem[];
  errands: GlobalSearchResultItem[];
  disputes: GlobalSearchResultItem[];
  withdrawals: GlobalSearchResultItem[];
};

export type BlogPostListItem = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  tags: string[];
  image: string | null;
  published_at: string | null;
  author: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
};

export type BlogPostDetail = BlogPostListItem & {
  body: string;
  author_id: number | null;
};

export const BLOG_CATEGORIES = [
  'News',
  'Tips',
  'Updates',
  'Product',
  'Company',
  'How-to',
  'Other',
] as const;

export type BlogListResponse = {
  posts: BlogPostListItem[];
  pagination: PaginationMeta;
};

export type BlogPostInput = {
  title: string;
  slug?: string;
  excerpt?: string;
  body: string;
  category?: string;
  tags?: string[];
  image?: string;
  published_at?: string | null;
};

export type BlogPostUpdateInput = Partial<BlogPostInput>;

export type BlogEditorialStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';

export type BlogBoardRow = BlogPostListItem & {
  status: BlogEditorialStatus;
  review_requested_at: string | null;
  archived_at: string | null;
  views: number;
  engaged_reads: number;
};

export type BlogBoardPost = BlogBoardRow & {
  body: string;
  author_id: number | null;
};

export type BlogBoardListResponse = {
  posts: BlogBoardRow[];
  pagination: PaginationMeta;
};

export type BlogBoardTab = 'all' | 'published' | 'drafts' | 'scheduled' | 'archived';

export type BlogBoardListParams = {
  tab: BlogBoardTab;
  status?: 'published' | 'scheduled' | 'draft' | 'review' | 'archived';
  author_id?: number;
  category?: string;
  days?: 7 | 30 | 90 | 365;
  search?: string;
  page?: number;
  per_page?: number;
};

export type BlogEditorInput = {
  title: string;
  slug?: string;
  excerpt?: string | null;
  body: string;
  category?: string | null;
  tags?: string[];
  image?: string | null;
  published_at?: string | null;
  status?: 'draft' | 'review' | 'published';
};

export type BlogPostAction = 'publish' | 'schedule' | 'review' | 'draft' | 'archive' | 'restore' | 'duplicate';

export type BlogOverview = {
  range: { start_date: string; end_date: string; previous_start_date: string; previous_end_date: string };
  kpis: {
    published: { count: number; in_range: number; previous_in_range: number };
    drafts: { count: number; awaiting_review: number };
    scheduled: { count: number; next_at: string | null; next_title: string | null };
    views: {
      count: number;
      previous_count: number;
      change_pct: number | null;
      engaged_reads: number;
      engaged_rate: number | null;
      avg_read_seconds: number | null;
    };
  };
  series: {
    bucket: 'day' | 'week';
    points: Array<{ start: string; end: string; views: number; engaged_reads: number }>;
  };
  categories: {
    total: number;
    items: Array<{ name: string; count: number; pct: number }>;
    top_engaged: { name: string; engaged_rate: number } | null;
  };
  top_articles: Array<{ id: number; title: string; slug: string; status: BlogEditorialStatus; views: number; change_pct: number | null }>;
  attention: {
    awaiting_review: { count: number; oldest_requested_at: string | null };
    broken_links: { count: number; posts: number };
  };
  tab_counts: Record<BlogBoardTab, number>;
  filters: { authors: Array<{ id: number; name: string }>; categories: string[] };
};

export type BlogLinkIssue = {
  post_id: number;
  title: string;
  slug: string;
  status: BlogEditorialStatus;
  links: Array<{ href: string; text: string; reason: string }>;
};

export type BlogCalendar = {
  month: string;
  entries: Array<{ id: number; title: string; status: BlogEditorialStatus; category: string | null; at: string; author: string | null }>;
  unscheduled: { drafts: number; review: number };
};

export type SystemHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type SystemHealthComponent = {
  key: string;
  label: string;
  status: 'healthy' | 'configured' | 'missing' | 'degraded' | 'down' | string;
  message: string;
  latency_ms?: number;
  pending?: number | null;
  failed_24h?: number;
};

export type SystemHealthSecurity = {
  approval_enabled: boolean;
  approval_ttl_minutes: number;
  critical_actions: number;
  all_deletes_protected: boolean;
  super_admins: number;
  failed_sign_ins_24h: number;
  blocked_sign_ins_24h: number;
  approvals_granted_7d: number;
  approvals_denied_7d: number;
  approved_actions_7d: number;
};

export type SystemHealthEndpoint = {
  label: string;
  path: string;
  audience: string;
  status: string;
  message: string;
};

export type SystemHealthAlert = {
  severity: 'info' | 'warning' | 'error' | string;
  area: string;
  title: string;
  message: string;
  count: number | null;
};

export type SystemHealthIssue = {
  id: string;
  severity: 'info' | 'warning' | 'error' | string;
  area: string;
  title: string;
  message: string;
  occurred_at: string;
};

export type SystemHealthData = {
  status: SystemHealthStatus;
  summary: string;
  checked_at: string;
  api: {
    status: string;
    app_name: string;
    environment: string;
    debug: boolean;
    app_url: string;
    php_version: string;
    laravel_version: string;
  };
  components: SystemHealthComponent[];
  endpoints: SystemHealthEndpoint[];
  operational_alerts: SystemHealthAlert[];
  recent_issues: SystemHealthIssue[];
  security?: SystemHealthSecurity;
};

export const COUPON_CATEGORIES = [
  'shopping',
  'pharmacy',
  'food',
  'queue',
  'pickup',
  'pickup_drop',
  'delivery',
  'domestic',
  'custom',
] as const;

export type CouponDiscountType = 'percent' | 'fixed';
export type CouponAudience = 'all' | 'new_requesters' | 'specific_users';
export type CouponLifecycleStatus = 'active' | 'paused' | 'scheduled' | 'expired' | 'exhausted';
export type CouponRedemptionStatus = 'reserved' | 'consumed' | 'released';

export type CouponAssignedUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  assigned_at?: string | null;
};

export type CouponUsage = {
  reserved: number;
  consumed: number;
  released: number;
  used: number;
  remaining: number | null;
};

export type AdminCoupon = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  max_redemptions: number | null;
  max_redemptions_per_user: number;
  audience: CouponAudience;
  categories: string[];
  is_active: boolean;
  status: CouponLifecycleStatus;
  usage: CouponUsage;
  subsidy_absorbed: number;
  assigned_users: CouponAssignedUser[];
  created_at: string | null;
  updated_at: string | null;
};

export type AdminCouponInput = {
  code: string;
  name: string;
  description?: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_discount_amount?: number | null;
  min_order_amount?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  max_redemptions?: number | null;
  max_redemptions_per_user?: number;
  audience: CouponAudience;
  categories?: string[];
  user_ids?: number[];
  is_active?: boolean;
};

export type AdminCouponListResponse = {
  coupons: AdminCoupon[];
  pagination: PaginationMeta;
};

export type AdminCouponStats = {
  active_codes: number;
  paused_codes: number;
  redemptions: number;
  reserved: number;
  subsidy_absorbed: number;
};

export type AdminCouponRedemption = {
  id: number;
  status: CouponRedemptionStatus;
  code: string;
  listed_amount: number;
  discount_amount: number;
  payable_amount: number;
  subsidy_amount: number;
  reserved_at: string | null;
  consumed_at: string | null;
  released_at: string | null;
  user: { id: number; name: string; email: string | null; phone: string | null } | null;
  errand: { id: number; code: string; title: string | null; status: string | null } | null;
};

export type AdminCouponRedemptionListResponse = {
  redemptions: AdminCouponRedemption[];
  pagination: PaginationMeta;
};

export type AdminCouponUserSearchResponse = {
  users: CouponAssignedUser[];
};

export type CouponAttentionFlag = 'expiring' | 'near_limit';

export type AdminCouponListParams = {
  page?: number;
  per_page?: number;
  search?: string;
  status?: CouponLifecycleStatus;
  flag?: CouponAttentionFlag;
  audience?: CouponAudience;
  discount_type?: CouponDiscountType;
};

export type CouponOverview = {
  range: { start_date: string; end_date: string; previous_start_date: string; previous_end_date: string };
  kpis: {
    active: { count: number; scheduled: number; paused: number };
    redemptions: { count: number; previous_count: number; change_pct: number | null; requesters: number };
    discount: {
      amount: number;
      previous_amount: number;
      change_pct: number | null;
      average: number | null;
      share_of_listed_pct: number | null;
    };
    order_value: { amount: number; listed_amount: number };
    reserved: { count: number; discount: number };
  };
  series: {
    bucket: 'day' | 'week';
    points: Array<{ start: string; end: string; redemptions: number; discount: number }>;
  };
  audience_mix: {
    total: number;
    items: Array<{ key: CouponAudience; label: string; redemptions: number; discount: number; pct: number }>;
    percent_share_pct: number | null;
  };
  top_coupons: Array<{
    id: number;
    code: string;
    name: string;
    status: CouponLifecycleStatus;
    redemptions: number;
    discount: number;
    change_pct: number | null;
    used: number;
    max_redemptions: number | null;
  }>;
  attention: {
    expiring: { count: number; next_code: string | null; next_at: string | null };
    near_limit: { count: number };
    exhausted: { count: number };
  };
  tab_counts: Record<'all' | CouponLifecycleStatus, number>;
};

export type AdminZone = {
  id: number;
  name: string;
  state?: string | null;
  city?: string | null;
  coverage_areas?: string[];
  runners_count?: number;
  aliases: string[];
  base_fee: number;
  per_km_rate: number;
  geo_boundary: Record<string, unknown> | null;
  has_boundary: boolean;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminZoneRunner = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  verification_status: string;
  is_suspended: boolean;
  zone_id: number | null;
  zone_name: string | null;
};

export type AdminZoneInput = {
  name?: string;
  state?: string | null;
  city?: string | null;
  coverage_text?: string | null;
  aliases?: string[];
  aliases_text?: string | null;
  base_fee?: number;
  per_km_rate?: number;
  geo_boundary?: Record<string, unknown> | string | null;
  active?: boolean;
};

export type AdminZoneListResponse = {
  zones: AdminZone[];
  pagination: PaginationMeta;
};

export type AdminZoneStats = {
  total: number;
  active: number;
  inactive: number;
  paused?: number;
  with_boundary: number;
  with_coverage?: number;
  assigned_runners?: number;
};
