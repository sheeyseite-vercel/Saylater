import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

const VARIANTS = {
  primary: "brand-gradient text-primary-foreground shadow-md shadow-primary/25",
  ghost: "glass hover:bg-muted",
  danger: "bg-destructive text-primary-foreground",
} as const;

export function Button({ variant = "primary", className, ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-xl px-4 font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
