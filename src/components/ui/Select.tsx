import React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "appearance-none flex h-10 w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 pr-8 rtl:pr-3 rtl:pl-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 disabled:cursor-not-allowed disabled:opacity-50 text-gray-100",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none text-gray-400" />
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select };
