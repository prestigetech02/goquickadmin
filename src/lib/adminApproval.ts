/**
 * Critical actions by staff admins come back as 428 APPROVAL_REQUIRED. The http client parks the request here
 * until a super admin enters their details in AdminApprovalPrompt, then retries it with the approval token.
 */

export type ApprovalRequest = {
  id: number;
  action: string;
  label: string;
  scope: string;
};

type Pending = ApprovalRequest & {
  resolve: (token: string) => void;
  reject: () => void;
};

let queue: Pending[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function requestApproval(details: Omit<ApprovalRequest, 'id'>): Promise<string> {
  return new Promise((resolve, reject) => {
    queue = [...queue, { ...details, id: nextId++, resolve, reject: () => reject(new Error('Approval cancelled')) }];
    emit();
  });
}

export function currentApproval(): ApprovalRequest | null {
  return queue[0] ?? null;
}

export function subscribeApprovals(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function settle(id: number, settleWith: (entry: Pending) => void) {
  const entry = queue.find((item) => item.id === id);
  if (!entry) return;
  queue = queue.filter((item) => item.id !== id);
  settleWith(entry);
  emit();
}

export function completeApproval(id: number, token: string) {
  settle(id, (entry) => entry.resolve(token));
}

export function cancelApproval(id: number) {
  settle(id, (entry) => entry.reject());
}
