import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

export function Button({ variant = "primary", className, ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex h-11 w-full items-center justify-center rounded-xl px-4 font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" ? "brand-gradient text-primary-foreground" : "glass hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}
