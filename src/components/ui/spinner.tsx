import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin rounded-full border-t-2 border-b-2", {
  variants: {
    size: {
      sm: "h-4 w-4 border-2",
      md: "h-6 w-6 border-2",
      lg: "h-10 w-10 border-4",
    },
    color: {
      primary: "border-primary-foreground",
      default: "border-current",
    },
  },
  defaultVariants: {
    size: "md",
    color: "primary",
  },
});

interface SpinnerProps extends VariantProps<typeof spinnerVariants> {}

export const Spinner = ({ size, color }: SpinnerProps) => {
  return <div className={cn(spinnerVariants({ size, color }))}></div>;
};
