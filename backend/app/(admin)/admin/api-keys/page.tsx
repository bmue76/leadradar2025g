import React from "react";
import { ApiKeysClient } from "./ApiKeysClient";

export type ApiKeyDto = {
  id: number | string;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  displayPrefix: string;
};

type ApiKeysResponse = {
  items: ApiKeyDto[];
};

async function fetchApiKeys(): Promise<ApiKeyDto[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/admin/api-keys`, {
    method: "GET",
    headers: {
      // Dev-Stub für requireAuthContext
      "x-user-id": "1",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Failed to load API keys", res.status, await res.text());
    throw new Error("Failed to load API keys");
  }

  const data = (await res.json()) as ApiKeysResponse;
  return data.items ?? [];
}

export default async function AdminApiKeysPage() {
  let apiKeys: ApiKeyDto[] = [];
  let loadError: string | null = null;

  try {
    apiKeys = await fetchApiKeys();
  } catch (err) {
    loadError = "API-Keys konnten nicht geladen werden.";
  }

  return (
    <ApiKeysClient initialItems={apiKeys} initialError={loadError} />
  );
}
