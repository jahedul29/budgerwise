import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
        secondary: "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        income: "border-transparent bg-income-light text-income-dark dark:bg-emerald-900/30 dark:text-emerald-300",
        expense: "border-transparent bg-expense-light text-expense-dark dark:bg-rose-900/30 dark:text-rose-300",
        warning: "border-transparent bg-warning-light text-warning-dark dark:bg-amber-900/30 dark:text-amber-300",
        outline: "text-gray-700 dark:text-gray-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
