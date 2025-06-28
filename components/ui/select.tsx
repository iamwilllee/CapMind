import React from "react";
import { cn } from "~/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  variant?: "default" | "compact";
  children: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const baseStyles =
      "bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500";

    const variantStyles = {
      default: "w-full px-4 py-3 text-sm rounded-lg shadow-sm hover:shadow-md",
      compact: "text-xs px-3 py-2 rounded-md min-w-[120px]",
    };

    return (
      <div className="relative">
        <select
          className={cn(
            baseStyles,
            variantStyles[variant],
            "appearance-none",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-500 dark:text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";

interface OptionProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  children: React.ReactNode;
}

const Option = React.forwardRef<HTMLOptionElement, OptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <option
        className={cn(
          "bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-200 py-2 px-3 hover:bg-blue-50 dark:hover:bg-zinc-700",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </option>
    );
  }
);

Option.displayName = "Option";

export { Select, Option };
