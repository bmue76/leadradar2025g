import { headers } from "next/headers";
import PresetsClient from "./PresetsClient";
import type { GetPresetsResponse } from "@/lib/types/form-presets";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type HeadersType = Awaited<ReturnType<typeof headers>>;

function firstString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function buildBaseUrl(h: HeadersType) {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

export default async function AdminPresetsPage({
  searchParams,
}: {
  // Next 16: searchParams kann Promise sein
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const h = await headers();
  const sp = await Promise.resolve(searchParams ?? {});

  const q = (firstString(sp.q) ?? "").trim();
  const category = (firstString(sp.category) ?? "").trim();

  const baseUrl = buildBaseUrl(h);

  // Dev-freundlicher Fallback, falls kein Header gesetzt ist
  const userId = h.get("x-user-id") ?? "1";
  const tenantId = h.get("x-tenant-id");

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (category) qs.set("category", category);

  const url = `${baseUrl}/api/admin/form-presets${
    qs.toString() ? `?${qs.toString()}` : ""
  }`;

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      "x-user-id": userId,
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Vorlagen</h1>
        <p className="mt-2 text-sm text-red-600">
          Fehler beim Laden der Vorlagen ({res.status})
        </p>
        <pre className="mt-3 whitespace-pre-wrap rounded border p-3 text-xs">
          {text}
        </pre>
      </div>
    );
  }

  const data = (await res.json()) as GetPresetsResponse;

  return (
    <PresetsClient
      presets={data.presets ?? []}
      categories={data.categories ?? []}
      currentQ={q}
      currentCategory={category}
      auth={{
        userId,
        tenantId: tenantId ?? null,
      }}
    />
  );
}
