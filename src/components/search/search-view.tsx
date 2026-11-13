"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

interface Result { kind: string; id: string; title: string; snippet: string; href: string }

export function SearchView() {
  const t = useTranslations("search");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        setResults(((await res.json()) as { results: Result[] }).results);
        setFailed(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          autoFocus
          value={q}
          dir="auto"
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          onChange={(e) => setQ(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-card ps-11 pe-3"
        />
      </div>

      {failed && <p role="alert" className="text-sm text-destructive">{t("error")}</p>}
      {loading && <p className="text-sm text-muted-foreground" role="status">{t("searching")}</p>}
      {!loading && results === null && <p className="text-sm text-muted-foreground">{t("hint")}</p>}
      {!loading && results?.length === 0 && <p className="text-sm text-muted-foreground">{t("none")}</p>}

      {results && results.length > 0 && (
        <ul className="divide-y divide-border border-y border-border">
          {results.map((r) => (
            <li key={`${r.kind}-${r.id}`}>
              <Link href={r.href} className="row-hover block px-1 py-3">
                <span className="flex items-center gap-2">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t(`kinds.${r.kind}`)}</span>
                  <span dir="auto" className="truncate font-medium">{r.title}</span>
                </span>
                {r.snippet && <span dir="auto" className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{r.snippet}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
