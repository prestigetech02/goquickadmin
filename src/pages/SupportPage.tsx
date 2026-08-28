import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Bike,
  BookOpen,
  CreditCard,
  ExternalLink,
  HelpCircle,
  IdCard,
  Mail,
  Package,
  RefreshCw,
  Scale,
  Settings,
  Users,
} from 'lucide-react';
import { fetchAdminHelpSupport } from '@/api/adminHelpSupportApi';
import { useAdminNavigate } from '@/context/AdminNavigationContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import {
  getAccessibleQuickLinks,
  type PageKey,
} from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

type QuickLink = {
  page: PageKey;
  label: string;
  description: string;
  icon: ReactNode;
};

const QUICK_LINKS: QuickLink[] = [
  {
    page: 'disputes',
    label: 'Disputes',
    description: 'Review and resolve buyer/runner conflicts',
    icon: <Scale className="w-5 h-5" />,
  },
  {
    page: 'payments',
    label: 'Payments',
    description: 'Withdrawals and wallet operations',
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    page: 'kyc',
    label: 'Runner KYC',
    description: 'Approve or reject runner verification',
    icon: <IdCard className="w-5 h-5" />,
  },
  {
    page: 'runners',
    label: 'Runners',
    description: 'Manage runner accounts and suspensions',
    icon: <Bike className="w-5 h-5" />,
  },
  {
    page: 'users',
    label: 'Users',
    description: 'Manage buyer and user accounts',
    icon: <Users className="w-5 h-5" />,
  },
  {
    page: 'errands',
    label: 'Errands',
    description: 'View and inspect errand activity',
    icon: <Package className="w-5 h-5" />,
  },
  {
    page: 'notifications',
    label: 'Notifications',
    description: 'Send broadcasts and view notification history',
    icon: <Bell className="w-5 h-5" />,
  },
  {
    page: 'settings',
    label: 'Settings',
    description: 'App and service configuration overview',
    icon: <Settings className="w-5 h-5" />,
  },
];

const ADMIN_GUIDE = [
  {
    title: 'Resolving a dispute',
    body: 'Go to Disputes, open the dispute, and use Resolve to add a resolution note and set status (resolved/closed). You can optionally update the related errand status.',
  },
  {
    title: 'Paying out a withdrawal',
    body: 'Go to Payments, find the approved withdrawal, and use Mark as paid after the transfer is done. The runner will receive an email confirmation.',
  },
  {
    title: 'Approving runner verification (KYC)',
    body: 'Go to Runner KYC, review the submission and documents, then Approve or Reject. Approved runners can accept errands and withdraw earnings.',
  },
  {
    title: 'Suspending or reactivating a user',
    body: 'Go to Users or Runners, open the user, then use Suspend or Reactivate. Suspended users cannot log in or perform actions.',
  },
  {
    title: 'Sending a broadcast notification',
    body: 'Go to Notifications, use the broadcast drawer to target all users, buyers only, runners only, or a custom audience. Respects each user’s notification preferences.',
  },
] as const;

export function SupportPage() {
  const { user } = useAuth();
  const navigate = useAdminNavigate();

  const helpQuery = useQuery({
    queryKey: queryKeys.support.info,
    queryFn: fetchAdminHelpSupport,
  });

  const supportEmail = helpQuery.data?.support_email ?? 'support@goquickapp.com.ng';
  const helpCenterUrl = helpQuery.data?.help_center_url;

  const visibleQuickLinks = useMemo(
    () => {
      const visiblePages = new Set(getAccessibleQuickLinks(user, QUICK_LINKS.map((link) => link.page)).map((page) => page.key));
      return QUICK_LINKS.filter((link) => visiblePages.has(link.page));
    },
    [user],
  );

  return (
    <div>
      <PageHeader
        title="Help & Support"
        subtitle="Contact information, quick links, and a short guide for common admin tasks"
      />

      {helpQuery.isError ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Failed to load support contact details. Using default support email.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink-900">Contact</h2>
                <p className="text-sm text-ink-500">Platform or account support</p>
              </div>
            </div>

            {helpQuery.isLoading ? (
              <div className="h-10 bg-ink-100 rounded-xl animate-pulse" />
            ) : (
              <>
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-2 text-brand-700 font-semibold hover:text-brand-800 transition-colors"
                >
                  {supportEmail}
                  <ExternalLink className="w-4 h-4" />
                </a>
                {helpCenterUrl ? (
                  <p className="mt-4">
                    <a
                      href={helpCenterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 hover:text-brand-700 transition-colors"
                    >
                      Help center / documentation
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </p>
                ) : null}
              </>
            )}

            <button
              type="button"
              onClick={() => helpQuery.refetch()}
              disabled={helpQuery.isFetching}
              className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-600 hover:bg-ink-50 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${helpQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-success-50 text-success-600 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink-900">Need help fast?</h2>
                <p className="text-sm text-ink-500">Use quick links to jump to the right module</p>
              </div>
            </div>
            <p className="text-sm text-ink-600">
              This page does not manage end-user support tickets. Use Disputes, Users, and Notifications for operational issues inside the platform.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <ArrowRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-900">Quick links</h2>
              <p className="text-sm text-ink-500">Jump to key sections of the admin panel</p>
            </div>
          </div>

          {visibleQuickLinks.length === 0 ? (
            <p className="text-sm text-ink-500">No quick links available for your module access.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleQuickLinks.map((link) => (
                <button
                  key={link.page}
                  type="button"
                  onClick={() => navigate(link.page)}
                  className="text-left p-4 rounded-xl border border-ink-100 hover:border-brand-200 hover:bg-brand-50/40 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-9 h-9 rounded-lg bg-ink-50 text-ink-600 flex items-center justify-center group-hover:bg-brand-100 group-hover:text-brand-700 transition-colors">
                      {link.icon}
                    </div>
                    <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-brand-600 mt-1 transition-colors" />
                  </div>
                  <p className="mt-3 font-semibold text-ink-900">{link.label}</p>
                  <p className="mt-1 text-sm text-ink-500">{link.description}</p>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-warning-50 text-warning-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-900">Admin guide</h2>
              <p className="text-sm text-ink-500">Common tasks and how to perform them</p>
            </div>
          </div>

          <div className="space-y-4">
            {ADMIN_GUIDE.map((item) => (
              <div key={item.title} className="p-4 rounded-xl bg-ink-50">
                <h3 className="font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-1 text-sm text-ink-600">{item.body}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
