import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { classNames } from "../../lib/format";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";

export type SortDirection = "asc" | "desc";

export interface DataTableColumn<T> {
  key: string;
  title: React.ReactNode;
  align?: "left" | "center" | "right";
  numeric?: boolean;
  width?: string | number;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string, direction: SortDirection) => void;
  onRowClick?: (item: T) => void;
  className?: string;
  stickyHeader?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle = "표시할 데이터가 없습니다",
  emptyDescription,
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
  className,
  stickyHeader = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-xl border border-normal bg-elevated overflow-hidden">
        <LoadingState />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-normal bg-elevated overflow-hidden p-4">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  const handleHeaderClick = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSort) return;
    if (sortKey === column.key) {
      onSort(column.key, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSort(column.key, "asc");
    }
  };

  return (
    <div
      className={classNames(
        "rounded-xl border border-normal bg-elevated overflow-x-auto shadow-xs",
        className
      )}
    >
      <table className="w-full text-left text-sm border-collapse">
        <thead
          className={classNames(
            "bg-alternative text-xs font-semibold text-neutral border-b border-normal uppercase tracking-wider",
            stickyHeader && "sticky top-0 z-10"
          )}
        >
          <tr>
            {columns.map((col) => {
              const isNumeric = col.numeric || col.align === "right";
              const alignClass =
                col.align === "center"
                  ? "text-center"
                  : isNumeric
                  ? "text-right"
                  : "text-left";
              const isSorted = sortKey === col.key;

              return (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={classNames(
                    "py-3 px-3.5 whitespace-nowrap",
                    alignClass,
                    col.sortable && "cursor-pointer select-none hover:text-strong transition-colors"
                  )}
                  onClick={() => handleHeaderClick(col)}
                >
                  <div
                    className={classNames(
                      "inline-flex items-center gap-1",
                      alignClass === "text-right" && "justify-end",
                      alignClass === "text-center" && "justify-center"
                    )}
                  >
                    <span>{col.title}</span>
                    {col.sortable && (
                      <span className="shrink-0 text-neutral">
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ArrowUp size={13} className="text-primary" />
                          ) : (
                            <ArrowDown size={13} className="text-primary" />
                          )
                        ) : (
                          <ArrowUpDown size={13} className="opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-normal/60">
          {data.map((item, index) => {
            const key = keyExtractor(item, index);
            const isClickable = Boolean(onRowClick);

            return (
              <tr
                key={key}
                onClick={() => onRowClick && onRowClick(item)}
                className={classNames(
                  "transition-colors",
                  isClickable ? "cursor-pointer hover:bg-alternative/60" : "hover:bg-alternative/30"
                )}
              >
                {columns.map((col) => {
                  const isNumeric = col.numeric || col.align === "right";
                  const alignClass =
                    col.align === "center"
                      ? "text-center"
                      : isNumeric
                      ? "text-right tabular-nums font-mono"
                      : "text-left";

                  const cellValue =
                    col.render != null
                      ? col.render(item, index)
                      : (item as Record<string, any>)[col.key];

                  return (
                    <td
                      key={col.key}
                      className={classNames(
                        "py-3 px-3.5 text-xs sm:text-sm text-strong whitespace-nowrap",
                        alignClass
                      )}
                    >
                      {cellValue ?? "-"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
