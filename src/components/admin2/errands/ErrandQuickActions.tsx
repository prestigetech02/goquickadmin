import { useQuery } from '@tanstack/react-query';
import { fetchAdminErrandView } from '@/api/adminErrandsApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminErrandBoardRow } from '@/types/api';
import { ErrandActionModals } from '../errand/ErrandActionModals';
import { Skeleton } from '../overview/primitives';

export type BoardAction = 'reassign' | 'cancel' | 'status' | 'complete';

export type BoardActionTarget = { kind: BoardAction; row: AdminErrandBoardRow };

const TITLES: Record<BoardAction, string> = {
  reassign: 'Reassign runner',
  cancel: 'Cancel errand',
  status: 'Change errand status',
  complete: 'Mark errand complete',
};

export function ErrandQuickActions({
  target,
  onClose,
  onDone,
}: {
  target: BoardActionTarget | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const id = target?.row.id ?? 0;
  const viewQuery = useQuery({
    queryKey: queryKeys.errands.view(id),
    queryFn: () => fetchAdminErrandView(id),
    enabled: target != null,
  });

  if (!target) return null;

  if (viewQuery.data && viewQuery.data.errand.id === target.row.id) {
    return <ErrandActionModals view={viewQuery.data} modal={target.kind} onClose={onClose} onDone={onDone} />;
  }

  return (
    <Modal open onClose={onClose} title={`${TITLES[target.kind]} · ${target.row.code}`} size="sm">
      {viewQuery.isError ? (
        <div className="space-y-3 font-inter">
          <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
            {getApiErrorMessage(viewQuery.error, 'Could not load this errand.')}
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void viewQuery.refetch()}
              className="h-[34px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[12px] font-semibold text-[#17211b]"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Skeleton className="h-[14px] w-[70%]" />
          <Skeleton className="h-[80px] w-full" />
          <Skeleton className="h-[36px] w-[40%]" />
        </div>
      )}
    </Modal>
  );
}
