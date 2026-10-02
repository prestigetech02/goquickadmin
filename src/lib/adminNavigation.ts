import type { AdminModule, AdminUser } from '@/types';

export type PageKey =
  | 'dashboard'
  | 'admin2'
  | 'admin2-users'
  | 'admin2-user'
  | 'admin2-errands'
  | 'admin2-errand'
  | 'admin2-runners'
  | 'admin2-runner'
  | 'admin2-transactions'
  | 'admin2-withdrawals'
  | 'admin2-zones'
  | 'admin2-notifications'
  | 'admin2-verifications'
  | 'admin2-disputes'
  | 'admin2-revenue'
  | 'admin2-analytics'
  | 'admin2-settings'
  | 'admin2-blog'
  | 'admin2-blog-post'
  | 'admin2-coupons'
  | 'admin2-support'
  | 'errands'
  | 'runners'
  | 'kyc'
  | 'users'
  | 'payments'
  | 'company-revenue'
  | 'disputes'
  | 'tickets'
  | 'analytics'
  | 'blog'
  | 'notifications'
  | 'pricing'
  | 'coupons'
  | 'zones'
  | 'settings'
  | 'user-management'
  | 'system-logs'
  | 'support'
  | 'in-app-notifications';

type PageVisibility = 'sidebar' | 'hidden';
type PageAccess = 'all-admins' | 'operations' | 'finance' | 'super-admin' | 'personal';

export type AdminPageDefinition = {
  key: PageKey;
  label: string;
  path: string;
  section?: string;
  access: PageAccess;
  visibility: PageVisibility;
};

export const ADMIN_MODULE_OPTIONS: Array<{ key: AdminModule; label: string }> = [
  { key: 'operations', label: 'Operations' },
  { key: 'finance', label: 'Finance' },
];

