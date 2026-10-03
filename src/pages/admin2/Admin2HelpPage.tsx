import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Bike,
  KeyRound,
  LifeBuoy,
  Mail,
  MessageSquareWarning,
  PackageCheck,
  Settings,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { fetchAdminHelpSupport } from '@/api/adminHelpSupportApi';
import { Card, Skeleton } from '@/components/admin2/overview/primitives';
import { PageHeader } from '@/components/admin2/shared/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { canAccessPage, getPagePath, type PageKey } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

const DEFAULT_SUPPORT_EMAIL = 'support@goquickapp.com.ng';

const QUICK_LINKS: Array<{ page: PageKey; label: string; description: string; icon: LucideIcon }> = [
  { page: 'admin2-support', label: 'Support tickets', description: 'Reply to tickets people raise in the apps', icon: LifeBuoy },
  { page: 'admin2-disputes', label: 'Disputes', description: 'Decide who gets the money when an errand goes wrong', icon: MessageSquareWarning },
  { page: 'admin2-withdrawals', label: 'Withdrawals', description: 'Approve or reject runner payout requests', icon: WalletCards },
  { page: 'admin2-verifications', label: 'Verifications', description: 'Review runner identity documents', icon: BadgeCheck },
  { page: 'admin2-runners', label: 'Runners', description: 'Runner accounts, earnings and suspensions', icon: Bike },
  { page: 'admin2-users', label: 'Users', description: 'Customer accounts, wallets and suspensions', icon: Users },
  { page: 'admin2-errands', label: 'Errands', description: 'Track live errands and step in when needed', icon: PackageCheck },
  { page: 'admin2-notifications', label: 'Notifications', description: 'Send announcements to customers or runners', icon: Bell },
  { page: 'admin2-settings', label: 'Settings', description: 'Fees, fare rules, referrals and payouts', icon: Settings },
];

const GUIDE: Array<{ title: string; body: string }> = [
  {
    title: 'Deciding a dispute',
    body: 'Open Disputes, pick the case and read both sides and the errand timeline. Choose an outcome (refund the requester, pay the runner, no money movement, or dismiss), write a resolution note, and optionally set the final errand status.',
  },
  {
    title: 'Paying out a withdrawal',
    body: 'Open Withdrawals and review the request. Approving sends the money straight away by Flutterwave Transfer. Rejecting returns the amount and the withdrawal fee to the runner’s wallet.',
  },
  {
    title: 'Approving a runner',
    body: 'Open Verifications, check the documents against the details the runner entered, then approve or reject with a reason. Only approved runners can accept errands and withdraw earnings.',
  },
  {
    title: 'Suspending or reactivating an account',
    body: 'Open the person from Users or Runners, then use the actions menu on their profile. Suspended accounts are blocked from the apps until they are reactivated.',
  },
  {
    title: 'Sending an announcement',
    body: 'Open Notifications and start a new message. Pick everyone, customers, runners or specific people, write the title and message, and send.',
  },
];

