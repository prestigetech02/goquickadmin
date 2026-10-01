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

export type UserDetails = UserListItem & {
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
  sessions: Array<{ id: number; client: string; created_at: string | null; last_used_at: string | null }>;
  activity: Array<{
    kind: 'session' | 'login' | 'verified' | 'suspended' | 'created';
    title: string;
    detail: string | null;
    at: string;
  }>;
  saved_places: Array<{ id: string; label: string; address: string; latitude: number | null; longitude: number | null }>;
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

export type SystemHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type SystemHealthComponent = {
  key: string;
  label: string;
  status: 'healthy' | 'configured' | 'missing' | 'degraded' | 'down' | string;
  message: string;
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

export type AdminZone = {
  id: number;
  name: string;
  aliases: string[];
  base_fee: number;
  per_km_rate: number;
  geo_boundary: Record<string, unknown> | null;
  has_boundary: boolean;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminZoneInput = {
  name: string;
  aliases?: string[];
  aliases_text?: string | null;
  base_fee: number;
  per_km_rate: number;
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
  with_boundary: number;
};