export const ADMIN_PAGES: AdminPageDefinition[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', section: 'Overview', access: 'all-admins', visibility: 'sidebar' },
  { key: 'admin2', label: 'Admin2 (beta)', path: '/admin2', section: 'Overview', access: 'all-admins', visibility: 'sidebar' },
  { key: 'admin2-users', label: 'User Management', path: '/admin2/users', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-user', label: 'User details', path: '/admin2/users/:id', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-errands', label: 'Errands', path: '/admin2/errands', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-errand', label: 'Errand details', path: '/admin2/errands/:id', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-runners', label: 'Runners', path: '/admin2/runners', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-runner', label: 'Runner details', path: '/admin2/runners/:id', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-transactions', label: 'Transactions', path: '/admin2/transactions', access: 'finance', visibility: 'hidden' },
  { key: 'admin2-withdrawals', label: 'Withdrawals', path: '/admin2/withdrawals', access: 'finance', visibility: 'hidden' },
  { key: 'admin2-zones', label: 'Service Zones', path: '/admin2/zones', access: 'all-admins', visibility: 'hidden' },
  { key: 'admin2-notifications', label: 'Notifications', path: '/admin2/notifications', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-verifications', label: 'Runner verification', path: '/admin2/verifications', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-disputes', label: 'Disputes', path: '/admin2/disputes', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-revenue', label: 'Company revenue', path: '/admin2/revenue', access: 'finance', visibility: 'hidden' },
  { key: 'admin2-analytics', label: 'Analytics', path: '/admin2/analytics', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-settings', label: 'Settings', path: '/admin2/settings', access: 'all-admins', visibility: 'hidden' },
  { key: 'admin2-blog', label: 'Blog', path: '/admin2/blog', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-blog-post', label: 'Blog post', path: '/admin2/blog/:id', access: 'operations', visibility: 'hidden' },
  { key: 'admin2-coupons', label: 'Coupons', path: '/admin2/coupons', access: 'finance', visibility: 'hidden' },
  { key: 'admin2-support', label: 'Support tickets', path: '/admin2/support', access: 'operations', visibility: 'hidden' },
  { key: 'errands', label: 'Errands', path: '/errands', section: 'Operations', access: 'operations', visibility: 'sidebar' },
  { key: 'runners', label: 'Runners', path: '/runners', section: 'Operations', access: 'operations', visibility: 'sidebar' },
  { key: 'kyc', label: 'Runner KYC', path: '/runner-kyc', section: 'Operations', access: 'operations', visibility: 'sidebar' },
  { key: 'users', label: 'Users', path: '/users', section: 'Operations', access: 'operations', visibility: 'sidebar' },
  { key: 'payments', label: 'Payments', path: '/payments', section: 'Financials', access: 'finance', visibility: 'sidebar' },
  { key: 'company-revenue', label: 'Company revenue', path: '/company-revenue', section: 'Financials', access: 'finance', visibility: 'sidebar' },
  { key: 'disputes', label: 'Disputes', path: '/disputes', section: 'Operations', access: 'operations', visibility: 'sidebar' },
  { key: 'tickets', label: 'Tickets', path: '/tickets', section: 'Operations', access: 'operations', visibility: 'sidebar' },
  { key: 'analytics', label: 'Analytics', path: '/analytics', section: 'Insights', access: 'operations', visibility: 'sidebar' },
  { key: 'blog', label: 'Blog', path: '/blog', section: 'Content', access: 'operations', visibility: 'sidebar' },
  { key: 'notifications', label: 'Notifications', path: '/notifications', section: 'Content', access: 'operations', visibility: 'sidebar' },
  { key: 'pricing', label: 'Pricing Rules', path: '/pricing', section: 'Configuration', access: 'finance', visibility: 'sidebar' },
  { key: 'zones', label: 'Service Zones', path: '/zones', section: 'Configuration', access: 'finance', visibility: 'sidebar' },
  { key: 'coupons', label: 'Coupons', path: '/coupons', section: 'Configuration', access: 'finance', visibility: 'sidebar' },
  { key: 'settings', label: 'Settings', path: '/settings', section: 'Configuration', access: 'all-admins', visibility: 'sidebar' },
  { key: 'user-management', label: 'User Management', path: '/user-management', section: 'System', access: 'super-admin', visibility: 'sidebar' },
  { key: 'system-logs', label: 'System Health', path: '/system-health', section: 'System', access: 'super-admin', visibility: 'sidebar' },
  { key: 'support', label: 'Help & Support', path: '/support', section: 'System', access: 'all-admins', visibility: 'sidebar' },
  { key: 'in-app-notifications', label: 'My Notifications', path: '/my-notifications', access: 'personal', visibility: 'hidden' },
];

const PAGE_BY_KEY = Object.fromEntries(ADMIN_PAGES.map((page) => [page.key, page])) as Record<PageKey, AdminPageDefinition>;
const PAGE_BY_PATH = Object.fromEntries(ADMIN_PAGES.map((page) => [page.path, page])) as Record<string, AdminPageDefinition>;

export function getPageDefinition(key: PageKey): AdminPageDefinition {
  return PAGE_BY_KEY[key];
}

export function getPagePath(key: PageKey): string {
  return getPageDefinition(key).path;
}

export function getPageHref(key: PageKey, options?: { openId?: number | null }): string {
  const url = new URL(getPagePath(key), 'http://admin.local');
  if (options?.openId != null) {
    url.searchParams.set('open', String(options.openId));
  }
  return `${url.pathname}${url.search}`;
}

const ADMIN2_ERRAND_PATH = /^\/admin2\/errands\/(\d+)\/?$/;
const ADMIN2_USER_PATH = /^\/admin2\/users\/(\d+)\/?$/;
const ADMIN2_RUNNER_PATH = /^\/admin2\/runners\/(\d+)\/?$/;
const ADMIN2_BLOG_POST_PATH = /^\/admin2\/blog\/(new|\d+)\/?$/;

export function getPageFromPathname(pathname: string): PageKey | null {
  if (ADMIN2_BLOG_POST_PATH.test(pathname)) return 'admin2-blog-post';
  if (ADMIN2_ERRAND_PATH.test(pathname)) return 'admin2-errand';
  if (ADMIN2_USER_PATH.test(pathname)) return 'admin2-user';
  if (ADMIN2_RUNNER_PATH.test(pathname)) return 'admin2-runner';
  return PAGE_BY_PATH[pathname]?.key ?? null;
}

export function getAdmin2RunnerId(pathname: string): number | null {
  const match = ADMIN2_RUNNER_PATH.exec(pathname);
  return match ? Number(match[1]) : null;
}

export function getAdmin2RunnerHref(id: number): string {
  return `${getPagePath('admin2-runners')}/${id}`;
}

export function getAdmin2UserId(pathname: string): number | null {
  const match = ADMIN2_USER_PATH.exec(pathname);
  return match ? Number(match[1]) : null;
}

export function getAdmin2UserHref(id: number): string {
  return `${getPagePath('admin2-users')}/${id}`;
}

export function getAdmin2ErrandId(pathname: string): number | null {
  const match = ADMIN2_ERRAND_PATH.exec(pathname);
  return match ? Number(match[1]) : null;
}

export function getAdmin2ErrandHref(id: number): string {
  return `${getPagePath('admin2-errands')}/${id}`;
}

/** Post id from /admin2/blog/:id, or 'new' for the create screen. */
export function getAdmin2BlogPostId(pathname: string): number | 'new' | null {
  const match = ADMIN2_BLOG_POST_PATH.exec(pathname);
  if (!match) return null;
  return match[1] === 'new' ? 'new' : Number(match[1]);
}

export function getAdmin2BlogPostHref(id: number | 'new'): string {
  return `${getPagePath('admin2-blog')}/${id}`;
}

export function isAdminModule(value: string): value is AdminModule {
  return value === 'operations' || value === 'finance';
}

export function canAccessPage(user: AdminUser | null | undefined, page: PageKey): boolean {
  if (!user) return false;

  const definition = getPageDefinition(page);
  if (definition.access === 'personal') return true;
  if (user.permissions.is_super_admin) return true;

  switch (definition.access) {
    case 'all-admins':
      return user.permissions.can_manage_operations || user.permissions.can_manage_finance;
    case 'operations':
      return user.permissions.can_manage_operations;
    case 'finance':
      return user.permissions.can_manage_finance;
    case 'super-admin':
      return false;
    default:
      return false;
  }
}

export function getDefaultPageForUser(user: AdminUser): PageKey {
  if (canAccessPage(user, 'dashboard')) return 'dashboard';
  if (canAccessPage(user, 'payments')) return 'payments';
  if (canAccessPage(user, 'support')) return 'support';
  return 'in-app-notifications';
}

export function getVisiblePages(user: AdminUser | null | undefined): AdminPageDefinition[] {
  return ADMIN_PAGES.filter((page) => page.visibility === 'sidebar' && canAccessPage(user, page.key));
}

export function getAccessibleQuickLinks(user: AdminUser | null | undefined, keys: PageKey[]): AdminPageDefinition[] {
  return keys
    .map((key) => getPageDefinition(key))
    .filter((page) => canAccessPage(user, page.key));
}
