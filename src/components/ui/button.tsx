import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

const VARIANTS = {
  primary: "btn-solid bg-primary text-primary-foreground",
  ghost: "border border-border bg-card hover:bg-muted",
  danger: "btn-solid bg-destructive text-white",
} as const;

export function Button({ variant = "primary", className, ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-xl px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
