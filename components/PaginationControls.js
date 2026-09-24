"use client";

function getVisiblePages(page, totalPages) {
  const current = Number(page) || 1;
  const total = Math.max(1, Number(totalPages) || 1);
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default function PaginationControls({
  pagination,
  pageSizeOptions = [10, 20, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemLabel = "items",
  currentCount,
  className = "",
}) {
  const page = Math.max(1, Number(pagination?.page) || 1);
  const pageSize = Math.max(1, Number(pagination?.page_size) || currentCount || 1);
  const total = Math.max(0, Number(pagination?.total) || currentCount || 0);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const visible = getVisiblePages(page, totalPages);

  return (
    <div className={`px-6 py-4 border-t border-gray-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${className}`.trim()}>
      <div className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-900">{currentCount ?? 0}</span> on this page · Total <span className="font-medium text-gray-900">{total}</span> {itemLabel}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {typeof onPageSizeChange === "function" ? (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows</span>
            <select
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value) || pageSize)}
              className="px-2 py-1.5 border border-gray-300 rounded-lg bg-white"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {visible.map((p, idx) =>
            p === "..." ? (
              <span key={`dots-${idx}`} className="px-2 text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange?.(p)}
                disabled={p === page}
                className={`px-3 py-1.5 rounded-lg border ${p === page ? "bg-blue-700 text-white border-blue-700" : "border-gray-300 hover:bg-gray-50"}`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
