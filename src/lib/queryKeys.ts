/** Central React Query keys for goquick-admin (Laravel API). */
export const queryKeys = {
  auth: {
    me: ['admin-auth', 'me'] as const,
  },
  settings: {
    all: ['admin-settings'] as const,
  },
  dashboard: {
    stats: ['admin-dashboard', 'stats'] as const,
    performance: (params: Record<string, unknown>) =>
      ['admin-dashboard', 'performance', params] as const,
  },
  users: {
    all: ['admin-users'] as const,
    list: (params: Record<string, unknown>) => ['admin-users', 'list', params] as const,
    detail: (id: number) => ['admin-users', 'detail', id] as const,
    wallet: (id: number) => ['admin-users', 'wallet', id] as const,
  },
  errands: {
    all: ['admin-errands'] as const,
    opsStats: ['admin-errands', 'ops-stats'] as const,
    list: (params: Record<string, unknown>) => ['admin-errands', 'list', params] as const,
    detail: (id: number) => ['admin-errands', 'detail', id] as const,
  },
  runners: {
    all: ['admin-runners'] as const,
    metrics: ['admin-runners', 'metrics'] as const,
    list: (params: Record<string, unknown>) => ['admin-runners', 'list', params] as const,
    detail: (id: number) => ['admin-runners', 'detail', id] as const,
    earnings: (id: number) => ['admin-runners', 'earnings', id] as const,
    verifications: (params: Record<string, unknown>) =>
      ['admin-runners', 'verifications', params] as const,
    verificationMetrics: ['admin-runners', 'verification-metrics'] as const,
    verificationDetail: (id: number) => ['admin-runners', 'verification', id] as const,
  },
  payments: {
    ledgerStats: ['admin-payments', 'ledger-stats'] as const,
    walletTransactions: (params: Record<string, unknown>) =>
      ['admin-payments', 'wallet-transactions', params] as const,
    walletTransactionDetail: (id: number) => ['admin-payments', 'wallet-transaction', id] as const,
    withdrawals: (params: Record<string, unknown>) =>
      ['admin-payments', 'withdrawals', params] as const,
    withdrawalDetail: (id: number) => ['admin-payments', 'withdrawal', id] as const,
  },
  disputes: {
    all: ['admin-disputes'] as const,
    list: (params: Record<string, unknown>) => ['admin-disputes', 'list', params] as const,
    detail: (id: number) => ['admin-disputes', 'detail', id] as const,
  },
  tickets: {
    all: ['admin-tickets'] as const,
    list: (params: Record<string, unknown>) => ['admin-tickets', 'list', params] as const,
    detail: (id: number) => ['admin-tickets', 'detail', id] as const,
  },
  pricing: {
    all: ['admin-pricing'] as const,
    list: (params: Record<string, unknown>) => ['admin-pricing', 'list', params] as const,
    detail: (id: number) => ['admin-pricing', 'detail', id] as const,
    fees: ['admin-pricing', 'fees'] as const,
  },
  blog: {
    list: (params: Record<string, unknown>) => ['admin-blog', 'list', params] as const,
    detail: (id: number) => ['admin-blog', 'detail', id] as const,
  },
  systemHealth: {
    all: ['admin-system-health'] as const,
  },
  notifications: {
    list: (params: Record<string, unknown>) => ['admin-notifications', 'list', params] as const,
  },
  admins: {
    all: ['admin-accounts'] as const,
    list: (params: Record<string, unknown>) => ['admin-accounts', 'list', params] as const,
    detail: (id: number) => ['admin-accounts', 'detail', id] as const,
  },
  support: {
    info: ['admin-help-support'] as const,
  },
  inAppNotifications: {
    all: ['in-app-notifications'] as const,
    unreadCount: ['in-app-notifications', 'unread-count'] as const,
    preview: ['in-app-notifications', 'preview'] as const,
    list: (params: Record<string, unknown>) => ['in-app-notifications', 'list', params] as const,
  },
  search: {
    global: (query: string) => ['admin-global-search', query] as const,
  },
} as const;
