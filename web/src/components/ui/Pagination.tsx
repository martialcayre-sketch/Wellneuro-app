type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const disablePrev = page <= 1;
  const disableNext = page >= totalPages;

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={disablePrev}
        className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground border border-border disabled:opacity-40"
      >
        Précédent
      </button>
      <span className="text-sm text-muted-foreground">
        Page {page} sur {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={disableNext}
        className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground border border-border disabled:opacity-40"
      >
        Suivant
      </button>
    </div>
  );
}
