export {
  ADMIN_MODULE_OPTIONS,
  canAccessPage,
  getDefaultPageForUser,
} from '@/lib/adminNavigation';
import type { AdminUser } from '@/types';

export function isSuperAdmin(user: AdminUser | null | undefined): boolean {
  return Boolean(user?.permissions.is_super_admin);
}
