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

export type DashboardStats = {
  metrics: {
    total_revenue: number;
    today_revenue: number;
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
};

export type UserDetails = UserListItem & {
  city?: string | null;
  state?: string | null;
  is_available?: boolean;
  suspended_at?: string | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
  wallet_balance?: number | null;
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
  runner_verification?: Record<string, unknown> | null;
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
