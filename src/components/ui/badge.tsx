import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        success:
          "border-transparent bg-success/20 text-success border-success/30",
        warning:
          "border-transparent bg-warning/20 text-warning border-warning/30",
        info:
          "border-transparent bg-info/20 text-info border-info/30",
        native:
          "border-success/30 bg-success/20 text-success",
        workaround:
          "border-warning/30 bg-warning/20 text-warning",
        unsupported:
          "border-destructive/30 bg-destructive/20 text-destructive",
        pending:
          "border-warning/30 bg-warning/10 text-warning",
        completed:
          "border-success/30 bg-success/10 text-success",
        failed:
          "border-destructive/30 bg-destructive/10 text-destructive",
        running:
          "border-primary/30 bg-primary/10 text-primary animate-pulse",
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
