import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly on every navigation inside the app while the next page streams in.
export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </main>
  );
}
