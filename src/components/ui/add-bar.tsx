"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "./button";

/** One-line "add" field used by tasks, ideas, lists and notes. */
export function AddBar({
  placeholder,
  label,
  onAdd,
}: {
  placeholder: string;
  label: string;
  onAdd: (text: string) => Promise<unknown>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const v = text.trim();
        if (!v || busy) return;
        setBusy(true);
        const ok = await onAdd(v);
        setBusy(false);
        if (ok) setText("");
      }}
    >
      <input
        value={text}
        maxLength={200}
        dir="auto"
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setText(e.target.value)}
        className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3"
      />
      <Button type="submit" className="w-auto" disabled={busy || !text.trim()} aria-label={label}>
        <Plus className="h-5 w-5" aria-hidden="true" />
      </Button>
    </form>
  );
}
