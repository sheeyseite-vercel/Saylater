import { brandIcon } from "@/lib/brand-icon";

export const runtime = "nodejs";

const ICONS: Record<string, { size: number; maskable?: boolean }> = {
  "192": { size: 192 },
  "512": { size: 512 },
  maskable: { size: 512, maskable: true },
};

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const spec = ICONS[name];
  if (!spec) return new Response("Not found", { status: 404 });
  return brandIcon(spec.size, { maskable: spec.maskable });
}