export function Admin2HelpPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const helpQuery = useQuery({ queryKey: queryKeys.support.info, queryFn: fetchAdminHelpSupport });
  const supportEmail = helpQuery.data?.support_email || DEFAULT_SUPPORT_EMAIL;
  const helpCenterUrl = helpQuery.data?.help_center_url;
  const links = QUICK_LINKS.filter((link) => canAccessPage(user, link.page));
  const superAdmin = Boolean(user?.permissions?.is_super_admin);

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader eyebrow="Administration · Help" title="Help & guide" subtitle="Who to contact, where things live, and how to handle the most common admin tasks." />

      <div className="grid grid-cols-1 gap-[16px] xl:grid-cols-2">
        <Card className="flex flex-col gap-[12px] p-[18px]">
          <div className="flex items-center gap-[10px]">
            <span className="flex size-[34px] items-center justify-center rounded-[8px] bg-[#eaf6ed] text-[#167d35]">
              <Mail className="size-[16px]" strokeWidth={1.8} />
            </span>
            <div className="flex flex-col gap-[2px]">
              <p className="text-[14px] font-semibold text-[#17211b]">Contact</p>
              <p className="text-[11px] text-[#7c857f]">Platform problems or questions about your admin account</p>
            </div>
          </div>
          {helpQuery.isLoading ? (
            <Skeleton className="h-[20px] w-[220px]" />
          ) : (
            <div className="flex flex-col gap-[8px]">
              <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-[6px] self-start text-[13px] font-semibold text-[#167d35] hover:underline">
                {supportEmail}
                <ArrowUpRight className="size-[14px]" strokeWidth={2} />
              </a>
              {helpCenterUrl ? (
                <a
                  href={helpCenterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-[6px] self-start text-[12px] font-medium text-[#45514a] hover:text-[#167d35]"
                >
                  Help centre and documentation
                  <ArrowUpRight className="size-[13px]" strokeWidth={2} />
                </a>
              ) : null}
            </div>
          )}
          {helpQuery.isError ? <p className="text-[11px] text-[#b06d12]">Couldn't load the contact details, so the default support address is shown.</p> : null}
        </Card>

        <Card className="flex flex-col gap-[12px] p-[18px]">
          <div className="flex items-center gap-[10px]">
            <span className="flex size-[34px] items-center justify-center rounded-[8px] bg-[#f1ecfb] text-[#6b46c1]">
              <KeyRound className="size-[16px]" strokeWidth={1.8} />
            </span>
            <div className="flex flex-col gap-[2px]">
              <p className="text-[14px] font-semibold text-[#17211b]">Super admin approval</p>
              <p className="text-[11px] text-[#7c857f]">A second pair of eyes on actions that move money or remove data</p>
            </div>
          </div>
          <p className="text-[12px] leading-[1.55] text-[#45514a]">
            {superAdmin
              ? 'You are a super admin, so your actions go through straight away. Other admins will ask you to enter your email and password when they delete records, suspend accounts, move wallet money, pay out withdrawals, decide disputes or change fees.'
              : 'Deleting records, suspending accounts, moving wallet money, paying out withdrawals, deciding disputes and changing fees need a super admin to approve. When asked, a super admin enters their own email and password on your screen; the approval covers that one action and is recorded in the audit log with both names.'}
          </p>
        </Card>
      </div>

      {links.length > 0 ? (
        <Card className="flex flex-col gap-[12px] p-[18px]">
          <div className="flex flex-col gap-[2px]">
            <p className="text-[14px] font-semibold text-[#17211b]">Where things live</p>
            <p className="text-[11px] text-[#7c857f]">The sections you have access to</p>
          </div>
          <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3">
            {links.map(({ page, label, description, icon: Icon }) => (
              <button
                key={page}
                type="button"
                onClick={() => navigate(getPagePath(page))}
                className="group flex items-start gap-[10px] rounded-[10px] border border-[#eef1ee] p-[12px] text-left hover:border-[#cfe5d5] hover:bg-[#f3faf5]"
              >
                <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[#f1f4f2] text-[#45514a] group-hover:bg-[#eaf6ed] group-hover:text-[#167d35]">
                  <Icon className="size-[15px]" strokeWidth={1.8} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="text-[12px] font-semibold text-[#17211b]">{label}</span>
                  <span className="text-[11px] leading-[1.45] text-[#7c857f]">{description}</span>
                </span>
                <ArrowRight className="mt-[2px] size-[14px] flex-shrink-0 text-[#b5bdb7] group-hover:text-[#167d35]" strokeWidth={2} />
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-[12px] p-[18px]">
        <div className="flex flex-col gap-[2px]">
          <p className="text-[14px] font-semibold text-[#17211b]">Admin guide</p>
          <p className="text-[11px] text-[#7c857f]">Common tasks, step by step</p>
        </div>
        <div className="grid grid-cols-1 gap-[10px] lg:grid-cols-2">
          {GUIDE.map((item) => (
            <div key={item.title} className="flex flex-col gap-[4px] rounded-[10px] bg-[#f8faf8] px-[14px] py-[12px]">
              <p className="text-[12px] font-semibold text-[#17211b]">{item.title}</p>
              <p className="text-[11px] leading-[1.55] text-[#45514a]">{item.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
