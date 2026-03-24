import { PAGE_SIZE_OPTIONS } from "../hooks/usePagination";

interface PaginationControlsProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  if (currentPage <= 2) pages.add(3);
  if (currentPage >= totalPages - 1) pages.add(totalPages - 2);

  return Array.from(pages).sort((a, b) => a - b);
}

const PaginationControls = ({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  startItem,
  endItem,
  onPageChange,
  onPageSizeChange,
  itemLabel = "items",
}: PaginationControlsProps) => {
  if (totalItems === 0) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  let previousPage: number | null = null;

  return (
    <div className="flex flex-col gap-3 border-t border-stroke px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <p className="text-xs text-fg-muted">
          Showing {startItem}-{endItem} of {totalItems} {itemLabel}
        </p>
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-stroke bg-surface px-2 py-1 text-xs text-fg-secondary focus:border-primary focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50"
        >
          Previous
        </button>

        <div className="flex items-center gap-1">
          {pages.map((page) => {
            const showEllipsis = previousPage !== null && page - previousPage > 1;
            previousPage = page;

            return (
              <div key={page} className="flex items-center gap-1">
                {showEllipsis ? (
                  <span className="px-1 text-xs text-fg-muted">...</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={`min-w-9 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    currentPage === page
                      ? "bg-primary text-on-primary"
                      : "border border-stroke bg-surface text-fg-secondary hover:border-stroke-strong"
                  }`}
                >
                  {page}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
