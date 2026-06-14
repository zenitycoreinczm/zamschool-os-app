"use client";

type PaginationProps = {
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (nextPage: number) => void;
};

export default function Pagination({
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="p-4 flex items-center justify-between text-gray-500">
      <button
        disabled={!canPrev}
        onClick={() => canPrev && onPageChange?.(page - 1)}
        className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Prev
      </button>
      <div className="flex items-center gap-2 text-sm">
        <span className="px-2 py-1 rounded-sm bg-lamaSky text-slate-900 font-semibold">
          {page}
        </span>
        <span className="text-xs text-slate-500">of {totalPages}</span>
      </div>
      <button
        disabled={!canNext}
        onClick={() => canNext && onPageChange?.(page + 1)}
        className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}
