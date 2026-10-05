export type AdminModule = 'operations' | 'finance' | 'content' | 'insights' | 'administration';

export interface AdminPermissions {
  is_super_admin: boolean;
  can_manage_operations: boolean;
  can_manage_finance: boolean;
  /** Missing on sessions cached before these modules existed. */
  can_manage_content?: boolean;
  can_manage_insights?: boolean;
  can_manage_administration?: boolean;
}

/** Laravel admin user from /admin/auth/login and /admin/auth/me */
export interface AdminUser {
  id: number;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  admin_role: string | null;
  admin_modules: AdminModule[];
  must_change_password: boolean;
  permissions: AdminPermissions;
}

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};
