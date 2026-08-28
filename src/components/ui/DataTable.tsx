import { type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  loading,
  emptyMessage = 'No data available',
  onRowClick,
  page,
  pageSize,
  total,
  onPageChange,
}: {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}) {
  const totalPages = pageSize && total ? Math.ceil(total / pageSize) : 1;

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-ink-100">
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-4">
                      <div className="h-4 bg-ink-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-ink-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-ink-100 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-ink-50' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-3.5 text-sm text-ink-700 ${col.className || ''}`}>
                      {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {page && pageSize && total !== undefined && onPageChange && total > 0 ? (
        <div className="flex items-center justify-between px-5 py-3 border-t border-ink-100">
          <p className="text-xs text-ink-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-ink-200 text-ink-600 disabled:opacity-40 hover:bg-ink-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-ink-600 px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-ink-200 text-ink-600 disabled:opacity-40 hover:bg-ink-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
