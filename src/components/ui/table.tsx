import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm border-collapse", className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("border-b border-[var(--color-border)]", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-[var(--color-border)]", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-[var(--color-border)] bg-[var(--color-neutral-20)] text-[var(--color-text-subtle)] font-medium",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isSelected?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, isSelected, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "transition-colors duration-fast bg-white hover:bg-[var(--color-neutral-10)]",
        isSelected && "bg-[var(--color-bg-selected)] hover:bg-[var(--color-bg-selected-hovered)]",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sortDirection, onSort, children, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-9 px-3 text-left text-xs font-semibold text-[var(--color-text-subtle)] whitespace-nowrap",
        "bg-[var(--color-neutral-20)]",
        sortable && "cursor-pointer select-none hover:text-[var(--color-text)] hover:bg-[var(--color-neutral-30)] transition-colors",
        className
      )}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      {sortable ? (
        <span className="inline-flex items-center gap-1">
          {children}
          <span className="text-[var(--color-text-subtlest)] text-xs">
            {sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "⇅"}
          </span>
        </span>
      ) : (
        children
      )}
    </th>
  )
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-3 py-2 text-sm text-[var(--color-text)] align-middle", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-[var(--color-text-subtle)]", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

interface TableEmptyProps {
  colSpan: number;
  icon?: React.ReactNode;
  message?: string;
}

function TableEmpty({ colSpan, icon, message = "Không có dữ liệu" }: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center text-sm text-[var(--color-text-subtle)]">
        <div className="flex flex-col items-center gap-2">
          {icon && <span className="opacity-30 [&_svg]:size-10">{icon}</span>}
          <span>{message}</span>
        </div>
      </td>
    </tr>
  );
}

function TableContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-[var(--color-border)] bg-white overflow-hidden shadow-[var(--shadow-card)]", className)}>
      {children}
    </div>
  );
}

export {
  Table, TableHeader, TableBody, TableFooter,
  TableHead, TableRow, TableCell, TableCaption,
  TableEmpty, TableContainer,
};
